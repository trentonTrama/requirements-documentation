"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { ProjectStatus } from "@prisma/client";
import { Button, Card, EmptyState, ErrorBanner, Field, Input, Modal, Select, Textarea } from "@/components/ui";
import { CategoryBadge, ProjectStatusBadge } from "@/components/badges";
import { BADGE_COLORS, PROJECT_STATUSES, PROJECT_STATUS_LABELS, badgeColorClass } from "@/lib/constants";
import { toConstantKey, toSlug } from "@/lib/utils";
import { createProject, deleteProject, updateProject } from "@/lib/actions/projects";

type ProjectRow = {
  id: string;
  key: string;
  slug: string;
  name: string;
  description: string;
  status: ProjectStatus;
  color: string;
  sortOrder: number;
  startsOn: Date | null;
  targetDate: Date | null;
  categories: { id: string; key: string; name: string; color: string }[];
  journeys: { id: string; key: string; title: string }[];
  requirementCount: number;
  openQuestionCount: number;
  _count: { categories: number; journeys: number; requirements: number };
};

const EMPTY = {
  key: "",
  slug: "",
  name: "",
  description: "",
  status: "ACTIVE" as ProjectStatus,
  color: "slate",
  sortOrder: 0,
  startsOn: "",
  targetDate: "",
};

const asDateInput = (value: Date | null) => (value ? value.toISOString().slice(0, 10) : "");

export function ProjectManager({ projects }: { projects: ProjectRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<ProjectRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [values, setValues] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function openCreate() {
    setValues(EMPTY);
    setError(null);
    setCreating(true);
  }

  function openEdit(project: ProjectRow) {
    setValues({
      key: project.key,
      slug: project.slug,
      name: project.name,
      description: project.description,
      status: project.status,
      color: project.color,
      sortOrder: project.sortOrder,
      startsOn: asDateInput(project.startsOn),
      targetDate: asDateInput(project.targetDate),
    });
    setError(null);
    setEditing(project);
  }

  function close() {
    setCreating(false);
    setEditing(null);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = editing ? await updateProject(editing.id, values) : await createProject(values);
      if (!result.ok) return setError(result.error);
      close();
      if (!editing && result.data) router.push(`/projects/${result.data}`);
      router.refresh();
    });
  }

  function remove(project: ProjectRow) {
    if (!confirm(`Delete ${project.name}? Its domains, journeys and requirements stay where they are.`))
      return;
    startTransition(async () => {
      const result = await deleteProject(project.id);
      if (!result.ok) return alert(result.error);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreate}>New project</Button>
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          hint="Group the domains, journeys and requirements that make up one piece of work."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {projects.map((project) => (
            <Card key={project.id} className="flex flex-col gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/projects/${project.slug}`}>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeColorClass(project.color)}`}
                      >
                        {project.name}
                      </span>
                    </Link>
                    <ProjectStatusBadge status={project.status} />
                  </div>
                  <p className="font-mono text-[11px] text-slate-400">{project.key}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(project)}>
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" disabled={pending} onClick={() => remove(project)}>
                    Delete
                  </Button>
                </div>
              </div>

              {project.description ? (
                <p className="line-clamp-2 text-sm text-slate-600">{project.description}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-1.5">
                {project.categories.map((category) => (
                  <CategoryBadge key={category.id} category={category} />
                ))}
                {project.journeys.length > 0 ? (
                  <span className="text-[11px] text-slate-400">
                    + {project.journeys.length} journey{project.journeys.length === 1 ? "" : "s"}
                  </span>
                ) : null}
                {project._count.requirements > 0 ? (
                  <span className="text-[11px] text-slate-400">
                    + {project._count.requirements} single requirement
                    {project._count.requirements === 1 ? "" : "s"}
                  </span>
                ) : null}
                {project._count.categories + project.journeys.length + project._count.requirements ===
                0 ? (
                  <span className="text-xs italic text-slate-400">Nothing in it yet</span>
                ) : null}
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-400">
                <span>
                  {project.requirementCount} requirements reached
                  {project.openQuestionCount > 0
                    ? ` · ${project.openQuestionCount} open questions`
                    : ""}
                </span>
                <Link href={`/projects/${project.slug}`} className="text-slate-600 hover:underline">
                  Open →
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={creating || editing !== null}
        onClose={close}
        title={editing ? "Edit project" : "New project"}
      >
        <form onSubmit={submit} className="space-y-4">
          <ErrorBanner message={error} />
          <Field label="Name">
            <Input
              value={values.name}
              required
              onChange={(e) => {
                const name = e.target.value;
                setValues((v) => ({
                  ...v,
                  name,
                  key: editing ? v.key : toConstantKey(name),
                  slug: editing ? v.slug : toSlug(name),
                }));
              }}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Key" hint="Uppercase letters, digits and underscores">
              <Input
                value={values.key}
                required
                onChange={(e) => setValues((v) => ({ ...v, key: e.target.value.toUpperCase() }))}
              />
            </Field>
            <Field label="Slug" hint="Used in the project's URL">
              <Input
                value={values.slug}
                required
                onChange={(e) => setValues((v) => ({ ...v, slug: e.target.value }))}
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
            <Field label="Status">
              <Select
                value={values.status}
                onChange={(e) => setValues((v) => ({ ...v, status: e.target.value as ProjectStatus }))}
              >
                {PROJECT_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {PROJECT_STATUS_LABELS[status]}
                  </option>
                ))}
              </Select>
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
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Starts on">
              <Input
                type="date"
                value={values.startsOn}
                onChange={(e) => setValues((v) => ({ ...v, startsOn: e.target.value }))}
              />
            </Field>
            <Field label="Target date">
              <Input
                type="date"
                value={values.targetDate}
                onChange={(e) => setValues((v) => ({ ...v, targetDate: e.target.value }))}
              />
            </Field>
          </div>
          <p className="text-xs text-slate-400">
            Membership is edited on the project&apos;s own page, where the whole tree is in view.
          </p>
          <div className="flex gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : editing ? "Save project" : "Create project"}
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
