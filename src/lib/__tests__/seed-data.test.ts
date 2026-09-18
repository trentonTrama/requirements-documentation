/**
 * Guards the committed corpus. If prisma/data/journeys.json is edited or
 * regenerated and something no longer lines up, this fails here rather than
 * seeding a quietly wrong database.
 */
import { describe, expect, it } from "vitest";
import {
  DOMAINS,
  PERSONAS,
  SOURCE_JOURNEYS,
  changeClassFor,
  domainFor,
  draftedOn,
  journeyKeyFor,
  personaKeysFor,
  requirementPersonaKeys,
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

describe("personas", () => {
  const known = new Set<string>(PERSONAS.map((p) => p.key));

  it("resolves every document's persona field to known atomic personas", () => {
    for (const journey of SOURCE_JOURNEYS) {
      const keys = personaKeysFor(journey.persona);
      expect(keys.length).toBeGreaterThan(0);
      for (const key of keys) expect(known.has(key)).toBe(true);
    }
  });

  it("drops the parenthetical qualifiers and de-duplicates", () => {
    expect(personaKeysFor("Underwriter (Policy change) / Servicing Rep (Servicing update)")).toEqual([
      "UNDERWRITER",
      "SERVICING_REP",
    ]);
    expect(personaKeysFor("Underwriter / Underwriter")).toEqual(["UNDERWRITER"]);
  });

  it("overrides per section only where the source names a change class", () => {
    expect(requirementPersonaKeys(null)).toEqual([]);
    expect(requirementPersonaKeys("POLICY_CHANGE")).toEqual(["UNDERWRITER"]);
    expect(requirementPersonaKeys("SERVICING_UPDATE")).toEqual(["SERVICING_REP"]);
    // A container section is scaffolding, so it keeps whatever the journey says.
    expect(requirementPersonaKeys("CONTAINER")).toEqual([]);
  });

  it("leaves most requirements inheriting", () => {
    const overriding = groups
      .filter((group) => requirementPersonaKeys(changeClassFor(group.class)).length > 0)
      .reduce((total, group) => total + group.requirements.length, 0);
    expect(overriding).toBe(47);
    expect(requirements.length - overriding).toBe(70);
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
