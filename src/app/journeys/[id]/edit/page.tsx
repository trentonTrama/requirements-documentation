import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { listCapabilities } from "@/lib/queries";
import { JourneyForm } from "@/components/journey-form";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function EditJourneyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [journey, categories, capabilities] = await Promise.all([
    // Slug or cuid, so the edit link works from either form of the URL.
    prisma.journey.findFirst({
      where: { OR: [{ id }, { slug: id }] },
      include: {
        capabilities: { select: { id: true } },
        _count: { select: { requirements: true } },
      },
    }),
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, key: true, name: true },
    }),
    listCapabilities(),
  ]);
  if (!journey) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <nav className="text-xs text-slate-400">
        <Link href={`/journeys/${journey.slug}`} className="hover:underline">
          {journey.key}
        </Link>{" "}
        / Edit
      </nav>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Edit {journey.title}</h1>
      <Card className="p-5">
        <JourneyForm
          categories={categories}
          capabilities={capabilities}
          journeyId={journey.id}
          requirementCount={journey._count.requirements}
          initial={{
            title: journey.title,
            key: journey.key,
            slug: journey.slug,
            side: journey.side,
            categoryId: journey.categoryId,
            statusNote: journey.statusNote,
            author: journey.author,
            primarySource: journey.primarySource,
            docFile: journey.docFile,
            asA: journey.asA,
            iWant: journey.iWant,
            soThat: journey.soThat,
            covers: journey.covers,
            notCovered: journey.notCovered,
            draftedOn: journey.draftedOn ? journey.draftedOn.toISOString().slice(0, 10) : "",
            sortOrder: journey.sortOrder,
            capabilityIds: journey.capabilities.map((capability) => capability.id),
          }}
        />
      </Card>
    </div>
  );
}
