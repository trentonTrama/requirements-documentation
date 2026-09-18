"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { criterionSchema } from "@/lib/validation";
import { createdEntry, customEntry, deletedEntry, diffEntity, nameList, writeChangeLog } from "@/lib/changelog";
import { nextCriterionRef } from "@/lib/refs";
import { resolveRequirementCapabilities } from "@/lib/capabilities";
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
        include: { capabilities: true, journey: { include: { capabilities: true } } },
      });
      if (!requirement) throw new ValidationError("Requirement not found");
      const inherited = resolveRequirementCapabilities(requirement, requirement.journey).capabilities;

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
          // Empty list = inherit the requirement's capabilities.
          capabilities: { connect: data.capabilityIds.map((capabilityId) => ({ id: capabilityId })) },
        },
      });

      const mode =
        data.capabilityIds.length > 0
          ? "with its own capability override"
          : `inheriting ${inherited.length} capability(s) from ${requirement.ref}`;
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
          capabilities: true,
          requirement: {
            include: { capabilities: true, journey: { include: { capabilities: true } } },
          },
        },
      });
      if (!before) throw new ValidationError("Acceptance criterion not found");

      const after = await tx.acceptanceCriterion.update({
        where: { id },
        data: {
          statement: data.statement,
          notes: data.notes,
          capabilities: { set: data.capabilityIds.map((capabilityId) => ({ id: capabilityId })) },
        },
        include: { capabilities: true },
      });

      const target = {
        entityType: "AcceptanceCriterion",
        entityId: id,
        entityRef: before.ref,
        entityName: after.statement,
      };
      const entries = diffEntity(target, before, data, FIELDS);
      entries.push(...capabilityChangeEntries(target, before, after, before.requirement));
      await writeChangeLog(tx, entries);
      return before.requirementId;
    });
    revalidate(requirementId);
    return id;
  });
}

/** Explicit capability assignment for one criterion; an empty list reverts to inheritance. */
export async function setCriterionCapabilities(id: string, capabilityIds: string[]) {
  return run(async () => {
    const requirementId = await prisma.$transaction(async (tx) => {
      const before = await tx.acceptanceCriterion.findUnique({
        where: { id },
        include: {
          capabilities: true,
          requirement: {
            include: { capabilities: true, journey: { include: { capabilities: true } } },
          },
        },
      });
      if (!before) throw new ValidationError("Acceptance criterion not found");

      const after = await tx.acceptanceCriterion.update({
        where: { id },
        data: { capabilities: { set: capabilityIds.map((capabilityId) => ({ id: capabilityId })) } },
        include: { capabilities: true },
      });

      await writeChangeLog(
        tx,
        capabilityChangeEntries(
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
  return setCriterionCapabilities(id, []);
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

type CapabilityBearing = {
  capabilities: { id: string; key: string; name: string; color: string }[];
};

function capabilityChangeEntries(
  target: Parameters<typeof customEntry>[0],
  before: CapabilityBearing,
  after: CapabilityBearing,
  requirement: CapabilityBearing & { journey?: CapabilityBearing | null },
) {
  const beforeNames = nameList(before.capabilities);
  const afterNames = nameList(after.capabilities);
  if (beforeNames === afterNames) return [];

  // What the criterion falls back to is the requirement's *resolved* set.
  const inherited =
    nameList(resolveRequirementCapabilities(requirement, requirement.journey).capabilities) ||
    "(none)";
  if (after.capabilities.length === 0) {
    return [
      customEntry(
        target,
        "Capabilities",
        `Reverted to inherited capabilities (${inherited})`,
        beforeNames,
        "",
      ),
    ];
  }
  if (before.capabilities.length === 0) {
    return [
      customEntry(
        target,
        "Capabilities",
        `Overrode inherited capabilities (${inherited}) with ${afterNames}`,
        "",
        afterNames,
      ),
    ];
  }
  return [
    customEntry(
      target,
      "Capabilities",
      `Capability override changed from ${beforeNames} to ${afterNames}`,
      beforeNames,
      afterNames,
    ),
  ];
}
