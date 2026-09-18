/**
 * Roles are configuration over capabilities, never a second thing to assign.
 * Nothing in the document tree points at a role: a role reaches a journey,
 * requirement or criterion exactly when one of its capabilities does, so
 * re-configuring a role changes its coverage without touching a requirement.
 *
 * Everything here works on already-resolved capability lists (src/lib/capabilities.ts),
 * so the inheritance rule is applied once, above, and never re-implemented.
 */
import type { CapabilityLike } from "./capabilities";

export type RoleLike<T extends CapabilityLike = CapabilityLike> = {
  id: string;
  key: string;
  name: string;
  color: string;
  capabilities: T[];
};

/** Capability ids a role grants, as a set for repeated membership tests. */
export function grantedCapabilityIds(role: { capabilities: { id: string }[] }) {
  return new Set(role.capabilities.map((capability) => capability.id));
}

/** Does this role grant at least one of the capabilities in play? */
export function roleReaches(role: RoleLike, capabilities: CapabilityLike[]) {
  const granted = grantedCapabilityIds(role);
  return capabilities.some((capability) => granted.has(capability.id));
}

/** Does this role grant every capability in play, rather than only some? */
export function roleCoversAll(role: RoleLike, capabilities: CapabilityLike[]) {
  if (capabilities.length === 0) return false;
  const granted = grantedCapabilityIds(role);
  return capabilities.every((capability) => granted.has(capability.id));
}

/**
 * The roles that can exercise a resolved capability set, each tagged with whether
 * it covers the whole set or only part of it -- a partial holder can do some of
 * what the requirement describes, which is worth saying out loud on the page.
 */
export function rolesFor<R extends RoleLike>(roles: R[], capabilities: CapabilityLike[]) {
  return roles
    .filter((role) => roleReaches(role, capabilities))
    .map((role) => ({ role, full: roleCoversAll(role, capabilities) }))
    .sort((a, b) => Number(b.full) - Number(a.full) || a.role.name.localeCompare(b.role.name));
}

/** Roles that hold a single capability, for the capability's own page. */
export function rolesGranting<R extends RoleLike>(roles: R[], capabilityId: string) {
  return roles.filter((role) => role.capabilities.some((c) => c.id === capabilityId));
}
