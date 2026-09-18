import { describe, expect, it } from "vitest";
import {
  criterionAppliesToPersona,
  isOverridden,
  resolveCriterionPersonas,
} from "../personas";

const policyholder = { id: "p1", key: "POLICYHOLDER", name: "Policyholder", color: "sky" };
const agent = { id: "p2", key: "AGENT", name: "Independent Agent", color: "violet" };
const underwriter = { id: "p3", key: "UNDERWRITER", name: "Underwriter", color: "amber" };

describe("resolveCriterionPersonas", () => {
  it("inherits the requirement's personas when the criterion declares none", () => {
    const result = resolveCriterionPersonas(
      { personas: [] },
      { personas: [policyholder, agent] },
    );
    expect(result.source).toBe("inherited");
    expect(result.personas.map((p) => p.id)).toEqual([agent.id, policyholder.id]);
  });

  it("replaces the inherited set entirely when the criterion declares personas", () => {
    const result = resolveCriterionPersonas(
      { personas: [underwriter] },
      { personas: [policyholder, agent] },
    );
    expect(result.source).toBe("override");
    expect(result.personas).toEqual([underwriter]);
  });

  it("allows an override to introduce a persona the requirement does not carry", () => {
    const result = resolveCriterionPersonas({ personas: [underwriter] }, { personas: [policyholder] });
    expect(result.personas.map((p) => p.id)).toEqual([underwriter.id]);
  });

  it("reports inherited with an empty list when the parent has no personas either", () => {
    const result = resolveCriterionPersonas({ personas: [] }, { personas: [] });
    expect(result).toEqual({ personas: [], source: "inherited" });
  });

  it("treats null and undefined persona relations as empty", () => {
    expect(resolveCriterionPersonas({}, {})).toEqual({ personas: [], source: "inherited" });
    expect(resolveCriterionPersonas({ personas: null }, { personas: null })).toEqual({
      personas: [],
      source: "inherited",
    });
  });

  it("reverts to inheritance once the override is cleared", () => {
    const requirement = { personas: [policyholder, agent] };
    const overridden = resolveCriterionPersonas({ personas: [underwriter] }, requirement);
    expect(overridden.source).toBe("override");

    const reverted = resolveCriterionPersonas({ personas: [] }, requirement);
    expect(reverted.source).toBe("inherited");
    expect(reverted.personas).toHaveLength(2);
  });

  it("sorts personas by name so chips render in a stable order", () => {
    const result = resolveCriterionPersonas({ personas: [] }, { personas: [underwriter, agent, policyholder] });
    expect(result.personas.map((p) => p.name)).toEqual([
      "Independent Agent",
      "Policyholder",
      "Underwriter",
    ]);
  });

  it("does not mutate the source arrays while sorting", () => {
    const personas = [underwriter, agent];
    resolveCriterionPersonas({ personas: [] }, { personas });
    expect(personas).toEqual([underwriter, agent]);
  });
});

describe("isOverridden", () => {
  it("is true only when the criterion carries its own personas", () => {
    expect(isOverridden({ personas: [underwriter] })).toBe(true);
    expect(isOverridden({ personas: [] })).toBe(false);
    expect(isOverridden({})).toBe(false);
  });
});

describe("criterionAppliesToPersona", () => {
  const requirement = { personas: [policyholder, agent] };

  it("matches personas reached by inheritance", () => {
    expect(criterionAppliesToPersona({ personas: [] }, requirement, agent.id)).toBe(true);
  });

  it("stops matching an inherited persona once the criterion overrides", () => {
    expect(criterionAppliesToPersona({ personas: [underwriter] }, requirement, agent.id)).toBe(false);
    expect(criterionAppliesToPersona({ personas: [underwriter] }, requirement, underwriter.id)).toBe(true);
  });
});
