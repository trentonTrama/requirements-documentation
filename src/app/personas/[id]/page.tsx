import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { personaCoverage } from "@/lib/queries";
import { Card, EmptyState } from "@/components/ui";
import { CategoryBadge, PriorityBadge, RefTag, StatusBadge } from "@/components/badges";
import { personaColorClass } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function PersonaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const persona = await prisma.persona.findUnique({ where: { id } });
  if (!persona) notFound();

  const coverage = await personaCoverage(persona.id);
  const directCount = coverage.filter((entry) => entry.direct).length;
  const overrideCount = coverage.reduce(
    (total, entry) => total + entry.criteria.filter((c) => c.source === "override").length,
    0,
  );
  const inheritedCount = coverage.reduce(
    (total, entry) => total + entry.criteria.filter((c) => c.source === "inherited").length,
    0,
  );

  return (
    <div className="space-y-6">
      <nav className="text-xs text-slate-400">
        <Link href="/personas" className="hover:underline">
          Personas
        </Link>{" "}
        / {persona.name}
      </nav>

      <header className="space-y-2">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium ring-1 ring-inset ${personaColorClass(persona.color)}`}
        >
          {persona.name}
        </span>
        {persona.description ? <p className="text-sm text-slate-600">{persona.description}</p> : null}
        <p className="text-xs text-slate-500">
          Assigned to {directCount} requirement{directCount === 1 ? "" : "s"} · applies to{" "}
          {inheritedCount} inherited and {overrideCount} overridden acceptance criteria
        </p>
      </header>

      {(persona.goals || persona.painPoints) && (
        <Card className="space-y-3 p-4">
          {persona.goals ? (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Goals</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{persona.goals}</p>
            </div>
          ) : null}
          {persona.painPoints ? (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pain points</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{persona.painPoints}</p>
            </div>
          ) : null}
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Coverage</h2>
        {coverage.length === 0 ? (
          <EmptyState
            title="Nothing assigned yet"
            hint="Assign this persona to a requirement, or override it on a specific acceptance criterion."
          />
        ) : (
          coverage.map(({ requirement, direct, criteria }) => (
            <Card key={requirement.id} className="p-4">
              <Link
                href={`/requirements/${requirement.id}`}
                className="flex flex-wrap items-center gap-2 hover:underline"
              >
                <RefTag value={requirement.ref} />
                <span className="text-sm font-medium text-slate-900">{requirement.title}</span>
                <StatusBadge status={requirement.status} />
                <PriorityBadge priority={requirement.priority} />
                <CategoryBadge category={requirement.category} />
              </Link>
              <p className="mt-1.5 text-[11px] text-slate-400">
                {direct
                  ? "Assigned directly to this requirement"
                  : "Not on the requirement — reaches it through a criterion override"}
              </p>
              {criteria.length > 0 ? (
                <ul className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
                  {criteria.map(({ criterion, source }) => (
                    <li key={criterion.id} className="flex items-start gap-2">
                      <RefTag value={criterion.ref} />
                      <span className="flex-1 text-sm text-slate-700">{criterion.statement}</span>
                      <span
                        className={
                          source === "inherited"
                            ? "text-[11px] uppercase tracking-wide text-slate-400"
                            : "text-[11px] font-semibold uppercase tracking-wide text-violet-600"
                        }
                      >
                        {source}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
