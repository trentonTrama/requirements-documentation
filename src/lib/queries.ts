import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { resolveCriterionPersonas, resolveRequirementPersonas } from "./personas";

export const personaSelect = {
  id: true,
  key: true,
  name: true,
  color: true,
} satisfies Prisma.PersonaSelect;

const criterionInclude = {
  personas: { select: personaSelect },
  comments: { orderBy: { createdAt: "asc" as const } },
  questions: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.AcceptanceCriterionInclude;

export const journeySummarySelect = {
  id: true,
  slug: true,
  key: true,
  title: true,
  side: true,
  categoryId: true,
  personas: { select: personaSelect },
  category: { select: { id: true, key: true, name: true, color: true } },
} satisfies Prisma.JourneySelect;

export const requirementDetailInclude = {
  journey: { select: journeySummarySelect },
  personas: { select: personaSelect },
  acceptanceCriteria: {
    orderBy: { sortOrder: "asc" as const },
    include: criterionInclude,
  },
  comments: { orderBy: { createdAt: "asc" as const } },
  questions: { orderBy: { createdAt: "desc" as const } },
  linksFrom: { include: { to: { select: { id: true, ref: true, title: true, status: true } } } },
  linksTo: { include: { from: { select: { id: true, ref: true, title: true, status: true } } } },
} satisfies Prisma.FunctionalRequirementInclude;

export const requirementListInclude = {
  journey: { select: journeySummarySelect },
  personas: { select: personaSelect },
  acceptanceCriteria: {
    orderBy: { sortOrder: "asc" as const },
    select: { id: true, personas: { select: personaSelect } },
  },
  _count: { select: { acceptanceCriteria: true, comments: true, questions: true } },
} satisfies Prisma.FunctionalRequirementInclude;

export type RequirementDetail = Prisma.FunctionalRequirementGetPayload<{
  include: typeof requirementDetailInclude;
}>;

export type RequirementListItem = Prisma.FunctionalRequirementGetPayload<{
  include: typeof requirementListInclude;
}>;

export type JourneySummary = Prisma.JourneyGetPayload<{ select: typeof journeySummarySelect }>;

export const REQUIREMENT_ORDER: Prisma.FunctionalRequirementOrderByWithRelationInput[] = [
  { journey: { category: { sortOrder: "asc" } } },
  { journey: { sortOrder: "asc" } },
  { sectionOrder: "asc" },
  { sortOrder: "asc" },
];

export function getRequirement(id: string) {
  return prisma.functionalRequirement.findUnique({
    where: { id },
    include: requirementDetailInclude,
  });
}

export function listRequirements(where: Prisma.FunctionalRequirementWhereInput = {}) {
  return prisma.functionalRequirement.findMany({
    where,
    include: requirementListInclude,
    orderBy: REQUIREMENT_ORDER,
  });
}

export function listCategories() {
  return prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { journeys: true } },
      journeys: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, side: true, _count: { select: { requirements: true } } },
      },
    },
  });
}

export function listPersonas() {
  return prisma.persona.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: { select: { journeys: true, requirements: true, acceptanceCriteria: true } },
    },
  });
}

/** Journeys grouped for the index page, with the counts that make them worth opening. */
export async function listJourneys() {
  const journeys = await prisma.journey.findMany({
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    include: {
      category: true,
      personas: { select: personaSelect },
      _count: { select: { requirements: true, archiveItems: true, notes: true } },
    },
  });

  const [decisionCounts, openQuestionCounts] = await Promise.all([
    prisma.functionalRequirement.groupBy({
      by: ["journeyId"],
      where: { decisionRequired: true },
      _count: true,
    }),
    prisma.question.groupBy({
      by: ["journeyId"],
      where: { status: "OPEN", journeyId: { not: null } },
      _count: true,
    }),
  ]);

  const decisions = new Map(decisionCounts.map((row) => [row.journeyId, row._count]));
  const openQuestions = new Map(openQuestionCounts.map((row) => [row.journeyId, row._count]));

  return journeys.map((journey) => ({
    ...journey,
    decisionRequiredCount: decisions.get(journey.id) ?? 0,
    openQuestionCount: openQuestions.get(journey.id) ?? 0,
  }));
}

