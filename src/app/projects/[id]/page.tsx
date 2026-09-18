import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getProject, listProjectRequirements, projectRollup } from "@/lib/queries";
import { membershipSource, MEMBERSHIP_LABELS } from "@/lib/projects";
import { resolveRequirementCapabilities } from "@/lib/capabilities";
import { PRIORITIES, PRIORITY_LABELS, REQUIREMENT_STATUSES, badgeColorClass } from "@/lib/constants";
import { Card, EmptyState } from "@/components/ui";
import {
  CategoryBadge,
  DecisionRequiredBadge,
  PriorityBadge,
  ProjectStatusBadge,
  RefTag,
  SideBadge,
  StatusBadge,
} from "@/components/badges";
import { CapabilityChips } from "@/components/capability-chips";
import { formatDate } from "@/lib/utils";
import { ProjectMembers } from "./members";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const [rollup, requirements, categories, journeys] = await Promise.all([
    projectRollup(project.id),
    listProjectRequirements(project.id),
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, key: true, name: true, color: true },
    }),
    prisma.journey.findMany({
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      select: {
        id: true,
        key: true,
        title: true,
        side: true,
        categoryId: true,
        requirements: {
          orderBy: [{ sectionOrder: "asc" }, { sortOrder: "asc" }],
          select: { id: true, ref: true, title: true },
        },
      },
    }),
  ]);

  // Group the requirements the project reaches by the journey they live in, and
  // say how each one got here.
  const byJourney = new Map<string, typeof requirements>();
  for (const requirement of requirements) {
    const list = byJourney.get(requirement.journeyId) ?? [];
    list.push(requirement);
    byJourney.set(requirement.journeyId, list);
  }

  return (
    <div className="space-y-6">
      <nav className="text-xs text-slate-400">
        <Link href="/projects" className="hover:underline">
          Projects
        </Link>{" "}
        / {project.name}
      </nav>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-sm font-medium ring-1 ring-inset ${badgeColorClass(project.color)}`}
          >
            {project.name}
          </span>
          <ProjectStatusBadge status={project.status} />
          <span className="font-mono text-[11px] text-slate-400">{project.key}</span>
        </div>
        {project.description ? <p className="text-sm text-slate-600">{project.description}</p> : null}
        <p className="text-xs text-slate-400">
          {project.categories.length} domains · {project.journeys.length} journeys added directly ·{" "}
          {project.requirements.length} single requirements
          {project.startsOn ? ` · starts ${formatDate(project.startsOn)}` : ""}
          {project.targetDate ? ` · target ${formatDate(project.targetDate)}` : ""}
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-4">
        <Stat label="Requirements" value={rollup.requirements} tone="text-slate-900" />
        <Stat label="Acceptance criteria" value={rollup.criteria} tone="text-slate-900" />
        <Stat
          label="Awaiting a decision"
          value={rollup.decisionRequired}
          tone="text-orange-600"
          href={`/requirements?project=${project.id}&decision=1`}
        />
        <Stat label="Open questions" value={rollup.openQuestions} tone="text-amber-600" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-slate-900">By status</h2>
          <dl className="mt-3 space-y-2">
            {REQUIREMENT_STATUSES.map((status) => (
              <div key={status} className="flex items-center justify-between gap-3">
                <dt>
                  <StatusBadge status={status} />
                </dt>
                <dd className="text-sm tabular-nums text-slate-600">{rollup.byStatus[status] ?? 0}</dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-slate-900">By priority</h2>
          <dl className="mt-3 space-y-2">
            {PRIORITIES.map((priority) => (
              <div key={priority} className="flex items-center justify-between gap-3">
                <dt>
                  <PriorityBadge priority={priority} />
                </dt>
                <dd className="text-sm tabular-nums text-slate-600">
                  {rollup.byPriority[priority] ?? 0}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <Card className="space-y-3 p-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">What is in this project</h2>
          <p className="mt-1 text-xs text-slate-500">
            Nothing here is owned by the project — the same domain, journey or requirement can sit in
            other projects too.
          </p>
        </div>
        <ProjectMembers
          projectId={project.id}
          options={{ categories, journeys }}
          initial={{
            categoryIds: project.categories.map((category) => category.id),
            journeyIds: project.journeys.map((journey) => journey.id),
            requirementIds: project.requirements.map((requirement) => requirement.id),
          }}
        />
      </Card>

      <section className="space-y-3">
        <div className="flex flex-wrap items-baseline gap-x-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Requirements reached <span className="text-slate-400">({requirements.length})</span>
          </h2>
          <Link href={`/requirements?project=${project.id}`} className="text-xs text-slate-500 hover:underline">
            Open in the requirements list
          </Link>
        </div>

        {requirements.length === 0 ? (
          <EmptyState
            title="This project is empty"
            hint="Add a domain, a journey or a single requirement above."
          />
        ) : (
          [...byJourney.values()].map((items) => {
            const journey = items[0].journey;
            return (
              <section key={journey.id} className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/journeys/${journey.slug}`}
                    className="flex items-center gap-2 hover:underline"
                  >
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
                    const source = membershipSource(project.id, requirement);
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
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
                          <CapabilityChips
                            capabilities={resolved.capabilities}
                            source={resolved.source}
                          />
                          <StatusBadge status={requirement.status} />
                          <PriorityBadge priority={requirement.priority} />
                          {source ? (
                            <span className="text-[11px] text-slate-400">
                              In this project {MEMBERSHIP_LABELS[source]}
                            </span>
                          ) : null}
                        </div>
                      </Link>
                    );
                  })}
                </Card>
              </section>
            );
          })
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  href,
}: {
  label: string;
  value: number;
  tone: string;
  href?: string;
}) {
  const card = (
    <Card className={`p-4 ${href ? "transition-colors hover:bg-slate-50" : ""}`}>
      <p className={`text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{label}</p>
    </Card>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}
