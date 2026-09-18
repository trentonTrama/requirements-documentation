import { describe, expect, it } from "vitest";
import {
  criterionAppliesToPersona,
  isOverridden,
  resolveCriterionPersonas,
  resolveCriterionPersonasInJourney,
  resolveRequirementPersonas,
} from "../personas";

const viewer = { id: "p1", key: "POLICY_VIEWER", name: "Policy Viewer", color: "sky" };
const underwriter = { id: "p2", key: "UNDERWRITER", name: "Underwriter", color: "amber" };
const servicing = { id: "p3", key: "SERVICING_REP", name: "Servicing Rep", color: "teal" };

describe("resolveRequirementPersonas", () => {
  it("inherits the journey's personas when the requirement declares none", () => {
    const result = resolveRequirementPersonas(
      { personas: [] },
      { personas: [underwriter, servicing] },
    );
    expect(result.source).toBe("inherited");
    expect(result.personas.map((p) => p.id)).toEqual([servicing.id, underwriter.id]);
  });

  it("overrides the journey when the requirement's section names one role", () => {
    const result = resolveRequirementPersonas(
      { personas: [underwriter] },
      { personas: [underwriter, servicing] },
    );
    expect(result.source).toBe("override");
    expect(result.personas).toEqual([underwriter]);
  });

  it("treats a missing journey as no inherited personas", () => {
    expect(resolveRequirementPersonas({ personas: [] }, null)).toEqual({
      personas: [],
      source: "inherited",
    });
    expect(resolveRequirementPersonas({ personas: [] }, undefined).source).toBe("inherited");
  });
});

describe("resolveCriterionPersonas", () => {
  it("inherits the requirement's personas when the criterion declares none", () => {
    const result = resolveCriterionPersonas({ personas: [] }, { personas: [viewer, underwriter] });
    expect(result.source).toBe("inherited");
    expect(result.personas.map((p) => p.id)).toEqual([viewer.id, underwriter.id]);
  });

  it("replaces the inherited set entirely when the criterion declares personas", () => {
    const result = resolveCriterionPersonas({ personas: [servicing] }, { personas: [viewer, underwriter] });
    expect(result.source).toBe("override");
    expect(result.personas).toEqual([servicing]);
  });

  it("allows an override to introduce a persona the parent does not carry", () => {
    const result = resolveCriterionPersonas({ personas: [underwriter] }, { personas: [viewer] });
    expect(result.personas.map((p) => p.id)).toEqual([underwriter.id]);
  });

  it("reports inherited with an empty list when the parent has no personas either", () => {
    expect(resolveCriterionPersonas({ personas: [] }, { personas: [] })).toEqual({
      personas: [],
      source: "inherited",
    });
  });

  it("treats null and undefined persona relations as empty", () => {
    expect(resolveCriterionPersonas({}, {})).toEqual({ personas: [], source: "inherited" });
    expect(resolveCriterionPersonas({ personas: null }, { personas: null })).toEqual({
      personas: [],
      source: "inherited",
    });
  });

  it("reverts to inheritance once the override is cleared", () => {
    const requirement = { personas: [viewer, underwriter] };
    expect(resolveCriterionPersonas({ personas: [servicing] }, requirement).source).toBe("override");

    const reverted = resolveCriterionPersonas({ personas: [] }, requirement);
    expect(reverted.source).toBe("inherited");
    expect(reverted.personas).toHaveLength(2);
  });

  it("sorts personas by name so chips render in a stable order", () => {
    const result = resolveCriterionPersonas({ personas: [] }, { personas: [underwriter, servicing, viewer] });
    expect(result.personas.map((p) => p.name)).toEqual([
      "Policy Viewer",
      "Servicing Rep",
      "Underwriter",
    ]);
  });

  it("does not mutate the source arrays while sorting", () => {
    const personas = [underwriter, servicing];
    resolveCriterionPersonas({ personas: [] }, { personas });
    expect(personas).toEqual([underwriter, servicing]);
  });
});

describe("the journey -> requirement -> criterion chain", () => {
  const journey = { personas: [underwriter, servicing] };

  it("carries the journey's personas all the way down when nothing overrides", () => {
    const result = resolveCriterionPersonasInJourney({ personas: [] }, { personas: [] }, journey);
    expect(result.source).toBe("inherited");
    expect(result.personas.map((p) => p.name)).toEqual(["Servicing Rep", "Underwriter"]);
  });

  it("stops at the requirement's override rather than reaching past it", () => {
    const result = resolveCriterionPersonasInJourney(
      { personas: [] },
      { personas: [underwriter] },
      journey,
    );
    expect(result.source).toBe("inherited");
    expect(result.personas).toEqual([underwriter]);
  });

  it("lets a criterion override a requirement that is itself overriding", () => {
    const result = resolveCriterionPersonasInJourney(
      { personas: [viewer] },
      { personas: [underwriter] },
      journey,
    );
    expect(result.source).toBe("override");
    expect(result.personas).toEqual([viewer]);
  });

  it("flows a persona added to the journey down to inheriting requirements only", () => {
    const widened = { personas: [underwriter, servicing, viewer] };
    expect(
      resolveCriterionPersonasInJourney({ personas: [] }, { personas: [] }, widened).personas,
    ).toHaveLength(3);
    expect(
      resolveCriterionPersonasInJourney({ personas: [] }, { personas: [underwriter] }, widened).personas,
    ).toEqual([underwriter]);
  });
});

describe("isOverridden", () => {
  it("is true only when the level carries its own personas", () => {
    expect(isOverridden({ personas: [underwriter] })).toBe(true);
    expect(isOverridden({ personas: [] })).toBe(false);
    expect(isOverridden({})).toBe(false);
  });
});

describe("criterionAppliesToPersona", () => {
  const requirement = { personas: [viewer, underwriter] };

  it("matches personas reached by inheritance", () => {
    expect(criterionAppliesToPersona({ personas: [] }, requirement, underwriter.id)).toBe(true);
  });

  it("stops matching an inherited persona once the criterion overrides", () => {
    expect(criterionAppliesToPersona({ personas: [servicing] }, requirement, underwriter.id)).toBe(false);
    expect(criterionAppliesToPersona({ personas: [servicing] }, requirement, servicing.id)).toBe(true);
  });
});
