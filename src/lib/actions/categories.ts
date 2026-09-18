"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { categorySchema } from "@/lib/validation";
import { createdEntry, deletedEntry, diffEntity, writeChangeLog } from "@/lib/changelog";
import { parseOrThrow, run, ValidationError } from "./shared";

const FIELDS = [
  { field: "key" as const, label: "Key" },
  { field: "name" as const, label: "Name" },
  { field: "description" as const, label: "Description" },
  { field: "color" as const, label: "Colour" },
  { field: "sortOrder" as const, label: "Sort order" },
];

function revalidate() {
  revalidatePath("/", "layout");
}

export async function createCategory(input: unknown) {
  return run(async () => {
    const data = parseOrThrow(categorySchema, input);
    const category = await prisma.$transaction(async (tx) => {
      const created = await tx.category.create({ data });
      await writeChangeLog(tx, [
        createdEntry(
          { entityType: "Category", entityId: created.id, entityRef: created.key, entityName: created.name },
          `Category "${created.name}" created`,
        ),
      ]);
      return created;
    });
    revalidate();
    return category.id;
  });
}

export async function updateCategory(id: string, input: unknown) {
  return run(async () => {
    const data = parseOrThrow(categorySchema, input);
    await prisma.$transaction(async (tx) => {
      const before = await tx.category.findUnique({ where: { id } });
      if (!before) throw new ValidationError("Category not found");
      // Domain keys do not appear in requirement references -- those come from the
      // journey key -- so renaming one is safe.
      const after = await tx.category.update({ where: { id }, data });
      await writeChangeLog(
        tx,
        diffEntity(
          { entityType: "Category", entityId: id, entityRef: after.key, entityName: after.name },
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

export async function deleteCategory(id: string) {
  return run(async () => {
    await prisma.$transaction(async (tx) => {
      const category = await tx.category.findUnique({
        where: { id },
        include: { _count: { select: { journeys: true } } },
      });
      if (!category) throw new ValidationError("Category not found");
      if (category._count.journeys > 0) {
        throw new ValidationError(
          `"${category.name}" still holds ${category._count.journeys} journey document(s). Move or delete them first.`,
        );
      }
      await tx.category.delete({ where: { id } });
      await writeChangeLog(tx, [
        deletedEntry(
          { entityType: "Category", entityId: id, entityRef: category.key, entityName: category.name },
          `Category "${category.name}" deleted`,
        ),
      ]);
    });
    revalidate();
    return id;
  });
}
