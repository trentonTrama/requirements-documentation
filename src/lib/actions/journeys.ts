"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { journeySchema } from "@/lib/validation";
import { createdEntry, deletedEntry, diffEntity, nameList, customEntry, writeChangeLog } from "@/lib/changelog";
import { JOURNEY_SIDE_LABELS } from "@/lib/constants";
import { parseOrThrow, run, ValidationError } from "./shared";

const FIELDS = [
  { field: "title" as const, label: "Title" },
  { field: "key" as const, label: "Key" },
  { field: "slug" as const, label: "Slug" },
  {
    field: "side" as const,
    label: "Side",
    format: (v: unknown) => JOURNEY_SIDE_LABELS[v as keyof typeof JOURNEY_SIDE_LABELS] ?? String(v ?? ""),
  },
  { field: "statusNote" as const, label: "Status" },
  { field: "author" as const, label: "Author" },
  { field: "primarySource" as const, label: "Primary source" },
  { field: "docFile" as const, label: "Document file" },
  { field: "asA" as const, label: "As a" },
  { field: "iWant" as const, label: "I want" },
  { field: "soThat" as const, label: "So that" },
  { field: "covers" as const, label: "Covers" },
  { field: "notCovered" as const, label: "Not covered" },
  { field: "sortOrder" as const, label: "Sort order" },
];

/** Journey pages are reachable by cuid and by slug, so both paths are refreshed. */
function revalidate(id?: string, slug?: string) {
  revalidatePath("/", "layout");
  if (id) revalidatePath(`/journeys/${id}`);
  if (slug) revalidatePath(`/journeys/${slug}`);
}

function toRecord(data: ReturnType<typeof parseData>) {
  const { capabilityIds, draftedOn, ...rest } = data;
  return { ...rest, draftedOn: draftedOn ? new Date(draftedOn) : null };
}

function parseData(input: unknown) {
  return parseOrThrow(journeySchema, input);
}

export async function createJourney(input: unknown) {
  return run(async () => {
    const data = parseData(input);
    const journey = await prisma.$transaction(async (tx) => {
      const category = await tx.category.findUnique({ where: { id: data.categoryId } });
      if (!category) throw new ValidationError("Domain not found");

      const created = await tx.journey.create({
        data: {
          ...toRecord(data),
          capabilities: { connect: data.capabilityIds.map((id) => ({ id })) },
        },
      });
      await writeChangeLog(tx, [
        createdEntry(
          { entityType: "Journey", entityId: created.id, entityRef: created.key, entityName: created.title },
          `Journey "${created.title}" created in ${category.name}`,
        ),
      ]);
      return created;
    });
    revalidate(journey.id, journey.slug);
    return journey.id;
  });
}

export async function updateJourney(id: string, input: unknown) {
  return run(async () => {
    const data = parseData(input);
    const slugs = await prisma.$transaction(async (tx) => {
      const before = await tx.journey.findUnique({
        where: { id },
        include: { capabilities: true, category: true },
      });
      if (!before) throw new ValidationError("Journey not found");

      const category = await tx.category.findUnique({ where: { id: data.categoryId } });
      if (!category) throw new ValidationError("Domain not found");

      const after = await tx.journey.update({
        where: { id },
        data: {
          ...toRecord(data),
          capabilities: { set: data.capabilityIds.map((capabilityId) => ({ id: capabilityId })) },
        },
        include: { capabilities: true },
      });

      const target = {
        entityType: "Journey",
        entityId: id,
        entityRef: after.key,
        entityName: after.title,
      };
      const entries = diffEntity(target, before, toRecord(data), FIELDS);

      if (before.categoryId !== category.id) {
        entries.push(
          customEntry(
            target,
            "Domain",
            `Moved from ${before.category.name} to ${category.name}`,
            before.category.name,
            category.name,
          ),
        );
      }

      const beforeCapabilities = nameList(before.capabilities);
      const afterCapabilities = nameList(after.capabilities);
      if (beforeCapabilities !== afterCapabilities) {
        entries.push(
          customEntry(
            target,
            "Capabilities",
            // Requirements that inherit pick this up immediately; those that override do not.
            `Journey capabilities changed from ${beforeCapabilities || "(none)"} to ${afterCapabilities || "(none)"}`,
            beforeCapabilities,
            afterCapabilities,
          ),
        );
      }

      await writeChangeLog(tx, entries);
      return { slug: before.slug, newSlug: after.slug };
    });
    revalidate(id, slugs.slug);
    if (slugs.newSlug !== slugs.slug) revalidate(undefined, slugs.newSlug);
    return id;
  });
}

export async function deleteJourney(id: string) {
  return run(async () => {
    const slug = await prisma.$transaction(async (tx) => {
      const journey = await tx.journey.findUnique({
        where: { id },
        include: { _count: { select: { requirements: true } } },
      });
      if (!journey) throw new ValidationError("Journey not found");
      // Requirements, their criteria, and the journey's notes and questions cascade.
      await tx.journey.delete({ where: { id } });
      await writeChangeLog(tx, [
        deletedEntry(
          { entityType: "Journey", entityId: id, entityRef: journey.key, entityName: journey.title },
          `Journey "${journey.title}" deleted with its ${journey._count.requirements} requirement(s)`,
        ),
      ]);
      return journey.slug;
    });
    revalidate(id, slug);
    return id;
  });
}
