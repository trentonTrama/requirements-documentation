"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, ErrorBanner } from "@/components/ui";
import { CategoryBadge, RefTag, SideBadge } from "@/components/badges";
import { cn } from "@/lib/utils";
import { setProjectMembers } from "@/lib/actions/projects";
import type { JourneySide } from "@prisma/client";

export type MemberOptions = {
  categories: { id: string; key: string; name: string; color: string }[];
  journeys: {
    id: string;
    key: string;
    title: string;
    side: JourneySide;
    categoryId: string;
    requirements: { id: string; ref: string; title: string }[];
  }[];
};

/**
 * Membership at all three levels, edited together: taking a domain already brings
 * its journeys and their requirements, so the narrower levels are for the cases
 * the domain does not cover.
 */
export function ProjectMembers({
  projectId,
  options,
  initial,
}: {
  projectId: string;
  options: MemberOptions;
  initial: { categoryIds: string[]; journeyIds: string[]; requirementIds: string[] };
}) {
  const router = useRouter();
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty =
    !sameSet(values.categoryIds, initial.categoryIds) ||
    !sameSet(values.journeyIds, initial.journeyIds) ||
    !sameSet(values.requirementIds, initial.requirementIds);

  function toggle(level: keyof typeof values, id: string) {
    setValues((current) => {
      const list = current[level];
      return {
        ...current,
        [level]: list.includes(id) ? list.filter((value) => value !== id) : [...list, id],
      };
    });
  }

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await setProjectMembers(projectId, values);
      if (!result.ok) return setError(result.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <ErrorBanner message={error} />

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-slate-600">Domains</p>
        <div className="flex flex-wrap gap-1.5">
          {options.categories.map((category) => (
            <Chip
              key={category.id}
              active={values.categoryIds.includes(category.id)}
              onClick={() => toggle("categoryIds", category.id)}
            >
              <CategoryBadge category={category} />
            </Chip>
          ))}
        </div>
        <p className="text-xs text-slate-400">
          A domain brings every journey under it, and every requirement under those.
        </p>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-slate-600">Journeys</p>
        <div className="flex flex-wrap gap-1.5">
          {options.journeys.map((journey) => {
            const viaCategory = values.categoryIds.includes(journey.categoryId);
            return (
              <Chip
                key={journey.id}
                active={values.journeyIds.includes(journey.id)}
                muted={viaCategory}
                onClick={() => toggle("journeyIds", journey.id)}
                title={viaCategory ? "Already in through its domain" : undefined}
              >
                <span className="flex items-center gap-1.5">
                  <RefTag value={journey.key} />
                  <span className="text-xs">{journey.title}</span>
                  <SideBadge side={journey.side} />
                </span>
              </Chip>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-slate-600">Individual requirements</p>
        <div className="space-y-1">
          {options.journeys.map((journey) => {
            const picked = journey.requirements.filter((requirement) =>
              values.requirementIds.includes(requirement.id),
            ).length;
            return (
              <details key={journey.id} className="rounded-md border border-slate-200 px-3 py-2">
                <summary className="cursor-pointer text-xs text-slate-600">
                  {journey.key} — {journey.title}
                  <span className="ml-2 text-slate-400">
                    {picked > 0 ? `${picked} picked` : `${journey.requirements.length} requirements`}
                  </span>
                </summary>
                <ul className="mt-2 space-y-1">
                  {journey.requirements.map((requirement) => (
                    <li key={requirement.id}>
                      <label className="flex items-start gap-2 text-xs text-slate-600">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300"
                          checked={values.requirementIds.includes(requirement.id)}
                          onChange={() => toggle("requirementIds", requirement.id)}
                        />
                        <RefTag value={requirement.ref} />
                        <span className="flex-1">{requirement.title}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
        </div>
      </div>

      {dirty ? (
        <div className="flex gap-2">
          <Button size="sm" disabled={pending} onClick={save}>
            {pending ? "Saving…" : "Save membership"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setValues(initial)}>
            Reset
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Chip({
  active,
  muted,
  onClick,
  title,
  children,
}: {
  active: boolean;
  muted?: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      title={title}
      className={cn(
        "rounded-full px-2 py-1 ring-1 ring-inset transition-colors",
        active ? "bg-slate-900/5 ring-slate-400" : "bg-white ring-slate-200 hover:ring-slate-300",
        !active && muted ? "opacity-50" : "",
      )}
    >
      {children}
    </button>
  );
}

function sameSet(a: string[], b: string[]) {
  return a.length === b.length && a.every((value) => b.includes(value));
}
