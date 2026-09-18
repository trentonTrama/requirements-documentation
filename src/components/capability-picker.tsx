"use client";

import { badgeColorClass } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type CapabilityOption = { id: string; name: string; color: string };

/**
 * Multi-select over capabilities. Used both where capabilities are assigned to a
 * document (journey, requirement, criterion) and where a role is configured with
 * the capabilities it grants -- the two are the same choice, made in two places.
 */
export function CapabilityPicker({
  capabilities,
  selected,
  onChange,
  emptyLabel = "No capabilities defined yet.",
}: {
  capabilities: CapabilityOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  emptyLabel?: string;
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id]);
  }

  if (capabilities.length === 0) {
    return <p className="text-xs text-slate-400">{emptyLabel}</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {capabilities.map((capability) => {
        const active = selected.includes(capability.id);
        return (
          <button
            key={capability.id}
            type="button"
            onClick={() => toggle(capability.id)}
            aria-pressed={active}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors",
              active
                ? badgeColorClass(capability.color)
                : "bg-white text-slate-400 ring-slate-200 hover:text-slate-700",
            )}
          >
            {capability.name}
          </button>
        );
      })}
    </div>
  );
}
