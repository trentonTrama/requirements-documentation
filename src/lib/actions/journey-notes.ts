"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { journeyNoteSchema } from "@/lib/validation";
import { customEntry, diffEntity, writeChangeLog } from "@/lib/changelog";
import { NOTE_KIND_LABELS } from "@/lib/constants";
import { parseOrThrow, run, ValidationError } from "./shared";

/**
 * Notes are kept as written and have no reference of their own, so their history
 * is recorded against the document they belong to -- that is where a reader
 * looking for "when did this decision arrive" will be.
 */
const FIELDS = [
  { field: "body" as const, label: "Note" },
  {
    field: "kind" as const,
    label: "Note list",
    format: (v: unknown) => NOTE_KIND_LABELS[v as keyof typeof NOTE_KIND_LABELS] ?? String(v ?? ""),
  },
];

function revalidate(journeyId: string, slug?: string) {
  revalidatePath("/", "layout");
  revalidatePath(`/journeys/${journeyId}`);
  if (slug) revalidatePath(`/journeys/${slug}`);
}

/** Journeys are the change-history target for their own notes. */
function journeyTarget(journey: { id: string; key: string; title: string }) {
  return {
    entityType: "Journey",
    entityId: journey.id,
    entityRef: journey.key,
    entityName: journey.title,
  };
}

function excerpt(body: string) {
  return body.length > 80 ? `${body.slice(0, 77)}…` : body;
}

export async function createJourneyNote(input: unknown) {
  return run(async () => {
    const data = parseOrThrow(journeyNoteSchema, input);
    const journey = await prisma.$transaction(async (tx) => {
      const found = await tx.journey.findUnique({ where: { id: data.journeyId } });
      if (!found) throw new ValidationError("Journey not found");

      const last = await tx.journeyNote.findFirst({
        where: { journeyId: found.id, kind: data.kind },
        orderBy: { sortOrder: "desc" },
        select: { sortOrder: true },
      });
      await tx.journeyNote.create({
        data: {
          journeyId: found.id,
          kind: data.kind,
          body: data.body,
          sortOrder: (last?.sortOrder ?? -1) + 1,
        },
      });

      await writeChangeLog(tx, [
        customEntry(
          journeyTarget(found),
          NOTE_KIND_LABELS[data.kind],
          `Added to ${NOTE_KIND_LABELS[data.kind].toLowerCase()}: "${excerpt(data.body)}"`,
          "",
          data.body,
        ),
      ]);
      return found;
    });
    revalidate(journey.id, journey.slug);
    return journey.id;
  });
}

export async function updateJourneyNote(id: string, input: unknown) {
  return run(async () => {
    const data = parseOrThrow(journeyNoteSchema, input);
    const journey = await prisma.$transaction(async (tx) => {
      const before = await tx.journeyNote.findUnique({ where: { id }, include: { journey: true } });
      if (!before) throw new ValidationError("Note not found");
      if (before.journeyId !== data.journeyId) throw new ValidationError("Note belongs to another journey");

      await tx.journeyNote.update({
        where: { id },
        data: { kind: data.kind, body: data.body },
      });
      await writeChangeLog(tx, diffEntity(journeyTarget(before.journey), before, data, FIELDS));
      return before.journey;
    });
    revalidate(journey.id, journey.slug);
    return id;
  });
}

export async function deleteJourneyNote(id: string) {
  return run(async () => {
    const journey = await prisma.$transaction(async (tx) => {
      const note = await tx.journeyNote.findUnique({ where: { id }, include: { journey: true } });
      if (!note) throw new ValidationError("Note not found");

      await tx.journeyNote.delete({ where: { id } });
      await writeChangeLog(tx, [
        customEntry(
          journeyTarget(note.journey),
          NOTE_KIND_LABELS[note.kind],
          `Removed from ${NOTE_KIND_LABELS[note.kind].toLowerCase()}: "${excerpt(note.body)}"`,
          note.body,
          "",
        ),
      ]);
      return note.journey;
    });
    revalidate(journey.id, journey.slug);
    return id;
  });
}

/** Position within the list; the document's order is part of how it reads. */
export async function reorderJourneyNotes(journeyId: string, orderedIds: string[]) {
  return run(async () => {
    const journey = await prisma.journey.findUnique({ where: { id: journeyId } });
    if (!journey) throw new ValidationError("Journey not found");
    await prisma.$transaction(
      orderedIds.map((id, index) =>
        prisma.journeyNote.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );
    revalidate(journey.id, journey.slug);
    return journeyId;
  });
}
