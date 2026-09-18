"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Card, EmptyState, ErrorBanner, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { CapabilityBadge } from "@/components/badges";
import { CapabilityPicker } from "@/components/capability-picker";
import { BADGE_COLORS, badgeColorClass } from "@/lib/constants";
import { toConstantKey } from "@/lib/utils";
import { createRole, deleteRole, updateRole } from "@/lib/actions/roles";

type CapabilityOption = { id: string; key: string; name: string; color: string };

type RoleRow = {
  id: string;
  key: string;
  name: string;
  description: string;
  goals: string;
  painPoints: string;
  color: string;
  sortOrder: number;
  capabilities: { id: string; key: string; name: string; color: string }[];
};

const EMPTY = {
  key: "",
  name: "",
  description: "",
  goals: "",
  painPoints: "",
  color: "slate",
  sortOrder: 0,
  capabilityIds: [] as string[],
};

export function RoleManager({
  roles,
  capabilities,
}: {
  roles: RoleRow[];
  capabilities: CapabilityOption[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setValues(EMPTY);
    setError(null);
    setCreating(true);
  }

  function openEdit(role: RoleRow) {
    setValues({
      key: role.key,
      name: role.name,
      description: role.description,
      goals: role.goals,
      painPoints: role.painPoints,
      color: role.color,
      sortOrder: role.sortOrder,
      capabilityIds: role.capabilities.map((capability) => capability.id),
    });
    setError(null);
    setEditing(role);
  }

  function close() {
    setCreating(false);
    setEditing(null);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = editing ? await updateRole(editing.id, values) : await createRole(values);
      if (!result.ok) return setError(result.error);
      close();
      router.refresh();
    });
  }

  function remove(role: RoleRow) {
    if (!confirm(`Delete ${role.name}? Its capabilities and the requirements under them stay as they are.`))
      return;
    startTransition(async () => {
      const result = await deleteRole(role.id);
      if (!result.ok) return alert(result.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>New role</Button>
      </div>

      {roles.length === 0 ? (
        <EmptyState title="No roles yet" hint="Bundle capabilities into the people who hold them." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {roles.map((role) => (
            <Card key={role.id} className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeColorClass(role.color)}`}
                  >
                    {role.name}
                  </span>
                  <p className="mt-1 font-mono text-[11px] text-slate-400">{role.key}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(role)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => remove(role)}>
                    Delete
                  </Button>
                </div>
              </div>

              {role.description ? <p className="text-sm text-slate-600">{role.description}</p> : null}

              <div className="flex flex-wrap items-center gap-1.5">
                {role.capabilities.length === 0 ? (
                  <span className="text-xs italic text-slate-400">Grants nothing yet</span>
                ) : (
                  role.capabilities.map((capability) => (
                    <CapabilityBadge key={capability.id} capability={capability} />
                  ))
                )}
              </div>

              <div className="mt-auto flex items-center justify-between pt-2 text-[11px] text-slate-400">
                <span>
                  {role.capabilities.length} capabilit{role.capabilities.length === 1 ? "y" : "ies"}
                </span>
                <Link href={`/roles/${role.id}`} className="text-slate-600 hover:underline">
                  View coverage →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={creating || editing !== null} onClose={close} title={editing ? "Edit role" : "New role"}>
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
            <Field label="Key" hint="Uppercase letters, digits and underscores">
              <Input
                value={values.key}
                required
                onChange={(e) => setValues((v) => ({ ...v, key: e.target.value.toUpperCase() }))}
              />
            </Field>
          </div>

          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-600">Capabilities</p>
            <CapabilityPicker
              capabilities={capabilities}
              selected={values.capabilityIds}
              onChange={(ids) => setValues((v) => ({ ...v, capabilityIds: ids }))}
            />
            <p className="text-xs text-slate-400">
              This is the whole configuration of the role: every requirement written against one of
              these capabilities is in its coverage.
            </p>
          </div>

          <Field label="Description">
            <Textarea
              rows={2}
              value={values.description}
              onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
            />
          </Field>
          <Field label="Goals">
            <Textarea
              rows={2}
              value={values.goals}
              onChange={(e) => setValues((v) => ({ ...v, goals: e.target.value }))}
            />
          </Field>
          <Field label="Pain points">
            <Textarea
              rows={2}
              value={values.painPoints}
              onChange={(e) => setValues((v) => ({ ...v, painPoints: e.target.value }))}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
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
            <Field label="Sort order">
              <Input
                type="number"
                value={values.sortOrder}
                onChange={(e) => setValues((v) => ({ ...v, sortOrder: Number(e.target.value) }))}
              />
            </Field>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : editing ? "Save role" : "Create role"}
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
