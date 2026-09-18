"use client";

import type { ChangeClass, JourneySide } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, ErrorBanner, Field, Input, Select, Textarea } from "./ui";
import { PersonaPicker, type PersonaOption } from "./persona-picker";
import {
  CHANGE_CLASSES,
  CHANGE_CLASS_LABELS,
  JOURNEY_SIDE_LABELS,
  PRIORITIES,
  PRIORITY_LABELS,
  REQUIREMENT_STATUSES,
  STATUS_LABELS,
} from "@/lib/constants";
import { createRequirement, updateRequirement } from "@/lib/actions/requirements";

export type JourneyOption = {
  id: string;
  key: string;
  title: string;
  side: JourneySide;
  personas: { id: string; name: string }[];
};

export type RequirementFormValues = {
  title: string;
  description: string;
  rationale: string;
  assumptions: string;
  sourceNotes: string;
  status: string;
  priority: string;
  journeyId: string;
  section: string;
  sectionOrder: number;
  sectionStateSpecific: boolean;
  changeClass: ChangeClass | "";
  decisionRequired: boolean;
  stateSpecific: boolean;
  personaIds: string[];
};

export function RequirementForm({
  journeys,
  personas,
  initial,
  requirementId,
  requirementRef,
}: {
  journeys: JourneyOption[];
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
      sourceNotes: "",
      status: "DRAFT",
      priority: "SHOULD",
      journeyId: journeys[0]?.id ?? "",
      section: "",
      sectionOrder: 0,
      sectionStateSpecific: false,
      changeClass: "",
      decisionRequired: false,
      stateSpecific: false,
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
      const payload = { ...values, changeClass: values.changeClass || null };
      const result = requirementId
        ? await updateRequirement(requirementId, payload)
        : await createRequirement(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/requirements/${requirementId ?? result.data}`);
      router.refresh();
    });
  }

  const journey = journeys.find((j) => j.id === values.journeyId);
  const inheritedNames = journey?.personas.map((p) => p.name).join(", ") || "no personas";

  return (
    <form onSubmit={submit} className="space-y-5">
      <ErrorBanner message={error} />

      <Field label="Requirement">
        <Textarea
          rows={2}
          value={values.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Users can see every entity named on the policy without navigating between entities"
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Journey"
          hint={
            requirementRef
              ? `Reference ${requirementRef} stays the same if you move this`
              : journey
                ? `New reference will be FR-${journey.key}-…`
                : undefined
          }
        >
          <Select value={values.journeyId} onChange={(e) => set("journeyId", e.target.value)} required>
            {journeys.map((option) => (
              <option key={option.id} value={option.id}>
                {option.key} — {option.title} ({JOURNEY_SIDE_LABELS[option.side]})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Section" hint="The requirement group within the document">
          <Input
            value={values.section}
            onChange={(e) => set("section", e.target.value)}
            placeholder="Named entities"
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
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
        <Field label="Change class" hint="How the change reaches the policy">
          <Select
            value={values.changeClass}
            onChange={(e) => set("changeClass", e.target.value as ChangeClass | "")}
          >
            <option value="">None</option>
            {CHANGE_CLASSES.map((value) => (
              <option key={value} value={value}>
                {CHANGE_CLASS_LABELS[value]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="flex flex-wrap gap-4">
        <Checkbox
          label="Decision required"
          checked={values.decisionRequired}
          onChange={(v) => set("decisionRequired", v)}
        />
        <Checkbox
          label="State specific"
          checked={values.stateSpecific}
          onChange={(v) => set("stateSpecific", v)}
        />
        <Checkbox
          label="Whole section is state specific"
          checked={values.sectionStateSpecific}
          onChange={(v) => set("sectionStateSpecific", v)}
        />
      </div>

      <Field label="Description">
        <Textarea rows={4} value={values.description} onChange={(e) => set("description", e.target.value)} />
      </Field>

      <Field label="Source notes" hint="Where this came from, and what changed since">
        <Textarea rows={3} value={values.sourceNotes} onChange={(e) => set("sourceNotes", e.target.value)} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Rationale" hint="Why this requirement exists">
          <Textarea rows={3} value={values.rationale} onChange={(e) => set("rationale", e.target.value)} />
        </Field>
        <Field label="Assumptions" hint="What this depends on being true">
          <Textarea rows={3} value={values.assumptions} onChange={(e) => set("assumptions", e.target.value)} />
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
          {values.personaIds.length === 0
            ? `Leave empty to inherit from the journey (${inheritedNames}). Acceptance criteria inherit in turn.`
            : "This selection overrides the journey's personas for this requirement."}
        </p>
        {values.personaIds.length > 0 ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => set("personaIds", [])}>
            Clear (inherit from journey)
          </Button>
        ) : null}
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

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-slate-600">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-slate-300"
      />
      {label}
    </label>
  );
}
