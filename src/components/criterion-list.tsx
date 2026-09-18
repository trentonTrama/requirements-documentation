"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { Comment, Question } from "@prisma/client";
import { Button, ErrorBanner, Field, Input, Textarea } from "./ui";
import { RefTag } from "./badges";
import { PersonaChips } from "./persona-chips";
import { PersonaPicker, type PersonaOption } from "./persona-picker";
import { DiscussionPanel } from "./discussion-panel";
import { resolveCriterionPersonas, type PersonaLike } from "@/lib/personas";
import {
  createCriterion,
  deleteCriterion,
  reorderCriteria,
  revertCriterionToInherited,
  setCriterionPersonas,
  updateCriterion,
} from "@/lib/actions/criteria";

export type CriterionItem = {
  id: string;
  ref: string;
  statement: string;
  notes: string;
  sortOrder: number;
  personas: PersonaLike[];
  comments: Comment[];
  questions: Question[];
};

export function CriterionList({
  requirementId,
  requirementPersonas,
  criteria,
  allPersonas,
}: {
  requirementId: string;
  requirementPersonas: PersonaLike[];
  criteria: CriterionItem[];
  allPersonas: PersonaOption[];
}) {
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">
          Acceptance criteria <span className="text-slate-400">({criteria.length})</span>
        </h2>
        <Button size="sm" onClick={() => setAdding((v) => !v)}>
          {adding ? "Close" : "Add criterion"}
        </Button>
      </div>

      {adding ? (
        <CriterionForm
          requirementId={requirementId}
          requirementPersonas={requirementPersonas}
          allPersonas={allPersonas}
          onDone={() => setAdding(false)}
        />
      ) : null}

      {criteria.length === 0 && !adding ? (
        <p className="rounded-md border border-dashed border-slate-300 px-4 py-6 text-center text-xs text-slate-400">
          No acceptance criteria yet. They will inherit this requirement&apos;s personas by default.
        </p>
      ) : null}

      <ul className="space-y-3">
        {criteria.map((criterion, index) => (
          <CriterionCard
            key={criterion.id}
            criterion={criterion}
            requirementId={requirementId}
            requirementPersonas={requirementPersonas}
            allPersonas={allPersonas}
            orderedIds={criteria.map((c) => c.id)}
            index={index}
          />
        ))}
      </ul>
    </div>
  );
}

function CriterionCard({
  criterion,
  requirementId,
  requirementPersonas,
  allPersonas,
  orderedIds,
  index,
}: {
  criterion: CriterionItem;
  requirementId: string;
  requirementPersonas: PersonaLike[];
  allPersonas: PersonaOption[];
  orderedIds: string[];
  index: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [showDiscussion, setShowDiscussion] = useState(false);
  const [editingPersonas, setEditingPersonas] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const resolved = resolveCriterionPersonas(criterion, { personas: requirementPersonas });
  const openQuestions = criterion.questions.filter((q) => q.status === "OPEN").length;

  function act(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) return setError(result.error ?? "Something went wrong");
      setError(null);
      setEditingPersonas(false);
      router.refresh();
    });
  }

  function move(direction: -1 | 1) {
    const next = [...orderedIds];
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= next.length) return;
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    act(() => reorderCriteria(requirementId, next));
  }

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4">
      {editing ? (
        <CriterionForm
          requirementId={requirementId}
          requirementPersonas={requirementPersonas}
          allPersonas={allPersonas}
          criterion={criterion}
          onDone={() => setEditing(false)}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <RefTag value={criterion.ref} />
            </div>
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" onClick={() => move(-1)} disabled={pending || index === 0} aria-label="Move up">
                ↑
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => move(1)}
                disabled={pending || index === orderedIds.length - 1}
                aria-label="Move down"
              >
                ↓
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                Edit
              </Button>
              <Button
                size="sm"
                variant="danger"
                disabled={pending}
                onClick={() => {
                  if (confirm(`Delete ${criterion.ref}?`)) act(() => deleteCriterion(criterion.id));
                }}
              >
                Delete
              </Button>
            </div>
          </div>

          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">{criterion.statement}</p>
          {criterion.notes ? (
            <p className="mt-1.5 whitespace-pre-wrap text-xs text-slate-500">{criterion.notes}</p>
          ) : null}

          <ErrorBanner message={error} />

          <div className="mt-3 border-t border-slate-100 pt-3">
            {editingPersonas ? (
              <PersonaOverrideEditor
                criterion={criterion}
                requirementPersonas={requirementPersonas}
                allPersonas={allPersonas}
                pending={pending}
                onCancel={() => setEditingPersonas(false)}
                onSave={(ids) => act(() => setCriterionPersonas(criterion.id, ids))}
              />
            ) : (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <PersonaChips personas={resolved.personas} source={resolved.source} />
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEditingPersonas(true)}>
                    {resolved.source === "override" ? "Change override" : "Override personas"}
                  </Button>
                  {resolved.source === "override" ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => act(() => revertCriterionToInherited(criterion.id))}
                    >
                      Revert to inherited
                    </Button>
                  ) : null}
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 border-t border-slate-100 pt-3">
            <button
              type="button"
              onClick={() => setShowDiscussion((v) => !v)}
              className="text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              {showDiscussion ? "Hide" : "Show"} discussion · {criterion.comments.length} comment
              {criterion.comments.length === 1 ? "" : "s"} · {criterion.questions.length} question
              {criterion.questions.length === 1 ? "" : "s"}
              {openQuestions > 0 ? (
                <span className="ml-1 font-semibold text-amber-600">({openQuestions} open)</span>
              ) : null}
            </button>
            {showDiscussion ? (
              <div className="mt-3">
                <DiscussionPanel
                  target={{ acceptanceCriterionId: criterion.id }}
                  comments={criterion.comments}
                  questions={criterion.questions}
                  compact
                />
              </div>
            ) : null}
          </div>
        </>
      )}
    </li>
  );
}

