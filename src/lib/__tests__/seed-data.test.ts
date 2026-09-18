/**
 * Guards the committed corpus. If prisma/data/journeys.json is edited or
 * regenerated and something no longer lines up, this fails here rather than
 * seeding a quietly wrong database.
 */
import { describe, expect, it } from "vitest";
import {
  CAPABILITIES,
  DOMAINS,
  PROJECTS,
  ROLES,
  SOURCE_JOURNEYS,
  capabilityKeysFor,
  changeClassFor,
  domainFor,
  draftedOn,
  journeyKeyFor,
  requirementCapabilityKeys,
  sideFor,
} from "../../../prisma/data/mapping";

const groups = SOURCE_JOURNEYS.flatMap((journey) => journey.requirementGroups);
const requirements = groups.flatMap((group) => group.requirements);

describe("corpus volumes", () => {
  it("holds the documents the app was built against", () => {
    expect(SOURCE_JOURNEYS).toHaveLength(12);
    expect(groups).toHaveLength(39);
    expect(requirements).toHaveLength(117);
    expect(requirements.flatMap((r) => r.acceptanceCriteria)).toHaveLength(254);
  });

  it("counts the flags the dashboard reports", () => {
    expect(requirements.filter((r) => r.decisionRequired)).toHaveLength(48);
    expect(requirements.filter((r) => r.stateSpecific)).toHaveLength(11);
    expect(SOURCE_JOURNEYS.flatMap((j) => j.openQuestions)).toHaveLength(56);
    expect(
      SOURCE_JOURNEYS.flatMap((j) => [...j.decisionsCarriedForward, ...j.technicalNotes]),
    ).toHaveLength(88);
    expect(SOURCE_JOURNEYS.flatMap((j) => j.archiveItemsNotCarried)).toHaveLength(106);
  });

  it("splits evenly into read and write sides", () => {
    const write = SOURCE_JOURNEYS.filter((j) => sideFor(j) === "WRITE");
    expect(write).toHaveLength(6);
    expect(SOURCE_JOURNEYS.length - write.length).toBe(6);
  });
});

