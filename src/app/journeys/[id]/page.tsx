import Link from "next/link";
import { notFound } from "next/navigation";
import { entityChanges, getJourney, groupBySection, type JourneyRequirement } from "@/lib/queries";
import { resolveCriterionCapabilities, resolveRequirementCapabilities } from "@/lib/capabilities";
import { Button, Card, EmptyState } from "@/components/ui";
import {
  CategoryBadge,
  ChangeClassBadge,
  DecisionRequiredBadge,
  PriorityBadge,
  ProjectBadge,
  RefTag,
  SideBadge,
  StateSpecificBadge,
  StatusBadge,
} from "@/components/badges";
import { CapabilityChips } from "@/components/capability-chips";
import { DiscussionPanel } from "@/components/discussion-panel";
import { ChangeHistory } from "@/components/change-history";
import { NoteEditor } from "@/components/note-editor";
import { ArchiveEditor } from "@/components/archive-editor";
import { DeleteJourneyButton } from "./delete-button";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function JourneyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const journey = await getJourney(id);
  if (!journey) notFound();

  const history = await entityChanges("Journey", journey.id);

  const sections = groupBySection(journey.requirements);
  const decisions = journey.notes.filter((note) => note.kind === "DECISION");
  const technical = journey.notes.filter((note) => note.kind === "TECHNICAL");
  const decisionRequired = journey.requirements.filter((r) => r.decisionRequired).length;
  // A journey is in a project directly or because its domain is.
  const projects = [
    ...journey.projects.map((project) => ({ project, direct: true })),
    ...journey.category.projects
      .filter((project) => !journey.projects.some((own) => own.id === project.id))
      .map((project) => ({ project, direct: false })),
  ].sort((a, b) => a.project.name.localeCompare(b.project.name));
  const openQuestions = journey.questions.filter((q) => q.status === "OPEN").length;

  return (
    <div className="space-y-6">
      <nav className="text-xs text-slate-400">
        <Link href="/journeys" className="hover:underline">
          Journeys
        </Link>{" "}
        / {journey.key}
      </nav>

      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <RefTag value={journey.key} />
              <SideBadge side={journey.side} />
              <Link href={`/journeys#${journey.category.key}`}>
                <CategoryBadge category={journey.category} />
              </Link>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900">{journey.title}</h1>
          </div>
          <div className="flex gap-2">
            <Link href={`/journeys/${journey.slug}/edit`}>
              <Button variant="secondary">Edit</Button>
            </Link>
            <DeleteJourneyButton
              id={journey.id}
              title={journey.title}
              requirementCount={journey.requirements.length}
            />
          </div>
        </div>
        {journey.statusNote ? <p className="text-sm text-slate-600">{journey.statusNote}</p> : null}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-xs font-medium text-slate-500">Capabilities</span>
          <CapabilityChips capabilities={journey.capabilities} showSource={false} />
          <span className="text-[11px] text-slate-400">
            inherited by every requirement that does not declare its own
          </span>
        </div>
        {projects.length > 0 ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="text-xs font-medium text-slate-500">Projects</span>
            <div className="flex flex-wrap items-center gap-1.5">
              {projects.map(({ project, direct }) => (
                <Link key={project.id} href={`/projects/${project.slug}`}>
                  <ProjectBadge project={project} />
                  {direct ? null : (
                    <span className="ml-1 text-[11px] text-slate-400">via its domain</span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        ) : null}
        <dl className="grid gap-x-6 gap-y-1 text-[11px] text-slate-400 sm:grid-cols-2">
          <Meta label="Author" value={journey.author} />
          <Meta label="Drafted" value={journey.draftedOn ? formatDate(journey.draftedOn) : ""} />
          <Meta label="Document" value={journey.docFile} />
          <Meta label="Primary source" value={journey.primarySource} />
        </dl>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="space-y-3 p-4">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">User story</h2>
            <p className="text-sm text-slate-800">
              <span className="text-slate-400">As a</span> {journey.asA}{" "}
              <span className="text-slate-400">I want</span> {journey.iWant}{" "}
              <span className="text-slate-400">so that</span> {journey.soThat}
            </p>
            {journey.covers ? (
              <p className="text-xs text-slate-600">
                <span className="font-medium text-slate-500">Covers: </span>
                {journey.covers}
              </p>
            ) : null}
            {journey.notCovered ? (
              <p className="text-xs text-slate-500">
                <span className="font-medium text-slate-500">Not covered: </span>
                {journey.notCovered}
              </p>
            ) : null}

            {journey.additionalUserStories.length > 0 ? (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Additional user stories
                </h3>
                {journey.additionalUserStories.map((story) => (
                  <div key={story.id} className="space-y-1">
                    {story.changeClass ? <ChangeClassBadge value={story.changeClass} /> : null}
                    <p className="text-sm text-slate-800">
                      <span className="text-slate-400">As a</span> {story.asA}{" "}
                      <span className="text-slate-400">I want</span> {story.iWant}{" "}
                      <span className="text-slate-400">so that</span> {story.soThat}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>

          <section className="space-y-4">
            <div className="flex flex-wrap items-baseline gap-x-3">
              <h2 className="text-sm font-semibold text-slate-900">
                Requirements <span className="text-slate-400">({journey.requirements.length})</span>
              </h2>
              {decisionRequired > 0 ? (
                <span className="text-xs text-orange-600">{decisionRequired} awaiting a decision</span>
              ) : null}
            </div>

            {sections.length === 0 ? (
              <EmptyState title="No requirements on this journey yet" />
            ) : (
              sections.map((section) => (
                <div key={`${section.name}-${section.requirements[0].id}`} className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-medium text-slate-700">{section.name}</h3>
                    {section.changeClass ? <ChangeClassBadge value={section.changeClass} /> : null}
                    {section.stateSpecific ? <StateSpecificBadge section /> : null}
                    <span className="text-[11px] text-slate-400">
                      {section.requirements.length} requirement
                      {section.requirements.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <Card className="divide-y divide-slate-100">
                    {section.requirements.map((requirement) => (
                      <RequirementRow key={requirement.id} requirement={requirement} journey={journey} />
                    ))}
                  </Card>
                </div>
              ))
            )}
          </section>

          <Card className="p-4">
            <h2 className="mb-1 text-sm font-semibold text-slate-900">
              Open questions & discussion
              {openQuestions > 0 ? (
                <span className="ml-2 text-xs font-normal text-amber-600">
                  {openQuestions} still open
                </span>
              ) : null}
            </h2>
            <p className="mb-3 text-xs text-slate-400">
              The document&apos;s open questions, tracked as answerable records.
            </p>
            <DiscussionPanel
              target={{ journeyId: journey.id }}
              comments={journey.comments}
              questions={journey.questions}
            />
          </Card>
        </div>

        <div className="space-y-6">
          <NoteEditor journeyId={journey.id} kind="DECISION" notes={decisions} />
          <NoteEditor journeyId={journey.id} kind="TECHNICAL" notes={technical} />
          <ArchiveEditor journeyId={journey.id} items={journey.archiveItems} />

          <Card className="p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Change history</h2>
            <ChangeHistory entries={history} />
          </Card>
        </div>
      </div>
    </div>
  );
}

function RequirementRow({
  requirement,
  journey,
}: {
  requirement: JourneyRequirement;
  journey: { capabilities: { id: string; key: string; name: string; color: string }[] };
}) {
  const resolved = resolveRequirementCapabilities(requirement, journey);

  return (
    <div className="px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/requirements/${requirement.id}`} className="flex items-center gap-2 hover:underline">
          <RefTag value={requirement.ref} />
          <span className="text-sm font-medium text-slate-900">{requirement.title}</span>
        </Link>
        {requirement.decisionRequired ? <DecisionRequiredBadge /> : null}
        {requirement.stateSpecific ? <StateSpecificBadge /> : null}
      </div>

      {requirement.acceptanceCriteria.length > 0 ? (
        <ul className="mt-2 space-y-1.5">
          {requirement.acceptanceCriteria.map((criterion) => {
            const criterionCapabilities = resolveCriterionCapabilities(criterion, {
              capabilities: resolved.capabilities,
            });
            return (
              <li key={criterion.id} className="flex flex-wrap items-start gap-2">
                <RefTag value={criterion.ref.split(".").at(-1) ?? criterion.ref} />
                <span className="flex-1 text-sm text-slate-700">{criterion.statement}</span>
                {criterionCapabilities.source === "override" ? (
                  <CapabilityChips capabilities={criterionCapabilities.capabilities} source="override" />
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <CapabilityChips capabilities={resolved.capabilities} source={resolved.source} />
        <span className="text-[11px] text-slate-400">
          <StatusBadge status={requirement.status} /> <PriorityBadge priority={requirement.priority} />
        </span>
        {requirement._count.comments + requirement._count.questions > 0 ? (
          <span className="text-[11px] text-slate-400">
            {requirement._count.comments} comments · {requirement._count.questions} questions
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div className="flex gap-1.5">
      <dt className="font-medium text-slate-500">{label}:</dt>
      <dd className="min-w-0 flex-1 break-words">{value}</dd>
    </div>
  );
}
