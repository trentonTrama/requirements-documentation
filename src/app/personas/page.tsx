import { listPersonas } from "@/lib/queries";
import { PersonaManager } from "./manager";

export const dynamic = "force-dynamic";

export default async function PersonasPage() {
  const personas = await listPersonas();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">User personas</h1>
        <p className="mt-1 text-sm text-slate-500">
          Personas are assigned to requirements; acceptance criteria inherit them unless they override.
        </p>
      </header>
      <PersonaManager personas={personas} />
    </div>
  );
}
