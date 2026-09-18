import Link from "next/link";
import { listCategories, listPersonas } from "@/lib/queries";
import { RequirementForm } from "@/components/requirement-form";
import { Card, EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewRequirementPage() {
  const [categories, personas] = await Promise.all([listCategories(), listPersonas()]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <nav className="text-xs text-slate-400">
        <Link href="/requirements" className="hover:underline">
          Requirements
        </Link>{" "}
        / New
      </nav>
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">New requirement</h1>
      {categories.length === 0 ? (
        <EmptyState
          title="Create a category first"
          hint="Requirement references are derived from the category key, so every requirement needs one."
        />
      ) : (
        <Card className="p-5">
          <RequirementForm categories={categories} personas={personas} />
        </Card>
      )}
    </div>
  );
}
