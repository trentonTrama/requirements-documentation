"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { commentSchema } from "@/lib/validation";
import { parseOrThrow, run, ValidationError } from "./shared";
import { resolveTargetPages } from "./targets";

function revalidate(pages: { journeyId: string | null; requirementId: string | null }) {
  revalidatePath("/", "layout");
  if (pages.requirementId) revalidatePath(`/requirements/${pages.requirementId}`);
  if (pages.journeyId) revalidatePath(`/journeys/${pages.journeyId}`);
}

export async function createComment(input: unknown) {
  return run(async () => {
    const data = parseOrThrow(commentSchema, input);
    const comment = await prisma.comment.create({
      data: {
        body: data.body,
        authorName: data.authorName,
        journeyId: data.journeyId ?? null,
        requirementId: data.requirementId ?? null,
        acceptanceCriterionId: data.acceptanceCriterionId ?? null,
      },
    });
    revalidate(await resolveTargetPages(prisma, comment));
    return comment.id;
  });
}

export async function updateComment(id: string, body: string) {
  return run(async () => {
    const trimmed = body.trim();
    if (!trimmed) throw new ValidationError("Comment cannot be empty");
    const comment = await prisma.comment.update({ where: { id }, data: { body: trimmed } });
    revalidate(await resolveTargetPages(prisma, comment));
    return comment.id;
  });
}

export async function deleteComment(id: string) {
  return run(async () => {
    const comment = await prisma.comment.delete({ where: { id } });
    revalidate(await resolveTargetPages(prisma, comment));
    return id;
  });
}
