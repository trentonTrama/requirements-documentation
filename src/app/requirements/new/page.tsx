import Link from "next/link";
import { prisma } from "@/lib/db";
import { listCapabilities } from "@/lib/queries";
import { RequirementForm } from "@/components/requirement-form";
import { Card, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";


export default async function NewRequirementPage() {
  const [journeys, capabilities] = await Promise.all([
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

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <nav className="text-xs text-slate-400">
        <Link href="/requirements" className="hover:underline">
          Requirements
        </Link>{" "}
        / New
      </nav>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">New requirement</h1>
      {journeys.length === 0 ? (
        <EmptyState
          title="Create a journey first"
          hint="Requirement references are derived from the journey key, so every requirement needs one."
        />
      ) : (
        <Card className="p-5">
          <RequirementForm journeys={journeys} capabilities={capabilities} />
        </Card>
      )}
    </div>
  );
}
