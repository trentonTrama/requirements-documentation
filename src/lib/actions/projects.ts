"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { projectMembersSchema, projectSchema } from "@/lib/validation";
import {
  createdEntry,
  customEntry,
  deletedEntry,
  diffEntity,
  nameList,
  writeChangeLog,
} from "@/lib/changelog";
import { PROJECT_STATUS_LABELS } from "@/lib/constants";
import { parseOrThrow, run, ValidationError } from "./shared";

const FIELDS = [
  { field: "key" as const, label: "Key" },
  { field: "slug" as const, label: "Slug" },
  { field: "name" as const, label: "Name" },
  { field: "description" as const, label: "Description" },
  {
    field: "status" as const,
    label: "Status",
    format: (v: unknown) =>
      PROJECT_STATUS_LABELS[v as keyof typeof PROJECT_STATUS_LABELS] ?? String(v ?? ""),
  },
  { field: "color" as const, label: "Colour" },
  { field: "sortOrder" as const, label: "Sort order" },
  { field: "startsOn" as const, label: "Starts on" },
  { field: "targetDate" as const, label: "Target date" },
];

function revalidate(id?: string) {
  revalidatePath("/", "layout");
  if (id) revalidatePath(`/projects/${id}`);
}

function toRecord(data: ReturnType<typeof parse>) {
  return {
    ...data,
    startsOn: data.startsOn ? new Date(data.startsOn) : null,
    targetDate: data.targetDate ? new Date(data.targetDate) : null,
  };
}

function parse(input: unknown) {
  return parseOrThrow(projectSchema, input);
}

export async function createProject(input: unknown) {
  return run(async () => {
    const data = toRecord(parse(input));
    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({ data });
      await writeChangeLog(tx, [
        createdEntry(
          {
            entityType: "Project",
            entityId: created.id,
            entityRef: created.key,
            entityName: created.name,
          },
          `Project "${created.name}" created`,
        ),
      ]);
      return created;
    });
    revalidate(project.id);
    return project.id;
  });
}

export async function updateProject(id: string, input: unknown) {
  return run(async () => {
    const data = toRecord(parse(input));
    await prisma.$transaction(async (tx) => {
      const before = await tx.project.findUnique({ where: { id } });
      if (!before) throw new ValidationError("Project not found");
      const after = await tx.project.update({ where: { id }, data });
      await writeChangeLog(
        tx,
        diffEntity(
          { entityType: "Project", entityId: id, entityRef: after.key, entityName: after.name },
          before,
          data,
          FIELDS,
        ),
      );
    });
    revalidate(id);
    return id;
  });
}

/**
 * Replace the project's membership at all three levels in one statement. A
 * project collects rather than owns, so nothing is created or deleted here --
 * only which existing records the project reaches.
 */
export async function setProjectMembers(id: string, input: unknown) {
  return run(async () => {
    const data = parseOrThrow(projectMembersSchema, input);
    await prisma.$transaction(async (tx) => {
      const before = await tx.project.findUnique({
        where: { id },
        include: {
          categories: { select: { name: true } },
          journeys: { select: { title: true } },
          requirements: { select: { ref: true } },
        },
      });
      if (!before) throw new ValidationError("Project not found");

      const after = await tx.project.update({
        where: { id },
        data: {
          categories: { set: data.categoryIds.map((categoryId) => ({ id: categoryId })) },
          journeys: { set: data.journeyIds.map((journeyId) => ({ id: journeyId })) },
          requirements: {
            set: data.requirementIds.map((requirementId) => ({ id: requirementId })),
          },
        },
        include: {
          categories: { select: { name: true } },
          journeys: { select: { title: true } },
          requirements: { select: { ref: true } },
        },
      });

      const target = {
        entityType: "Project",
        entityId: id,
        entityRef: after.key,
        entityName: after.name,
      };
      const entries = [
        membershipEntry(target, "Domains", nameList(before.categories), nameList(after.categories)),
        membershipEntry(
          target,
          "Journeys",
          nameList(before.journeys.map((j) => ({ name: j.title }))),
          nameList(after.journeys.map((j) => ({ name: j.title }))),
        ),
        membershipEntry(
          target,
          "Requirements",
          nameList(before.requirements.map((r) => ({ name: r.ref }))),
          nameList(after.requirements.map((r) => ({ name: r.ref }))),
        ),
      ].filter((entry): entry is NonNullable<typeof entry> => entry !== null);

      await writeChangeLog(tx, entries);
    });
    revalidate(id);
    return id;
  });
}

export async function deleteProject(id: string) {
  return run(async () => {
    await prisma.$transaction(async (tx) => {
      const project = await tx.project.findUnique({ where: { id } });
      if (!project) throw new ValidationError("Project not found");
      // Only the collection goes; every domain, journey and requirement it held
      // stays exactly where it was.
      await tx.project.delete({ where: { id } });
      await writeChangeLog(tx, [
        deletedEntry(
          { entityType: "Project", entityId: id, entityRef: project.key, entityName: project.name },
          `Project "${project.name}" deleted; its members were left in place`,
        ),
      ]);
    });
    revalidate();
    return id;
  });
}

function membershipEntry(
  target: Parameters<typeof customEntry>[0],
  level: string,
  before: string,
  after: string,
) {
  if (before === after) return null;
  return customEntry(
    target,
    level,
    `${level} in this project changed from ${before || "(none)"} to ${after || "(none)"}`,
    before,
    after,
  );
}
