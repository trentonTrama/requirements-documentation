"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, ErrorBanner, Field, Input, Select, Textarea } from "./ui";
import { PersonaPicker, type PersonaOption } from "./persona-picker";
import { PRIORITIES, PRIORITY_LABELS, REQUIREMENT_STATUSES, STATUS_LABELS } from "@/lib/constants";
import { createRequirement, updateRequirement } from "@/lib/actions/requirements";

type Category = { id: string; key: string; name: string };

export type RequirementFormValues = {
  title: string;
  description: string;
  rationale: string;
  assumptions: string;
  status: string;
  priority: string;
  categoryId: string;
  personaIds: string[];
};

export function RequirementForm({
  categories,
  personas,
  initial,
  requirementId,
  requirementRef,
}: {
  categories: Category[];
  personas: PersonaOption[];
  initial?: RequirementFormValues;
  requirementId?: string;
  requirementRef?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<RequirementFormValues>(
    initial ?? {
      title: "",
      description: "",
      rationale: "",
      assumptions: "",
      status: "DRAFT",
      priority: "SHOULD",
      categoryId: categories[0]?.id ?? "",
      personaIds: [],
    },
  );

  function set<K extends keyof RequirementFormValues>(key: K, value: RequirementFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = requirementId
        ? await updateRequirement(requirementId, values)
        : await createRequirement(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/requirements/${requirementId ?? result.data}`);
      router.refresh();
    });
  }

  const selectedCategory = categories.find((c) => c.id === values.categoryId);

  return (
    <form onSubmit={submit} className="space-y-5">
      <ErrorBanner message={error} />

      <Field label="Title">
        <Input
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Policyholder can pay a premium by card"
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Category"
          hint={
            requirementRef
              ? `Reference ${requirementRef} stays the same if you move this`
              : selectedCategory
                ? `New reference will be FR-${selectedCategory.key}-…`
                : undefined
          }
        >
          <Select value={values.categoryId} onChange={(e) => set("categoryId", e.target.value)} required>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={values.status} onChange={(e) => set("status", e.target.value)}>
            {REQUIREMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Priority">
          <Select value={values.priority} onChange={(e) => set("priority", e.target.value)}>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Description">
        <Textarea
          rows={5}
          value={values.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="What the system must do."
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Rationale" hint="Why this requirement exists">
          <Textarea rows={4} value={values.rationale} onChange={(e) => set("rationale", e.target.value)} />
        </Field>
        <Field label="Assumptions" hint="What this depends on being true">
          <Textarea rows={4} value={values.assumptions} onChange={(e) => set("assumptions", e.target.value)} />
        </Field>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-slate-600">Personas</p>
        <PersonaPicker
          personas={personas}
          selected={values.personaIds}
          onChange={(ids) => set("personaIds", ids)}
        />
        <p className="text-xs text-slate-400">
          Acceptance criteria inherit these personas unless they declare their own.
        </p>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : requirementId ? "Save changes" : "Create requirement"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
