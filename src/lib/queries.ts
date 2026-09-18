import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { resolveCriterionCapabilities, resolveRequirementCapabilities } from "./capabilities";
import { journeysInProject, requirementsInProject } from "./projects";

export const capabilitySelect = {
  id: true,
  key: true,
  name: true,
  color: true,
} satisfies Prisma.CapabilitySelect;

export const projectSelect = {
  id: true,
  key: true,
  slug: true,
  name: true,
  color: true,
  status: true,
} satisfies Prisma.ProjectSelect;

const criterionInclude = {
  capabilities: { select: capabilitySelect },
  comments: { orderBy: { createdAt: "asc" as const } },
  questions: { orderBy: { createdAt: "desc" as const } },
} satisfies Prisma.AcceptanceCriterionInclude;

export const journeySummarySelect = {
  id: true,
  slug: true,
  key: true,
  title: true,
  side: true,
  categoryId: true,
  capabilities: { select: capabilitySelect },
  projects: { select: projectSelect },
  category: {
    select: { id: true, key: true, name: true, color: true, projects: { select: projectSelect } },
  },
} satisfies Prisma.JourneySelect;

export const requirementDetailInclude = {
  journey: { select: journeySummarySelect },
  capabilities: { select: capabilitySelect },
  projects: { select: projectSelect },
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
  journey: { select: journeySummarySelect },
  capabilities: { select: capabilitySelect },
  projects: { select: projectSelect },
  acceptanceCriteria: {
    orderBy: { sortOrder: "asc" as const },
    select: { id: true, capabilities: { select: capabilitySelect } },
  },
  _count: { select: { acceptanceCriteria: true, comments: true, questions: true } },
} satisfies Prisma.FunctionalRequirementInclude;

export type RequirementDetail = Prisma.FunctionalRequirementGetPayload<{
  include: typeof requirementDetailInclude;
}>;

export type RequirementListItem = Prisma.FunctionalRequirementGetPayload<{
  include: typeof requirementListInclude;
}>;

export type JourneySummary = Prisma.JourneyGetPayload<{ select: typeof journeySummarySelect }>;

export const REQUIREMENT_ORDER: Prisma.FunctionalRequirementOrderByWithRelationInput[] = [
  { journey: { category: { sortOrder: "asc" } } },
  { journey: { sortOrder: "asc" } },
  { sectionOrder: "asc" },
  { sortOrder: "asc" },
];

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
    orderBy: REQUIREMENT_ORDER,
  });
}

export function listCategories() {
  return prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      projects: { select: projectSelect },
      _count: { select: { journeys: true } },
      journeys: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, side: true, _count: { select: { requirements: true } } },
      },
    },
  });
}

export function listCapabilities() {
  return prisma.capability.findMany({
    orderBy: { name: "asc" },
    include: {
      roles: { select: { id: true, key: true, name: true, color: true } },
      _count: {
        select: { journeys: true, requirements: true, acceptanceCriteria: true, roles: true },
      },
    },
  });
}

export type CapabilityListItem = Awaited<ReturnType<typeof listCapabilities>>[number];

/** Roles with the capabilities they grant -- a role is nothing else. */
export function listRoles() {
  return prisma.role.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: { capabilities: { select: capabilitySelect } },
  });
}

export type RoleListItem = Awaited<ReturnType<typeof listRoles>>[number];

export function getRole(id: string) {
  return prisma.role.findUnique({
    where: { id },
    include: { capabilities: { select: capabilitySelect } },
  });
}

/** Journeys grouped for the index page, with the counts that make them worth opening. */
export async function listJourneys() {
  const journeys = await prisma.journey.findMany({
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    include: {
      category: { include: { projects: { select: projectSelect } } },
      capabilities: { select: capabilitySelect },
      projects: { select: projectSelect },
      _count: { select: { requirements: true, archiveItems: true, notes: true } },
    },
  });

  const [decisionCounts, openQuestionCounts] = await Promise.all([
    prisma.functionalRequirement.groupBy({
      by: ["journeyId"],
      where: { decisionRequired: true },
      _count: true,
    }),
    prisma.question.groupBy({
      by: ["journeyId"],
      where: { status: "OPEN", journeyId: { not: null } },
      _count: true,
    }),
  ]);

  const decisions = new Map(decisionCounts.map((row) => [row.journeyId, row._count]));
  const openQuestions = new Map(openQuestionCounts.map((row) => [row.journeyId, row._count]));

  return journeys.map((journey) => ({
    ...journey,
    decisionRequiredCount: decisions.get(journey.id) ?? 0,
    openQuestionCount: openQuestions.get(journey.id) ?? 0,
  }));
}

