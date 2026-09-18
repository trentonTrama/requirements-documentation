"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { roleSchema } from "@/lib/validation";
import {
  createdEntry,
  customEntry,
  deletedEntry,
  diffEntity,
  nameList,
  writeChangeLog,
} from "@/lib/changelog";
import { parseOrThrow, run, ValidationError } from "./shared";

const FIELDS = [
  { field: "key" as const, label: "Key" },
  { field: "name" as const, label: "Name" },
  { field: "description" as const, label: "Description" },
  { field: "goals" as const, label: "Goals" },
  { field: "painPoints" as const, label: "Pain points" },
  { field: "color" as const, label: "Colour" },
  { field: "sortOrder" as const, label: "Sort order" },
];

function revalidate(id?: string) {
  revalidatePath("/", "layout");
  if (id) revalidatePath(`/roles/${id}`);
}

/** Strip the relation the database does not store as a column. */
function toRecord(data: ReturnType<typeof parse>) {
  const { capabilityIds, ...rest } = data;
  return rest;
}

function parse(input: unknown) {
  return parseOrThrow(roleSchema, input);
}

export async function createRole(input: unknown) {
  return run(async () => {
    const data = parse(input);
    const role = await prisma.$transaction(async (tx) => {
      const created = await tx.role.create({
        data: {
          ...toRecord(data),
          capabilities: { connect: data.capabilityIds.map((id) => ({ id })) },
        },
        include: { capabilities: true },
      });
      await writeChangeLog(tx, [
        createdEntry(
          { entityType: "Role", entityId: created.id, entityRef: created.key, entityName: created.name },
          `Role "${created.name}" created granting ${nameList(created.capabilities) || "no capabilities"}`,
        ),
      ]);
      return created;
    });
    revalidate(role.id);
    return role.id;
  });
}

export async function updateRole(id: string, input: unknown) {
  return run(async () => {
    const data = parse(input);
    await prisma.$transaction(async (tx) => {
      const before = await tx.role.findUnique({ where: { id }, include: { capabilities: true } });
      if (!before) throw new ValidationError("Role not found");

      const after = await tx.role.update({
        where: { id },
        data: {
          ...toRecord(data),
          // `set` replaces the whole grant in one statement.
          capabilities: { set: data.capabilityIds.map((capabilityId) => ({ id: capabilityId })) },
        },
        include: { capabilities: true },
      });

      const target = { entityType: "Role", entityId: id, entityRef: after.key, entityName: after.name };
      const entries = diffEntity(target, before, toRecord(data), FIELDS);

      const beforeCapabilities = nameList(before.capabilities);
      const afterCapabilities = nameList(after.capabilities);
      if (beforeCapabilities !== afterCapabilities) {
        entries.push(
          customEntry(
            target,
            "Capabilities",
            // Coverage is derived, so this one edit changes every requirement the
            // role reaches without touching a requirement.
            `Capabilities changed from ${beforeCapabilities || "(none)"} to ${afterCapabilities || "(none)"}`,
            beforeCapabilities,
            afterCapabilities,
          ),
        );
      }

      await writeChangeLog(tx, entries);
    });
    revalidate(id);
    return id;
  });
}

/** Grant or revoke a single capability, for the one-click controls on a role page. */
export async function setRoleCapabilities(id: string, capabilityIds: string[]) {
  return run(async () => {
    await prisma.$transaction(async (tx) => {
      const before = await tx.role.findUnique({ where: { id }, include: { capabilities: true } });
      if (!before) throw new ValidationError("Role not found");

      const after = await tx.role.update({
        where: { id },
        data: { capabilities: { set: capabilityIds.map((capabilityId) => ({ id: capabilityId })) } },
        include: { capabilities: true },
      });

      const beforeNames = nameList(before.capabilities);
      const afterNames = nameList(after.capabilities);
      if (beforeNames === afterNames) return;

      await writeChangeLog(tx, [
        customEntry(
          { entityType: "Role", entityId: id, entityRef: after.key, entityName: after.name },
          "Capabilities",
          `Capabilities changed from ${beforeNames || "(none)"} to ${afterNames || "(none)"}`,
          beforeNames,
          afterNames,
        ),
      ]);
    });
    revalidate(id);
    return id;
  });
}

export async function deleteRole(id: string) {
  return run(async () => {
    await prisma.$transaction(async (tx) => {
      const role = await tx.role.findUnique({ where: { id } });
      if (!role) throw new ValidationError("Role not found");
      // Nothing in the document tree points at a role, so this only drops the
      // capability grant.
      await tx.role.delete({ where: { id } });
      await writeChangeLog(tx, [
        deletedEntry(
          { entityType: "Role", entityId: id, entityRef: role.key, entityName: role.name },
          `Role "${role.name}" deleted`,
        ),
      ]);
    });
    revalidate();
    return id;
  });
}
