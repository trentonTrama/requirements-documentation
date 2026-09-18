import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { listCategories, listQuestions } from "@/lib/queries";
import { Card, EmptyState } from "@/components/ui";
import { RefTag } from "@/components/badges";
import { QuestionRow } from "@/components/discussion-panel";
import { QuestionFilters } from "./filters";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string; assignee?: string; category?: string }>;

export default async function QuestionsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const status = params.status ?? "OPEN";

  const where: Prisma.QuestionWhereInput = {};
  if (status !== "ALL") where.status = status as Prisma.EnumQuestionStatusFilter["equals"];
  if (params.assignee) where.assignee = params.assignee;
  if (params.category) {
    where.OR = [
      { requirement: { categoryId: params.category } },
      { acceptanceCriterion: { requirement: { categoryId: params.category } } },
    ];
  }

  const [questions, categories, assigneeRows] = await Promise.all([
    listQuestions(where),
    listCategories(),
    listQuestions({ assignee: { not: null } }),
  ]);

  const assignees = [...new Set(assigneeRows.map((q) => q.assignee).filter(Boolean) as string[])].sort();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Questions</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every open question raised against a requirement or an acceptance criterion, in one place.
        </p>
      </header>

      <QuestionFilters categories={categories} assignees={assignees} />

      {questions.length === 0 ? (
        <EmptyState title="No questions match these filters" />
      ) : (
        <ul className="space-y-3">
          {questions.map((question) => {
            const requirement = question.requirement ?? question.acceptanceCriterion?.requirement;
            const criterion = question.acceptanceCriterion;
            return (
              <Card key={question.id} className="p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  {requirement ? (
                    <Link
                      href={`/requirements/${requirement.id}`}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <RefTag value={requirement.ref} />
                      <span>{requirement.title}</span>
                    </Link>
                  ) : (
                    <span className="italic text-slate-400">Orphaned question</span>
                  )}
                  {criterion ? (
                    <>
                      <span className="text-slate-300">›</span>
                      <RefTag value={criterion.ref} />
                      <span className="max-w-md truncate">{criterion.statement}</span>
                    </>
                  ) : null}
                  {requirement?.category ? (
                    <span className="text-slate-400">· {requirement.category.name}</span>
                  ) : null}
                </div>
                <ul>
                  <QuestionRow question={question} />
                </ul>
              </Card>
            );
          })}
        </ul>
      )}
    </div>
  );
}
