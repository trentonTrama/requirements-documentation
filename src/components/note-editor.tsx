"use client";

import type { NoteKind } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Card, ErrorBanner, Field, Select, Textarea } from "./ui";
import { NOTE_KIND_LABELS } from "@/lib/constants";
import {
  createJourneyNote,
  deleteJourneyNote,
  reorderJourneyNotes,
  updateJourneyNote,
} from "@/lib/actions/journey-notes";

export type NoteItem = { id: string; kind: NoteKind; body: string; sortOrder: number };

const KINDS: NoteKind[] = ["DECISION", "TECHNICAL"];

/** Both lists sit side by side, so "Add" alone would name three buttons the same. */
const ADD_LABELS: Record<NoteKind, string> = {
  DECISION: "Add a decision",
  TECHNICAL: "Add a technical note",
};

/**
 * One of a journey's two note lists. The list is per kind, and the edit form
 * carries the kind, so a note filed under the wrong heading moves across rather
 * than being retyped.
 */
export function NoteEditor({
  journeyId,
  kind,
  notes,
}: {
  journeyId: string;
  kind: NoteKind;
  notes: NoteItem[];
}) {
  const [adding, setAdding] = useState(false);

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">
          {NOTE_KIND_LABELS[kind]} <span className="text-slate-400">({notes.length})</span>
        </h2>
        <Button
          size="sm"
          variant="ghost"
          aria-label={adding ? "Close the note form" : ADD_LABELS[kind]}
          onClick={() => setAdding((v) => !v)}
        >
          {adding ? "Close" : "Add"}
        </Button>
      </div>

      {adding ? (
        <div className="mt-3">
          <NoteForm journeyId={journeyId} kind={kind} onDone={() => setAdding(false)} />
        </div>
      ) : null}

      {notes.length === 0 && !adding ? (
        <p className="mt-2 text-xs text-slate-400">Nothing recorded.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {notes.map((note, index) => (
            <NoteRow
              key={note.id}
              note={note}
              journeyId={journeyId}
              orderedIds={notes.map((n) => n.id)}
              index={index}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

function NoteRow({
  note,
  journeyId,
  orderedIds,
  index,
}: {
  note: NoteItem;
  journeyId: string;
  orderedIds: string[];
  index: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function act(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) return setError(result.error ?? "Something went wrong");
      setError(null);
      router.refresh();
    });
  }

  function move(direction: -1 | 1) {
    const next = [...orderedIds];
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= next.length) return;
    [next[index], next[swapWith]] = [next[swapWith], next[index]];
    act(() => reorderJourneyNotes(journeyId, next));
  }

  if (editing) {
    return (
      <li>
        <NoteForm journeyId={journeyId} kind={note.kind} note={note} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="group border-l-2 border-slate-200 pl-3">
      <p className="whitespace-pre-wrap text-xs text-slate-700">{note.body}</p>
      <ErrorBanner message={error} />
      <div className="mt-1 flex items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
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
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          Edit
        </Button>
        <Button
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => {
            if (confirm("Delete this note?")) act(() => deleteJourneyNote(note.id));
          }}
        >
          Delete
        </Button>
      </div>
    </li>
  );
}

function NoteForm({
  journeyId,
  kind,
  note,
  onDone,
}: {
  journeyId: string;
  kind: NoteKind;
  note?: NoteItem;
  onDone: () => void;
}) {
  const router = useRouter();
  const [body, setBody] = useState(note?.body ?? "");
  const [noteKind, setNoteKind] = useState<NoteKind>(note?.kind ?? kind);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const payload = { journeyId, kind: noteKind, body };
      const result = note ? await updateJourneyNote(note.id, payload) : await createJourneyNote(payload);
      if (!result.ok) return setError(result.error);
      onDone();
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-md bg-slate-50 p-3">
      <ErrorBanner message={error} />
      <Field label="Note">
        <Textarea
          rows={3}
          autoFocus
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Carried forward: quoting stays out of scope for this release."
          required
        />
      </Field>
      <Field label="List" hint="Which heading this note sits under">
        <Select value={noteKind} onChange={(e) => setNoteKind(e.target.value as NoteKind)}>
          {KINDS.map((value) => (
            <option key={value} value={value}>
              {NOTE_KIND_LABELS[value]}
            </option>
          ))}
        </Select>
      </Field>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending || body.trim() === ""}>
          {pending ? "Saving…" : note ? "Save note" : "Add note"}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
