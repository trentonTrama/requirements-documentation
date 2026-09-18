/**
 * Capability resolution down the journey -> requirement -> acceptance criterion
 * chain.
 *
 * Rule (see prisma/schema.prisma): capabilities attach to a journey document. A
 * requirement inherits them unless it declares its own, and a criterion inherits
 * the requirement's *resolved* set unless it declares its own. Declaring
 * capabilities replaces the inherited set entirely at that level -- a non-empty
 * capability list IS the override, there is no separate flag.
 *
 * This is the single source of truth: every view, filter and coverage report
 * calls it rather than re-deriving the rule. Roles are never resolved here --
 * a role reaches a requirement only through the capabilities it grants
 * (src/lib/roles.ts).
 */

export type CapabilityLike = {
  id: string;
  key: string;
  name: string;
  color: string;
};

export type CapabilitySource = "inherited" | "override";

export type ResolvedCapabilities<T extends CapabilityLike = CapabilityLike> = {
  capabilities: T[];
  source: CapabilitySource;
};

type CapabilityBearer<T extends CapabilityLike> = { capabilities?: T[] | null };

/** Shared inherit-unless-declared step, applied at each level of the chain. */
function resolve<T extends CapabilityLike>(
  child: CapabilityBearer<T>,
  inherited: T[],
): ResolvedCapabilities<T> {
  const own = child.capabilities ?? [];
  return own.length > 0
    ? { capabilities: sortCapabilities(own), source: "override" }
    : { capabilities: sortCapabilities(inherited), source: "inherited" };
}

export function resolveRequirementCapabilities<T extends CapabilityLike>(
  requirement: CapabilityBearer<T>,
  journey: CapabilityBearer<T> | null | undefined,
): ResolvedCapabilities<T> {
  return resolve(requirement, journey?.capabilities ?? []);
}

/**
 * `requirement` may be a raw record or an already-resolved capability list. Pass
 * the resolved list when a journey is in play, so a criterion inherits what its
 * requirement actually shows rather than what it stores.
 */
export function resolveCriterionCapabilities<T extends CapabilityLike>(
  criterion: CapabilityBearer<T>,
  requirement: CapabilityBearer<T>,
): ResolvedCapabilities<T> {
  return resolve(criterion, requirement.capabilities ?? []);
}

/** Resolve a criterion all the way up through its requirement to its journey. */
export function resolveCriterionCapabilitiesInJourney<T extends CapabilityLike>(
  criterion: CapabilityBearer<T>,
  requirement: CapabilityBearer<T>,
  journey: CapabilityBearer<T> | null | undefined,
): ResolvedCapabilities<T> {
  const forRequirement = resolveRequirementCapabilities(requirement, journey);
  return resolveCriterionCapabilities(criterion, { capabilities: forRequirement.capabilities });
}

/** True when this level carries its own capability list rather than inheriting. */
export function isOverridden(bearer: CapabilityBearer<CapabilityLike>) {
  return (bearer.capabilities ?? []).length > 0;
}

/**
 * Does this capability apply to the criterion, directly or by inheritance?
 * Used by capability detail pages and list filtering.
 */
export function criterionAppliesToCapability<T extends CapabilityLike>(
  criterion: CapabilityBearer<T>,
  requirement: CapabilityBearer<T>,
  capabilityId: string,
) {
  return resolveCriterionCapabilities(criterion, requirement).capabilities.some(
    (c) => c.id === capabilityId,
  );
}

function sortCapabilities<T extends CapabilityLike>(capabilities: T[]): T[] {
  return [...capabilities].sort((a, b) => a.name.localeCompare(b.name));
}
