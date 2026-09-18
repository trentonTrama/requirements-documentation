/**
 * A role is configuration over capabilities: nothing in the document tree points
 * at one, so its coverage has to fall out of what it grants.
 */
import { describe, expect, it } from "vitest";
import { grantedCapabilityIds, roleCoversAll, roleReaches, rolesFor, rolesGranting } from "../roles";

const view = { id: "c1", key: "POLICY_VIEW", name: "View policy", color: "sky" };
const change = { id: "c2", key: "POLICY_CHANGE", name: "Change policy", color: "amber" };
const servicing = { id: "c3", key: "SERVICING_UPDATE", name: "Update servicing details", color: "teal" };

const viewer = { id: "r1", key: "POLICY_VIEWER", name: "Policy Viewer", color: "sky", capabilities: [view] };
const underwriter = {
  id: "r2",
  key: "UNDERWRITER",
  name: "Underwriter",
  color: "amber",
  capabilities: [view, change],
};
const servicingRep = {
  id: "r3",
  key: "SERVICING_REP",
  name: "Servicing Rep",
  color: "teal",
  capabilities: [view, servicing],
};
const roles = [viewer, underwriter, servicingRep];

describe("grantedCapabilityIds", () => {
  it("is the whole configuration of a role", () => {
    expect([...grantedCapabilityIds(underwriter)]).toEqual([view.id, change.id]);
    expect([...grantedCapabilityIds({ capabilities: [] })]).toEqual([]);
  });
});

describe("roleReaches", () => {
  it("is true when the role grants any capability in play", () => {
    expect(roleReaches(viewer, [view, change])).toBe(true);
    expect(roleReaches(viewer, [change])).toBe(false);
  });

  it("reaches nothing when no capability is in play", () => {
    expect(roleReaches(underwriter, [])).toBe(false);
  });
});

describe("roleCoversAll", () => {
  it("separates a full holder from a partial one", () => {
    expect(roleCoversAll(underwriter, [view, change])).toBe(true);
    expect(roleCoversAll(viewer, [view, change])).toBe(false);
  });

  it("is false for an empty capability set rather than vacuously true", () => {
    expect(roleCoversAll(underwriter, [])).toBe(false);
  });
});

describe("rolesFor", () => {
  it("lists every role that can exercise part of the set, full holders first", () => {
    const result = rolesFor(roles, [view, change]);
    expect(result.map((entry) => entry.role.name)).toEqual([
      "Underwriter",
      "Policy Viewer",
      "Servicing Rep",
    ]);
    expect(result.map((entry) => entry.full)).toEqual([true, false, false]);
  });

  it("drops roles that grant none of it", () => {
    expect(rolesFor(roles, [servicing]).map((entry) => entry.role.name)).toEqual(["Servicing Rep"]);
  });

  it("returns nothing for a requirement with no capabilities", () => {
    expect(rolesFor(roles, [])).toEqual([]);
  });

  it("re-grants coverage the moment a role's capabilities change, with no edit to the requirement", () => {
    const widened = { ...viewer, capabilities: [view, servicing] };
    expect(rolesFor([widened], [servicing])[0]?.role.name).toBe("Policy Viewer");
  });
});

describe("rolesGranting", () => {
  it("finds the holders of one capability", () => {
    expect(rolesGranting(roles, view.id).map((role) => role.key)).toEqual([
      "POLICY_VIEWER",
      "UNDERWRITER",
      "SERVICING_REP",
    ]);
    expect(rolesGranting(roles, change.id).map((role) => role.key)).toEqual(["UNDERWRITER"]);
  });

  it("returns nothing for a capability no role holds", () => {
    expect(rolesGranting(roles, "c9")).toEqual([]);
  });
});
