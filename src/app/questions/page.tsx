import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { listQuestions, type QuestionWithTarget } from "@/lib/queries";
import { Card, EmptyState } from "@/components/ui";
import { RefTag } from "@/components/badges";
import { QuestionRow } from "@/components/discussion-panel";
import { QuestionFilters } from "./filters";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string; assignee?: string; journey?: string }>;

export default async function QuestionsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const status = params.status ?? "OPEN";

  const where: Prisma.QuestionWhereInput = {};
  if (status !== "ALL") where.status = status as Prisma.EnumQuestionStatusFilter["equals"];
  if (params.assignee) where.assignee = params.assignee;
  if (params.journey) {
    where.OR = [
      { journeyId: params.journey },
      { requirement: { journeyId: params.journey } },
      { acceptanceCriterion: { requirement: { journeyId: params.journey } } },
    ];
  }

  const [questions, journeys, assigneeRows] = await Promise.all([
    listQuestions(where),
    prisma.journey.findMany({
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      select: { id: true, key: true, title: true },
    }),
    prisma.question.findMany({ where: { assignee: { not: null } }, select: { assignee: true } }),
  ]);

  const assignees = [...new Set(assigneeRows.map((q) => q.assignee).filter(Boolean) as string[])].sort();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Questions</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every question raised against a journey, a requirement or an acceptance criterion, in one
          place. {questions.length} shown.
        </p>
      </header>

      <QuestionFilters journeys={journeys} assignees={assignees} />

      {questions.length === 0 ? (
        <EmptyState title="No questions match these filters" />
      ) : (
        <ul className="space-y-3">
          {questions.map((question) => (
            <Card key={question.id} className="p-4">
              <QuestionBreadcrumb question={question} />
              <ul>
                <QuestionRow question={question} />
              </ul>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}

function QuestionBreadcrumb({ question }: { question: QuestionWithTarget }) {
  const journey =
    question.journey ??
    question.requirement?.journey ??
    question.acceptanceCriterion?.requirement.journey;
  const requirement = question.requirement ?? question.acceptanceCriterion?.requirement;
  const criterion = question.acceptanceCriterion;

  return (
    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
      {journey ? (
        <Link href={`/journeys/${journey.slug}`} className="flex items-center gap-2 hover:underline">
          <RefTag value={journey.key} />
          <span>{journey.title}</span>
        </Link>
      ) : (
        <span className="italic text-slate-400">Unattached question</span>
      )}
      {requirement ? (
        <>
          <span className="text-slate-300">›</span>
          <Link
            href={`/requirements/${requirement.id}`}
            className="flex items-center gap-2 hover:underline"
          >
            <RefTag value={requirement.ref} />
            <span className="max-w-md truncate">{requirement.title}</span>
          </Link>
        </>
      ) : null}
      {criterion ? (
        <>
          <span className="text-slate-300">›</span>
          <RefTag value={criterion.ref.split(".").at(-1) ?? criterion.ref} />
          <span className="max-w-md truncate">{criterion.statement}</span>
        </>
      ) : null}
    </div>
  );
}
