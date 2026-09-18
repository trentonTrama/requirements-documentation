import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { capabilityCoverage, listRoles } from "@/lib/queries";
import { rolesGranting } from "@/lib/roles";
import { Card, EmptyState } from "@/components/ui";
import {
  CapabilityActionBadge,
  CategoryBadge,
  DecisionRequiredBadge,
  RefTag,
  RoleBadge,
  SideBadge,
  StatusBadge,
} from "@/components/badges";
import { badgeColorClass } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function CapabilityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const capability = await prisma.capability.findUnique({ where: { id } });
  if (!capability) notFound();

  const [coverage, roles] = await Promise.all([capabilityCoverage([capability.id]), listRoles()]);
  const holders = rolesGranting(roles, capability.id);
  const directJourneys = coverage.filter((entry) => entry.direct).length;
  const requirements = coverage.flatMap((entry) => entry.requirements);
  const inherited = requirements.filter((r) => r.source === "inherited").length;
  const overridden = requirements.filter((r) => r.source === "override").length;

  return (
    <div className="space-y-6">
      <nav className="text-xs text-slate-400">
        <Link href="/capabilities" className="hover:underline">
          Capabilities
        </Link>{" "}
        / {capability.name}
      </nav>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium ring-1 ring-inset ${badgeColorClass(capability.color)}`}
          >
            {capability.name}
          </span>
          <CapabilityActionBadge action={capability.action} />
          {capability.resource ? (
            <span className="text-sm text-slate-500">{capability.resource}</span>
          ) : null}
          <span className="font-mono text-[11px] text-slate-400">{capability.key}</span>
        </div>
        {capability.description ? (
          <p className="text-sm text-slate-600">{capability.description}</p>
        ) : null}
        <p className="text-xs text-slate-500">
          On {directJourneys} journey{directJourneys === 1 ? "" : "s"} · applies to {inherited}{" "}
          requirements by inheritance and {overridden} by override
        </p>
      </header>

      <Card className="space-y-2 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Roles granting this
        </h2>
        {holders.length === 0 ? (
          <p className="text-xs text-slate-400">
            No role grants this capability yet, so nobody can exercise what these requirements
            describe.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-1.5">
            {holders.map((role) => (
              <Link key={role.id} href={`/roles/${role.id}`}>
                <RoleBadge role={role} />
              </Link>
            ))}
          </div>
        )}
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Coverage</h2>
        {coverage.length === 0 ? (
          <EmptyState
            title="Nothing assigned yet"
            hint="Assign this capability to a journey, or override it on a specific requirement."
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