export const journeyDetailInclude = {
  category: true,
  personas: { select: personaSelect },
  additionalUserStories: { orderBy: { sortOrder: "asc" as const } },
  notes: { orderBy: [{ kind: "asc" as const }, { sortOrder: "asc" as const }] },
  archiveItems: { orderBy: { sortOrder: "asc" as const } },
  comments: { orderBy: { createdAt: "asc" as const } },
  questions: { orderBy: [{ status: "asc" as const }, { createdAt: "asc" as const }] },
  requirements: {
    orderBy: [{ sectionOrder: "asc" as const }, { sortOrder: "asc" as const }],
    include: {
      personas: { select: personaSelect },
      acceptanceCriteria: {
        orderBy: { sortOrder: "asc" as const },
        include: { personas: { select: personaSelect } },
      },
      _count: { select: { comments: true, questions: true } },
    },
  },
} satisfies Prisma.JourneyInclude;

export type JourneyDetail = Prisma.JourneyGetPayload<{ include: typeof journeyDetailInclude }>;
export type JourneyRequirement = JourneyDetail["requirements"][number];

/** Find a journey by its cuid or its slug, so document slugs work as URLs. */
export function getJourney(idOrSlug: string) {
  return prisma.journey.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: journeyDetailInclude,
  });
}

/** Requirements in document order, bucketed into the sections they were written in. */
export function groupBySection(requirements: JourneyRequirement[]) {
  const sections: {
    name: string;
    stateSpecific: boolean;
    changeClass: JourneyRequirement["changeClass"];
    requirements: JourneyRequirement[];
  }[] = [];

  for (const requirement of requirements) {
    const current = sections.at(-1);
    if (current && current.name === requirement.section) {
      current.requirements.push(requirement);
      continue;
    }
    sections.push({
      name: requirement.section,
      stateSpecific: requirement.sectionStateSpecific,
      changeClass: requirement.changeClass,
      requirements: [requirement],
    });
  }

  return sections;
}

export const questionTargetInclude = {
  journey: { select: { id: true, slug: true, title: true, side: true, key: true } },
  requirement: {
    select: {
      id: true,
      ref: true,
      title: true,
      journey: { select: { id: true, slug: true, title: true, key: true } },
    },
  },
  acceptanceCriterion: {
    select: {
      id: true,
      ref: true,
      statement: true,
      requirement: {
        select: {
          id: true,
          ref: true,
          title: true,
          journey: { select: { id: true, slug: true, title: true, key: true } },
        },
      },
    },
  },
} satisfies Prisma.QuestionInclude;

export type QuestionWithTarget = Prisma.QuestionGetPayload<{ include: typeof questionTargetInclude }>;

export function listQuestions(where: Prisma.QuestionWhereInput = {}) {
  return prisma.question.findMany({
    where,
    include: questionTargetInclude,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export function recentChanges(take = 15) {
  return prisma.changeLogEntry.findMany({ orderBy: { createdAt: "desc" }, take });
}

/** Change history for a requirement plus all of its acceptance criteria. */
export function requirementHistory(requirementId: string, criterionIds: string[]) {
  return prisma.changeLogEntry.findMany({
    where: {
      OR: [
        { entityType: "Requirement", entityId: requirementId },
        { entityType: "AcceptanceCriterion", entityId: { in: criterionIds } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export function entityChanges(entityType: string, entityId: string) {
  return prisma.changeLogEntry.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Everything a persona touches: journeys assigned directly, requirements that
 * resolve to this persona, and criteria that resolve to it -- each tagged with
 * whether it got there by inheritance or by declaring an override.
 */
export async function personaCoverage(personaId: string) {
  const journeys = await prisma.journey.findMany({
    where: {
      OR: [
        { personas: { some: { id: personaId } } },
        { requirements: { some: { personas: { some: { id: personaId } } } } },
      ],
    },
    include: {
      category: true,
      personas: { select: personaSelect },
      requirements: {
        orderBy: [{ sectionOrder: "asc" }, { sortOrder: "asc" }],
        include: {
          personas: { select: personaSelect },
          acceptanceCriteria: {
            orderBy: { sortOrder: "asc" },
            include: { personas: { select: personaSelect } },
          },
        },
      },
    },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });

  return journeys
    .map((journey) => {
      const direct = journey.personas.some((p) => p.id === personaId);
      const requirements = journey.requirements
        .map((requirement) => {
          const resolved = resolveRequirementPersonas(requirement, journey);
          if (!resolved.personas.some((p) => p.id === personaId)) return null;
          const criteria = requirement.acceptanceCriteria.filter((criterion) =>
            resolveCriterionPersonas(criterion, { personas: resolved.personas }).personas.some(
              (p) => p.id === personaId,
            ),
          );
          return { requirement, source: resolved.source, criteriaCount: criteria.length };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

      return { journey, direct, requirements };
    })
    .filter((entry) => entry.direct || entry.requirements.length > 0);
}
