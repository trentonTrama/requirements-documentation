/**
 * Project membership is a rule, not a column: a requirement can be in a project
 * three different ways, and the query filter and the in-memory check have to
 * agree about which.
 */
import { describe, expect, it } from "vitest";
import {
  MEMBERSHIP_LABELS,
  membershipSource,
  projectsForRequirement,
  requirementsInProject,
} from "../projects";

const release = { id: "p1", name: "Release 1", slug: "release-1", color: "violet" };
const platform = { id: "p2", name: "Platform", slug: "platform", color: "sky" };

describe("membershipSource", () => {
  it("reports a requirement added on its own as direct", () => {
    expect(membershipSource(release.id, { projects: [release] })).toBe("direct");
  });

  it("reaches a requirement through its journey", () => {
    expect(membershipSource(release.id, { projects: [], journey: { projects: [release] } })).toBe(
      "journey",
    );
  });

  it("reaches a requirement through its domain", () => {
    expect(
      membershipSource(release.id, {
        projects: [],
        journey: { projects: [], category: { projects: [release] } },
      }),
    ).toBe("category");
  });

  it("prefers the most specific membership when several apply", () => {
    expect(
      membershipSource(release.id, {
        projects: [release],
        journey: { projects: [release], category: { projects: [release] } },
      }),
    ).toBe("direct");
  });

  it("is null when the project does not reach the requirement at all", () => {
    expect(
      membershipSource(release.id, {
        projects: [platform],
        journey: { projects: [], category: { projects: [platform] } },
      }),
    ).toBe(null);
  });

  it("treats missing relations as no membership", () => {
    expect(membershipSource(release.id, {})).toBe(null);
  });
});

describe("projectsForRequirement", () => {
  it("collects every project a requirement belongs to, each tagged once", () => {
    const result = projectsForRequirement({
      projects: [release],
      journey: { projects: [platform], category: { projects: [release, platform] } },
    });
    expect(result).toEqual([
      { project: platform, source: "journey" },
      { project: release, source: "direct" },
    ]);
  });

  it("is empty for a requirement in no project", () => {
    expect(projectsForRequirement({ projects: [], journey: { projects: [] } })).toEqual([]);
  });

  it("names each membership in a way the page can show", () => {
    expect(MEMBERSHIP_LABELS.direct).toBe("added directly");
    expect(MEMBERSHIP_LABELS.journey).toBe("through its journey");
    expect(MEMBERSHIP_LABELS.category).toBe("through its domain");
  });
});

describe("requirementsInProject", () => {
  it("asks for all three membership levels, so the filter matches the rule", () => {
    const where = requirementsInProject("p1");
    expect(where.OR).toEqual([
      { projects: { some: { id: "p1" } } },
      { journey: { projects: { some: { id: "p1" } } } },
      { journey: { category: { projects: { some: { id: "p1" } } } } },
    ]);
  });
});
