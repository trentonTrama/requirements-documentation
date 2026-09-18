/**
 * Persona resolution for acceptance criteria.
 *
 * Rule (see prisma/schema.prisma): an acceptance criterion inherits its parent
 * requirement's personas. Declaring personas on the criterion replaces the
 * inherited set entirely for that criterion. A non-empty persona list on the
 * criterion IS the override -- there is no separate flag.
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

export function resolveCriterionPersonas<T extends PersonaLike>(
  criterion: { personas?: T[] | null },
  requirement: { personas?: T[] | null },
): ResolvedPersonas<T> {
  const own = criterion.personas ?? [];
  if (own.length > 0) {
    return { personas: sortPersonas(own), source: "override" };
  }
  return { personas: sortPersonas(requirement.personas ?? []), source: "inherited" };
}

/** True when the criterion carries its own persona list. */
export function isOverridden(criterion: { personas?: PersonaLike[] | null }) {
  return (criterion.personas ?? []).length > 0;
}

/**
 * Does this persona apply to the criterion, directly or by inheritance?
 * Used by persona detail pages and list filtering.
 */
export function criterionAppliesToPersona<T extends PersonaLike>(
  criterion: { personas?: T[] | null },
  requirement: { personas?: T[] | null },
  personaId: string,
) {
  return resolveCriterionPersonas(criterion, requirement).personas.some((p) => p.id === personaId);
}

function sortPersonas<T extends PersonaLike>(personas: T[]): T[] {
  return [...personas].sort((a, b) => a.name.localeCompare(b.name));
}
