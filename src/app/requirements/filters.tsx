"use client";

import type { JourneySide } from "@prisma/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Select } from "@/components/ui";
import {
  JOURNEY_SIDES,
  JOURNEY_SIDE_LABELS,
  PRIORITIES,
  PRIORITY_LABELS,
  REQUIREMENT_STATUSES,
  STATUS_LABELS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

const FILTER_KEYS = [
  "project",
  "journey",
  "side",
  "status",
  "priority",
  "capability",
  "role",
  "decision",
  "state",
  "q",
];

export function RequirementFilters({
  journeys,
  capabilities,
  roles,
  projects,
}: {
  journeys: { id: string; title: string; key: string; side: JourneySide }[];
  capabilities: { id: string; name: string }[];
  roles: { id: string; name: string }[];
  projects: { id: string; name: string }[];
}) {
  const router = useRouter();
  const params = useSearchParams();

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.push(`/requirements?${next.toString()}`);
  }

  function toggle(key: string) {
    update(key, params.get(key) === "1" ? "" : "1");
  }

  const hasFilters = FILTER_KEYS.some((key) => params.get(key));

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        update("q", String(data.get("q") ?? ""));
      }}
    >
      <input
        name="q"
        defaultValue={params.get("q") ?? ""}
        placeholder="Search requirements and criteria"
        className="w-64 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-slate-500"
      />
      <Select
        className="w-auto"
        value={params.get("project") ?? ""}
        onChange={(e) => update("project", e.target.value)}
      >
        <option value="">All projects</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </Select>
      <Select
        className="w-auto"
        value={params.get("journey") ?? ""}
        onChange={(e) => update("journey", e.target.value)}
      >
        <option value="">All journeys</option>
        {journeys.map((journey) => (
          <option key={journey.id} value={journey.id}>
            {journey.key} — {journey.title}
          </option>
        ))}
      </Select>
      <Select className="w-auto" value={params.get("side") ?? ""} onChange={(e) => update("side", e.target.value)}>
        <option value="">Read & write</option>
        {JOURNEY_SIDES.map((side) => (
          <option key={side} value={side}>
            {JOURNEY_SIDE_LABELS[side]}
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
        value={params.get("capability") ?? ""}
        onChange={(e) => update("capability", e.target.value)}
      >
        <option value="">All capabilities</option>
        {capabilities.map((capability) => (
          <option key={capability.id} value={capability.id}>
            {capability.name}
          </option>
        ))}
      </Select>
      <Select className="w-auto" value={params.get("role") ?? ""} onChange={(e) => update("role", e.target.value)}>
        <option value="">Any role</option>
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.name}
          </option>
        ))}
      </Select>

      <Toggle active={params.get("decision") === "1"} onClick={() => toggle("decision")}>
        Decision required
      </Toggle>
      <Toggle active={params.get("state") === "1"} onClick={() => toggle("state")}>
        State specific
      </Toggle>

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

function Toggle({
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
      aria-pressed={active}
      className={cn(
        "rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-inset transition-colors",
        active
          ? "bg-slate-900 text-white ring-slate-900"
          : "bg-white text-slate-500 ring-slate-300 hover:text-slate-900",
      )}
    >
      {children}
    </button>
  );
}
