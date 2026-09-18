import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { listCapabilities, listProjects, listRequirements, listRoles } from "@/lib/queries";
import { resolveCriterionCapabilities, resolveRequirementCapabilities } from "@/lib/capabilities";
import { grantedCapabilityIds } from "@/lib/roles";
import { requirementsInProject } from "@/lib/projects";
import { Button, Card, EmptyState } from "@/components/ui";
import {
  CategoryBadge,
  DecisionRequiredBadge,
  PriorityBadge,
  RefTag,
  SideBadge,
  StateSpecificBadge,
  StatusBadge,
} from "@/components/badges";
import { CapabilityChips } from "@/components/capability-chips";
import { RequirementFilters } from "./filters";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  journey?: string;
  category?: string;
  side?: string;
  status?: string;
  priority?: string;
  capability?: string;
  role?: string;
  project?: string;
  decision?: string;
  state?: string;
  q?: string;
}>;

export default async function RequirementsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const [journeys, capabilities, roles, projects] = await Promise.all([
    prisma.journey.findMany({
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      select: { id: true, title: true, key: true, side: true, category: { select: { name: true } } },
    }),
    listCapabilities(),
    listRoles(),
    listProjects(),
  ]);

  const where: Prisma.FunctionalRequirementWhereInput = {};
  const journeyWhere: Prisma.JourneyWhereInput = {};
  if (params.journey) where.journeyId = params.journey;
  if (params.category) journeyWhere.categoryId = params.category;
  if (params.side) journeyWhere.side = params.side as Prisma.EnumJourneySideFilter["equals"];
  if (Object.keys(journeyWhere).length > 0) where.journey = journeyWhere;
  if (params.status) where.status = params.status as Prisma.EnumRequirementStatusFilter["equals"];
  if (params.priority) where.priority = params.priority as Prisma.EnumPriorityFilter["equals"];
  // Project membership is a rule rather than a column, so it comes in as a
  // pre-built clause covering all three levels.
  if (params.project) where.AND = [requirementsInProject(params.project)];
  if (params.decision === "1") where.decisionRequired = true;
  if (params.state === "1") where.stateSpecific = true;
  if (params.q) {
    where.OR = [
      { title: { contains: params.q } },
      { description: { contains: params.q } },
      { sourceNotes: { contains: params.q } },
      { ref: { contains: params.q } },
      { acceptanceCriteria: { some: { statement: { contains: params.q } } } },
    ];
  }

  let requirements = await listRequirements(where);

  // Capability filtering resolves inheritance, so a requirement matches when the
  // capability reaches it through its journey, its own override, or any criterion.
  // Filtering by role is the same test over everything that role grants -- a role
  // is never stored on a requirement.
  const wanted = capabilityFilter(params, roles);
  if (wanted) {
    requirements = requirements.filter((requirement) => {
      const resolved = resolveRequirementCapabilities(requirement, requirement.journey);
      if (resolved.capabilities.some((c) => wanted.has(c.id))) return true;
      return requirement.acceptanceCriteria.some((criterion) =>
        resolveCriterionCapabilities(criterion, {
          capabilities: resolved.capabilities,
        }).capabilities.some((c) => wanted.has(c.id)),
      );
    });
  }

  const grouped = new Map<string, typeof requirements>();
  for (const requirement of requirements) {
    const key = requirement.journeyId;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(requirement);
  }

  const decisionCount = requirements.filter((r) => r.decisionRequired).length;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Requirements</h1>
          <p className="mt-1 text-sm text-slate-500">
            {requirements.length} requirement{requirements.length === 1 ? "" : "s"}
            {decisionCount > 0 ? ` · ${decisionCount} awaiting a decision` : ""}
          </p>
        </div>
        <Link href="/requirements/new">
          <Button>New requirement</Button>
        </Link>
      </header>

      <RequirementFilters
        journeys={journeys}
        capabilities={capabilities}
        roles={roles}
        projects={projects}
      />

      {requirements.length === 0 ? (
        <EmptyState
          title="No requirements match these filters"
          hint="Clear the filters, or create a new requirement."
        />
      ) : (
        <div className="space-y-6">
          {[...grouped.values()].map((items) => {
            const journey = items[0].journey;
            return (
              <section key={journey.id} className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/journeys/${journey.slug}`} className="flex items-center gap-2 hover:underline">
                    <RefTag value={journey.key} />
                    <span className="text-sm font-medium text-slate-800">{journey.title}</span>
                  </Link>
                  <SideBadge side={journey.side} />
                  <CategoryBadge category={journey.category} />
                  <span className="text-xs text-slate-400">{items.length}</span>
                </div>
                <Card className="divide-y divide-slate-100">
                  {items.map((requirement) => {
                    const resolved = resolveRequirementCapabilities(requirement, requirement.journey);
                    return (
                      <Link
                        key={requirement.id}
                        href={`/requirements/${requirement.id}`}
                        className="block px-4 py-3 hover:bg-slate-50"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <RefTag value={requirement.ref} />
                          <span className="text-sm font-medium text-slate-900">{requirement.title}</span>
                          {requirement.decisionRequired ? <DecisionRequiredBadge /> : null}
                          {requirement.stateSpecific ? <StateSpecificBadge /> : null}
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                          <CapabilityChips capabilities={resolved.capabilities} source={resolved.source} />
                          <StatusBadge status={requirement.status} />
                          <PriorityBadge priority={requirement.priority} />
                          <span className="text-[11px] text-slate-400">
                            {requirement.section ? `${requirement.section} · ` : ""}
                            {requirement._count.acceptanceCriteria} criteria ·{" "}
                            {requirement._count.comments} comments · {requirement._count.questions}{" "}
                            questions
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </Card>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * The capability ids a filter selection stands for: the capability itself, or
 * everything the chosen role grants. Null when neither filter is set.
 */
function capabilityFilter(
  params: { capability?: string; role?: string },
  roles: { id: string; capabilities: { id: string }[] }[],
) {
  if (params.capability) return new Set([params.capability]);
  if (!params.role) return null;
  const role = roles.find((candidate) => candidate.id === params.role);
  return role ? grantedCapabilityIds(role) : new Set<string>();
}
