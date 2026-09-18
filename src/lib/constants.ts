import type { LinkType, Priority, QuestionStatus, RequirementStatus } from "@prisma/client";

export const REQUIREMENT_STATUSES: RequirementStatus[] = [
  "DRAFT",
  "IN_REVIEW",
  "APPROVED",
  "IMPLEMENTED",
  "DEPRECATED",
];

export const PRIORITIES: Priority[] = ["MUST", "SHOULD", "COULD", "WONT"];

export const QUESTION_STATUSES: QuestionStatus[] = ["OPEN", "ANSWERED", "DEFERRED"];

export const LINK_TYPES: LinkType[] = ["DEPENDS_ON", "RELATES_TO", "CONFLICTS_WITH"];

export const STATUS_LABELS: Record<RequirementStatus, string> = {
  DRAFT: "Draft",
  IN_REVIEW: "In review",
  APPROVED: "Approved",
  IMPLEMENTED: "Implemented",
  DEPRECATED: "Deprecated",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  MUST: "Must have",
  SHOULD: "Should have",
  COULD: "Could have",
  WONT: "Won't have",
};

export const QUESTION_STATUS_LABELS: Record<QuestionStatus, string> = {
  OPEN: "Open",
  ANSWERED: "Answered",
  DEFERRED: "Deferred",
};

export const LINK_TYPE_LABELS: Record<LinkType, string> = {
  DEPENDS_ON: "Depends on",
  RELATES_TO: "Relates to",
  CONFLICTS_WITH: "Conflicts with",
};

/** Label for the inverse direction, used when rendering a link on the target requirement. */
export const LINK_TYPE_INVERSE_LABELS: Record<LinkType, string> = {
  DEPENDS_ON: "Required by",
  RELATES_TO: "Relates to",
  CONFLICTS_WITH: "Conflicts with",
};

export const STATUS_STYLES: Record<RequirementStatus, string> = {
  DRAFT: "bg-slate-100 text-slate-700 ring-slate-200",
  IN_REVIEW: "bg-amber-100 text-amber-800 ring-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  IMPLEMENTED: "bg-sky-100 text-sky-800 ring-sky-200",
  DEPRECATED: "bg-rose-100 text-rose-800 ring-rose-200",
};

export const PRIORITY_STYLES: Record<Priority, string> = {
  MUST: "bg-rose-100 text-rose-800 ring-rose-200",
  SHOULD: "bg-amber-100 text-amber-800 ring-amber-200",
  COULD: "bg-sky-100 text-sky-800 ring-sky-200",
  WONT: "bg-slate-100 text-slate-600 ring-slate-200",
};

export const QUESTION_STATUS_STYLES: Record<QuestionStatus, string> = {
  OPEN: "bg-amber-100 text-amber-800 ring-amber-200",
  ANSWERED: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  DEFERRED: "bg-slate-100 text-slate-600 ring-slate-200",
};

export const PERSONA_COLORS = [
  "slate",
  "rose",
  "amber",
  "emerald",
  "sky",
  "violet",
  "fuchsia",
  "teal",
] as const;

export type PersonaColor = (typeof PERSONA_COLORS)[number];

export const PERSONA_COLOR_STYLES: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  rose: "bg-rose-100 text-rose-700 ring-rose-200",
  amber: "bg-amber-100 text-amber-800 ring-amber-200",
  emerald: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  sky: "bg-sky-100 text-sky-700 ring-sky-200",
  violet: "bg-violet-100 text-violet-700 ring-violet-200",
  fuchsia: "bg-fuchsia-100 text-fuchsia-700 ring-fuchsia-200",
  teal: "bg-teal-100 text-teal-700 ring-teal-200",
};

export function personaColorClass(color: string) {
  return PERSONA_COLOR_STYLES[color] ?? PERSONA_COLOR_STYLES.slate;
}
