import { describe, expect, it } from "vitest";
import { categorySchema, commentSchema, criterionSchema, linkSchema, questionSchema } from "../validation";

describe("commentSchema", () => {
  it("accepts a comment on a requirement", () => {
    expect(commentSchema.safeParse({ body: "hi", requirementId: "r1" }).success).toBe(true);
  });

  it("rejects a comment with no target", () => {
    expect(commentSchema.safeParse({ body: "hi" }).success).toBe(false);
  });

  it("rejects a comment attached to both a requirement and a criterion", () => {
    const result = commentSchema.safeParse({ body: "hi", requirementId: "r1", acceptanceCriterionId: "c1" });
    expect(result.success).toBe(false);
  });

  it("falls back to Anonymous when no author is given", () => {
    const result = commentSchema.parse({ body: "hi", requirementId: "r1" });
    expect(result.authorName).toBe("Anonymous");
  });
});

describe("questionSchema", () => {
  it("applies the same single-target rule", () => {
    expect(questionSchema.safeParse({ body: "why?", acceptanceCriterionId: "c1" }).success).toBe(true);
    expect(questionSchema.safeParse({ body: "why?" }).success).toBe(false);
  });
});

describe("criterionSchema", () => {
  it("defaults to an empty persona list, meaning inherit", () => {
    const result = criterionSchema.parse({ requirementId: "r1", statement: "given…" });
    expect(result.personaIds).toEqual([]);
  });
});

describe("categorySchema", () => {
  it("requires an uppercase alphanumeric key", () => {
    expect(categorySchema.safeParse({ key: "BIL", name: "Billing" }).success).toBe(true);
    expect(categorySchema.safeParse({ key: "bil", name: "Billing" }).success).toBe(false);
    expect(categorySchema.safeParse({ key: "B I L", name: "Billing" }).success).toBe(false);
  });
});

describe("linkSchema", () => {
  it("rejects a self link", () => {
    expect(linkSchema.safeParse({ fromRequirementId: "r1", toRequirementId: "r1" }).success).toBe(false);
  });
});
