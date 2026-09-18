import { listCapabilities } from "@/lib/queries";
import { CapabilityManager } from "./manager";

export const dynamic = "force-dynamic";

export default async function CapabilitiesPage() {
  const capabilities = await listCapabilities();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Capabilities</h1>
        <p className="mt-1 text-sm text-slate-500">
          One permission each — an action on a resource. Requirements are written against
          capabilities, not against roles: journeys carry them, requirements and acceptance criteria
          inherit them unless they override, and a role reaches a requirement only through the
          capabilities it grants.
        </p>
      </header>
      <CapabilityManager capabilities={capabilities} />
    </div>
  );
}
