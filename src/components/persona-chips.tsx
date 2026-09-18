import { PersonaBadge } from "./badges";
import type { PersonaLike, PersonaSource } from "@/lib/personas";

/**
 * Renders resolved personas and, crucially, makes the inheritance mode visible:
 * inherited personas are shown muted with an "inherited" tag, overrides solid.
 */
export function PersonaChips({
  personas,
  source,
  emptyLabel = "No personas assigned",
  showSource = true,
}: {
  personas: PersonaLike[];
  source?: PersonaSource;
  emptyLabel?: string;
  showSource?: boolean;
}) {
  const inherited = source === "inherited";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {personas.length === 0 ? (
        <span className="text-xs italic text-slate-400">{emptyLabel}</span>
      ) : (
        personas.map((persona) => (
          <PersonaBadge key={persona.id} persona={persona} muted={inherited} />
        ))
      )}
      {showSource && source ? (
        <span
          className={
            inherited
              ? "text-[11px] uppercase tracking-wide text-slate-400"
              : "text-[11px] font-semibold uppercase tracking-wide text-violet-600"
          }
          title={
            inherited
              ? "These personas come from the parent requirement"
              : "This criterion declares its own personas, replacing the inherited set"
          }
        >
          {inherited ? "inherited" : "override"}
        </span>
      ) : null}
    </div>
  );
}
