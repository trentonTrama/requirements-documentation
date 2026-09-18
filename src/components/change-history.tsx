import type { ChangeLogEntry } from "@prisma/client";
import { formatDateTime } from "@/lib/utils";

export function ChangeHistory({ entries }: { entries: ChangeLogEntry[] }) {
  if (entries.length === 0) {
    return <p className="text-xs text-slate-400">No changes recorded yet.</p>;
  }

  return (
    <ol className="space-y-2.5">
      {entries.map((entry) => (
        <li key={entry.id} className="border-l-2 border-slate-200 pl-3">
          <p className="text-xs text-slate-700">{entry.summary}</p>
          <p className="mt-0.5 text-[11px] text-slate-400">
            {entry.entityRef ? `${entry.entityRef} · ` : ""}
            {entry.authorName} · {formatDateTime(entry.createdAt)}
          </p>
        </li>
      ))}
    </ol>
  );
}
