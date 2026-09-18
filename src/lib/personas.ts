/**
 * Persona resolution down the journey -> requirement -> acceptance criterion chain.
 *
 * Rule (see prisma/schema.prisma): personas attach to a journey document. A
 * requirement inherits them unless it declares its own, and a criterion inherits
 * the requirement's *resolved* set unless it declares its own. Declaring
 * personas replaces the inherited set entirely at that level -- a non-empty
 * persona list IS the override, there is no separate flag.
 *
 * This is the single source of truth: every view, filter and persona report
 * calls it rather than re-deriving the rule.
 */

export type PersonaLike = {
  id: string;
  key: string;
  name: string;
  color: string;
};

export type PersonaSource = "inherited" | "override";

export type ResolvedPersonas<T extends PersonaLike = PersonaLike> = {
  personas: T[];
  source: PersonaSource;
};

type PersonaBearer<T extends PersonaLike> = { personas?: T[] | null };

/** Shared inherit-unless-declared step, applied at each level of the chain. */
function resolve<T extends PersonaLike>(
  child: PersonaBearer<T>,
  inherited: T[],
): ResolvedPersonas<T> {
  const own = child.personas ?? [];
  return own.length > 0
    ? { personas: sortPersonas(own), source: "override" }
    : { personas: sortPersonas(inherited), source: "inherited" };
}

export function resolveRequirementPersonas<T extends PersonaLike>(
  requirement: PersonaBearer<T>,
  journey: PersonaBearer<T> | null | undefined,
): ResolvedPersonas<T> {
  return resolve(requirement, journey?.personas ?? []);
}

/**
 * `requirement` may be a raw record or an already-resolved persona list. Pass the
 * resolved list when a journey is in play, so a criterion inherits what its
 * requirement actually shows rather than what it stores.
 */
export function resolveCriterionPersonas<T extends PersonaLike>(
  criterion: PersonaBearer<T>,
  requirement: PersonaBearer<T>,
): ResolvedPersonas<T> {
  return resolve(criterion, requirement.personas ?? []);
}

/** Resolve a criterion all the way up through its requirement to its journey. */
export function resolveCriterionPersonasInJourney<T extends PersonaLike>(
  criterion: PersonaBearer<T>,
  requirement: PersonaBearer<T>,
  journey: PersonaBearer<T> | null | undefined,
): ResolvedPersonas<T> {
  const forRequirement = resolveRequirementPersonas(requirement, journey);
  return resolveCriterionPersonas(criterion, { personas: forRequirement.personas });
}

/** True when this level carries its own persona list rather than inheriting. */
export function isOverridden(bearer: PersonaBearer<PersonaLike>) {
  return (bearer.personas ?? []).length > 0;
}

/**
 * Does this persona apply to the criterion, directly or by inheritance?
 * Used by persona detail pages and list filtering.
 */
export function criterionAppliesToPersona<T extends PersonaLike>(
  criterion: PersonaBearer<T>,
  requirement: PersonaBearer<T>,
  personaId: string,
) {
  return resolveCriterionPersonas(criterion, requirement).personas.some((p) => p.id === personaId);
}

function sortPersonas<T extends PersonaLike>(personas: T[]): T[] {
  return [...personas].sort((a, b) => a.name.localeCompare(b.name));
}
