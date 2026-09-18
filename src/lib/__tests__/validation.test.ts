import { describe, expect, it } from "vitest";
import {
  capabilitySchema,
  categorySchema,
  commentSchema,
  criterionSchema,
  journeySchema,
  linkSchema,
  projectSchema,
  questionSchema,
  requirementSchema,
  roleSchema,
} from "../validation";

describe("commentSchema", () => {
  it("accepts a comment on any one of the three parents", () => {
    expect(commentSchema.safeParse({ body: "hi", journeyId: "j1" }).success).toBe(true);
    expect(commentSchema.safeParse({ body: "hi", requirementId: "r1" }).success).toBe(true);
    expect(commentSchema.safeParse({ body: "hi", acceptanceCriterionId: "c1" }).success).toBe(true);
  });

  it("rejects a comment with no target", () => {
    expect(commentSchema.safeParse({ body: "hi" }).success).toBe(false);
  });

  it("rejects a comment attached to more than one parent", () => {
    expect(
      commentSchema.safeParse({ body: "hi", requirementId: "r1", acceptanceCriterionId: "c1" }).success,
    ).toBe(false);
    expect(commentSchema.safeParse({ body: "hi", journeyId: "j1", requirementId: "r1" }).success).toBe(
      false,
    );
    expect(
      commentSchema.safeParse({
        body: "hi",
        journeyId: "j1",
        requirementId: "r1",
        acceptanceCriterionId: "c1",
      }).success,
    ).toBe(false);
  });

  it("falls back to Anonymous when no author is given", () => {
    const result = commentSchema.parse({ body: "hi", requirementId: "r1" });
    expect(result.authorName).toBe("Anonymous");
  });
});

describe("questionSchema", () => {
  it("applies the same single-target rule", () => {
    expect(questionSchema.safeParse({ body: "why?", acceptanceCriterionId: "c1" }).success).toBe(true);
    expect(questionSchema.safeParse({ body: "why?", journeyId: "j1" }).success).toBe(true);
    expect(questionSchema.safeParse({ body: "why?" }).success).toBe(false);
    expect(questionSchema.safeParse({ body: "why?", journeyId: "j1", requirementId: "r1" }).success).toBe(
      false,
    );
  });
});

describe("requirementSchema", () => {
  it("defaults to inheriting capabilities from the journey", () => {
    const result = requirementSchema.parse({ title: "Users can…", journeyId: "j1" });
    expect(result.capabilityIds).toEqual([]);
    expect(result.decisionRequired).toBe(false);
    expect(result.stateSpecific).toBe(false);
    expect(result.status).toBe("DRAFT");
  });

  it("requires a journey", () => {
    expect(requirementSchema.safeParse({ title: "Users can…" }).success).toBe(false);
  });

  it("rejects a change class the schema does not model", () => {
    expect(
      requirementSchema.safeParse({ title: "x", journeyId: "j1", changeClass: "Rate change" }).success,
    ).toBe(false);
  });
});

describe("journeySchema", () => {
  it("accepts a slug of lowercase words and hyphens", () => {
    const result = journeySchema.safeParse({
      slug: "business-entity-data-write",
      key: "BEDW",
      title: "Business Entity Data — Write",
      categoryId: "c1",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a slug with spaces or capitals", () => {
    const base = { key: "BEDW", title: "t", categoryId: "c1" };
    expect(journeySchema.safeParse({ ...base, slug: "Business Entity" }).success).toBe(false);
    expect(journeySchema.safeParse({ ...base, slug: "BEDW" }).success).toBe(false);
  });

  it("defaults to the read side", () => {
    expect(journeySchema.parse({ slug: "a-b", key: "AB", title: "t", categoryId: "c1" }).side).toBe(
      "READ",
    );
  });
});

describe("criterionSchema", () => {
  it("defaults to an empty capability list, meaning inherit from the requirement", () => {
    const result = criterionSchema.parse({ requirementId: "r1", statement: "given…" });
    expect(result.capabilityIds).toEqual([]);
  });
});

describe("categorySchema", () => {
  it("requires an uppercase alphanumeric key", () => {
    expect(categorySchema.safeParse({ key: "BED", name: "Business Entity Data" }).success).toBe(true);
    expect(categorySchema.safeParse({ key: "bed", name: "Business Entity Data" }).success).toBe(false);
    expect(categorySchema.safeParse({ key: "B E D", name: "Business Entity Data" }).success).toBe(false);
  });
});

describe("capabilitySchema", () => {
  it("takes an underscored constant key and defaults the action to VIEW", () => {
    const result = capabilitySchema.parse({ key: "POLICY_CHANGE", name: "Change policy" });
    expect(result.action).toBe("VIEW");
    expect(result.resource).toBe("");
  });

  it("rejects a key the journey key rules would allow but a constant would not", () => {
    expect(capabilitySchema.safeParse({ key: "policy_view", name: "View" }).success).toBe(false);
    expect(capabilitySchema.safeParse({ key: "POLICY VIEW", name: "View" }).success).toBe(false);
  });

  it("rejects an action the schema does not model", () => {
    expect(capabilitySchema.safeParse({ key: "X_Y", name: "x", action: "PUBLISH" }).success).toBe(
      false,
    );
  });
});

describe("roleSchema", () => {
  it("defaults to a role that grants nothing", () => {
    const result = roleSchema.parse({ key: "UNDERWRITER", name: "Underwriter" });
    expect(result.capabilityIds).toEqual([]);
  });

  it("carries the whole capability configuration", () => {
    const result = roleSchema.parse({
      key: "UNDERWRITER",
      name: "Underwriter",
      capabilityIds: ["c1", "c2"],
    });
    expect(result.capabilityIds).toEqual(["c1", "c2"]);
  });
});

describe("projectSchema", () => {
  it("accepts a constant key with a url slug and defaults to active", () => {
    const result = projectSchema.parse({
      key: "WCPOLICY",
      slug: "workers-comp-policy",
      name: "Workers-Comp Policy Platform",
    });
    expect(result.status).toBe("ACTIVE");
    expect(result.targetDate ?? null).toBe(null);
  });

  it("rejects a slug with spaces or capitals", () => {
    const base = { key: "WCPOLICY", name: "Workers-Comp" };
    expect(projectSchema.safeParse({ ...base, slug: "Workers Comp" }).success).toBe(false);
  });
});

describe("linkSchema", () => {
  it("rejects a self link", () => {
    expect(linkSchema.safeParse({ fromRequirementId: "r1", toRequirementId: "r1" }).success).toBe(false);
  });
});
