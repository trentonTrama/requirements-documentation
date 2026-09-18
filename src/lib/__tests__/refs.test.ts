import { describe, expect, it } from "vitest";
import { formatCriterionRef, formatRequirementRef } from "../refs";

describe("reference formatting", () => {
  it("zero-pads requirement numbers to three digits", () => {
    expect(formatRequirementRef("BED", 1)).toBe("FR-BED-001");
    expect(formatRequirementRef("BED", 42)).toBe("FR-BED-042");
  });

  it("does not truncate numbers beyond the padding width", () => {
    expect(formatRequirementRef("BEDW", 1234)).toBe("FR-BEDW-1234");
  });

  it("nests criterion references under their requirement", () => {
    expect(formatCriterionRef("FR-BED-001", 3)).toBe("FR-BED-001.AC-03");
  });
});
