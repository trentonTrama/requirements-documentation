import Link from "next/link";
import { notFound } from "next/navigation";
import { getRequirement, listCategories, listPersonas } from "@/lib/queries";
import { RequirementForm } from "@/components/requirement-form";
import { Card } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function EditRequirementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [requirement, categories, personas] = await Promise.all([
    getRequirement(id),
    listCategories(),
    listPersonas(),
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
          categories={categories}
          personas={personas}
          requirementId={requirement.id}
          requirementRef={requirement.ref}
          initial={{
            title: requirement.title,
            description: requirement.description,
            rationale: requirement.rationale,
            assumptions: requirement.assumptions,
            status: requirement.status,
            priority: requirement.priority,
            categoryId: requirement.categoryId,
            personaIds: requirement.personas.map((persona) => persona.id),
          }}
        />
      </Card>
    </div>
  );
}
