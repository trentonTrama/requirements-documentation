import type { Prisma } from "@prisma/client";

/**
 * Change history is derived rather than hand-written: mutating actions pass the
 * before/after snapshots through diffEntity, so nobody has to remember to log.
 */

export type FieldSpec<T> = {
  field: keyof T & string;
  label: string;
  /** Render a stored value for display, e.g. resolving a categoryId to a name. */
  format?: (value: unknown) => string;
};

export type ChangeLogTarget = {
  entityType: string;
  entityId: string;
  entityRef?: string;
  entityName?: string;
  authorName?: string;
};

export type ChangeLogDraft = {
  entityType: string;
  entityId: string;
  entityRef: string;
  entityName: string;
  field: string;
  oldValue: string;
  newValue: string;
  summary: string;
  authorName: string;
};

export function diffEntity<T extends Record<string, unknown>>(
  target: ChangeLogTarget,
  before: T,
  after: Partial<T>,
  fields: FieldSpec<T>[],
): ChangeLogDraft[] {
  const drafts: ChangeLogDraft[] = [];
  for (const spec of fields) {
    if (!(spec.field in after)) continue;
    const format = spec.format ?? defaultFormat;
    const oldValue = format(before[spec.field]);
    const newValue = format(after[spec.field]);
    if (oldValue === newValue) continue;
    drafts.push(
      draft(target, {
        field: spec.label,
        oldValue,
        newValue,
        summary: `${spec.label} changed from ${display(oldValue)} to ${display(newValue)}`,
      }),
    );
  }
  return drafts;
}

export function createdEntry(target: ChangeLogTarget, summary: string): ChangeLogDraft {
  return draft(target, { field: "created", oldValue: "", newValue: "", summary });
}

export function deletedEntry(target: ChangeLogTarget, summary: string): ChangeLogDraft {
  return draft(target, { field: "deleted", oldValue: "", newValue: "", summary });
}

export function customEntry(
  target: ChangeLogTarget,
  field: string,
  summary: string,
  oldValue = "",
  newValue = "",
): ChangeLogDraft {
  return draft(target, { field, oldValue, newValue, summary });
}

/** Names, sorted, so persona-set changes read as a stable list rather than id noise. */
export function nameList(items: { name: string }[]) {
  return items
    .map((item) => item.name)
    .sort((a, b) => a.localeCompare(b))
    .join(", ");
}

export async function writeChangeLog(tx: Prisma.TransactionClient, drafts: ChangeLogDraft[]) {
  if (drafts.length === 0) return;
  await tx.changeLogEntry.createMany({ data: drafts });
}

function draft(
  target: ChangeLogTarget,
  parts: { field: string; oldValue: string; newValue: string; summary: string },
): ChangeLogDraft {
  return {
    entityType: target.entityType,
    entityId: target.entityId,
    entityRef: target.entityRef ?? "",
    entityName: target.entityName ?? "",
    authorName: target.authorName || "System",
    ...parts,
  };
}

function defaultFormat(value: unknown) {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function display(value: string) {
  return value === "" ? "(empty)" : `"${value}"`;
}
