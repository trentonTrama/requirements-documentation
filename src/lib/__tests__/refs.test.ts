import { describe, expect, it } from "vitest";
import { formatCriterionRef, formatRequirementRef } from "../refs";

describe("reference formatting", () => {
  it("zero-pads requirement numbers to three digits", () => {
    expect(formatRequirementRef("BIL", 1)).toBe("FR-BIL-001");
    expect(formatRequirementRef("BIL", 42)).toBe("FR-BIL-042");
  });

  it("does not truncate numbers beyond the padding width", () => {
    expect(formatRequirementRef("BIL", 1234)).toBe("FR-BIL-1234");
  });

  it("nests criterion references under their requirement", () => {
    expect(formatCriterionRef("FR-BIL-001", 3)).toBe("FR-BIL-001.AC-03");
  });
});
