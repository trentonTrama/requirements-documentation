"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { CapabilityAction } from "@prisma/client";
import { Button, Card, EmptyState, ErrorBanner, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { CapabilityActionBadge, RoleBadge } from "@/components/badges";
import {
  BADGE_COLORS,
  CAPABILITY_ACTIONS,
  CAPABILITY_ACTION_LABELS,
  badgeColorClass,
} from "@/lib/constants";
import { toConstantKey } from "@/lib/utils";
import { createCapability, deleteCapability, updateCapability } from "@/lib/actions/capabilities";

type CapabilityRow = {
  id: string;
  key: string;
  name: string;
  description: string;
  resource: string;
  action: CapabilityAction;
  color: string;
  roles: { id: string; key: string; name: string; color: string }[];
  _count: { journeys: number; requirements: number; acceptanceCriteria: number; roles: number };
};

const EMPTY = {
  key: "",
  name: "",
  description: "",
  resource: "",
  action: "VIEW" as CapabilityAction,
  color: "slate",
};

export function CapabilityManager({ capabilities }: { capabilities: CapabilityRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<CapabilityRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setValues(EMPTY);
    setError(null);
    setCreating(true);
  }

  function openEdit(capability: CapabilityRow) {
    setValues({
      key: capability.key,
      name: capability.name,
      description: capability.description,
      resource: capability.resource,
      action: capability.action,
      color: capability.color,
    });
    setError(null);
    setEditing(capability);
  }

  function close() {
    setCreating(false);
    setEditing(null);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = editing
        ? await updateCapability(editing.id, values)
        : await createCapability(values);
      if (!result.ok) return setError(result.error);
      close();
      router.refresh();
    });
  }

  function remove(capability: CapabilityRow) {
    if (
      !confirm(
        `Delete ${capability.name}? It will be unassigned from all journeys, requirements and criteria, and removed from ${capability._count.roles} role(s).`,
      )
    )
      return;
    startTransition(async () => {
      const result = await deleteCapability(capability.id);
      if (!result.ok) return alert(result.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>New capability</Button>
      </div>

      {capabilities.length === 0 ? (
        <EmptyState
          title="No capabilities yet"
          hint="Define what the system lets someone do, one permission at a time."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {capabilities.map((capability) => (
            <Card key={capability.id} className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeColorClass(capability.color)}`}
                  >
                    {capability.name}
                  </span>
                  <p className="mt-1 font-mono text-[11px] text-slate-400">{capability.key}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(capability)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => remove(capability)}>
                    Delete
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <CapabilityActionBadge action={capability.action} />
                {capability.resource ? (
                  <span className="text-xs text-slate-500">{capability.resource}</span>
                ) : null}
              </div>

              {capability.description ? (
                <p className="text-sm text-slate-600">{capability.description}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-400">Granted to</span>
                {capability.roles.length === 0 ? (
                  <span className="text-[11px] italic text-slate-400">no roles yet</span>
                ) : (
                  capability.roles.map((role) => <RoleBadge key={role.id} role={role} />)
                )}
              </div>

              <div className="mt-auto flex items-center justify-between pt-2 text-[11px] text-slate-400">
                <span>
                  {capability._count.journeys} journeys · {capability._count.requirements} requirement
                  overrides · {capability._count.acceptanceCriteria} criterion overrides
                </span>
                <Link href={`/capabilities/${capability.id}`} className="text-slate-600 hover:underline">
                  View coverage →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={creating || editing !== null}
        onClose={close}
        title={editing ? "Edit capability" : "New capability"}
      >
        <form onSubmit={submit} className="space-y-4">
          <ErrorBanner message={error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input
                value={values.name}
                required
                onChange={(e) => {
                  const name = e.target.value;
                  setValues((v) => ({ ...v, name, key: editing ? v.key : toConstantKey(name) }));
                }}
              />
            </Field>
            <Field label="Key" hint="Uppercase letters, digits and underscores, e.g. POLICY_CHANGE">
              <Input
                value={values.key}
                required
                onChange={(e) => setValues((v) => ({ ...v, key: e.target.value.toUpperCase() }))}
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Action" hint="What the holder may do">
              <Select
                value={values.action}
                onChange={(e) =>
                  setValues((v) => ({ ...v, action: e.target.value as CapabilityAction }))
                }
              >
                {CAPABILITY_ACTIONS.map((action) => (
                  <option key={action} value={action}>
                    {CAPABILITY_ACTION_LABELS[action]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Resource" hint="What it acts on">
              <Input
                value={values.resource}
                placeholder="Coverage, exposure and rating"
                onChange={(e) => setValues((v) => ({ ...v, resource: e.target.value }))}
              />
            </Field>
          </div>
          <Field label="Description">
            <Textarea
              rows={3}
              value={values.description}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
            />
          </Field>
          <Field label="Colour">
            <Select
              value={values.color}
              onChange={(e) => setValues((v) => ({ ...v, color: e.target.value }))}
            >
              {BADGE_COLORS.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : editing ? "Save capability" : "Create capability"}
            </Button>
            <Button type="button" variant="secondary" onClick={close}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
