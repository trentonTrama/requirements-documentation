"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { personaSchema } from "@/lib/validation";
import { createdEntry, deletedEntry, diffEntity, writeChangeLog } from "@/lib/changelog";
import { parseOrThrow, run, ValidationError } from "./shared";

const FIELDS = [
  { field: "key" as const, label: "Key" },
  { field: "name" as const, label: "Name" },
  { field: "description" as const, label: "Description" },
  { field: "goals" as const, label: "Goals" },
  { field: "painPoints" as const, label: "Pain points" },
  { field: "color" as const, label: "Colour" },
];

function revalidate() {
  revalidatePath("/", "layout");
}

export async function createPersona(input: unknown) {
  return run(async () => {
    const data = parseOrThrow(personaSchema, input);
    const persona = await prisma.$transaction(async (tx) => {
      const created = await tx.persona.create({ data });
      await writeChangeLog(tx, [
        createdEntry(
          { entityType: "Persona", entityId: created.id, entityRef: created.key, entityName: created.name },
          `Persona "${created.name}" created`,
        ),
      ]);
      return created;
    });
    revalidate();
    return persona.id;
  });
}

export async function updatePersona(id: string, input: unknown) {
  return run(async () => {
    const data = parseOrThrow(personaSchema, input);
    await prisma.$transaction(async (tx) => {
      const before = await tx.persona.findUnique({ where: { id } });
      if (!before) throw new ValidationError("Persona not found");
      const after = await tx.persona.update({ where: { id }, data });
      await writeChangeLog(
        tx,
        diffEntity(
          { entityType: "Persona", entityId: id, entityRef: after.key, entityName: after.name },
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

export async function deletePersona(id: string) {
  return run(async () => {
    await prisma.$transaction(async (tx) => {
      const persona = await tx.persona.findUnique({ where: { id } });
      if (!persona) throw new ValidationError("Persona not found");
      // Prisma clears the implicit join rows for us; requirements and criteria
      // survive, they just lose the assignment.
      await tx.persona.delete({ where: { id } });
      await writeChangeLog(tx, [
        deletedEntry(
          { entityType: "Persona", entityId: id, entityRef: persona.key, entityName: persona.name },
          `Persona "${persona.name}" deleted`,
        ),
      ]);
    });
    revalidate();
    return id;
  });
}
