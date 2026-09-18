import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getRequirement, listPersonas, requirementHistory } from "@/lib/queries";
import { resolveRequirementPersonas } from "@/lib/personas";
import { Button, Card } from "@/components/ui";
import {
  CategoryBadge,
  ChangeClassBadge,
  DecisionRequiredBadge,
  PriorityBadge,
  RefTag,
  SideBadge,
  StateSpecificBadge,
  StatusBadge,
} from "@/components/badges";
import { PersonaChips } from "@/components/persona-chips";
import { CriterionList } from "@/components/criterion-list";
import { DiscussionPanel } from "@/components/discussion-panel";
import { ChangeHistory } from "@/components/change-history";
import { LinksEditor, type LinkRow } from "@/components/links-editor";
import { DeleteRequirementButton } from "./delete-button";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RequirementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const requirement = await getRequirement(id);
  if (!requirement) notFound();

  const [personas, history, candidates] = await Promise.all([
    listPersonas(),
    requirementHistory(
      requirement.id,
      requirement.acceptanceCriteria.map((criterion) => criterion.id),
    ),
    prisma.functionalRequirement.findMany({
      where: { id: { not: requirement.id } },
      select: { id: true, ref: true, title: true },
      orderBy: { ref: "asc" },
    }),
  ]);

  const links: LinkRow[] = [
    ...requirement.linksFrom.map((link) => ({
      id: link.id,
      type: link.type,
      other: link.to,
      direction: "from" as const,
    })),
    ...requirement.linksTo.map((link) => ({
      id: link.id,
      type: link.type,
      other: link.from,
      direction: "to" as const,
    })),
  ];

  const resolved = resolveRequirementPersonas(requirement, requirement.journey);
  const overrides = requirement.acceptanceCriteria.filter((c) => c.personas.length > 0).length;

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-1 text-xs text-slate-400">
        <Link href="/requirements" className="hover:underline">
          Requirements
        </Link>
        <span>/</span>
        <Link href={`/journeys/${requirement.journey.slug}`} className="hover:underline">
          {requirement.journey.title}
        </Link>
        {requirement.section ? (
          <>
            <span>/</span>
            <span>{requirement.section}</span>
          </>
        ) : null}
        <span>/</span>
        <span>{requirement.ref}</span>
      </nav>

      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <RefTag value={requirement.ref} />
              <StatusBadge status={requirement.status} />
              <PriorityBadge priority={requirement.priority} />
              <SideBadge side={requirement.journey.side} />
              <CategoryBadge category={requirement.journey.category} />
              {requirement.changeClass ? <ChangeClassBadge value={requirement.changeClass} /> : null}
              {requirement.decisionRequired ? <DecisionRequiredBadge /> : null}
              {requirement.stateSpecific ? <StateSpecificBadge /> : null}
              {!requirement.stateSpecific && requirement.sectionStateSpecific ? (
                <StateSpecificBadge section />
              ) : null}
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">{requirement.title}</h1>
          </div>
          <div className="flex gap-2">
            <Link href={`/requirements/${requirement.id}/edit`}>
              <Button variant="secondary">Edit</Button>
            </Link>
            <DeleteRequirementButton id={requirement.id} reference={requirement.ref} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-xs font-medium text-slate-500">Personas</span>
          <PersonaChips personas={resolved.personas} source={resolved.source} />
          <span className="text-[11px] text-slate-400">
            {resolved.source === "inherited"
              ? `inherited from ${requirement.journey.title}`
              : `overriding ${requirement.journey.title}`}
            {" · "}
            inherited in turn by {requirement.acceptanceCriteria.length - overrides} of{" "}
            {requirement.acceptanceCriteria.length} criteria
            {overrides > 0 ? ` · ${overrides} override${overrides === 1 ? "s" : ""}` : ""}
          </span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          {requirement.description || requirement.rationale || requirement.assumptions ? (
            <Card className="space-y-4 p-4">
              <Section title="Description" body={requirement.description} hideEmpty />
              <Section title="Rationale" body={requirement.rationale} hideEmpty />
              <Section title="Assumptions" body={requirement.assumptions} hideEmpty />
            </Card>
          ) : null}

          <Card className="p-4">
            <CriterionList
              requirementId={requirement.id}
              requirementPersonas={resolved.personas}
              inheritedFrom={
                resolved.source === "inherited" ? requirement.journey.title : requirement.ref
              }
              criteria={requirement.acceptanceCriteria}
              allPersonas={personas}
            />
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Requirement discussion</h2>
            <DiscussionPanel
              target={{ requirementId: requirement.id }}
              comments={requirement.comments}
              questions={requirement.questions}
            />
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Provenance</h2>
            {requirement.sourceNotes ? (
              <p className="mt-1 whitespace-pre-wrap text-xs text-slate-600">{requirement.sourceNotes}</p>
            ) : (
              <p className="mt-1 text-xs italic text-slate-400">No source notes recorded.</p>
            )}
            <dl className="mt-3 space-y-1 border-t border-slate-100 pt-2 text-[11px] text-slate-400">
              <div className="flex gap-1.5">
                <dt className="font-medium text-slate-500">Journey:</dt>
                <dd>
                  <Link href={`/journeys/${requirement.journey.slug}`} className="hover:underline">
                    {requirement.journey.title}
                  </Link>
                </dd>
              </div>
              {requirement.section ? (
                <div className="flex gap-1.5">
                  <dt className="font-medium text-slate-500">Section:</dt>
                  <dd>{requirement.section}</dd>
                </div>
              ) : null}
            </dl>
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Linked requirements</h2>
            <LinksEditor requirementId={requirement.id} links={links} candidates={candidates} />
          </Card>

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Change history</h2>
            <ChangeHistory entries={history} />
            <p className="mt-3 border-t border-slate-100 pt-2 text-[11px] text-slate-400">
              Created {formatDateTime(requirement.createdAt)} · updated{" "}
              {formatDateTime(requirement.updatedAt)}
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Section({ title, body, hideEmpty }: { title: string; body: string; hideEmpty?: boolean }) {
  if (!body && hideEmpty) return null;
  return (
    <div>
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">{title}</h2>
      {body ? (
        <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{body}</p>
      ) : (
        <p className="mt-1 text-sm italic text-slate-400">Not recorded.</p>
      )}
    </div>
  );
}
