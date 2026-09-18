"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { answerQuestionSchema, questionSchema, questionStatusSchema } from "@/lib/validation";
import { parseOrThrow, run, ValidationError } from "./shared";
import { resolveTargetRequirement } from "./targets";

function revalidate(requirementId: string | null) {
  revalidatePath("/", "layout");
  revalidatePath("/questions");
  if (requirementId) revalidatePath(`/requirements/${requirementId}`);
}

export async function createQuestion(input: unknown) {
  return run(async () => {
    const data = parseOrThrow(questionSchema, input);
    const question = await prisma.question.create({
      data: {
        body: data.body,
        askedBy: data.askedBy,
        assignee: data.assignee?.trim() || null,
        requirementId: data.requirementId ?? null,
        acceptanceCriterionId: data.acceptanceCriterionId ?? null,
      },
    });
    revalidate(await resolveTargetRequirement(prisma, question));
    return question.id;
  });
}

export async function updateQuestion(id: string, body: string, assignee?: string | null) {
  return run(async () => {
    const trimmed = body.trim();
    if (!trimmed) throw new ValidationError("Question cannot be empty");
    const question = await prisma.question.update({
      where: { id },
      data: { body: trimmed, assignee: assignee?.trim() || null },
    });
    revalidate(await resolveTargetRequirement(prisma, question));
    return question.id;
  });
}

export async function answerQuestion(input: unknown) {
  return run(async () => {
    const data = parseOrThrow(answerQuestionSchema, input);
    const question = await prisma.question.update({
      where: { id: data.id },
      data: {
        answer: data.answer,
        answeredBy: data.answeredBy,
        answeredAt: new Date(),
        status: "ANSWERED",
      },
    });
    revalidate(await resolveTargetRequirement(prisma, question));
    return question.id;
  });
}

export async function setQuestionStatus(input: unknown) {
  return run(async () => {
    const data = parseOrThrow(questionStatusSchema, input);
    const status = data.status;
    const question = await prisma.question.update({
      where: { id: data.id },
      data:
        status === "ANSWERED"
          ? { status }
          : // Reopening or deferring clears the answer metadata so the record
            // does not claim to be answered while sitting in another state.
            { status, answer: null, answeredBy: null, answeredAt: null },
    });
    revalidate(await resolveTargetRequirement(prisma, question));
    return question.id;
  });
}

export async function deleteQuestion(id: string) {
  return run(async () => {
    const question = await prisma.question.delete({ where: { id } });
    revalidate(await resolveTargetRequirement(prisma, question));
    return id;
  });
}
