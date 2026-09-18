"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Select } from "@/components/ui";
import { QUESTION_STATUSES, QUESTION_STATUS_LABELS } from "@/lib/constants";

export function QuestionFilters({
  categories,
  assignees,
}: {
  categories: { id: string; name: string }[];
  assignees: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/questions?${next.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        className="w-auto"
        value={params.get("status") ?? "OPEN"}
        onChange={(e) => update("status", e.target.value)}
      >
        {QUESTION_STATUSES.map((status) => (
          <option key={status} value={status}>
            {QUESTION_STATUS_LABELS[status]}
          </option>
        ))}
        <option value="ALL">All statuses</option>
      </Select>
      <Select
        className="w-auto"
        value={params.get("category") ?? ""}
        onChange={(e) => update("category", e.target.value)}
      >
        <option value="">All categories</option>
        {categories.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </Select>
      <Select
        className="w-auto"
        value={params.get("assignee") ?? ""}
        onChange={(e) => update("assignee", e.target.value)}
      >
        <option value="">Anyone</option>
        {assignees.map((assignee) => (
          <option key={assignee} value={assignee}>
            {assignee}
          </option>
        ))}
      </Select>
    </div>
  );
}