describe("identifiers", () => {
  it("gives every document a unique slug and a unique derived key", () => {
    const slugs = SOURCE_JOURNEYS.map((j) => j.slug);
    const keys = SOURCE_JOURNEYS.map(journeyKeyFor);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("suffixes write-side keys so the two sides of a domain do not collide", () => {
    const read = SOURCE_JOURNEYS.find((j) => j.slug === "business-entity-data")!;
    const write = SOURCE_JOURNEYS.find((j) => j.slug === "business-entity-data-write")!;
    expect(journeyKeyFor(read)).toBe("BED");
    expect(journeyKeyFor(write)).toBe("BEDW");
    expect(domainFor(read)).toEqual(domainFor(write));
  });

  it("maps every document onto a known domain", () => {
    const known = new Set<string>(DOMAINS.map((d) => d.key));
    for (const journey of SOURCE_JOURNEYS) {
      expect(known.has(domainFor(journey).key)).toBe(true);
    }
  });

  it("parses every drafted date", () => {
    for (const journey of SOURCE_JOURNEYS) expect(draftedOn(journey)).toBeInstanceOf(Date);
  });
});

describe("capabilities", () => {
  const known = new Set<string>(CAPABILITIES.map((c) => c.key));

  it("resolves every document's actor field to known capabilities", () => {
    for (const journey of SOURCE_JOURNEYS) {
      const keys = capabilityKeysFor(journey.persona);
      expect(keys.length).toBeGreaterThan(0);
      for (const key of keys) expect(known.has(key)).toBe(true);
    }
  });

  it("maps each named actor to the one permission it is on the document to exercise", () => {
    expect(capabilityKeysFor("Policy Viewer")).toEqual(["POLICY_VIEW"]);
    expect(capabilityKeysFor("Underwriter")).toEqual(["POLICY_CHANGE"]);
    expect(capabilityKeysFor("Servicing Rep")).toEqual(["SERVICING_UPDATE"]);
  });

  it("drops the parenthetical qualifiers and de-duplicates", () => {
    expect(capabilityKeysFor("Underwriter (Policy change) / Servicing Rep (Servicing update)")).toEqual([
      "POLICY_CHANGE",
      "SERVICING_UPDATE",
    ]);
    expect(capabilityKeysFor("Underwriter / Underwriter")).toEqual(["POLICY_CHANGE"]);
  });

  it("rejects an actor the corpus has not introduced", () => {
    expect(() => capabilityKeysFor("Claims Adjuster")).toThrow(/Unknown actor/);
  });

  it("overrides per section only where the source names a change class", () => {
    expect(requirementCapabilityKeys(null)).toEqual([]);
    expect(requirementCapabilityKeys("POLICY_CHANGE")).toEqual(["POLICY_CHANGE"]);
    expect(requirementCapabilityKeys("SERVICING_UPDATE")).toEqual(["SERVICING_UPDATE"]);
    // A container section is scaffolding, so it keeps whatever the journey says.
    expect(requirementCapabilityKeys("CONTAINER")).toEqual([]);
  });

  it("leaves most requirements inheriting", () => {
    const overriding = groups
      .filter((group) => requirementCapabilityKeys(changeClassFor(group.class)).length > 0)
      .reduce((total, group) => total + group.requirements.length, 0);
    expect(overriding).toBe(47);
    expect(requirements.length - overriding).toBe(70);
  });
});

describe("roles", () => {
  const known = new Set<string>(CAPABILITIES.map((c) => c.key));

  it("configures every role out of capabilities that exist", () => {
    for (const role of ROLES) {
      expect(role.capabilities.length).toBeGreaterThan(0);
      for (const key of role.capabilities) expect(known.has(key)).toBe(true);
    }
  });

  it("gives every role the read capability, and one write capability at most", () => {
    for (const role of ROLES) {
      expect(role.capabilities).toContain("POLICY_VIEW");
      expect(role.capabilities.filter((key) => key !== "POLICY_VIEW").length).toBeLessThanOrEqual(1);
    }
  });

  it("covers every capability the corpus writes against", () => {
    const granted = new Set(ROLES.flatMap((role) => role.capabilities));
    for (const capability of CAPABILITIES) expect(granted.has(capability.key)).toBe(true);
  });

  it("keeps a role for each actor the documents name", () => {
    expect(ROLES.map((role) => role.name)).toEqual([
      "Policy Viewer",
      "Underwriter",
      "Servicing Rep",
    ]);
  });
});

describe("projects", () => {
  it("seeds the corpus as one project over every domain", () => {
    expect(PROJECTS).toHaveLength(1);
    expect(PROJECTS[0].categories).toBe("all");
    expect(PROJECTS[0].slug).toMatch(/^[a-z0-9-]+$/);
  });
});

describe("requirement groups", () => {
  it("maps every group class to a known change class", () => {
    for (const group of groups) expect(() => changeClassFor(group.class)).not.toThrow();
  });

  it("rejects a class the schema does not model", () => {
    expect(() => changeClassFor("Something else")).toThrow(/Unknown requirement group class/);
  });

  it("gives every requirement a statement, source notes and at least one criterion", () => {
    for (const requirement of requirements) {
      expect(requirement.fr.trim()).not.toBe("");
      expect(requirement.sourceNotes.trim()).not.toBe("");
      expect(requirement.acceptanceCriteria.length).toBeGreaterThan(0);
      for (const criterion of requirement.acceptanceCriteria) expect(criterion.trim()).not.toBe("");
    }
  });
});

describe("user stories", () => {
  it("gives every document a complete primary user story", () => {
    for (const journey of SOURCE_JOURNEYS) {
      expect(journey.userStory.asA.trim()).not.toBe("");
      expect(journey.userStory.iWant.trim()).not.toBe("");
      expect(journey.userStory.soThat.trim()).not.toBe("");
    }
  });
});
