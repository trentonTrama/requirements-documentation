"use client";

import { personaColorClass } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type PersonaOption = { id: string; name: string; color: string };

export function PersonaPicker({
  personas,
  selected,
  onChange,
}: {
  personas: PersonaOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  function toggle(id: string) {
    onChange(selected.includes(id) ? selected.filter((v) => v !== id) : [...selected, id]);
  }

  if (personas.length === 0) {
    return <p className="text-xs text-slate-400">No personas defined yet.</p>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {personas.map((persona) => {
        const active = selected.includes(persona.id);
        return (
          <button
            key={persona.id}
            type="button"
            onClick={() => toggle(persona.id)}
            aria-pressed={active}
            className={cn(
              "rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset transition-colors",
              active
                ? personaColorClass(persona.color)
                : "bg-white text-slate-400 ring-slate-200 hover:text-slate-700",
            )}
          >
            {persona.name}
          </button>
        );
      })}
    </div>
  );
}
