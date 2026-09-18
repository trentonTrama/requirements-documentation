import { CapabilityBadge } from "./badges";
import type { CapabilityLike, CapabilitySource } from "@/lib/capabilities";

/**
 * Renders resolved capabilities and, crucially, makes the inheritance mode
 * visible: inherited capabilities are shown muted with an "inherited" tag,
 * overrides solid.
 */
export function CapabilityChips({
  capabilities,
  source,
  emptyLabel = "No capabilities assigned",
  showSource = true,
}: {
  capabilities: CapabilityLike[];
  source?: CapabilitySource;
  emptyLabel?: string;
  showSource?: boolean;
}) {
  const inherited = source === "inherited";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {capabilities.length === 0 ? (
        <span className="text-xs italic text-slate-400">{emptyLabel}</span>
      ) : (
        capabilities.map((capability) => (
          <CapabilityBadge key={capability.id} capability={capability} muted={inherited} />
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
              ? "These capabilities come from the parent requirement"
              : "This criterion declares its own capabilities, replacing the inherited set"
          }
        >
          {inherited ? "inherited" : "override"}
        </span>
      ) : null}
    </div>
  );
}
