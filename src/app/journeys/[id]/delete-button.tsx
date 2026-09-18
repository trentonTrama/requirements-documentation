"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { deleteJourney } from "@/lib/actions/journeys";

export function DeleteJourneyButton({
  id,
  title,
  requirementCount,
}: {
  id: string;
  title: string;
  requirementCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button
        variant="danger"
        disabled={pending}
        onClick={() => {
          const carried =
            requirementCount > 0
              ? `Its ${requirementCount} requirement${requirementCount === 1 ? "" : "s"}, their acceptance criteria, and the document's notes, questions and archive items go too.`
              : "Its notes, questions and archive items go too.";
          if (!confirm(`Delete ${title}? ${carried}`)) return;
          startTransition(async () => {
            const result = await deleteJourney(id);
            if (!result.ok) return setError(result.error);
            router.push("/journeys");
            router.refresh();
          });
        }}
      >
        Delete
      </Button>
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </>
  );
}
