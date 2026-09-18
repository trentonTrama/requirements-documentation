import { z } from "zod";
import { LinkType, Priority, QuestionStatus, RequirementStatus } from "@prisma/client";
import { PERSONA_COLORS } from "./constants";

const trimmed = (max: number) => z.string().trim().max(max);
const required = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

export const keySchema = z
  .string()
  .trim()
  .min(2, "Key must be at least 2 characters")
  .max(12, "Key must be 12 characters or fewer")
  .regex(/^[A-Z0-9]+$/, "Key must be uppercase letters and digits only");

export const personaSchema = z.object({
  key: keySchema,
  name: required("Name", 120),
  description: trimmed(2000).default(""),
  goals: trimmed(2000).default(""),
  painPoints: trimmed(2000).default(""),
  color: z.enum(PERSONA_COLORS).default("slate"),
});

export const categorySchema = z.object({
  key: keySchema,
  name: required("Name", 120),
  description: trimmed(2000).default(""),
  color: z.enum(PERSONA_COLORS).default("slate"),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const requirementSchema = z.object({
  title: required("Title", 200),
  description: trimmed(8000).default(""),
  rationale: trimmed(4000).default(""),
  assumptions: trimmed(4000).default(""),
  status: z.nativeEnum(RequirementStatus).default("DRAFT"),
  priority: z.nativeEnum(Priority).default("SHOULD"),
  categoryId: required("Category", 40),
  personaIds: z.array(z.string()).default([]),
});

export const criterionSchema = z.object({
  requirementId: required("Requirement", 40),
  statement: required("Statement", 2000),
  notes: trimmed(4000).default(""),
  /**
   * Empty means "inherit from the requirement". A non-empty list overrides.
   * Callers that want to revert to inheritance send an empty array.
   */
  personaIds: z.array(z.string()).default([]),
});

export const commentSchema = z
  .object({
    body: required("Comment", 4000),
    authorName: trimmed(80).default("").transform((v) => v || "Anonymous"),
    requirementId: z.string().optional().nullable(),
    acceptanceCriterionId: z.string().optional().nullable(),
  })
  .refine(exactlyOneTarget, {
    message: "A comment must attach to exactly one requirement or acceptance criterion",
  });

export const questionSchema = z
  .object({
    body: required("Question", 4000),
    askedBy: trimmed(80).default("").transform((v) => v || "Anonymous"),
    assignee: trimmed(80).optional().nullable(),
    requirementId: z.string().optional().nullable(),
    acceptanceCriterionId: z.string().optional().nullable(),
  })
  .refine(exactlyOneTarget, {
    message: "A question must attach to exactly one requirement or acceptance criterion",
  });

export const answerQuestionSchema = z.object({
  id: required("Question", 40),
  answer: required("Answer", 4000),
  answeredBy: trimmed(80).default("").transform((v) => v || "Anonymous"),
});

export const questionStatusSchema = z.object({
  id: required("Question", 40),
  status: z.nativeEnum(QuestionStatus),
});

export const linkSchema = z
  .object({
    fromRequirementId: required("Requirement", 40),
    toRequirementId: required("Target requirement", 40),
    type: z.nativeEnum(LinkType).default("RELATES_TO"),
  })
  .refine((v) => v.fromRequirementId !== v.toRequirementId, {
    message: "A requirement cannot link to itself",
  });

/**
 * Comments and questions hang off exactly one parent. SQLite cannot add a CHECK
 * constraint after the fact, so this refinement (shared by forms and actions) is
 * where the invariant is enforced.
 */
function exactlyOneTarget(value: {
  requirementId?: string | null;
  acceptanceCriterionId?: string | null;
}) {
  return Boolean(value.requirementId) !== Boolean(value.acceptanceCriterionId);
}

export type PersonaInput = z.input<typeof personaSchema>;
export type CategoryInput = z.input<typeof categorySchema>;
export type RequirementInput = z.input<typeof requirementSchema>;
export type CriterionInput = z.input<typeof criterionSchema>;
