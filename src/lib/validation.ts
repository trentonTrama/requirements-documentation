import { z } from "zod";
import {
  CapabilityAction,
  ChangeClass,
  JourneySide,
  LinkType,
  NoteKind,
  Priority,
  ProjectStatus,
  QuestionStatus,
  RequirementStatus,
} from "@prisma/client";
import { BADGE_COLORS } from "./constants";

const trimmed = (max: number) => z.string().trim().max(max);
const required = (label: string, max: number) =>
  z.string().trim().min(1, `${label} is required`).max(max, `${label} is too long`);

/**
 * Short handles. Journey and domain keys are letters and digits because they end
 * up inside requirement references (FR-BED-001); capability, role and project
 * keys do not, so they may also use underscores to stay readable as constants
 * (POLICY_VIEW, SERVICING_UPDATE).
 */
export const keySchema = z
  .string()
  .trim()
  .min(2, "Key must be at least 2 characters")
  .max(12, "Key must be 12 characters or fewer")
  .regex(/^[A-Z0-9]+$/, "Key must be uppercase letters and digits only");

export const constantKeySchema = z
  .string()
  .trim()
  .min(2, "Key must be at least 2 characters")
  .max(32, "Key must be 32 characters or fewer")
  .regex(/^[A-Z0-9_]+$/, "Key must be uppercase letters, digits and underscores only");

export const capabilitySchema = z.object({
  key: constantKeySchema,
  name: required("Name", 120),
  description: trimmed(2000).default(""),
  resource: trimmed(200).default(""),
  action: z.nativeEnum(CapabilityAction).default("VIEW"),
  color: z.enum(BADGE_COLORS).default("slate"),
});

export const roleSchema = z.object({
  key: constantKeySchema,
  name: required("Name", 120),
  description: trimmed(2000).default(""),
  goals: trimmed(2000).default(""),
  painPoints: trimmed(2000).default(""),
  color: z.enum(BADGE_COLORS).default("slate"),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  /** The whole configuration of a role: what it is allowed to do. */
  capabilityIds: z.array(z.string()).default([]),
});

export const projectSchema = z.object({
  key: constantKeySchema,
  slug: z
    .string()
    .trim()
    .min(2, "Slug is required")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, digits and hyphens"),
  name: required("Name", 160),
  description: trimmed(4000).default(""),
  status: z.nativeEnum(ProjectStatus).default("ACTIVE"),
  color: z.enum(BADGE_COLORS).default("slate"),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  startsOn: z.string().trim().optional().nullable(),
  targetDate: z.string().trim().optional().nullable(),
});

/** Membership edits: a project collects domains, journeys and single requirements. */
export const projectMembersSchema = z.object({
  categoryIds: z.array(z.string()).default([]),
  journeyIds: z.array(z.string()).default([]),
  requirementIds: z.array(z.string()).default([]),
});

export const categorySchema = z.object({
  key: keySchema,
  name: required("Name", 120),
  description: trimmed(2000).default(""),
  color: z.enum(BADGE_COLORS).default("slate"),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
});

export const journeySchema = z.object({
  slug: z
    .string()
    .trim()
    .min(2, "Slug is required")
    .max(80)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, digits and hyphens"),
  key: keySchema,
  title: required("Title", 200),
  side: z.nativeEnum(JourneySide).default("READ"),
  categoryId: required("Domain", 40),
  statusNote: trimmed(2000).default(""),
  author: trimmed(120).default(""),
  primarySource: trimmed(2000).default(""),
  docFile: trimmed(400).default(""),
  asA: trimmed(200).default(""),
  iWant: trimmed(1000).default(""),
  soThat: trimmed(1000).default(""),
  covers: trimmed(4000).default(""),
  notCovered: trimmed(4000).default(""),
  draftedOn: z.string().trim().optional().nullable(),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  capabilityIds: z.array(z.string()).default([]),
});

