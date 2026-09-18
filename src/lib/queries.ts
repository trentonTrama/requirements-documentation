import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { resolveCriterionPersonas } from "./personas";

export const personaSelect = {
  id: true,
  key: true,
  name: true,
  color: true,
} satisfies Prisma.PersonaSelect;

const criterionInclude = {
  personas: { select: personaSelect },
  comments: { orderBy: { createdAt: "asc" as const } },
  questions: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.AcceptanceCriterionInclude;

export const requirementDetailInclude = {
  category: true,
  personas: { select: personaSelect },
  acceptanceCriteria: {
    orderBy: { sortOrder: "asc" as const },
    include: criterionInclude,
  },
  comments: { orderBy: { createdAt: "asc" as const } },
  questions: { orderBy: { createdAt: "desc" as const } },
  linksFrom: { include: { to: { select: { id: true, ref: true, title: true, status: true } } } },
  linksTo: { include: { from: { select: { id: true, ref: true, title: true, status: true } } } },
} satisfies Prisma.FunctionalRequirementInclude;

export const requirementListInclude = {
  category: true,
  personas: { select: personaSelect },
  acceptanceCriteria: {
    orderBy: { sortOrder: "asc" as const },
    select: { id: true, personas: { select: personaSelect } },
  },
  _count: { select: { acceptanceCriteria: true, comments: true, questions: true } },
} satisfies Prisma.FunctionalRequirementInclude;

export type RequirementDetail = Prisma.FunctionalRequirementGetPayload<{
  include: typeof requirementDetailInclude;
}>;

export type RequirementListItem = Prisma.FunctionalRequirementGetPayload<{
  include: typeof requirementListInclude;
}>;

export type CriterionDetail = RequirementDetail["acceptanceCriteria"][number];

export function getRequirement(id: string) {
  return prisma.functionalRequirement.findUnique({
    where: { id },
    include: requirementDetailInclude,
  });
}

export function listRequirements(where: Prisma.FunctionalRequirementWhereInput = {}) {
  return prisma.functionalRequirement.findMany({
    where,
    include: requirementListInclude,
    orderBy: [{ category: { sortOrder: "asc" } }, { ref: "asc" }],
  });
}

export function listCategories() {
  return prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { requirements: true } } },
  });
}

export function listPersonas() {
  return prisma.persona.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { requirements: true, acceptanceCriteria: true } } },
  });
}

export const openQuestionInclude = {
  requirement: { select: { id: true, ref: true, title: true, category: { select: { name: true } } } },
  acceptanceCriterion: {
    select: {
      id: true,
      ref: true,
      statement: true,
      requirement: { select: { id: true, ref: true, title: true, category: { select: { name: true } } } },
    },
  },
} satisfies Prisma.QuestionInclude;

export type QuestionWithTarget = Prisma.QuestionGetPayload<{ include: typeof openQuestionInclude }>;

export function listQuestions(where: Prisma.QuestionWhereInput = {}) {
  return prisma.question.findMany({
    where,
    include: openQuestionInclude,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export function recentChanges(take = 15) {
  return prisma.changeLogEntry.findMany({ orderBy: { createdAt: "desc" }, take });
}

export function entityChanges(entityType: string, entityId: string) {
  return prisma.changeLogEntry.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "desc" },
  });
}

/** Change history for a requirement plus all of its acceptance criteria. */
export function requirementHistory(requirementId: string, criterionIds: string[]) {
  return prisma.changeLogEntry.findMany({
    where: {
      OR: [
        { entityType: "Requirement", entityId: requirementId },
        { entityType: "AcceptanceCriterion", entityId: { in: criterionIds } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

/**
 * Everything a persona touches: requirements assigned directly, plus criteria
 * that resolve to this persona either by inheritance or by their own override.
 */
export async function personaCoverage(personaId: string) {
  const requirements = await prisma.functionalRequirement.findMany({
    where: {
      OR: [
        { personas: { some: { id: personaId } } },
        { acceptanceCriteria: { some: { personas: { some: { id: personaId } } } } },
      ],
    },
    include: {
      category: true,
      personas: { select: personaSelect },
      acceptanceCriteria: {
        orderBy: { sortOrder: "asc" },
        include: { personas: { select: personaSelect } },
      },
    },
    orderBy: [{ category: { sortOrder: "asc" } }, { ref: "asc" }],
  });

  return requirements
    .map((requirement) => {
      const direct = requirement.personas.some((p) => p.id === personaId);
      const criteria = requirement.acceptanceCriteria
        .map((criterion) => {
          const resolved = resolveCriterionPersonas(criterion, requirement);
          return resolved.personas.some((p) => p.id === personaId)
            ? { criterion, source: resolved.source }
            : null;
        })
        .filter((entry): entry is { criterion: (typeof requirement.acceptanceCriteria)[number]; source: "inherited" | "override" } => entry !== null);
      return { requirement, direct, criteria };
    })
    .filter((entry) => entry.direct || entry.criteria.length > 0);
}