function PersonaOverrideEditor({
  criterion,
  requirementPersonas,
  allPersonas,
  pending,
  onCancel,
  onSave,
}: {
  criterion: CriterionItem;
  requirementPersonas: PersonaLike[];
  allPersonas: PersonaOption[];
  pending: boolean;
  onCancel: () => void;
  onSave: (ids: string[]) => void;
}) {
  const [selected, setSelected] = useState<string[]>(criterion.personas.map((p) => p.id));

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">
        Selecting personas overrides the inherited set (
        {requirementPersonas.map((p) => p.name).join(", ") || "none"}). Clear the selection to go back to
        inheriting.
      </p>
      <PersonaPicker personas={allPersonas} selected={selected} onChange={setSelected} />
      <div className="flex gap-2">
        <Button size="sm" disabled={pending} onClick={() => onSave(selected)}>
          Save personas
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setSelected([])} disabled={selected.length === 0}>
          Clear (inherit)
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function CriterionForm({
  requirementId,
  requirementPersonas,
  allPersonas,
  criterion,
  onDone,
}: {
  requirementId: string;
  requirementPersonas: PersonaLike[];
  allPersonas: PersonaOption[];
  criterion?: CriterionItem;
  onDone: () => void;
}) {
  const router = useRouter();
  const [statement, setStatement] = useState(criterion?.statement ?? "");
  const [notes, setNotes] = useState(criterion?.notes ?? "");
  const [personaIds, setPersonaIds] = useState<string[]>(criterion?.personas.map((p) => p.id) ?? []);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const payload = { requirementId, statement, notes, personaIds };
      const result = criterion
        ? await updateCriterion(criterion.id, payload)
        : await createCriterion(payload);
      if (!result.ok) return setError(result.error);
      onDone();
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-md bg-slate-50 p-3">
      <ErrorBanner message={error} />
      <Field label="Statement">
        <Textarea
          rows={3}
          autoFocus
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          placeholder="Given a saved card, when the policyholder confirms payment, then the premium is applied within 5 seconds."
          required
        />
      </Field>
      <Field label="Notes" hint="Optional detail, edge cases, test data">
        <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
      </Field>
      <div className="space-y-1.5">
        <p className="text-xs font-medium text-slate-600">Personas</p>
        <PersonaPicker personas={allPersonas} selected={personaIds} onChange={setPersonaIds} />
        <p className="text-xs text-slate-400">
          {personaIds.length === 0
            ? `Leave empty to inherit from the requirement (${
                requirementPersonas.map((p) => p.name).join(", ") || "no personas yet"
              }).`
            : "This selection overrides the requirement's personas for this criterion."}
        </p>
      </div>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending || statement.trim() === ""}>
          {pending ? "Saving…" : criterion ? "Save criterion" : "Add criterion"}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
