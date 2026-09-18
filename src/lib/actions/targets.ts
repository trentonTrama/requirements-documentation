import type { PrismaClient } from "@prisma/client";

/**
 * Comments and questions hang off either a requirement or an acceptance
 * criterion. Both ultimately live on one requirement page, which is what needs
 * revalidating.
 */
export async function resolveTargetRequirement(
  client: PrismaClient,
  target: { requirementId: string | null; acceptanceCriterionId: string | null },
) {
  if (target.requirementId) return target.requirementId;
  if (!target.acceptanceCriterionId) return null;
  const criterion = await client.acceptanceCriterion.findUnique({
    where: { id: target.acceptanceCriterionId },
    select: { requirementId: true },
  });
  return criterion?.requirementId ?? null;
}
