"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { capabilitySchema } from "@/lib/validation";
import { createdEntry, deletedEntry, diffEntity, writeChangeLog } from "@/lib/changelog";
import { CAPABILITY_ACTION_LABELS } from "@/lib/constants";
import { parseOrThrow, run, ValidationError } from "./shared";

const FIELDS = [
  { field: "key" as const, label: "Key" },
  { field: "name" as const, label: "Name" },
  { field: "description" as const, label: "Description" },
  { field: "resource" as const, label: "Resource" },
  {
    field: "action" as const,
    label: "Action",
    format: (v: unknown) =>
      CAPABILITY_ACTION_LABELS[v as keyof typeof CAPABILITY_ACTION_LABELS] ?? String(v ?? ""),
  },
  { field: "color" as const, label: "Colour" },
];

function revalidate() {
  revalidatePath("/", "layout");
}

export async function createCapability(input: unknown) {
  return run(async () => {
    const data = parseOrThrow(capabilitySchema, input);
    const capability = await prisma.$transaction(async (tx) => {
      const created = await tx.capability.create({ data });
      await writeChangeLog(tx, [
        createdEntry(
          {
            entityType: "Capability",
            entityId: created.id,
            entityRef: created.key,
            entityName: created.name,
          },
          `Capability "${created.name}" created`,
        ),
      ]);
      return created;
    });
    revalidate();
    return capability.id;
  });
}

export async function updateCapability(id: string, input: unknown) {
  return run(async () => {
    const data = parseOrThrow(capabilitySchema, input);
    await prisma.$transaction(async (tx) => {
      const before = await tx.capability.findUnique({ where: { id } });
      if (!before) throw new ValidationError("Capability not found");
      const after = await tx.capability.update({ where: { id }, data });
      await writeChangeLog(
        tx,
        diffEntity(
          { entityType: "Capability", entityId: id, entityRef: after.key, entityName: after.name },
          before,
          data,
          FIELDS,
        ),
      );
    });
    revalidate();
    return id;
  });
}

export async function deleteCapability(id: string) {
  return run(async () => {
    await prisma.$transaction(async (tx) => {
      const capability = await tx.capability.findUnique({
        where: { id },
        include: { _count: { select: { roles: true } } },
      });
      if (!capability) throw new ValidationError("Capability not found");
      // Prisma clears the implicit join rows for us; journeys, requirements and
      // criteria survive, they just lose the assignment, and any role granting it
      // simply stops granting it.
      await tx.capability.delete({ where: { id } });
      await writeChangeLog(tx, [
        deletedEntry(
          {
            entityType: "Capability",
            entityId: id,
            entityRef: capability.key,
            entityName: capability.name,
          },
          `Capability "${capability.name}" deleted, removing it from ${capability._count.roles} role(s)`,
        ),
      ]);
    });
    revalidate();
    return id;
  });
}