/**
 * The two lists a journey document carries alongside its requirements: the
 * decisions and technical notes kept as written, and the archive items
 * deliberately not carried into it. Both hang off exactly one journey.
 */
export const journeyNoteSchema = z.object({
  journeyId: required("Journey", 40),
  kind: z.nativeEnum(NoteKind),
  body: required("Note", 4000),
});

export const archiveItemSchema = z.object({
  journeyId: required("Journey", 40),
  item: required("Item", 2000),
  source: trimmed(400).default(""),
  disposition: trimmed(2000).default(""),
});

export const requirementSchema = z.object({
  title: required("Title", 400),
  description: trimmed(8000).default(""),
  rationale: trimmed(4000).default(""),
  assumptions: trimmed(4000).default(""),
  sourceNotes: trimmed(8000).default(""),
  status: z.nativeEnum(RequirementStatus).default("DRAFT"),
  priority: z.nativeEnum(Priority).default("SHOULD"),
  journeyId: required("Journey", 40),
  section: trimmed(200).default(""),
  sectionOrder: z.coerce.number().int().min(0).max(999).default(0),
  sectionStateSpecific: z.boolean().default(false),
  changeClass: z.nativeEnum(ChangeClass).nullish(),
  decisionRequired: z.boolean().default(false),
  stateSpecific: z.boolean().default(false),
  /** Empty means "inherit from the journey". A non-empty list overrides. */
  capabilityIds: z.array(z.string()).default([]),
});

export const criterionSchema = z.object({
  requirementId: required("Requirement", 40),
  statement: required("Statement", 4000),
  notes: trimmed(4000).default(""),
  /**
   * Empty means "inherit from the requirement". A non-empty list overrides.
   * Callers that want to revert to inheritance send an empty array.
   */
  capabilityIds: z.array(z.string()).default([]),
});

export const commentSchema = z
  .object({
    body: required("Comment", 4000),
    authorName: trimmed(80).default("").transform((v) => v || "Anonymous"),
    journeyId: z.string().optional().nullable(),
    requirementId: z.string().optional().nullable(),
    acceptanceCriterionId: z.string().optional().nullable(),
  })
  .refine(exactlyOneTarget, {
    message: "A comment must attach to exactly one journey, requirement or acceptance criterion",
  });

export const questionSchema = z
  .object({
    body: required("Question", 4000),
    askedBy: trimmed(80).default("").transform((v) => v || "Anonymous"),
    assignee: trimmed(80).optional().nullable(),
    journeyId: z.string().optional().nullable(),
    requirementId: z.string().optional().nullable(),
    acceptanceCriterionId: z.string().optional().nullable(),
  })
  .refine(exactlyOneTarget, {
    message: "A question must attach to exactly one journey, requirement or acceptance criterion",
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
 * Comments and questions hang off exactly one parent -- a journey, a requirement
 * or an acceptance criterion. SQLite cannot add a CHECK constraint after the
 * fact, so this refinement (shared by forms and actions) is where the invariant
 * is enforced.
 */
function exactlyOneTarget(value: {
  journeyId?: string | null;
  requirementId?: string | null;
  acceptanceCriterionId?: string | null;
}) {
  const targets = [value.journeyId, value.requirementId, value.acceptanceCriterionId];
  return targets.filter(Boolean).length === 1;
}

export type JourneyInput = z.input<typeof journeySchema>;
export type JourneyNoteInput = z.input<typeof journeyNoteSchema>;
export type ArchiveItemInput = z.input<typeof archiveItemSchema>;
export type CapabilityInput = z.input<typeof capabilitySchema>;
export type RoleInput = z.input<typeof roleSchema>;
export type ProjectInput = z.input<typeof projectSchema>;
export type CategoryInput = z.input<typeof categorySchema>;
export type RequirementInput = z.input<typeof requirementSchema>;
export type CriterionInput = z.input<typeof criterionSchema>;
