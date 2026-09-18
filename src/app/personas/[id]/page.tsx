import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { personaCoverage } from "@/lib/queries";
import { Card, EmptyState } from "@/components/ui";
import {
  CategoryBadge,
  DecisionRequiredBadge,
  RefTag,
  SideBadge,
  StatusBadge,
} from "@/components/badges";
import { personaColorClass } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function PersonaDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const persona = await prisma.persona.findUnique({ where: { id } });
  if (!persona) notFound();

  const coverage = await personaCoverage(persona.id);
  const directJourneys = coverage.filter((entry) => entry.direct).length;
  const requirements = coverage.flatMap((entry) => entry.requirements);
  const inherited = requirements.filter((r) => r.source === "inherited").length;
  const overridden = requirements.filter((r) => r.source === "override").length;

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
          On {directJourneys} journey{directJourneys === 1 ? "" : "s"} · applies to {inherited}{" "}
          requirements by inheritance and {overridden} by override
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
            hint="Assign this persona to a journey, or override it on a specific requirement."
          />
        ) : (
          coverage.map(({ journey, direct, requirements: rows }) => (
            <Card key={journey.id} className="p-4">
              <Link
                href={`/journeys/${journey.slug}`}
                className="flex flex-wrap items-center gap-2 hover:underline"
              >
                <RefTag value={journey.key} />
                <span className="text-sm font-medium text-slate-900">{journey.title}</span>
                <SideBadge side={journey.side} />
                <CategoryBadge category={journey.category} />
              </Link>
              <p className="mt-1.5 text-[11px] text-slate-400">
                {direct
                  ? "On this journey — inherited by every requirement that does not override"
                  : "Not on the journey — reaches it through requirement overrides only"}
              </p>
              {rows.length > 0 ? (
                <ul className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
                  {rows.map(({ requirement, source, criteriaCount }) => (
                    <li key={requirement.id} className="flex flex-wrap items-start gap-2">
                      <Link
                        href={`/requirements/${requirement.id}`}
                        className="flex flex-1 items-start gap-2 hover:underline"
                      >
                        <RefTag value={requirement.ref} />
                        <span className="flex-1 text-sm text-slate-700">{requirement.title}</span>
                      </Link>
                      {requirement.decisionRequired ? <DecisionRequiredBadge /> : null}
                      <StatusBadge status={requirement.status} />
                      <span className="text-[11px] text-slate-400">{criteriaCount} criteria</span>
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
