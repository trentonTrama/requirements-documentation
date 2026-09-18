import Link from "next/link";
import { prisma } from "@/lib/db";
import { listCategories, listProjects, listQuestions, recentChanges } from "@/lib/queries";
import { PRIORITIES, PRIORITY_LABELS, REQUIREMENT_STATUSES, STATUS_LABELS } from "@/lib/constants";
import { Card } from "@/components/ui";
import {
  CategoryBadge,
  DecisionRequiredBadge,
  PriorityBadge,
  ProjectStatusBadge,
  RefTag,
  SideBadge,
  StatusBadge,
} from "@/components/badges";
import { ChangeHistory } from "@/components/change-history";
import { relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [byStatus, byPriority, categories, projects, openQuestions, changes, totals] =
    await Promise.all([
      prisma.functionalRequirement.groupBy({ by: ["status"], _count: true }),
      prisma.functionalRequirement.groupBy({ by: ["priority"], _count: true }),
      listCategories(),
      listProjects(),
      listQuestions({ status: "OPEN" }),
      recentChanges(12),
      prisma.$transaction([
        prisma.journey.count(),
        prisma.functionalRequirement.count(),
        prisma.acceptanceCriterion.count(),
        prisma.capability.count(),
        prisma.role.count(),
        prisma.functionalRequirement.count({ where: { decisionRequired: true } }),
        prisma.functionalRequirement.count({ where: { stateSpecific: true } }),
      ]),
    ]);

  const [journeys, requirements, criteria, capabilities, roles, decisionRequired, stateSpecific] =
    totals;
  const statusCounts = Object.fromEntries(byStatus.map((row) => [row.status, row._count]));
  const priorityCounts = Object.fromEntries(byPriority.map((row) => [row.priority, row._count]));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          {projects.length} projects · {journeys} journeys · {requirements} requirements · {criteria}{" "}
          acceptance criteria · {capabilities} capabilities held by {roles} roles
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Awaiting a decision"
          value={decisionRequired}
          href="/requirements?decision=1"
          tone="text-orange-600"
        />
        <Stat
          label="Open questions"
          value={openQuestions.length}
          href="/questions"
          tone="text-amber-600"
        />
        <Stat
          label="State specific"
          value={stateSpecific}
          href="/requirements?state=1"
          tone="text-indigo-600"
        />
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
                <dd className="text-sm tabular-nums text-slate-600">{statusCounts[status] ?? 0}</dd>
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
                <dd className="text-sm tabular-nums text-slate-600">{priorityCounts[priority] ?? 0}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Projects</h2>
          <Link href="/projects" className="text-xs text-slate-500 hover:underline">
            All projects
          </Link>
        </div>
        {projects.length === 0 ? (
          <p className="mt-3 text-xs text-slate-400">
            No projects yet. Group domains, journeys or single requirements into one.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {projects.map((project) => (
              <li key={project.id} className="py-2">
                <Link
                  href={`/projects/${project.slug}`}
                  className="flex flex-wrap items-center gap-2 hover:underline"
                >
                  <span className="text-sm text-slate-800">{project.name}</span>
                  <ProjectStatusBadge status={project.status} />
                  <span className="text-[11px] tabular-nums text-slate-400">
                    {project.requirementCount} requirements
                    {project.openQuestionCount > 0
                      ? ` · ${project.openQuestionCount} open questions`
                      : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Domains</h2>
          <Link href="/journeys" className="text-xs text-slate-500 hover:underline">
            All journeys
          </Link>
        </div>
        <ul className="mt-3 flex flex-wrap gap-2">
          {categories.map((category) => (
            <li key={category.id}>
              <Link
                href={`/requirements?category=${category.id}`}
                className="flex items-center gap-2 rounded-md border border-slate-200 px-2.5 py-1.5 hover:bg-slate-50"
              >
                <CategoryBadge category={category} />
                <span className="text-xs tabular-nums text-slate-500">
                  {category.journeys.reduce((total, j) => total + j._count.requirements, 0)}
                </span>
              </Link>
            </li>
          ))}
          {categories.length === 0 ? <li className="text-xs text-slate-400">No domains yet.</li> : null}
        </ul>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">
              Open questions <span className="text-slate-400">({openQuestions.length})</span>
            </h2>
            <Link href="/questions" className="text-xs text-slate-500 hover:underline">
              All questions
            </Link>
          </div>
          {openQuestions.length === 0 ? (
            <p className="mt-3 text-xs text-slate-400">Nothing outstanding.</p>
          ) : (
            <ul className="mt-3 space-y-2.5">
              {openQuestions.slice(0, 8).map((question) => {
                const journey =
                  question.journey ??
                  question.requirement?.journey ??
                  question.acceptanceCriterion?.requirement.journey;
                return (
                  <li key={question.id} className="border-l-2 border-amber-300 pl-3">
                    <p className="text-sm text-slate-800">{question.body}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {journey ? (
                        <Link href={`/journeys/${journey.slug}`} className="hover:underline">
                          {journey.key}
                        </Link>
                      ) : null}{" "}
                      · {question.askedBy}
                      {question.assignee ? ` → ${question.assignee}` : ""} ·{" "}
                      {relativeTime(question.createdAt)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <h2 className="text-sm font-semibold text-slate-900">Recent changes</h2>
          <div className="mt-3">
            <ChangeHistory entries={changes} />
          </div>
        </Card>
      </div>

      <RecentRequirements />
    </div>
  );
}

function Stat({
  label,
  value,
  href,
  tone,
}: {
  label: string;
  value: number;
  href: string;
  tone: string;
}) {
  return (
    <Link href={href}>
      <Card className="p-4 transition-colors hover:bg-slate-50">
        <p className={`text-2xl font-semibold tabular-nums ${tone}`}>{value}</p>
        <p className="mt-0.5 text-xs text-slate-500">{label}</p>
      </Card>
    </Link>
  );
}

async function RecentRequirements() {
  const requirements = await prisma.functionalRequirement.findMany({
    orderBy: { updatedAt: "desc" },
    take: 6,
    include: { journey: { select: { slug: true, key: true, side: true } } },
  });

  if (requirements.length === 0) {
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-slate-600">No requirements yet.</p>
        <Link href="/requirements/new" className="mt-2 inline-block text-xs text-slate-900 underline">
          Create the first one
        </Link>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h2 className="text-sm font-semibold text-slate-900">Recently updated</h2>
      <ul className="mt-3 divide-y divide-slate-100">
        {requirements.map((requirement) => (
          <li key={requirement.id} className="py-2">
            <Link
              href={`/requirements/${requirement.id}`}
              className="flex flex-wrap items-center gap-2 hover:underline"
            >
              <RefTag value={requirement.ref} />
              <span className="text-sm text-slate-800">{requirement.title}</span>
              <StatusBadge status={requirement.status} />
              <SideBadge side={requirement.journey.side} />
              {requirement.decisionRequired ? <DecisionRequiredBadge /> : null}
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
