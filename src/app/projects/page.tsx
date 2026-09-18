import { listProjects } from "@/lib/queries";
import { ProjectManager } from "./manager";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const projects = await listProjects();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Projects</h1>
        <p className="mt-1 text-sm text-slate-500">
          A project collects work rather than owning it: take a whole domain, a single journey
          document, or one requirement out of a document. The same domain can sit in several projects,
          and deleting a project leaves everything it held exactly where it was.
        </p>
      </header>
      <ProjectManager projects={projects} />
    </div>
  );
}
