import type { Prisma } from "@prisma/client";

/**
 * Reference keys are stable identifiers: assigned once at creation and never
 * rewritten. Counters are monotonic per prefix, so deleting FR-BIL-003 does not
 * free the number for reuse.
 */

export function formatRequirementRef(categoryKey: string, value: number) {
  return `FR-${categoryKey}-${String(value).padStart(3, "0")}`;
}

export function formatCriterionRef(requirementRef: string, value: number) {
  return `${requirementRef}.AC-${String(value).padStart(2, "0")}`;
}

type Tx = Prisma.TransactionClient;

async function takeNext(tx: Tx, prefix: string) {
  const counter = await tx.refCounter.upsert({
    where: { prefix },
    create: { prefix, nextValue: 2 },
    update: { nextValue: { increment: 1 } },
    select: { nextValue: true },
  });
  // upsert returns the post-update value, so an update yields the next free
  // number + 1; a create yields 2. Either way the number we just claimed is one less.
  return counter.nextValue - 1;
}

export async function nextRequirementRef(tx: Tx, categoryKey: string) {
  const value = await takeNext(tx, `FR-${categoryKey}`);
  return formatRequirementRef(categoryKey, value);
}

export async function nextCriterionRef(tx: Tx, requirementRef: string) {
  const value = await takeNext(tx, `${requirementRef}.AC`);
  return formatCriterionRef(requirementRef, value);
}
