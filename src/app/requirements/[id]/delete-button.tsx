"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui";
import { deleteRequirement } from "@/lib/actions/requirements";

export function DeleteRequirementButton({ id, reference }: { id: string; reference: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <Button
        variant="danger"
        disabled={pending}
        onClick={() => {
          if (!confirm(`Delete ${reference}? Its acceptance criteria, comments and questions go too.`)) return;
          startTransition(async () => {
            const result = await deleteRequirement(id);
            if (!result.ok) return setError(result.error);
            router.push("/requirements");
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
