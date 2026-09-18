import { listCapabilities, listRoles } from "@/lib/queries";
import { RoleManager } from "./manager";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const [roles, capabilities] = await Promise.all([listRoles(), listCapabilities()]);
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Roles</h1>
        <p className="mt-1 text-sm text-slate-500">
          A role is a configured set of capabilities and nothing else. Nothing in the documents points
          at a role — it reaches a requirement exactly when one of its capabilities does, so widening
          a role widens its coverage without touching a single requirement.
        </p>
      </header>
      <RoleManager roles={roles} capabilities={capabilities} />
    </div>
  );
}
