"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Comment, Question } from "@prisma/client";
import { Button, ErrorBanner, Input, Select, Textarea } from "./ui";
import { QuestionStatusBadge } from "./badges";
import { QUESTION_STATUSES, QUESTION_STATUS_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { TimeAgo } from "./time-ago";
import { useAuthorName } from "@/lib/author";
import { createComment, deleteComment } from "@/lib/actions/comments";
import { answerQuestion, createQuestion, deleteQuestion, setQuestionStatus } from "@/lib/actions/questions";

/** Exactly one parent, matching the invariant enforced in src/lib/validation.ts. */
export type DiscussionTarget =
  | { journeyId: string; requirementId?: never; acceptanceCriterionId?: never }
  | { requirementId: string; journeyId?: never; acceptanceCriterionId?: never }
  | { acceptanceCriterionId: string; journeyId?: never; requirementId?: never };

export function DiscussionPanel({
  target,
  comments,
  questions,
  compact,
}: {
  target: DiscussionTarget;
  comments: Comment[];
  questions: Question[];
  compact?: boolean;
}) {
  const openCount = questions.filter((q) => q.status === "OPEN").length;
  const [tab, setTab] = useState<"comments" | "questions">(
    openCount > 0 && comments.length === 0 ? "questions" : "comments",
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-1 border-b border-slate-200">
        <TabButton active={tab === "comments"} onClick={() => setTab("comments")}>
          Comments <Count value={comments.length} />
        </TabButton>
        <TabButton active={tab === "questions"} onClick={() => setTab("questions")}>
          Questions <Count value={questions.length} highlight={openCount > 0 ? openCount : undefined} />
        </TabButton>
      </div>

      {tab === "comments" ? (
        <CommentsTab target={target} comments={comments} compact={compact} />
      ) : (
        <QuestionsTab target={target} questions={questions} compact={compact} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "-mb-px border-b-2 border-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-900"
          : "-mb-px border-b-2 border-transparent px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
      }
    >
      {children}
    </button>
  );
}

function Count({ value, highlight }: { value: number; highlight?: number }) {
  return (
    <span className="ml-1 text-[11px] text-slate-400">
      {value}
      {highlight ? <span className="ml-1 font-semibold text-amber-600">({highlight} open)</span> : null}
    </span>
  );
}

function CommentsTab({
  target,
  comments,
  compact,
}: {
  target: DiscussionTarget;
  comments: Comment[];
  compact?: boolean;
}) {
  const router = useRouter();
  const author = useAuthorName();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createComment({ ...target, body, authorName: author });
      if (!result.ok) return setError(result.error);
      setBody("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {comments.length === 0 ? (
        <p className="text-xs text-slate-400">No comments yet.</p>
      ) : (
        <ul className="space-y-2">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-md bg-slate-50 px-3 py-2">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700">{comment.authorName}</span>
                <TimeAgo value={comment.createdAt} className="text-[11px] text-slate-400" />
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{comment.body}</p>
              <RowActions
                onDelete={() =>
                  startTransition(async () => {
                    const result = await deleteComment(comment.id);
                    if (!result.ok) return setError(result.error);
                    router.refresh();
                  })
                }
              />
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="space-y-2">
        <ErrorBanner message={error} />
        <Textarea
          rows={compact ? 2 : 3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment…"
        />
        <Button type="submit" size="sm" disabled={pending || body.trim() === ""}>
          {pending ? "Saving…" : "Add comment"}
        </Button>
      </form>
    </div>
  );
}

function QuestionsTab({
  target,
  questions,
  compact,
}: {
  target: DiscussionTarget;
  questions: Question[];
  compact?: boolean;
}) {
  const router = useRouter();
  const author = useAuthorName();
  const [body, setBody] = useState("");
  const [assignee, setAssignee] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createQuestion({ ...target, body, askedBy: author, assignee });
      if (!result.ok) return setError(result.error);
      setBody("");
      setAssignee("");
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {questions.length === 0 ? (
        <p className="text-xs text-slate-400">No questions raised yet.</p>
      ) : (
        <ul className="space-y-2">
          {questions.map((question) => (
            <QuestionRow key={question.id} question={question} />
          ))}
        </ul>
      )}

      <form onSubmit={submit} className="space-y-2">
        <ErrorBanner message={error} />
        <Textarea
          rows={compact ? 2 : 3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Ask a question about this item…"
        />
        <div className="flex flex-wrap items-center gap-2">
          <Input
            className="max-w-48"
            value={assignee}
            onChange={(e) => setAssignee(e.target.value)}
            placeholder="Assign to (optional)"
          />
          <Button type="submit" size="sm" disabled={pending || body.trim() === ""}>
            {pending ? "Saving…" : "Ask question"}
          </Button>
        </div>
      </form>
    </div>
  );
}

export function QuestionRow({ question }: { question: Question }) {
  const router = useRouter();
  const author = useAuthorName();
  const [answer, setAnswer] = useState("");
  const [answering, setAnswering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function act(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) return setError(result.error ?? "Something went wrong");
      setAnswering(false);
      setAnswer("");
      router.refresh();
    });
  }

  return (
    <li className="rounded-md border border-slate-200 px-3 py-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <QuestionStatusBadge status={question.status} />
          <span className="text-xs text-slate-500">
            asked by {question.askedBy}
            {question.assignee ? ` · for ${question.assignee}` : ""}
          </span>
        </div>
        <TimeAgo value={question.createdAt} className="text-[11px] text-slate-400" />
      </div>

      <p className="mt-1.5 whitespace-pre-wrap text-sm font-medium text-slate-800">{question.body}</p>

      {question.answer ? (
        <div className="mt-2 rounded bg-emerald-50 px-3 py-2">
          <p className="whitespace-pre-wrap text-sm text-emerald-900">{question.answer}</p>
          <p className="mt-1 text-[11px] text-emerald-700">
            {question.answeredBy}
            {question.answeredAt ? ` · ${formatDateTime(question.answeredAt)}` : ""}
          </p>
        </div>
      ) : null}

      <ErrorBanner message={error} />

      {answering ? (
        <div className="mt-2 space-y-2">
          <Textarea
            rows={2}
            autoFocus
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Answer…"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              disabled={pending || answer.trim() === ""}
              onClick={() => act(() => answerQuestion({ id: question.id, answer, answeredBy: author }))}
            >
              Save answer
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setAnswering(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {question.status !== "ANSWERED" ? (
            <Button size="sm" variant="secondary" onClick={() => setAnswering(true)}>
              Answer
            </Button>
          ) : null}
          <Select
            className="w-auto py-1 text-xs"
            value={question.status}
            disabled={pending}
            onChange={(e) => act(() => setQuestionStatus({ id: question.id, status: e.target.value }))}
          >
            {QUESTION_STATUSES.map((status) => (
              <option key={status} value={status}>
                {QUESTION_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
          <RowActions onDelete={() => act(() => deleteQuestion(question.id))} />
        </div>
      )}
    </li>
  );
}

function RowActions({ onDelete }: { onDelete: () => void }) {
  return (
    <button
      type="button"
      onClick={() => {
        if (confirm("Delete this entry?")) onDelete();
      }}
      className="mt-1 text-[11px] text-slate-400 underline-offset-2 hover:text-rose-600 hover:underline"
    >
      Delete
    </button>
  );
}
