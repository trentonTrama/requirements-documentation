import type {
  ChangeClass,
  JourneySide,
  LinkType,
  Priority,
  QuestionStatus,
  RequirementStatus,
} from "@prisma/client";
import {
  CHANGE_CLASS_LABELS,
  JOURNEY_SIDE_LABELS,
  JOURNEY_SIDE_STYLES,
  LINK_TYPE_LABELS,
  PRIORITY_LABELS,
  PRIORITY_STYLES,
  QUESTION_STATUS_LABELS,
  QUESTION_STATUS_STYLES,
  STATUS_LABELS,
  STATUS_STYLES,
  personaColorClass,
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

export function PersonaBadge({
  persona,
  muted,
}: {
  persona: { name: string; color: string };
  muted?: boolean;
}) {
  return (
    <span
      className={cn(
        base,
        muted ? "bg-white text-slate-500 italic ring-slate-200 ring-dashed" : personaColorClass(persona.color),
      )}
    >
      {persona.name}
    </span>
  );
}

export function CategoryBadge({ category }: { category: { key: string; name: string; color: string } }) {
  return (
    <span className={cn(base, personaColorClass(category.color))} title={category.name}>
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
