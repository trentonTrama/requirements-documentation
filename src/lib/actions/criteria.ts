"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { criterionSchema } from "@/lib/validation";
import { createdEntry, customEntry, deletedEntry, diffEntity, nameList, writeChangeLog } from "@/lib/changelog";
import { nextCriterionRef } from "@/lib/refs";
import { resolveRequirementPersonas } from "@/lib/personas";
import { parseOrThrow, run, ValidationError } from "./shared";

const FIELDS = [
  { field: "statement" as const, label: "Statement" },
  { field: "notes" as const, label: "Notes" },
];

function revalidate(requirementId: string) {
  revalidatePath("/", "layout");
  revalidatePath(`/requirements/${requirementId}`);
}

export async function createCriterion(input: unknown) {
  return run(async () => {
    const data = parseOrThrow(criterionSchema, input);
    const criterion = await prisma.$transaction(async (tx) => {
      const requirement = await tx.functionalRequirement.findUnique({
        where: { id: data.requirementId },
        include: { personas: true, journey: { include: { personas: true } } },
      });
      if (!requirement) throw new ValidationError("Requirement not found");
      const inherited = resolveRequirementPersonas(requirement, requirement.journey).personas;

      const ref = await nextCriterionRef(tx, requirement.ref);
      const last = await tx.acceptanceCriterion.findFirst({
        where: { requirementId: requirement.id },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });

      const created = await tx.acceptanceCriterion.create({
        data: {
          ref,
          requirementId: requirement.id,
          statement: data.statement,
          notes: data.notes,
          sortOrder: (last?.sortOrder ?? -1) + 1,
          // Empty list = inherit the requirement's personas.
          personas: { connect: data.personaIds.map((personaId) => ({ id: personaId })) },
        },
      });

      const mode =
        data.personaIds.length > 0
          ? "with its own persona override"
          : `inheriting ${inherited.length} persona(s) from ${requirement.ref}`;
      await writeChangeLog(tx, [
        createdEntry(
          { entityType: "AcceptanceCriterion", entityId: created.id, entityRef: ref, entityName: created.statement },
          `${ref} created ${mode}`,
        ),
      ]);
      return created;
    });
    revalidate(criterion.requirementId);
    return criterion.id;
  });
}

export async function updateCriterion(id: string, input: unknown) {
  return run(async () => {
    const data = parseOrThrow(criterionSchema, input);
    const requirementId = await prisma.$transaction(async (tx) => {
      const before = await tx.acceptanceCriterion.findUnique({
        where: { id },
        include: {
          personas: true,
          requirement: { include: { personas: true, journey: { include: { personas: true } } } },
        },
      });
      if (!before) throw new ValidationError("Acceptance criterion not found");

      const after = await tx.acceptanceCriterion.update({
        where: { id },
        data: {
          statement: data.statement,
          notes: data.notes,
          personas: { set: data.personaIds.map((personaId) => ({ id: personaId })) },
        },
        include: { personas: true },
      });

      const target = {
        entityType: "AcceptanceCriterion",
        entityId: id,
        entityRef: before.ref,
        entityName: after.statement,
      };
      const entries = diffEntity(target, before, data, FIELDS);
      entries.push(...personaChangeEntries(target, before, after, before.requirement));
      await writeChangeLog(tx, entries);
      return before.requirementId;
    });
    revalidate(requirementId);
    return id;
  });
}

/** Explicit persona assignment for one criterion; an empty list reverts to inheritance. */
export async function setCriterionPersonas(id: string, personaIds: string[]) {
  return run(async () => {
    const requirementId = await prisma.$transaction(async (tx) => {
      const before = await tx.acceptanceCriterion.findUnique({
        where: { id },
        include: {
          personas: true,
          requirement: { include: { personas: true, journey: { include: { personas: true } } } },
        },
      });
      if (!before) throw new ValidationError("Acceptance criterion not found");

      const after = await tx.acceptanceCriterion.update({
        where: { id },
        data: { personas: { set: personaIds.map((personaId) => ({ id: personaId })) } },
        include: { personas: true },
      });

      await writeChangeLog(
        tx,
        personaChangeEntries(
          {
            entityType: "AcceptanceCriterion",
            entityId: id,
            entityRef: before.ref,
            entityName: after.statement,
          },
          before,
          after,
          before.requirement,
        ),
      );
      return before.requirementId;
    });
    revalidate(requirementId);
    return id;
  });
}

/** Convenience wrapper for the "revert to inherited" control. */
export async function revertCriterionToInherited(id: string) {
  return setCriterionPersonas(id, []);
}

export async function reorderCriteria(requirementId: string, orderedIds: string[]) {
  return run(async () => {
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.acceptanceCriterion.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
    revalidate(requirementId);
    return requirementId;
  });
}

export async function deleteCriterion(id: string) {
  return run(async () => {
    const requirementId = await prisma.$transaction(async (tx) => {
      const criterion = await tx.acceptanceCriterion.findUnique({ where: { id } });
      if (!criterion) throw new ValidationError("Acceptance criterion not found");
      await tx.acceptanceCriterion.delete({ where: { id } });
      await writeChangeLog(tx, [
        deletedEntry(
          {
            entityType: "AcceptanceCriterion",
            entityId: id,
            entityRef: criterion.ref,
            entityName: criterion.statement,
          },
          `${criterion.ref} deleted`,
        ),
      ]);
      return criterion.requirementId;
    });
    revalidate(requirementId);
    return id;
  });
}

type PersonaBearing = { personas: { id: string; key: string; name: string; color: string }[] };

function personaChangeEntries(
  target: Parameters<typeof customEntry>[0],
  before: PersonaBearing,
  after: PersonaBearing,
  requirement: PersonaBearing & { journey?: PersonaBearing | null },
) {
  const beforeNames = nameList(before.personas);
  const afterNames = nameList(after.personas);
  if (beforeNames === afterNames) return [];

  // What the criterion falls back to is the requirement's *resolved* set.
  const inherited =
    nameList(resolveRequirementPersonas(requirement, requirement.journey).personas) || "(none)";
  if (after.personas.length === 0) {
    return [
      customEntry(
        target,
        "Personas",
        `Reverted to inherited personas (${inherited})`,
        beforeNames,
        "",
      ),
    ];
  }
  if (before.personas.length === 0) {
    return [
      customEntry(
        target,
        "Personas",
        `Overrode inherited personas (${inherited}) with ${afterNames}`,
        "",
        afterNames,
      ),
    ];
  }
  return [
    customEntry(target, "Personas", `Persona override changed from ${beforeNames} to ${afterNames}`, beforeNames, afterNames),
  ];
}
