import type {
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

export const JOURNEY_SIDES: JourneySide[] = ["READ", "WRITE"];

export const CHANGE_CLASSES: ChangeClass[] = ["POLICY_CHANGE", "SERVICING_UPDATE", "CONTAINER"];

export const CAPABILITY_ACTIONS: CapabilityAction[] = [
  "VIEW",
  "CREATE",
  "UPDATE",
  "DELETE",
  "APPROVE",
];

export const PROJECT_STATUSES: ProjectStatus[] = ["PLANNED", "ACTIVE", "PAUSED", "COMPLETE"];

/** The verb half of a capability, as it reads in a sentence about the holder. */
export const CAPABILITY_ACTION_LABELS: Record<CapabilityAction, string> = {
  VIEW: "View",
  CREATE: "Create",
  UPDATE: "Update",
  DELETE: "Delete",
  APPROVE: "Approve",
};

export const CAPABILITY_ACTION_STYLES: Record<CapabilityAction, string> = {
  VIEW: "bg-sky-100 text-sky-800 ring-sky-200",
  CREATE: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  UPDATE: "bg-amber-100 text-amber-800 ring-amber-200",
  DELETE: "bg-rose-100 text-rose-800 ring-rose-200",
  APPROVE: "bg-violet-100 text-violet-800 ring-violet-200",
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  PLANNED: "Planned",
  ACTIVE: "Active",
  PAUSED: "Paused",
  COMPLETE: "Complete",
};

export const PROJECT_STATUS_STYLES: Record<ProjectStatus, string> = {
  PLANNED: "bg-slate-100 text-slate-700 ring-slate-200",
  ACTIVE: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  PAUSED: "bg-amber-100 text-amber-800 ring-amber-200",
  COMPLETE: "bg-sky-100 text-sky-800 ring-sky-200",
};

export const JOURNEY_SIDE_LABELS: Record<JourneySide, string> = {
  READ: "Read",
  WRITE: "Write",
};

export const JOURNEY_SIDE_STYLES: Record<JourneySide, string> = {
  READ: "bg-sky-100 text-sky-800 ring-sky-200",
  WRITE: "bg-violet-100 text-violet-800 ring-violet-200",
};

export const CHANGE_CLASS_LABELS: Record<ChangeClass, string> = {
  POLICY_CHANGE: "Policy change",
  SERVICING_UPDATE: "Servicing update",
  CONTAINER: "Container",
};

export const NOTE_KIND_LABELS: Record<NoteKind, string> = {
  DECISION: "Decisions carried forward",
  TECHNICAL: "Technical notes",
};

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

/** One palette, shared by capabilities, roles, projects and domains. */
export const BADGE_COLORS = [
  "slate",
  "rose",
  "amber",
  "emerald",
  "sky",
  "violet",
  "fuchsia",
  "teal",
] as const;

export type BadgeColor = (typeof BADGE_COLORS)[number];

export const BADGE_COLOR_STYLES: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  rose: "bg-rose-100 text-rose-700 ring-rose-200",
  amber: "bg-amber-100 text-amber-800 ring-amber-200",
  emerald: "bg-emerald-100 text-emerald-700 ring-emerald-200",
  sky: "bg-sky-100 text-sky-700 ring-sky-200",
  violet: "bg-violet-100 text-violet-700 ring-violet-200",
  fuchsia: "bg-fuchsia-100 text-fuchsia-700 ring-fuchsia-200",
  teal: "bg-teal-100 text-teal-700 ring-teal-200",
};

export function badgeColorClass(color: string) {
  return BADGE_COLOR_STYLES[color] ?? BADGE_COLOR_STYLES.slate;
}
