import Link from "next/link";
import { prisma } from "@/lib/db";
import { listCapabilities } from "@/lib/queries";
import { JourneyForm } from "@/components/journey-form";
import { Card, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewJourneyPage() {
  const [categories, capabilities] = await Promise.all([
    prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, key: true, name: true },
    }),
    listCapabilities(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <nav className="text-xs text-slate-400">
        <Link href="/journeys" className="hover:underline">
          Journeys
        </Link>{" "}
        / New
      </nav>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">New journey</h1>
      {categories.length === 0 ? (
        <EmptyState
          title="Create a domain first"
          hint="Every journey document belongs to one domain, and reaches its projects through it."
        />
      ) : (
        <Card className="p-5">
          <JourneyForm categories={categories} capabilities={capabilities} />
        </Card>
      )}
    </div>
  );
}
