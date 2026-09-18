import Link from "next/link";
import { listJourneys } from "@/lib/queries";
import { Card, EmptyState } from "@/components/ui";
import { CategoryBadge, SideBadge } from "@/components/badges";
import { CapabilityChips } from "@/components/capability-chips";

export const dynamic = "force-dynamic";

export default async function JourneysPage() {
  const journeys = await listJourneys();

  const byDomain = new Map<string, typeof journeys>();
  for (const journey of journeys) {
    const key = journey.category.id;
    if (!byDomain.has(key)) byDomain.set(key, []);
    byDomain.get(key)!.push(journey);
  }

  const totals = journeys.reduce(
    (acc, journey) => ({
      requirements: acc.requirements + journey._count.requirements,
      decisions: acc.decisions + journey.decisionRequiredCount,
      questions: acc.questions + journey.openQuestionCount,
    }),
    { requirements: 0, decisions: 0, questions: 0 },
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Journeys</h1>
        <p className="mt-1 text-sm text-slate-500">
          {journeys.length} documents across {byDomain.size} domains · {totals.requirements}{" "}
          requirements · {totals.decisions} awaiting a decision · {totals.questions} open questions
        </p>
      </header>

      {journeys.length === 0 ? (
        <EmptyState title="No journey documents yet" hint="Run the seed to import the corpus." />
      ) : (
        <div className="space-y-6">
          {[...byDomain.values()].map((group) => (
            <section key={group[0].category.id} className="space-y-2">
              <div className="flex items-center gap-2">
                <CategoryBadge category={group[0].category} />
                {group[0].category.description ? (
                  <span className="text-xs text-slate-400">{group[0].category.description}</span>
                ) : null}
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                {group.map((journey) => (
                  <Card key={journey.id} className="flex flex-col gap-2 p-4">
                    <Link href={`/journeys/${journey.slug}`} className="group space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <SideBadge side={journey.side} />
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-600">
                          {journey.key}
                        </span>
                      </div>
                      <h2 className="text-sm font-medium text-slate-900 group-hover:underline">
                        {journey.title}
                      </h2>
                      <p className="line-clamp-2 text-xs text-slate-500">{journey.statusNote}</p>
                    </Link>
                    <CapabilityChips capabilities={journey.capabilities} showSource={false} />
                    <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-slate-100 pt-2 text-[11px] text-slate-400">
                      <span>{journey._count.requirements} requirements</span>
                      {journey.decisionRequiredCount > 0 ? (
                        <span className="font-medium text-orange-600">
                          {journey.decisionRequiredCount} need a decision
                        </span>
                      ) : null}
                      {journey.openQuestionCount > 0 ? (
                        <span className="font-medium text-amber-600">
                          {journey.openQuestionCount} open questions
                        </span>
                      ) : null}
                      <span>{journey._count.archiveItems} archive items</span>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
