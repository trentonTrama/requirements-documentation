import { describe, expect, it } from "vitest";
import {
  criterionAppliesToCapability,
  isOverridden,
  resolveCriterionCapabilities,
  resolveCriterionCapabilitiesInJourney,
  resolveRequirementCapabilities,
} from "../capabilities";

const view = { id: "c1", key: "POLICY_VIEW", name: "View policy", color: "sky" };
const change = { id: "c2", key: "POLICY_CHANGE", name: "Change policy", color: "amber" };
const servicing = { id: "c3", key: "SERVICING_UPDATE", name: "Update servicing details", color: "teal" };

describe("resolveRequirementCapabilities", () => {
  it("inherits the journey's capabilities when the requirement declares none", () => {
    const result = resolveRequirementCapabilities(
      { capabilities: [] },
      { capabilities: [change, servicing] },
    );
    expect(result.source).toBe("inherited");
    expect(result.capabilities.map((c) => c.id)).toEqual([change.id, servicing.id]);
  });

  it("overrides the journey when the requirement's section names one capability", () => {
    const result = resolveRequirementCapabilities(
      { capabilities: [change] },
      { capabilities: [change, servicing] },
    );
    expect(result.source).toBe("override");
    expect(result.capabilities).toEqual([change]);
  });

  it("treats a missing journey as no inherited capabilities", () => {
    expect(resolveRequirementCapabilities({ capabilities: [] }, null)).toEqual({
      capabilities: [],
      source: "inherited",
    });
    expect(resolveRequirementCapabilities({ capabilities: [] }, undefined).source).toBe("inherited");
  });
});

describe("resolveCriterionCapabilities", () => {
  it("inherits the requirement's capabilities when the criterion declares none", () => {
    const result = resolveCriterionCapabilities({ capabilities: [] }, { capabilities: [view, change] });
    expect(result.source).toBe("inherited");
    expect(result.capabilities.map((c) => c.id)).toEqual([change.id, view.id]);
  });

  it("replaces the inherited set entirely when the criterion declares capabilities", () => {
    const result = resolveCriterionCapabilities({ capabilities: [servicing] }, { capabilities: [view, change] });
    expect(result.source).toBe("override");
    expect(result.capabilities).toEqual([servicing]);
  });

  it("allows an override to introduce a capability the parent does not carry", () => {
    const result = resolveCriterionCapabilities({ capabilities: [change] }, { capabilities: [view] });
    expect(result.capabilities.map((c) => c.id)).toEqual([change.id]);
  });

  it("reports inherited with an empty list when the parent has no capabilities either", () => {
    expect(resolveCriterionCapabilities({ capabilities: [] }, { capabilities: [] })).toEqual({
      capabilities: [],
      source: "inherited",
    });
  });

  it("treats null and undefined capability relations as empty", () => {
    expect(resolveCriterionCapabilities({}, {})).toEqual({ capabilities: [], source: "inherited" });
    expect(resolveCriterionCapabilities({ capabilities: null }, { capabilities: null })).toEqual({
      capabilities: [],
      source: "inherited",
    });
  });

  it("reverts to inheritance once the override is cleared", () => {
    const requirement = { capabilities: [view, change] };
    expect(resolveCriterionCapabilities({ capabilities: [servicing] }, requirement).source).toBe("override");

    const reverted = resolveCriterionCapabilities({ capabilities: [] }, requirement);
    expect(reverted.source).toBe("inherited");
    expect(reverted.capabilities).toHaveLength(2);
  });

  it("sorts capabilities by name so chips render in a stable order", () => {
    const result = resolveCriterionCapabilities({ capabilities: [] }, { capabilities: [change, servicing, view] });
    expect(result.capabilities.map((c) => c.name)).toEqual([
      "Change policy",
      "Update servicing details",
      "View policy",
    ]);
  });

  it("does not mutate the source arrays while sorting", () => {
    const capabilities = [change, servicing];
    resolveCriterionCapabilities({ capabilities: [] }, { capabilities });
    expect(capabilities).toEqual([change, servicing]);
  });
});

describe("the journey -> requirement -> criterion chain", () => {
  const journey = { capabilities: [change, servicing] };

  it("carries the journey's capabilities all the way down when nothing overrides", () => {
    const result = resolveCriterionCapabilitiesInJourney({ capabilities: [] }, { capabilities: [] }, journey);
    expect(result.source).toBe("inherited");
    expect(result.capabilities.map((c) => c.name)).toEqual(["Change policy", "Update servicing details"]);
  });

  it("stops at the requirement's override rather than reaching past it", () => {
    const result = resolveCriterionCapabilitiesInJourney(
      { capabilities: [] },
      { capabilities: [change] },
      journey,
    );
    expect(result.source).toBe("inherited");
    expect(result.capabilities).toEqual([change]);
  });

  it("lets a criterion override a requirement that is itself overriding", () => {
    const result = resolveCriterionCapabilitiesInJourney(
      { capabilities: [view] },
      { capabilities: [change] },
      journey,
    );
    expect(result.source).toBe("override");
    expect(result.capabilities).toEqual([view]);
  });

  it("flows a capability added to the journey down to inheriting requirements only", () => {
    const widened = { capabilities: [change, servicing, view] };
    expect(
      resolveCriterionCapabilitiesInJourney({ capabilities: [] }, { capabilities: [] }, widened).capabilities,
    ).toHaveLength(3);
    expect(
      resolveCriterionCapabilitiesInJourney({ capabilities: [] }, { capabilities: [change] }, widened).capabilities,
    ).toEqual([change]);
  });
});

describe("isOverridden", () => {
  it("is true only when the level carries its own capabilities", () => {
    expect(isOverridden({ capabilities: [change] })).toBe(true);
    expect(isOverridden({ capabilities: [] })).toBe(false);
    expect(isOverridden({})).toBe(false);
  });
});

describe("criterionAppliesToCapability", () => {
  const requirement = { capabilities: [view, change] };

  it("matches capabilities reached by inheritance", () => {
    expect(criterionAppliesToCapability({ capabilities: [] }, requirement, change.id)).toBe(true);
  });

  it("stops matching an inherited capability once the criterion overrides", () => {
    expect(criterionAppliesToCapability({ capabilities: [servicing] }, requirement, change.id)).toBe(false);
    expect(criterionAppliesToCapability({ capabilities: [servicing] }, requirement, servicing.id)).toBe(true);
  });
});
