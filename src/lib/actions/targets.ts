import type { PrismaClient } from "@prisma/client";

export type DiscussionTargetRow = {
  journeyId: string | null;
  requirementId: string | null;
  acceptanceCriterionId: string | null;
};

/**
 * Comments and questions hang off a journey, a requirement or an acceptance
 * criterion. Resolving both ids tells the callers which pages to revalidate.
 */
export async function resolveTargetPages(
  client: PrismaClient,
  target: DiscussionTargetRow,
): Promise<{ journeyId: string | null; requirementId: string | null }> {
  if (target.journeyId) return { journeyId: target.journeyId, requirementId: null };

  if (target.requirementId) {
    const requirement = await client.functionalRequirement.findUnique({
      where: { id: target.requirementId },
      select: { journeyId: true },
    });
    return { journeyId: requirement?.journeyId ?? null, requirementId: target.requirementId };
  }

  if (target.acceptanceCriterionId) {
    const criterion = await client.acceptanceCriterion.findUnique({
      where: { id: target.acceptanceCriterionId },
      select: { requirement: { select: { id: true, journeyId: true } } },
    });
    return {
      journeyId: criterion?.requirement.journeyId ?? null,
      requirementId: criterion?.requirement.id ?? null,
    };
  }

  return { journeyId: null, requirementId: null };
}
