"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { archiveItemSchema } from "@/lib/validation";
import { customEntry, diffEntity, writeChangeLog } from "@/lib/changelog";
import { parseOrThrow, run, ValidationError } from "./shared";

/**
 * An archive item records something from the archive deliberately left out of
 * this document, and where it went instead. Like notes, it has no reference of
 * its own, so its history is recorded against the journey.
 */
const FIELDS = [
  { field: "item" as const, label: "Archive item" },
  { field: "source" as const, label: "Archive item source" },
  { field: "disposition" as const, label: "Archive item disposition" },
];

function revalidate(journeyId: string, slug?: string) {
  revalidatePath("/", "layout");
  revalidatePath(`/journeys/${journeyId}`);
  if (slug) revalidatePath(`/journeys/${slug}`);
}

function journeyTarget(journey: { id: string; key: string; title: string }) {
  return {
    entityType: "Journey",
    entityId: journey.id,
    entityRef: journey.key,
    entityName: journey.title,
  };
}

function excerpt(item: string) {
  return item.length > 80 ? `${item.slice(0, 77)}…` : item;
}

export async function createArchiveItem(input: unknown) {
  return run(async () => {
    const data = parseOrThrow(archiveItemSchema, input);
    const journey = await prisma.$transaction(async (tx) => {
      const found = await tx.journey.findUnique({ where: { id: data.journeyId } });
      if (!found) throw new ValidationError("Journey not found");

      const last = await tx.archiveItem.findFirst({
        where: { journeyId: found.id },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      await tx.archiveItem.create({
        data: {
          journeyId: found.id,
          item: data.item,
          source: data.source,
          disposition: data.disposition,
          sortOrder: (last?.sortOrder ?? -1) + 1,
        },
      });

      await writeChangeLog(tx, [
        customEntry(
          journeyTarget(found),
          "Archive item",
          `Archive item recorded as not carried: "${excerpt(data.item)}"`,
          "",
          data.item,
        ),
      ]);
      return found;
    });
    revalidate(journey.id, journey.slug);
    return journey.id;
  });
}

export async function updateArchiveItem(id: string, input: unknown) {
  return run(async () => {
    const data = parseOrThrow(archiveItemSchema, input);
    const journey = await prisma.$transaction(async (tx) => {
      const before = await tx.archiveItem.findUnique({ where: { id }, include: { journey: true } });
      if (!before) throw new ValidationError("Archive item not found");
      if (before.journeyId !== data.journeyId) {
        throw new ValidationError("Archive item belongs to another journey");
      }

      await tx.archiveItem.update({
        where: { id },
        data: { item: data.item, source: data.source, disposition: data.disposition },
      });
      await writeChangeLog(tx, diffEntity(journeyTarget(before.journey), before, data, FIELDS));
      return before.journey;
    });
    revalidate(journey.id, journey.slug);
    return id;
  });
}

export async function deleteArchiveItem(id: string) {
  return run(async () => {
    const journey = await prisma.$transaction(async (tx) => {
      const entry = await tx.archiveItem.findUnique({ where: { id }, include: { journey: true } });
      if (!entry) throw new ValidationError("Archive item not found");

      await tx.archiveItem.delete({ where: { id } });
      await writeChangeLog(tx, [
        customEntry(
          journeyTarget(entry.journey),
          "Archive item",
          `Archive item removed: "${excerpt(entry.item)}"`,
          entry.item,
          "",
        ),
      ]);
      return entry.journey;
    });
    revalidate(journey.id, journey.slug);
    return id;
  });
}

export async function reorderArchiveItems(journeyId: string, orderedIds: string[]) {
  return run(async () => {
    const journey = await prisma.journey.findUnique({ where: { id: journeyId } });
    if (!journey) throw new ValidationError("Journey not found");
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.archiveItem.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );
    revalidate(journey.id, journey.slug);
    return journeyId;
  });
}
