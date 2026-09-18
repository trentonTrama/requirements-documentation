/**
 * Project membership. A project is a cross-cutting collection rather than a level
 * of the tree: it can take a whole domain, a single journey document, or one
 * requirement out of a document, and the same category or journey can belong to
 * several projects.
 *
 * So "is this requirement in the project?" has three answers, and the page says
 * which one applies:
 *
 *   direct    the requirement itself was added
 *   journey   its journey document was added
 *   category  its domain was added
 *
 * The rule lives here, and both the Prisma filter and the in-memory check are
 * derived from it, so a query and a badge can never disagree.
 */
import type { Prisma } from "@prisma/client";

export type MembershipSource = "direct" | "journey" | "category";

type Identified = { id: string };
type Membered = { projects?: Identified[] | null };

/** Requirements reachable from a project, at any of the three membership levels. */
export function requirementsInProject(projectId: string): Prisma.FunctionalRequirementWhereInput {
  return {
    OR: [
      { projects: { some: { id: projectId } } },
      { journey: { projects: { some: { id: projectId } } } },
      { journey: { category: { projects: { some: { id: projectId } } } } },
    ],
  };
}

/** Journeys reachable from a project: added directly, or through their domain. */
export function journeysInProject(projectId: string): Prisma.JourneyWhereInput {
  return {
    OR: [
      { projects: { some: { id: projectId } } },
      { category: { projects: { some: { id: projectId } } } },
    ],
  };
}

/**
 * How a requirement reaches a project, or null when it does not. Most specific
 * membership wins, so a requirement added on its own reads as `direct` even if
 * its domain is in the project too.
 */
export function membershipSource(
  projectId: string,
  requirement: Membered & { journey?: (Membered & { category?: Membered | null }) | null },
): MembershipSource | null {
  if (holds(requirement, projectId)) return "direct";
  if (holds(requirement.journey, projectId)) return "journey";
  if (holds(requirement.journey?.category, projectId)) return "category";
  return null;
}

/** Every project a requirement belongs to, tagged with how it got there. */
export function projectsForRequirement<P extends Identified & { name: string }>(
  requirement: { projects?: P[] | null } & {
    journey?: ({ projects?: P[] | null; category?: { projects?: P[] | null } | null }) | null;
  },
): { project: P; source: MembershipSource }[] {
  const seen = new Map<string, { project: P; source: MembershipSource }>();
  const add = (projects: P[] | null | undefined, source: MembershipSource) => {
    for (const project of projects ?? []) {
      // The first source to claim a project wins, and they are added most
      // specific first.
      if (!seen.has(project.id)) seen.set(project.id, { project, source });
    }
  };

  add(requirement.projects, "direct");
  add(requirement.journey?.projects, "journey");
  add(requirement.journey?.category?.projects, "category");

  return [...seen.values()].sort((a, b) => a.project.name.localeCompare(b.project.name));
}

export const MEMBERSHIP_LABELS: Record<MembershipSource, string> = {
  direct: "added directly",
  journey: "through its journey",
  category: "through its domain",
};

function holds(bearer: Membered | null | undefined, projectId: string) {
  return (bearer?.projects ?? []).some((project) => project.id === projectId);
}
