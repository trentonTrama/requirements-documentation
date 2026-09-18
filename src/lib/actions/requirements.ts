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
import { PRIORITY_LABELS, STATUS_LABELS } from "@/lib/constants";
import { parseOrThrow, run, ValidationError } from "./shared";

const FIELDS = [
  { field: "title" as const, label: "Title" },
  { field: "description" as const, label: "Description" },
  { field: "rationale" as const, label: "Rationale" },
  { field: "assumptions" as const, label: "Assumptions" },
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
];

function revalidate(id?: string) {
  revalidatePath("/", "layout");
  if (id) revalidatePath(`/requirements/${id}`);
}

export async function createRequirement(input: unknown) {
  return run(async () => {
    const data = parseOrThrow(requirementSchema, input);
    const requirement = await prisma.$transaction(async (tx) => {
      const category = await tx.category.findUnique({ where: { id: data.categoryId } });
      if (!category) throw new ValidationError("Category not found");

      const ref = await nextRequirementRef(tx, category.key);
      const created = await tx.functionalRequirement.create({
        data: {
          ref,
          title: data.title,
          description: data.description,
          rationale: data.rationale,
          assumptions: data.assumptions,
          status: data.status,
          priority: data.priority,
          categoryId: data.categoryId,
          personas: { connect: data.personaIds.map((personaId) => ({ id: personaId })) },
        },
        include: { personas: true },
      });

      await writeChangeLog(tx, [
        createdEntry(
          { entityType: "Requirement", entityId: created.id, entityRef: ref, entityName: created.title },
          `${ref} created in ${category.name}`,
        ),
      ]);
      return created;
    });
    revalidate(requirement.id);
    return requirement.id;
  });
}

export async function updateRequirement(id: string, input: unknown) {
  return run(async () => {
    const data = parseOrThrow(requirementSchema, input);
    await prisma.$transaction(async (tx) => {
      const before = await tx.functionalRequirement.findUnique({
        where: { id },
        include: { personas: true, category: true },
      });
      if (!before) throw new ValidationError("Requirement not found");

      const category = await tx.category.findUnique({ where: { id: data.categoryId } });
      if (!category) throw new ValidationError("Category not found");

      const after = await tx.functionalRequirement.update({
        where: { id },
        data: {
          title: data.title,
          description: data.description,
          rationale: data.rationale,
          assumptions: data.assumptions,
          status: data.status,
          priority: data.priority,
          categoryId: data.categoryId,
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
      const entries = diffEntity(target, before, data, FIELDS);

      if (before.categoryId !== data.categoryId) {
        entries.push(
          customEntry(
            target,
            "Category",
            // The ref is deliberately left alone -- it is the stable identifier.
            `Moved from ${before.category.name} to ${category.name} (reference ${before.ref} unchanged)`,
            before.category.name,
            category.name,
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
            `Personas changed from ${beforePersonas || "(none)"} to ${afterPersonas || "(none)"}`,
            beforePersonas,
            afterPersonas,
          ),
        );
      }

      await writeChangeLog(tx, entries);
    });
    revalidate(id);
    return id;
  });
}

export async function deleteRequirement(id: string) {
  return run(async () => {
    await prisma.$transaction(async (tx) => {
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
          `${requirement.ref} "${requirement.title}" deleted with its acceptance criteria and discussion`,
        ),
      ]);
    });
    revalidate();
    return id;
  });
}
