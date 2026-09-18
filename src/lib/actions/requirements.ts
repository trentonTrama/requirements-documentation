"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirementSchema } from "@/lib/validation";
import {
  createdEntry,
  customEntry,
  deletedEntry,
  diffEntity,
  nameList,
  writeChangeLog,
} from "@/lib/changelog";
import { nextRequirementRef } from "@/lib/refs";
import { CHANGE_CLASS_LABELS, PRIORITY_LABELS, STATUS_LABELS } from "@/lib/constants";
import { parseOrThrow, run, ValidationError } from "./shared";

const FIELDS = [
  { field: "title" as const, label: "Requirement" },
  { field: "description" as const, label: "Description" },
  { field: "rationale" as const, label: "Rationale" },
  { field: "assumptions" as const, label: "Assumptions" },
  { field: "sourceNotes" as const, label: "Source notes" },
  { field: "section" as const, label: "Section" },
  {
    field: "status" as const,
    label: "Status",
    format: (v: unknown) => STATUS_LABELS[v as keyof typeof STATUS_LABELS] ?? String(v ?? ""),
  },
  {
    field: "priority" as const,
    label: "Priority",
    format: (v: unknown) => PRIORITY_LABELS[v as keyof typeof PRIORITY_LABELS] ?? String(v ?? ""),
  },
  {
    field: "changeClass" as const,
    label: "Change class",
    format: (v: unknown) =>
      v ? (CHANGE_CLASS_LABELS[v as keyof typeof CHANGE_CLASS_LABELS] ?? String(v)) : "",
  },
  {
    field: "decisionRequired" as const,
    label: "Decision required",
    format: (v: unknown) => (v ? "yes" : "no"),
  },
  {
    field: "stateSpecific" as const,
    label: "State specific",
    format: (v: unknown) => (v ? "yes" : "no"),
  },
];

function revalidate(id?: string, journeyId?: string) {
  revalidatePath("/", "layout");
  if (id) revalidatePath(`/requirements/${id}`);
  if (journeyId) revalidatePath(`/journeys/${journeyId}`);
}

/** Strip the fields the database does not store directly. */
function toRecord(data: ReturnType<typeof parse>) {
  const { personaIds, journeyId, ...rest } = data;
  return { ...rest, changeClass: data.changeClass ?? null };
}

function parse(input: unknown) {
  return parseOrThrow(requirementSchema, input);
}

export async function createRequirement(input: unknown) {
  return run(async () => {
    const data = parse(input);
    const requirement = await prisma.$transaction(async (tx) => {
      const journey = await tx.journey.findUnique({ where: { id: data.journeyId } });
      if (!journey) throw new ValidationError("Journey not found");

      const ref = await nextRequirementRef(tx, journey.key);
      const last = await tx.functionalRequirement.findFirst({
        where: { journeyId: journey.id },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });

      const created = await tx.functionalRequirement.create({
        data: {
          ref,
          journeyId: journey.id,
          sortOrder: (last?.sortOrder ?? 0) + 1,
          ...toRecord(data),
          // Empty = inherit the journey's personas.
          personas: { connect: data.personaIds.map((personaId) => ({ id: personaId })) },
        },
      });

      await writeChangeLog(tx, [
        createdEntry(
          { entityType: "Requirement", entityId: created.id, entityRef: ref, entityName: created.title },
          `${ref} created in ${journey.title}`,
        ),
      ]);
      return created;
    });
    revalidate(requirement.id, requirement.journeyId);
    return requirement.id;
  });
}

export async function updateRequirement(id: string, input: unknown) {
  return run(async () => {
    const data = parse(input);
    const journeyIds = await prisma.$transaction(async (tx) => {
      const before = await tx.functionalRequirement.findUnique({
        where: { id },
        include: { personas: true, journey: true },
      });
      if (!before) throw new ValidationError("Requirement not found");

      const journey = await tx.journey.findUnique({ where: { id: data.journeyId } });
      if (!journey) throw new ValidationError("Journey not found");

      const after = await tx.functionalRequirement.update({
        where: { id },
        data: {
          journeyId: journey.id,
          ...toRecord(data),
          // `set` replaces the whole assignment list in one statement.
          personas: { set: data.personaIds.map((personaId) => ({ id: personaId })) },
        },
        include: { personas: true },
      });

      const target = {
        entityType: "Requirement",
        entityId: id,
        entityRef: before.ref,
        entityName: after.title,
      };
      const entries = diffEntity(target, before, toRecord(data), FIELDS);

      if (before.journeyId !== journey.id) {
        entries.push(
          customEntry(
            target,
            "Journey",
            // The ref is deliberately left alone -- it is the stable identifier.
            `Moved from ${before.journey.title} to ${journey.title} (reference ${before.ref} unchanged)`,
            before.journey.title,
            journey.title,
          ),
        );
      }

      const beforePersonas = nameList(before.personas);
      const afterPersonas = nameList(after.personas);
      if (beforePersonas !== afterPersonas) {
        entries.push(
          customEntry(
            target,
            "Personas",
            personaSummary(before.personas.length, after.personas.length, beforePersonas, afterPersonas, journey.title),
            beforePersonas,
            afterPersonas,
          ),
        );
      }

      await writeChangeLog(tx, entries);
      return [before.journeyId, journey.id];
    });
    revalidate(id, journeyIds[0]);
    if (journeyIds[1] !== journeyIds[0]) revalidate(undefined, journeyIds[1]);
    return id;
  });
}

export async function deleteRequirement(id: string) {
  return run(async () => {
    const journeyId = await prisma.$transaction(async (tx) => {
      const requirement = await tx.functionalRequirement.findUnique({ where: { id } });
      if (!requirement) throw new ValidationError("Requirement not found");
      // Criteria, comments, questions and links cascade at the database level.
      await tx.functionalRequirement.delete({ where: { id } });
      await writeChangeLog(tx, [
        deletedEntry(
          {
            entityType: "Requirement",
            entityId: id,
            entityRef: requirement.ref,
            entityName: requirement.title,
          },
          `${requirement.ref} deleted with its acceptance criteria and discussion`,
        ),
      ]);
      return requirement.journeyId;
    });
    revalidate(undefined, journeyId);
    return id;
  });
}

function personaSummary(
  beforeCount: number,
  afterCount: number,
  before: string,
  after: string,
  journeyTitle: string,
) {
  if (afterCount === 0) return `Reverted to the personas inherited from ${journeyTitle}`;
  if (beforeCount === 0) return `Overrode the personas inherited from ${journeyTitle} with ${after}`;
  return `Persona override changed from ${before} to ${after}`;
}
