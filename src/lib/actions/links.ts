"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { linkSchema } from "@/lib/validation";
import { customEntry, writeChangeLog } from "@/lib/changelog";
import { LINK_TYPE_LABELS } from "@/lib/constants";
import { parseOrThrow, run, ValidationError } from "./shared";

export async function createLink(input: unknown) {
  return run(async () => {
    const data = parseOrThrow(linkSchema, input);
    const link = await prisma.$transaction(async (tx) => {
      const [from, to] = await Promise.all([
        tx.functionalRequirement.findUnique({ where: { id: data.fromRequirementId } }),
        tx.functionalRequirement.findUnique({ where: { id: data.toRequirementId } }),
      ]);
      if (!from || !to) throw new ValidationError("Both requirements must exist");

      const created = await tx.requirementLink.create({
        data: {
          fromRequirementId: from.id,
          toRequirementId: to.id,
          type: data.type,
        },
      });
      await writeChangeLog(tx, [
        customEntry(
          { entityType: "Requirement", entityId: from.id, entityRef: from.ref, entityName: from.title },
          "Link",
          `${from.ref} ${LINK_TYPE_LABELS[data.type].toLowerCase()} ${to.ref}`,
          "",
          to.ref,
        ),
      ]);
      return created;
    });
    revalidatePath("/", "layout");
    revalidatePath(`/requirements/${link.fromRequirementId}`);
    revalidatePath(`/requirements/${link.toRequirementId}`);
    return link.id;
  });
}

export async function deleteLink(id: string) {
  return run(async () => {
    const link = await prisma.requirementLink.delete({ where: { id } });
    revalidatePath("/", "layout");
    revalidatePath(`/requirements/${link.fromRequirementId}`);
    revalidatePath(`/requirements/${link.toRequirementId}`);
    return id;
  });
}
