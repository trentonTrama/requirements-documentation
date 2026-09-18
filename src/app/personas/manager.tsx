"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Card, EmptyState, ErrorBanner, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { PERSONA_COLORS, personaColorClass } from "@/lib/constants";
import { toKey } from "@/lib/utils";
import { createPersona, deletePersona, updatePersona } from "@/lib/actions/personas";

type PersonaRow = {
  id: string;
  key: string;
  name: string;
  description: string;
  goals: string;
  painPoints: string;
  color: string;
  _count: { requirements: number; acceptanceCriteria: number };
};

const EMPTY = { key: "", name: "", description: "", goals: "", painPoints: "", color: "slate" };

export function PersonaManager({ personas }: { personas: PersonaRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<PersonaRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setValues(EMPTY);
    setError(null);
    setCreating(true);
  }

  function openEdit(persona: PersonaRow) {
    setValues({
      key: persona.key,
      name: persona.name,
      description: persona.description,
      goals: persona.goals,
      painPoints: persona.painPoints,
      color: persona.color,
    });
    setError(null);
    setEditing(persona);
  }

  function close() {
    setCreating(false);
    setEditing(null);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = editing ? await updatePersona(editing.id, values) : await createPersona(values);
      if (!result.ok) return setError(result.error);
      close();
      router.refresh();
    });
  }

  function remove(persona: PersonaRow) {
    if (!confirm(`Delete ${persona.name}? It will be unassigned from all requirements and criteria.`))
      return;
    startTransition(async () => {
      const result = await deletePersona(persona.id);
      if (!result.ok) return alert(result.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>New persona</Button>
      </div>

      {personas.length === 0 ? (
        <EmptyState title="No personas yet" hint="Define who the system is being built for." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {personas.map((persona) => (
            <Card key={persona.id} className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${personaColorClass(persona.color)}`}
                  >
                    {persona.name}
                  </span>
                  <p className="mt-1 font-mono text-[11px] text-slate-400">{persona.key}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(persona)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => remove(persona)}>
                    Delete
                  </Button>
                </div>
              </div>

              {persona.description ? (
                <p className="text-sm text-slate-600">{persona.description}</p>
              ) : null}
              {persona.goals ? (
                <p className="text-xs text-slate-500">
                  <span className="font-medium text-slate-600">Goals: </span>
                  {persona.goals}
                </p>
              ) : null}
              {persona.painPoints ? (
                <p className="text-xs text-slate-500">
                  <span className="font-medium text-slate-600">Pain points: </span>
                  {persona.painPoints}
                </p>
              ) : null}

              <div className="mt-auto flex items-center justify-between pt-2 text-[11px] text-slate-400">
                <span>
                  {persona._count.requirements} requirements · {persona._count.acceptanceCriteria} criteria
                  overridden
                </span>
                <Link href={`/personas/${persona.id}`} className="text-slate-600 hover:underline">
                  View coverage →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={creating || editing !== null} onClose={close} title={editing ? "Edit persona" : "New persona"}>
        <form onSubmit={submit} className="space-y-4">
          <ErrorBanner message={error} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input
                value={values.name}
                required
                onChange={(e) => {
                  const name = e.target.value;
                  setValues((v) => ({
                    ...v,
                    name,
                    key: editing ? v.key : toKey(name),
                  }));
                }}
              />
            </Field>
            <Field label="Key" hint="Uppercase letters and digits, used as a short handle">
              <Input
                value={values.key}
                required
                onChange={(e) => setValues((v) => ({ ...v, key: e.target.value.toUpperCase() }))}
              />
            </Field>
          </div>
          <Field label="Description">
            <Textarea rows={3} value={values.description} onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))} />
          </Field>
          <Field label="Goals">
            <Textarea rows={2} value={values.goals} onChange={(e) => setValues((v) => ({ ...v, goals: e.target.value }))} />
          </Field>
          <Field label="Pain points">
            <Textarea rows={2} value={values.painPoints} onChange={(e) => setValues((v) => ({ ...v, painPoints: e.target.value }))} />
          </Field>
          <Field label="Colour">
            <Select value={values.color} onChange={(e) => setValues((v) => ({ ...v, color: e.target.value }))}>
              {PERSONA_COLORS.map((color) => (
                <option key={color} value={color}>
                  {color}
                </option>
              ))}
            </Select>
          </Field>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : editing ? "Save persona" : "Create persona"}
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
