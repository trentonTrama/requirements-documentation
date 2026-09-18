/**
 * Imports the authored requirements corpus (prisma/data/journeys.json) into the
 * database. The corpus is the source of truth: everything here is derived from
 * it, nothing is invented.
 *
 * Idempotent -- journeys upsert on slug, requirements on their deterministic
 * ref, and each journey's children are replaced on every run. Re-seeding leaves
 * the counts unchanged.
 */
import { PrismaClient } from "@prisma/client";
import { formatCriterionRef, formatRequirementRef } from "../src/lib/refs";
import {
  DOMAINS,
  PERSONAS,
  SOURCE_JOURNEYS,
  changeClassFor,
  domainFor,
  draftedOn,
  journeyKeyFor,
  personaKeysFor,
  requirementPersonaKeys,
  sideFor,
} from "./data/mapping";

const prisma = new PrismaClient();

async function main() {
  const personaIds = new Map<string, string>();
  for (const persona of PERSONAS) {
    const record = await prisma.persona.upsert({
      where: { key: persona.key },
      create: { ...persona },
      update: { ...persona },
    });
    personaIds.set(persona.key, record.id);
  }

  const categoryIds = new Map<string, string>();
  for (const [index, domain] of DOMAINS.entries()) {
    const record = await prisma.category.upsert({
      where: { key: domain.key },
      create: { ...domain, sortOrder: index },
      update: { ...domain, sortOrder: index },
    });
    categoryIds.set(domain.key, record.id);
  }

  const connect = (keys: string[]) => keys.map((key) => ({ id: required(personaIds, key) }));
  let requirementCount = 0;
  let criterionCount = 0;
  let questionCount = 0;

  for (const [journeyIndex, source] of SOURCE_JOURNEYS.entries()) {
    const domain = domainFor(source);
    const key = journeyKeyFor(source);
    const personas = connect(personaKeysFor(source.persona));

    const fields = {
      key,
      title: source.domain,
      side: sideFor(source),
      categoryId: required(categoryIds, domain.key),
      statusNote: source.status,
      author: source.author,
      primarySource: source.primarySource,
      docFile: source.docFile,
      asA: source.userStory.asA,
      iWant: source.userStory.iWant,
      soThat: source.userStory.soThat,
      covers: source.userStory.covers,
      notCovered: source.userStory.notCovered,
      draftedOn: draftedOn(source),
      sortOrder: journeyIndex,
    };

    const journey = await prisma.journey.upsert({
      where: { slug: source.slug },
      create: { slug: source.slug, ...fields, personas: { connect: personas } },
      update: { ...fields, personas: { set: personas } },
    });

    // Every ref this journey is about to write. Clearing by ref as well as by
    // journey matters because a requirement may have been moved to another
    // journey in the app since the last seed -- keying only on journeyId would
    // leave it behind to collide with the ref being recreated here.
    const refs = source.requirementGroups
      .flatMap((group) => group.requirements)
      .map((_, index) => formatRequirementRef(key, index + 1));

    // Replace this journey's children so repeated seeding stays clean.
    await prisma.$transaction([
      prisma.additionalUserStory.deleteMany({ where: { journeyId: journey.id } }),
      prisma.journeyNote.deleteMany({ where: { journeyId: journey.id } }),
      prisma.archiveItem.deleteMany({ where: { journeyId: journey.id } }),
      prisma.question.deleteMany({ where: { journeyId: journey.id } }),
      prisma.functionalRequirement.deleteMany({
        where: { OR: [{ journeyId: journey.id }, { ref: { in: refs } }] },
      }),
    ]);

    await prisma.additionalUserStory.createMany({
      data: source.additionalUserStories.map((story, index) => ({
        journeyId: journey.id,
        changeClass: changeClassFor(story.class),
        asA: story.asA,
        iWant: story.iWant,
        soThat: story.soThat,
        sortOrder: index,
      })),
    });

    await prisma.journeyNote.createMany({
      data: [
        ...source.decisionsCarriedForward.map((body, index) => ({
          journeyId: journey.id,
          kind: "DECISION" as const,
          body,
          sortOrder: index,
        })),
        ...source.technicalNotes.map((body, index) => ({
          journeyId: journey.id,
          kind: "TECHNICAL" as const,
          body,
          sortOrder: index,
        })),
      ],
    });

    await prisma.archiveItem.createMany({
      data: source.archiveItemsNotCarried.map((entry, index) => ({
        journeyId: journey.id,
        item: entry.item,
        source: entry.source,
        disposition: entry.disposition,
        sortOrder: index,
      })),
    });

    // The document's open questions are real, unresolved questions -- import them
    // as tracked records so they show up in the questions tracker, not as prose.
    await prisma.question.createMany({
      data: source.openQuestions.map((body) => ({
        journeyId: journey.id,
        body,
        askedBy: source.author,
        status: "OPEN" as const,
      })),
    });
    questionCount += source.openQuestions.length;

    let ordinal = 0;
    for (const [sectionOrder, group] of source.requirementGroups.entries()) {
      const changeClass = changeClassFor(group.class);
      const overridePersonas = connect(requirementPersonaKeys(changeClass));

      for (const requirement of group.requirements) {
        ordinal += 1;
        const ref = formatRequirementRef(key, ordinal);
        const created = await prisma.functionalRequirement.create({
          data: {
            ref,
            journeyId: journey.id,
            title: requirement.fr,
            sourceNotes: requirement.sourceNotes,
            section: group.category,
            sectionOrder,
            sectionStateSpecific: group.stateSpecific,
            changeClass,
            decisionRequired: requirement.decisionRequired,
            stateSpecific: requirement.stateSpecific,
            sortOrder: ordinal,
            // Empty = inherit the journey's personas.
            personas: { connect: overridePersonas },
          },
        });
        requirementCount += 1;

        await prisma.acceptanceCriterion.createMany({
          data: requirement.acceptanceCriteria.map((statement, index) => ({
            ref: formatCriterionRef(ref, index + 1),
            requirementId: created.id,
            statement,
            sortOrder: index,
          })),
        });
        criterionCount += requirement.acceptanceCriteria.length;

        await advanceCounter(`${ref}.AC`, requirement.acceptanceCriteria.length + 1);
      }
    }

    await advanceCounter(`FR-${key}`, ordinal + 1);
  }

  await prisma.changeLogEntry.deleteMany({ where: { authorName: "Seed" } });
  await prisma.changeLogEntry.create({
    data: {
      entityType: "System",
      entityId: "seed",
      field: "created",
      summary: `Imported ${SOURCE_JOURNEYS.length} journey documents: ${requirementCount} requirements, ${criterionCount} acceptance criteria, ${questionCount} open questions`,
      authorName: "Seed",
    },
  });

  console.log(
    `Imported ${SOURCE_JOURNEYS.length} journeys across ${DOMAINS.length} domains — ` +
      `${requirementCount} requirements, ${criterionCount} acceptance criteria, ${questionCount} open questions`,
  );
}

function required(map: Map<string, string>, key: string) {
  const id = map.get(key);
  if (!id) throw new Error(`Missing seeded record for ${key}`);
  return id;
}

/** Keep the app's ref counters ahead of anything the seed created. */
async function advanceCounter(prefix: string, nextValue: number) {
  const existing = await prisma.refCounter.findUnique({ where: { prefix } });
  if (existing && existing.nextValue >= nextValue) return;
  await prisma.refCounter.upsert({
    where: { prefix },
    create: { prefix, nextValue },
    update: { nextValue },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
