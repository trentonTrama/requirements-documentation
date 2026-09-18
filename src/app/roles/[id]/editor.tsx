"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, ErrorBanner } from "@/components/ui";
import { CapabilityPicker, type CapabilityOption } from "@/components/capability-picker";
import { setRoleCapabilities } from "@/lib/actions/roles";

/** The role's whole configuration, edited in place on its page. */
export function RoleCapabilityEditor({
  roleId,
  capabilities,
  selected,
}: {
  roleId: string;
  capabilities: CapabilityOption[];
  selected: string[];
}) {
  const router = useRouter();
  const [ids, setIds] = useState(selected);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const dirty =
    ids.length !== selected.length || ids.some((id) => !selected.includes(id));

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await setRoleCapabilities(roleId, ids);
      if (!result.ok) return setError(result.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <ErrorBanner message={error} />
      <CapabilityPicker capabilities={capabilities} selected={ids} onChange={setIds} />
      {dirty ? (
        <div className="flex gap-2">
          <Button size="sm" disabled={pending} onClick={save}>
            {pending ? "Saving…" : "Save capabilities"}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setIds(selected)}>
            Reset
          </Button>
        </div>
      ) : null}
    </div>
  );
}
