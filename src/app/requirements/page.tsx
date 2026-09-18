import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { listCategories, listPersonas, listRequirements } from "@/lib/queries";
import { resolveCriterionPersonas } from "@/lib/personas";
import { Button, Card, EmptyState } from "@/components/ui";
import { CategoryBadge, PriorityBadge, RefTag, StatusBadge } from "@/components/badges";
import { PersonaChips } from "@/components/persona-chips";
import { RequirementFilters } from "./filters";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  category?: string;
  status?: string;
  priority?: string;
  persona?: string;
  q?: string;
}>;

export default async function RequirementsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const [categories, personas] = await Promise.all([listCategories(), listPersonas()]);

  const where: Prisma.FunctionalRequirementWhereInput = {};
  if (params.category) where.categoryId = params.category;
  if (params.status) where.status = params.status as Prisma.EnumRequirementStatusFilter["equals"];
  if (params.priority) where.priority = params.priority as Prisma.EnumPriorityFilter["equals"];
  if (params.q) {
    where.OR = [
      { title: { contains: params.q } },
      { description: { contains: params.q } },
      { ref: { contains: params.q } },
    ];
  }

  let requirements = await listRequirements(where);

  // Persona filtering resolves inheritance, so a requirement matches when the
  // persona is on the requirement itself or on any criterion after resolution.
  if (params.persona) {
    const personaId = params.persona;
    requirements = requirements.filter(
      (requirement) =>
        requirement.personas.some((p) => p.id === personaId) ||
        requirement.acceptanceCriteria.some((criterion) =>
          resolveCriterionPersonas(criterion, requirement).personas.some((p) => p.id === personaId),
        ),
    );
  }

  const grouped = new Map<string, typeof requirements>();
  for (const requirement of requirements) {
    const key = requirement.category.id;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(requirement);
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">Requirements</h1>
          <p className="mt-1 text-sm text-slate-500">
            {requirements.length} requirement{requirements.length === 1 ? "" : "s"}
          </p>
        </div>
        <Link href="/requirements/new">
          <Button>New requirement</Button>
        </Link>
      </header>

      <RequirementFilters categories={categories} personas={personas} />

      {requirements.length === 0 ? (
        <EmptyState
          title="No requirements match these filters"
          hint="Clear the filters, or create a new requirement."
        />
      ) : (
        <div className="space-y-6">
          {[...grouped.entries()].map(([categoryId, items]) => (
            <section key={categoryId} className="space-y-2">
              <div className="flex items-center gap-2">
                <CategoryBadge category={items[0].category} />
                <span className="text-xs text-slate-400">{items.length}</span>
              </div>
              <Card className="divide-y divide-slate-100">
                {items.map((requirement) => {
                  const overrides = requirement.acceptanceCriteria.filter(
                    (criterion) => criterion.personas.length > 0,
                  ).length;
                  return (
                    <Link
                      key={requirement.id}
                      href={`/requirements/${requirement.id}`}
                      className="block px-4 py-3 hover:bg-slate-50"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <RefTag value={requirement.ref} />
                        <span className="text-sm font-medium text-slate-900">{requirement.title}</span>
                        <StatusBadge status={requirement.status} />
                        <PriorityBadge priority={requirement.priority} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                        <PersonaChips personas={requirement.personas} showSource={false} />
                        <span className="text-[11px] text-slate-400">
                          {requirement._count.acceptanceCriteria} criteria
                          {overrides > 0 ? ` · ${overrides} with persona overrides` : ""} ·{" "}
                          {requirement._count.comments} comments · {requirement._count.questions} questions
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