export const journeyDetailInclude = {
  category: { include: { projects: { select: projectSelect } } },
  capabilities: { select: capabilitySelect },
  projects: { select: projectSelect },
  additionalUserStories: { orderBy: { sortOrder: "asc" as const } },
  notes: { orderBy: [{ kind: "asc" as const }, { sortOrder: "asc" as const }] },
  archiveItems: { orderBy: { sortOrder: "asc" as const } },
  comments: { orderBy: { createdAt: "asc" as const } },
  questions: { orderBy: [{ status: "asc" as const }, { createdAt: "asc" as const }] },
  requirements: {
    orderBy: [{ sectionOrder: "asc" as const }, { sortOrder: "asc" as const }],
    include: {
      capabilities: { select: capabilitySelect },
      projects: { select: projectSelect },
      acceptanceCriteria: {
        orderBy: { sortOrder: "asc" as const },
        include: { capabilities: { select: capabilitySelect } },
      },
      _count: { select: { comments: true, questions: true } },
    },
  },
} satisfies Prisma.JourneyInclude;

export type JourneyDetail = Prisma.JourneyGetPayload<{ include: typeof journeyDetailInclude }>;
export type JourneyRequirement = JourneyDetail["requirements"][number];

/** Find a journey by its cuid or its slug, so document slugs work as URLs. */
export function getJourney(idOrSlug: string) {
  return prisma.journey.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: journeyDetailInclude,
  });
}

/** Requirements in document order, bucketed into the sections they were written in. */
export function groupBySection(requirements: JourneyRequirement[]) {
  const sections: {
    name: string;
    stateSpecific: boolean;
    changeClass: JourneyRequirement["changeClass"];
    requirements: JourneyRequirement[];
  }[] = [];

  for (const requirement of requirements) {
    const current = sections.at(-1);
    if (current && current.name === requirement.section) {
      current.requirements.push(requirement);
      continue;
    }
    sections.push({
      name: requirement.section,
      stateSpecific: requirement.sectionStateSpecific,
      changeClass: requirement.changeClass,
      requirements: [requirement],
    });
  }

  return sections;
}

export const questionTargetInclude = {
  journey: { select: { id: true, slug: true, title: true, side: true, key: true } },
  requirement: {
    select: {
      id: true,
      ref: true,
      title: true,
      journey: { select: { id: true, slug: true, title: true, key: true } },
    },
  },
  acceptanceCriterion: {
    select: {
      id: true,
      ref: true,
      statement: true,
      requirement: {
        select: {
          id: true,
          ref: true,
          title: true,
          journey: { select: { id: true, slug: true, title: true, key: true } },
        },
      },
    },
  },
} satisfies Prisma.QuestionInclude;

export type QuestionWithTarget = Prisma.QuestionGetPayload<{ include: typeof questionTargetInclude }>;

