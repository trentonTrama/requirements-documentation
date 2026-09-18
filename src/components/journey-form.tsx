"use client";

import type { JourneySide } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, ErrorBanner, Field, Input, Select, Textarea } from "./ui";
import { CapabilityPicker, type CapabilityOption } from "./capability-picker";
import { JOURNEY_SIDES, JOURNEY_SIDE_LABELS } from "@/lib/constants";
import { toKey, toSlug } from "@/lib/utils";
import { createJourney, updateJourney } from "@/lib/actions/journeys";

export type CategoryOption = { id: string; key: string; name: string };

export type JourneyFormValues = {
  title: string;
  key: string;
  slug: string;
  side: JourneySide;
  categoryId: string;
  statusNote: string;
  author: string;
  primarySource: string;
  docFile: string;
  asA: string;
  iWant: string;
  soThat: string;
  covers: string;
  notCovered: string;
  draftedOn: string;
  sortOrder: number;
  capabilityIds: string[];
};

const EMPTY: JourneyFormValues = {
  title: "",
  key: "",
  slug: "",
  side: "READ",
  categoryId: "",
  statusNote: "",
  author: "",
  primarySource: "",
  docFile: "",
  asA: "",
  iWant: "",
  soThat: "",
  covers: "",
  notCovered: "",
  draftedOn: "",
  sortOrder: 0,
  capabilityIds: [],
};

/**
 * One form for both creating and editing a journey document. On create the key
 * and slug follow the title until they are edited; on edit they are left alone,
 * because both are already in use -- the slug in URLs, the key in every
 * requirement reference the document has issued.
 */
export function JourneyForm({
  categories,
  capabilities,
  initial,
  journeyId,
  requirementCount = 0,
}: {
  categories: CategoryOption[];
  capabilities: CapabilityOption[];
  initial?: JourneyFormValues;
  journeyId?: string;
  requirementCount?: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [values, setValues] = useState<JourneyFormValues>(
    initial ?? { ...EMPTY, categoryId: categories[0]?.id ?? "" },
  );

  function set<K extends keyof JourneyFormValues>(key: K, value: JourneyFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const payload = { ...values, draftedOn: values.draftedOn || null };
      const result = journeyId ? await updateJourney(journeyId, payload) : await createJourney(payload);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/journeys/${journeyId ?? result.data}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <ErrorBanner message={error} />

      <Field label="Title">
        <Input
          value={values.title}
          required
          placeholder="Business Entity Data — Write"
          onChange={(e) => {
            const title = e.target.value;
            setValues((v) => ({
              ...v,
              title,
              key: journeyId ? v.key : toKey(title),
              slug: journeyId ? v.slug : toSlug(title),
            }));
          }}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Domain">
          <Select value={values.categoryId} onChange={(e) => set("categoryId", e.target.value)} required>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.key} — {category.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Side" hint="Whether the document covers reading the surface or changing it">
          <Select value={values.side} onChange={(e) => set("side", e.target.value as JourneySide)}>
            {JOURNEY_SIDES.map((side) => (
              <option key={side} value={side}>
                {JOURNEY_SIDE_LABELS[side]}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          label="Key"
          hint={
            journeyId
              ? requirementCount > 0
                ? `${requirementCount} existing reference(s) keep the old prefix; only new ones use this`
                : "Used as the prefix of every requirement reference"
              : `New references will be FR-${values.key || "…"}-001`
          }
        >
          <Input
            value={values.key}
            required
            onChange={(e) => set("key", e.target.value.toUpperCase())}
          />
        </Field>
        <Field label="Slug" hint="Used in the document's URL">
          <Input value={values.slug} required onChange={(e) => set("slug", e.target.value)} />
        </Field>
        <Field label="Sort order" hint="Position within the domain">
          <Input
            type="number"
            min={0}
            max={999}
            value={values.sortOrder}
            onChange={(e) => set("sortOrder", Number(e.target.value))}
          />
        </Field>
      </div>

      <Field label="Status" hint="Where the document itself stands">
        <Textarea rows={2} value={values.statusNote} onChange={(e) => set("statusNote", e.target.value)} />
      </Field>

      <div className="space-y-4 rounded-md border border-slate-200 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">User story</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="As a">
            <Input value={values.asA} onChange={(e) => set("asA", e.target.value)} placeholder="underwriter" />
          </Field>
          <Field label="I want">
            <Textarea rows={2} value={values.iWant} onChange={(e) => set("iWant", e.target.value)} />
          </Field>
          <Field label="So that">
            <Textarea rows={2} value={values.soThat} onChange={(e) => set("soThat", e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Covers" hint="What this document is responsible for">
            <Textarea rows={3} value={values.covers} onChange={(e) => set("covers", e.target.value)} />
          </Field>
          <Field label="Not covered" hint="What is deliberately left to another document">
            <Textarea
              rows={3}
              value={values.notCovered}
              onChange={(e) => set("notCovered", e.target.value)}
            />
          </Field>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Author">
          <Input value={values.author} onChange={(e) => set("author", e.target.value)} />
        </Field>
        <Field label="Drafted on">
          <Input
            type="date"
            value={values.draftedOn}
            onChange={(e) => set("draftedOn", e.target.value)}
          />
        </Field>
        <Field label="Document file" hint="The source document this was written from">
          <Input value={values.docFile} onChange={(e) => set("docFile", e.target.value)} />
        </Field>
        <Field label="Primary source" hint="Where the content came from in the archive">
          <Textarea
            rows={2}
            value={values.primarySource}
            onChange={(e) => set("primarySource", e.target.value)}
          />
        </Field>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-slate-600">Capabilities</p>
        <CapabilityPicker
          capabilities={capabilities}
          selected={values.capabilityIds}
          onChange={(ids) => set("capabilityIds", ids)}
        />
        <p className="text-xs text-slate-400">
          Every requirement on this journey inherits these unless it declares its own.
        </p>
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : journeyId ? "Save changes" : "Create journey"}
        </Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
