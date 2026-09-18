import { listCategories } from "@/lib/queries";
import { CategoryManager } from "./manager";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await listCategories();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Categories</h1>
        <p className="mt-1 text-sm text-slate-500">
          Every requirement belongs to one category. The category key seeds the requirement reference
          (FR-<span className="font-mono">KEY</span>-001) at creation time and is not rewritten afterwards.
        </p>
      </header>
      <CategoryManager categories={categories} />
    </div>
  );
}