export function listQuestions(where: Prisma.QuestionWhereInput = {}) {
  return prisma.question.findMany({
    where,
    include: questionTargetInclude,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export function recentChanges(take = 15) {
  return prisma.changeLogEntry.findMany({ orderBy: { createdAt: "desc" }, take });
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

export function entityChanges(entityType: string, entityId: string) {
  return prisma.changeLogEntry.findMany({
    where: { entityType, entityId },
    orderBy: { createdAt: "desc" },
  });
}

/**
 * Everything a set of capabilities touches: journeys assigned directly,
 * requirements that resolve to any of them, and criteria that resolve to any of
 * them -- each tagged with whether it got there by inheritance or by declaring an
 * override.
 *
 * Pass one capability id for a capability's own page, or a role's whole granted
 * set for a role's page: a role's coverage is exactly the union of what its
 * capabilities reach, so both pages come from the same query.
 */
export async function capabilityCoverage(capabilityIds: string[]) {
  if (capabilityIds.length === 0) return [];
  const wanted = new Set(capabilityIds);
  const matches = (list: { id: string }[]) => list.some((entry) => wanted.has(entry.id));

  const journeys = await prisma.journey.findMany({
    where: {
      OR: [
        { capabilities: { some: { id: { in: capabilityIds } } } },
        { requirements: { some: { capabilities: { some: { id: { in: capabilityIds } } } } } },
      ],
    },
    include: {
      category: true,
      capabilities: { select: capabilitySelect },
      requirements: {
        orderBy: [{ sectionOrder: "asc" }, { sortOrder: "asc" }],
        include: {
          capabilities: { select: capabilitySelect },
          acceptanceCriteria: {
            orderBy: { sortOrder: "asc" },
            include: { capabilities: { select: capabilitySelect } },
          },
        },
      },
    },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
  });

  return journeys
    .map((journey) => {
      const direct = matches(journey.capabilities);
      const requirements = journey.requirements
        .map((requirement) => {
          const resolved = resolveRequirementCapabilities(requirement, journey);
          if (!matches(resolved.capabilities)) return null;
          const criteria = requirement.acceptanceCriteria.filter((criterion) =>
            matches(
              resolveCriterionCapabilities(criterion, { capabilities: resolved.capabilities })
                .capabilities,
            ),
          );
          return { requirement, source: resolved.source, criteriaCount: criteria.length };
        })
        .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

      return { journey, direct, requirements };
    })
    .filter((entry) => entry.direct || entry.requirements.length > 0);
}

/** Projects with the rollup the index page needs: members, and what they reach. */
export async function listProjects() {
  const projects = await prisma.project.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      categories: { select: { id: true, key: true, name: true, color: true } },
      journeys: { select: { id: true, key: true, title: true, side: true } },
      _count: { select: { categories: true, journeys: true, requirements: true } },
    },
  });

  // Counted through the membership rule rather than from _count, which only sees
  // requirements added directly.
  return Promise.all(
    projects.map(async (project) => ({
      ...project,
      requirementCount: await prisma.functionalRequirement.count({
        where: requirementsInProject(project.id),
      }),
      openQuestionCount: await prisma.question.count({
        where: {
          status: "OPEN",
          OR: [
            { journey: journeysInProject(project.id) },
            { requirement: requirementsInProject(project.id) },
            { acceptanceCriterion: { requirement: requirementsInProject(project.id) } },
          ],
        },
      }),
    })),
  );
}

export type ProjectListItem = Awaited<ReturnType<typeof listProjects>>[number];

/** Find a project by its cuid or its slug, so project slugs work as URLs. */
export function getProject(idOrSlug: string) {
  return prisma.project.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: {
      categories: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, key: true, name: true, color: true, _count: { select: { journeys: true } } },
      },
      journeys: {
        orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
        select: {
          id: true,
          slug: true,
          key: true,
          title: true,
          side: true,
          category: { select: { id: true, key: true, name: true, color: true } },
          _count: { select: { requirements: true } },
        },
      },
      requirements: {
        orderBy: REQUIREMENT_ORDER,
        include: requirementListInclude,
      },
    },
  });
}

export type ProjectDetail = NonNullable<Awaited<ReturnType<typeof getProject>>>;

/**
 * Everything the project reaches, at every membership level, with the status and
 * priority mix -- the numbers a project page is actually opened for.
 */
export async function projectRollup(projectId: string) {
  const where = requirementsInProject(projectId);
  const [requirements, byStatus, byPriority, decisionRequired, openQuestions, criteria] =
    await Promise.all([
      prisma.functionalRequirement.count({ where }),
      prisma.functionalRequirement.groupBy({ by: ["status"], where, _count: true }),
      prisma.functionalRequirement.groupBy({ by: ["priority"], where, _count: true }),
      prisma.functionalRequirement.count({ where: { ...where, decisionRequired: true } }),
      prisma.question.count({
        where: {
          status: "OPEN",
          OR: [
            { journey: journeysInProject(projectId) },
            { requirement: where },
            { acceptanceCriterion: { requirement: where } },
          ],
        },
      }),
      prisma.acceptanceCriterion.count({ where: { requirement: where } }),
    ]);

  return {
    requirements,
    criteria,
    decisionRequired,
    openQuestions,
    byStatus: Object.fromEntries(byStatus.map((row) => [row.status, row._count])),
    byPriority: Object.fromEntries(byPriority.map((row) => [row.priority, row._count])),
  };
}

/** Requirements a project reaches, each tagged with how it got there. */
export function listProjectRequirements(projectId: string) {
  return prisma.functionalRequirement.findMany({
    where: requirementsInProject(projectId),
    include: requirementListInclude,
    orderBy: REQUIREMENT_ORDER,
  });
}
