import { listCategories } from "@/lib/queries";
import { CategoryManager } from "./manager";

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const categories = await listCategories();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Domains</h1>
        <p className="mt-1 text-sm text-slate-500">
          The top-level grouping. Each domain holds its journey documents — typically a read side and a
          write side — and requirements reach their domain through the journey they belong to.
        </p>
      </header>
      <CategoryManager categories={categories} />
    </div>
  );
}
