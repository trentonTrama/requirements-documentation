import type {
  CapabilityAction,
  ChangeClass,
  JourneySide,
  LinkType,
  Priority,
  ProjectStatus,
  QuestionStatus,
  RequirementStatus,
} from "@prisma/client";
import {
  CAPABILITY_ACTION_LABELS,
  CAPABILITY_ACTION_STYLES,
  CHANGE_CLASS_LABELS,
  JOURNEY_SIDE_LABELS,
  JOURNEY_SIDE_STYLES,
  LINK_TYPE_LABELS,
  PRIORITY_LABELS,
  PRIORITY_STYLES,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_STYLES,
  QUESTION_STATUS_LABELS,
  QUESTION_STATUS_STYLES,
  STATUS_LABELS,
  STATUS_STYLES,
  badgeColorClass,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

const base = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset";

export function StatusBadge({ status }: { status: RequirementStatus }) {
  return <span className={cn(base, STATUS_STYLES[status])}>{STATUS_LABELS[status]}</span>;
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return <span className={cn(base, PRIORITY_STYLES[priority])}>{PRIORITY_LABELS[priority]}</span>;
}

export function QuestionStatusBadge({ status }: { status: QuestionStatus }) {
  return (
    <span className={cn(base, QUESTION_STATUS_STYLES[status])}>{QUESTION_STATUS_LABELS[status]}</span>
  );
}

export function LinkTypeBadge({ type, label }: { type: LinkType; label?: string }) {
  return (
    <span className={cn(base, "bg-slate-100 text-slate-600 ring-slate-200")}>
      {label ?? LINK_TYPE_LABELS[type]}
    </span>
  );
}

export function CapabilityBadge({
  capability,
  muted,
}: {
  capability: { name: string; color: string };
  muted?: boolean;
}) {
  return (
    <span
      className={cn(
        base,
        muted
          ? "bg-white text-slate-500 italic ring-slate-200 ring-dashed"
          : badgeColorClass(capability.color),
      )}
    >
      {capability.name}
    </span>
  );
}

/** The verb half of a capability, shown where the resource is already in view. */
export function CapabilityActionBadge({ action }: { action: CapabilityAction }) {
  return (
    <span className={cn(base, CAPABILITY_ACTION_STYLES[action])}>
      {CAPABILITY_ACTION_LABELS[action]}
    </span>
  );
}

/**
 * A role never attaches to a requirement, so its badge says how much of the
 * capability set in view it actually covers.
 */
export function RoleBadge({
  role,
  partial,
}: {
  role: { name: string; color: string };
  partial?: boolean;
}) {
  return (
    <span
      className={cn(base, badgeColorClass(role.color))}
      title={partial ? "Grants some of the capabilities in play" : undefined}
    >
      {role.name}
      {partial ? <span className="ml-1 font-normal opacity-70">partial</span> : null}
    </span>
  );
}

export function ProjectBadge({ project }: { project: { name: string; color: string } }) {
  return <span className={cn(base, badgeColorClass(project.color))}>{project.name}</span>;
}

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return <span className={cn(base, PROJECT_STATUS_STYLES[status])}>{PROJECT_STATUS_LABELS[status]}</span>;
}

export function CategoryBadge({ category }: { category: { key: string; name: string; color: string } }) {
  return (
    <span className={cn(base, badgeColorClass(category.color))} title={category.name}>
      {category.name}
    </span>
  );
}

export function SideBadge({ side }: { side: JourneySide }) {
  return <span className={cn(base, JOURNEY_SIDE_STYLES[side])}>{JOURNEY_SIDE_LABELS[side]}</span>;
}

export function ChangeClassBadge({ value }: { value: ChangeClass }) {
  return (
    <span className={cn(base, "bg-slate-100 text-slate-600 ring-slate-200")}>
      {CHANGE_CLASS_LABELS[value]}
    </span>
  );
}

/** Still awaiting a product or compliance decision. */
export function DecisionRequiredBadge() {
  return (
    <span
      className={cn(base, "bg-orange-100 text-orange-800 ring-orange-200")}
      title="This requirement is still awaiting a decision"
    >
      Decision required
    </span>
  );
}

export function StateSpecificBadge({ section }: { section?: boolean }) {
  return (
    <span
      className={cn(base, "bg-indigo-100 text-indigo-800 ring-indigo-200")}
      title={
        section
          ? "The whole section is state-specific"
          : "This requirement's behaviour varies by state"
      }
    >
      State specific
    </span>
  );
}

export function RefTag({ value }: { value: string }) {
  return (
    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">{value}</span>
  );
}
