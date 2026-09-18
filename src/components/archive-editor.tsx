"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Card, ErrorBanner, Field, Input, Textarea } from "./ui";
import {
  createArchiveItem,
  deleteArchiveItem,
  reorderArchiveItems,
  updateArchiveItem,
} from "@/lib/actions/archive-items";

export type ArchiveItemRow = {
  id: string;
  item: string;
  source: string;
  disposition: string;
  sortOrder: number;
};

/** The archive items a document deliberately did not carry, and where they went. */
export function ArchiveEditor({
  journeyId,
  items,
}: {
  journeyId: string;
  items: ArchiveItemRow[];
}) {
  const [adding, setAdding] = useState(false);

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-900">
          Archive items not carried <span className="text-slate-400">({items.length})</span>
        </h2>
        <Button
          size="sm"
          variant="ghost"
          aria-label={adding ? "Close the archive item form" : "Add an archive item"}
          onClick={() => setAdding((v) => !v)}
        >
          {adding ? "Close" : "Add"}
        </Button>
      </div>

      {adding ? (
        <div className="mt-3">
          <ArchiveForm journeyId={journeyId} onDone={() => setAdding(false)} />
        </div>
      ) : null}

      {items.length === 0 && !adding ? (
        <p className="mt-2 text-xs text-slate-400">Nothing recorded.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {items.map((entry, index) => (
            <ArchiveRow
              key={entry.id}
              entry={entry}
              journeyId={journeyId}
              orderedIds={items.map((i) => i.id)}
              index={index}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

function ArchiveRow({
  entry,
  journeyId,
  orderedIds,
  index,
}: {
  entry: ArchiveItemRow;
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
    act(() => reorderArchiveItems(journeyId, next));
  }

  if (editing) {
    return (
      <li>
        <ArchiveForm journeyId={journeyId} entry={entry} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="group border-l-2 border-slate-200 pl-3">
      <p className="whitespace-pre-wrap text-xs text-slate-700">{entry.item}</p>
      <p className="mt-0.5 text-[11px] text-slate-400">
        {entry.source ? `${entry.source} · ` : ""}
        {entry.disposition}
      </p>
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
            if (confirm("Delete this archive item?")) act(() => deleteArchiveItem(entry.id));
          }}
        >
          Delete
        </Button>
      </div>
    </li>
  );
}

function ArchiveForm({
  journeyId,
  entry,
  onDone,
}: {
  journeyId: string;
  entry?: ArchiveItemRow;
  onDone: () => void;
}) {
  const router = useRouter();
  const [item, setItem] = useState(entry?.item ?? "");
  const [source, setSource] = useState(entry?.source ?? "");
  const [disposition, setDisposition] = useState(entry?.disposition ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const payload = { journeyId, item, source, disposition };
      const result = entry
        ? await updateArchiveItem(entry.id, payload)
        : await createArchiveItem(payload);
      if (!result.ok) return setError(result.error);
      onDone();
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-md bg-slate-50 p-3">
      <ErrorBanner message={error} />
      <Field label="Item">
        <Textarea
          rows={2}
          autoFocus
          value={item}
          onChange={(e) => setItem(e.target.value)}
          placeholder="Bulk endorsement upload"
          required
        />
      </Field>
      <Field label="Source" hint="Where it sat in the archive">
        <Input value={source} onChange={(e) => setSource(e.target.value)} />
      </Field>
      <Field label="Disposition" hint="Where it went instead, or why it was dropped">
        <Textarea
          rows={2}
          value={disposition}
          onChange={(e) => setDisposition(e.target.value)}
          placeholder="Deferred to the servicing workstream"
        />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending || item.trim() === ""}>
          {pending ? "Saving…" : entry ? "Save item" : "Add item"}
        </Button>
        <Button type="button" size="sm" variant="secondary" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
