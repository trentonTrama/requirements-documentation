import { describe, expect, it } from "vitest";
import {
  categorySchema,
  commentSchema,
  criterionSchema,
  journeySchema,
  linkSchema,
  questionSchema,
  requirementSchema,
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
  it("defaults to inheriting personas from the journey", () => {
    const result = requirementSchema.parse({ title: "Users can…", journeyId: "j1" });
    expect(result.personaIds).toEqual([]);
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
  it("defaults to an empty persona list, meaning inherit from the requirement", () => {
    const result = criterionSchema.parse({ requirementId: "r1", statement: "given…" });
    expect(result.personaIds).toEqual([]);
  });
});

describe("categorySchema", () => {
  it("requires an uppercase alphanumeric key", () => {
    expect(categorySchema.safeParse({ key: "BED", name: "Business Entity Data" }).success).toBe(true);
    expect(categorySchema.safeParse({ key: "bed", name: "Business Entity Data" }).success).toBe(false);
    expect(categorySchema.safeParse({ key: "B E D", name: "Business Entity Data" }).success).toBe(false);
  });
});

describe("linkSchema", () => {
  it("rejects a self link", () => {
    expect(linkSchema.safeParse({ fromRequirementId: "r1", toRequirementId: "r1" }).success).toBe(false);
  });
});
