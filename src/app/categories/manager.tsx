"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, Card, EmptyState, ErrorBanner, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { PERSONA_COLORS, personaColorClass } from "@/lib/constants";
import { toKey } from "@/lib/utils";
import { createCategory, deleteCategory, updateCategory } from "@/lib/actions/categories";

type CategoryRow = {
  id: string;
  key: string;
  name: string;
  description: string;
  color: string;
  sortOrder: number;
  _count: { requirements: number };
};

const EMPTY = { key: "", name: "", description: "", color: "slate", sortOrder: 0 };

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<CategoryRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [values, setValues] = useState<typeof EMPTY>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    setCreating(false);
    setEditing(null);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = editing ? await updateCategory(editing.id, values) : await createCategory(values);
      if (!result.ok) return setError(result.error);
      close();
      router.refresh();
    });
  }

  function remove(category: CategoryRow) {
    if (!confirm(`Delete ${category.name}?`)) return;
    startTransition(async () => {
      const result = await deleteCategory(category.id);
      if (!result.ok) return alert(result.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setValues({ ...EMPTY, sortOrder: categories.length });
            setError(null);
            setCreating(true);
          }}
        >
          New category
        </Button>
      </div>

      {categories.length === 0 ? (
        <EmptyState title="No categories yet" hint="Requirements cannot be created without one." />
      ) : (
        <Card className="divide-y divide-slate-100">
          {categories.map((category) => (
            <div key={category.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="w-10 font-mono text-[11px] text-slate-400">{category.sortOrder}</span>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${personaColorClass(category.color)}`}
              >
                {category.name}
              </span>
              <span className="font-mono text-[11px] text-slate-400">{category.key}</span>
              <span className="flex-1 text-sm text-slate-600">{category.description}</span>
              <Link
                href={`/requirements?category=${category.id}`}
                className="text-[11px] text-slate-500 hover:underline"
              >
                {category._count.requirements} requirements
              </Link>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setValues({
                      key: category.key,
                      name: category.name,
                      description: category.description,
                      color: category.color,
                      sortOrder: category.sortOrder,
                    });
                    setError(null);
                    setEditing(category);
                  }}
                >
                  Edit
                </Button>
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => remove(category)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </Card>
      )}

      <Modal
        open={creating || editing !== null}
        onClose={close}
        title={editing ? "Edit category" : "New category"}
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
                  setValues((v) => ({ ...v, name, key: editing ? v.key : toKey(name) }));
                }}
              />
            </Field>
            <Field
              label="Key"
              hint={
                editing
                  ? "Changing this affects new references only; existing ones stay as they are"
                  : "Used in requirement references, e.g. FR-BIL-001"
              }
            >
              <Input
                value={values.key}
                required
                onChange={(e) => setValues((v) => ({ ...v, key: e.target.value.toUpperCase() }))}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Colour">
              <Select value={values.color} onChange={(e) => setValues((v) => ({ ...v, color: e.target.value }))}>
                {PERSONA_COLORS.map((color) => (
                  <option key={color} value={color}>
                    {color}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Sort order">
              <Input
                type="number"
                min={0}
                value={values.sortOrder}
                onChange={(e) => setValues((v) => ({ ...v, sortOrder: Number(e.target.value) }))}
              />
            </Field>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : editing ? "Save category" : "Create category"}
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
