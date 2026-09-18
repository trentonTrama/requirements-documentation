import { describe, expect, it } from "vitest";
import { createdEntry, customEntry, deletedEntry, diffEntity, nameList } from "../changelog";

const target = { entityType: "Requirement", entityId: "r1", entityRef: "FR-BIL-001", entityName: "Pay by card" };

const fields = [
  { field: "title" as const, label: "Title" },
  { field: "status" as const, label: "Status" },
];

describe("diffEntity", () => {
  it("records only the fields that actually changed", () => {
    const entries = diffEntity(
      target,
      { title: "Old", status: "DRAFT" },
      { title: "New", status: "DRAFT" },
      fields,
    );
    expect(entries).toHaveLength(1);
    expect(entries[0].field).toBe("Title");
    expect(entries[0].oldValue).toBe("Old");
    expect(entries[0].newValue).toBe("New");
  });

  it("ignores fields absent from the update payload", () => {
    const entries = diffEntity(target, { title: "Old", status: "DRAFT" }, { title: "Old" }, fields);
    expect(entries).toEqual([]);
  });

  it("applies a custom formatter before comparing", () => {
    const entries = diffEntity(
      target,
      { status: "DRAFT" },
      { status: "APPROVED" },
      [{ field: "status", label: "Status", format: (v) => (v === "DRAFT" ? "Draft" : "Approved") }],
    );
    expect(entries[0].summary).toBe('Status changed from "Draft" to "Approved"');
  });

  it("describes a cleared value as empty rather than quoting nothing", () => {
    const entries = diffEntity(target, { title: "Old" }, { title: "" }, [
      { field: "title", label: "Title" },
    ]);
    expect(entries[0].summary).toBe('Title changed from "Old" to (empty)');
  });

  it("carries the entity identity onto every draft", () => {
    const [entry] = diffEntity(target, { title: "Old" }, { title: "New" }, [
      { field: "title", label: "Title" },
    ]);
    expect(entry).toMatchObject({
      entityType: "Requirement",
      entityId: "r1",
      entityRef: "FR-BIL-001",
      authorName: "System",
    });
  });
});

describe("entry helpers", () => {
  it("builds created, deleted and custom entries", () => {
    expect(createdEntry(target, "created").field).toBe("created");
    expect(deletedEntry(target, "deleted").field).toBe("deleted");
    expect(customEntry(target, "Capabilities", "changed", "a", "b")).toMatchObject({
      field: "Capabilities",
      oldValue: "a",
      newValue: "b",
    });
  });
});

describe("nameList", () => {
  it("sorts names so capability changes read consistently", () => {
    expect(nameList([{ name: "Underwriter" }, { name: "Agent" }])).toBe("Agent, Underwriter");
  });

  it("returns an empty string for no names", () => {
    expect(nameList([])).toBe("");
  });
});
