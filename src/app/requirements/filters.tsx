"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button, Select } from "@/components/ui";
import { PRIORITIES, PRIORITY_LABELS, REQUIREMENT_STATUSES, STATUS_LABELS } from "@/lib/constants";

export function RequirementFilters({
  categories,
  personas,
}: {
  categories: { id: string; name: string }[];
  personas: { id: string; name: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/requirements?${next.toString()}`);
  }

  const hasFilters = ["category", "status", "priority", "persona", "q"].some((key) => params.get(key));

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        update("q", String(data.get("q") ?? ""));
      }}
    >
      <input
        name="q"
        defaultValue={params.get("q") ?? ""}
        placeholder="Search title, description or reference"
        className="w-64 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-slate-500"
      />
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
        value={params.get("status") ?? ""}
        onChange={(e) => update("status", e.target.value)}
      >
        <option value="">All statuses</option>
        {REQUIREMENT_STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </Select>
      <Select
        className="w-auto"
        value={params.get("priority") ?? ""}
        onChange={(e) => update("priority", e.target.value)}
      >
        <option value="">All priorities</option>
        {PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {PRIORITY_LABELS[priority]}
          </option>
        ))}
      </Select>
      <Select
        className="w-auto"
        value={params.get("persona") ?? ""}
        onChange={(e) => update("persona", e.target.value)}
      >
        <option value="">All personas</option>
        {personas.map((persona) => (
          <option key={persona.id} value={persona.id}>
            {persona.name}
          </option>
        ))}
      </Select>
      <Button type="submit" variant="secondary">
        Search
      </Button>
      {hasFilters ? (
        <Button type="button" variant="ghost" onClick={() => router.push("/requirements")}>
          Clear
        </Button>
      ) : null}
    </form>
  );
}
