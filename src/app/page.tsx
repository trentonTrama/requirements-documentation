import Link from "next/link";
import { prisma } from "@/lib/db";
import { listCategories, listQuestions, recentChanges } from "@/lib/queries";
import { PRIORITIES, PRIORITY_LABELS, REQUIREMENT_STATUSES, STATUS_LABELS } from "@/lib/constants";
import { Card } from "@/components/ui";
import { CategoryBadge, PriorityBadge, RefTag, StatusBadge } from "@/components/badges";
import { ChangeHistory } from "@/components/change-history";
import { relativeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [byStatus, byPriority, categories, openQuestions, changes, totals] = await Promise.all([
    prisma.functionalRequirement.groupBy({ by: ["status"], _count: true }),
    prisma.functionalRequirement.groupBy({ by: ["priority"], _count: true }),
    listCategories(),
    listQuestions({ status: "OPEN" }),
    recentChanges(12),
    prisma.$transaction([
      prisma.functionalRequirement.count(),
      prisma.acceptanceCriterion.count(),
      prisma.persona.count(),
    ]),
  ]);

  const statusCounts = Object.fromEntries(byStatus.map((row) => [row.status, row._count]));
  const priorityCounts = Object.fromEntries(byPriority.map((row) => [row.priority, row._count]));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500">
          {totals[0]} requirements · {totals[1]} acceptance criteria · {totals[2]} personas
        </p>
      </header>

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
          <h2 className="text-sm font-semibold text-slate-900">Categories</h2>
          <Link href="/categories" className="text-xs text-slate-500 hover:underline">
            Manage
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
                <span className="text-xs tabular-nums text-slate-500">{category._count.requirements}</span>
              </Link>
            </li>
          ))}
          {categories.length === 0 ? (
            <li className="text-xs text-slate-400">No categories yet.</li>
          ) : null}
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
                const requirement = question.requirement ?? question.acceptanceCriterion?.requirement;
                const ref = question.acceptanceCriterion?.ref ?? requirement?.ref ?? "";
                return (
                  <li key={question.id} className="border-l-2 border-amber-300 pl-3">
                    <p className="text-sm text-slate-800">{question.body}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {requirement ? (
                        <Link href={`/requirements/${requirement.id}`} className="hover:underline">
                          {ref}
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

async function RecentRequirements() {
  const requirements = await prisma.functionalRequirement.findMany({
    orderBy: { updatedAt: "desc" },
    take: 6,
    include: { category: true },
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
              <CategoryBadge category={requirement.category} />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
