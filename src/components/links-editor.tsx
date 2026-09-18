"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { LinkType, RequirementStatus } from "@prisma/client";
import { Button, ErrorBanner, Select } from "./ui";
import { LinkTypeBadge, RefTag } from "./badges";
import { LINK_TYPES, LINK_TYPE_INVERSE_LABELS, LINK_TYPE_LABELS } from "@/lib/constants";
import { createLink, deleteLink } from "@/lib/actions/links";

type Related = { id: string; ref: string; title: string; status: RequirementStatus };

export type LinkRow = { id: string; type: LinkType; other: Related; direction: "from" | "to" };

export function LinksEditor({
  requirementId,
  links,
  candidates,
}: {
  requirementId: string;
  links: LinkRow[];
  candidates: { id: string; ref: string; title: string }[];
}) {
  const router = useRouter();
  const [type, setType] = useState<string>("DEPENDS_ON");
  const [targetId, setTargetId] = useState<string>(candidates[0]?.id ?? "");
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

  return (
    <div className="space-y-3">
      <ErrorBanner message={error} />

      {links.length === 0 ? (
        <p className="text-xs text-slate-400">No linked requirements.</p>
      ) : (
        <ul className="space-y-1.5">
          {links.map((link) => (
            <li key={`${link.id}-${link.direction}`} className="flex flex-wrap items-center gap-2">
              <LinkTypeBadge
                type={link.type}
                label={
                  link.direction === "from"
                    ? LINK_TYPE_LABELS[link.type]
                    : LINK_TYPE_INVERSE_LABELS[link.type]
                }
              />
              <Link
                href={`/requirements/${link.other.id}`}
                className="flex items-center gap-2 text-sm text-slate-700 hover:underline"
              >
                <RefTag value={link.other.ref} />
                {link.other.title}
              </Link>
              <button
                type="button"
                disabled={pending}
                onClick={() => act(() => deleteLink(link.id))}
                className="text-[11px] text-slate-400 hover:text-rose-600"
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {candidates.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <Select className="w-auto text-xs" value={type} onChange={(e) => setType(e.target.value)}>
            {LINK_TYPES.map((value) => (
              <option key={value} value={value}>
                {LINK_TYPE_LABELS[value]}
              </option>
            ))}
          </Select>
          <Select
            className="max-w-xs text-xs"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          >
            {candidates.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.ref} — {candidate.title}
              </option>
            ))}
          </Select>
          <Button
            size="sm"
            variant="secondary"
            disabled={pending || !targetId}
            onClick={() =>
              act(() => createLink({ fromRequirementId: requirementId, toRequirementId: targetId, type }))
            }
          >
            Add link
          </Button>
        </div>
      ) : null}
    </div>
  );
}
