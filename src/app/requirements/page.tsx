import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { listPersonas, listRequirements } from "@/lib/queries";
import { resolveCriterionPersonas, resolveRequirementPersonas } from "@/lib/personas";
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
import { PersonaChips } from "@/components/persona-chips";
import { RequirementFilters } from "./filters";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  journey?: string;
  category?: string;
  side?: string;
  status?: string;
  priority?: string;
  persona?: string;
  decision?: string;
  state?: string;
  q?: string;
}>;

export default async function RequirementsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const [journeys, personas] = await Promise.all([
    prisma.journey.findMany({
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      select: { id: true, title: true, key: true, side: true, category: { select: { name: true } } },
    }),
    listPersonas(),
  ]);

  const where: Prisma.FunctionalRequirementWhereInput = {};
  const journeyWhere: Prisma.JourneyWhereInput = {};
  if (params.journey) where.journeyId = params.journey;
  if (params.category) journeyWhere.categoryId = params.category;
  if (params.side) journeyWhere.side = params.side as Prisma.EnumJourneySideFilter["equals"];
  if (Object.keys(journeyWhere).length > 0) where.journey = journeyWhere;
  if (params.status) where.status = params.status as Prisma.EnumRequirementStatusFilter["equals"];
  if (params.priority) where.priority = params.priority as Prisma.EnumPriorityFilter["equals"];
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

  // Persona filtering resolves inheritance, so a requirement matches when the
  // persona reaches it through its journey, its own override, or any criterion.
  if (params.persona) {
    const personaId = params.persona;
    requirements = requirements.filter((requirement) => {
      const resolved = resolveRequirementPersonas(requirement, requirement.journey);
      if (resolved.personas.some((p) => p.id === personaId)) return true;
      return requirement.acceptanceCriteria.some((criterion) =>
        resolveCriterionPersonas(criterion, { personas: resolved.personas }).personas.some(
          (p) => p.id === personaId,
        ),
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

      <RequirementFilters journeys={journeys} personas={personas} />

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
                    const resolved = resolveRequirementPersonas(requirement, requirement.journey);
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
                          <PersonaChips personas={resolved.personas} source={resolved.source} />
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
