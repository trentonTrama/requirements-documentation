import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getRequirement, listCapabilities } from "@/lib/queries";
import { RequirementForm } from "@/components/requirement-form";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function EditRequirementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [requirement, journeys, capabilities] = await Promise.all([
    getRequirement(id),
    prisma.journey.findMany({
      orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
      select: {
        id: true,
        key: true,
        title: true,
        side: true,
        capabilities: { select: { id: true, name: true } },
      },
    }),
    listCapabilities(),
  ]);
  if (!requirement) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <nav className="text-xs text-slate-400">
        <Link href={`/requirements/${requirement.id}`} className="hover:underline">
          {requirement.ref}
        </Link>{" "}
        / Edit
      </nav>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Edit {requirement.ref}</h1>
      <Card className="p-5">
        <RequirementForm
          journeys={journeys}
          capabilities={capabilities}
          requirementId={requirement.id}
          requirementRef={requirement.ref}
          initial={{
            title: requirement.title,
            description: requirement.description,
            rationale: requirement.rationale,
            assumptions: requirement.assumptions,
            sourceNotes: requirement.sourceNotes,
            status: requirement.status,
            priority: requirement.priority,
            journeyId: requirement.journeyId,
            section: requirement.section,
            sectionOrder: requirement.sectionOrder,
            sectionStateSpecific: requirement.sectionStateSpecific,
            changeClass: requirement.changeClass ?? "",
            decisionRequired: requirement.decisionRequired,
            stateSpecific: requirement.stateSpecific,
            capabilityIds: requirement.capabilities.map((capability) => capability.id),
          }}
        />
      </Card>
    </div>
  );
}
