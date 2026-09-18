import Link from "next/link";
import { notFound } from "next/navigation";
import { capabilityCoverage, getRole, listCapabilities } from "@/lib/queries";
import { Card, EmptyState } from "@/components/ui";
import {
  CapabilityBadge,
  CategoryBadge,
  DecisionRequiredBadge,
  RefTag,
  SideBadge,
  StatusBadge,
} from "@/components/badges";
import { badgeColorClass } from "@/lib/constants";
import { RoleCapabilityEditor } from "./editor";

export const dynamic = "force-dynamic";

export default async function RoleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const role = await getRole(id);
  if (!role) notFound();

  const [coverage, capabilities] = await Promise.all([
    // A role's coverage is exactly the union of what its capabilities reach.
    capabilityCoverage(role.capabilities.map((capability) => capability.id)),
    listCapabilities(),
  ]);

  const requirements = coverage.flatMap((entry) => entry.requirements);
  const criteria = requirements.reduce((total, row) => total + row.criteriaCount, 0);

  return (
    <div className="space-y-6">
      <nav className="text-xs text-slate-400">
        <Link href="/roles" className="hover:underline">
          Roles
        </Link>{" "}
        / {role.name}
      </nav>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium ring-1 ring-inset ${badgeColorClass(role.color)}`}
          >
            {role.name}
          </span>
          <span className="font-mono text-[11px] text-slate-400">{role.key}</span>
        </div>
        {role.description ? <p className="text-sm text-slate-600">{role.description}</p> : null}
        <p className="text-xs text-slate-500">
          Grants {role.capabilities.length} capabilit{role.capabilities.length === 1 ? "y" : "ies"} ·
          reaches {requirements.length} requirements and {criteria} acceptance criteria across{" "}
          {coverage.length} journey{coverage.length === 1 ? "" : "s"}
        </p>
      </header>

      <Card className="space-y-3 p-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Capabilities granted
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Editing this changes what the role reaches. No requirement is touched.
          </p>
        </div>
        <RoleCapabilityEditor
          roleId={role.id}
          capabilities={capabilities}
          selected={role.capabilities.map((capability) => capability.id)}
        />
      </Card>

      {(role.goals || role.painPoints) && (
        <Card className="space-y-3 p-4">
          {role.goals ? (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Goals</h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{role.goals}</p>
            </div>
          ) : null}
          {role.painPoints ? (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Pain points
              </h2>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{role.painPoints}</p>
            </div>
          ) : null}
        </Card>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Coverage</h2>
        {role.capabilities.length === 0 ? (
          <EmptyState
            title="This role grants nothing yet"
            hint="Give it a capability above and its coverage appears here."
          />
        ) : coverage.length === 0 ? (
          <EmptyState
            title="Nothing written against these capabilities yet"
            hint="Assign one of them to a journey and every requirement under it lands here."
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
                  ? "The journey carries one of this role's capabilities"
                  : "Reached through requirement overrides only"}
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

      <Card className="p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          What this role can do
        </h2>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {role.capabilities.length === 0 ? (
            <span className="text-xs italic text-slate-400">Nothing yet</span>
          ) : (
            role.capabilities.map((capability) => (
              <Link key={capability.id} href={`/capabilities/${capability.id}`}>
                <CapabilityBadge capability={capability} />
              </Link>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
