/**
 * Turns the authored corpus into the shapes the database stores. Kept separate
 * from the seed script so the derivations -- journey keys, persona splitting,
 * change classes -- are testable without a database.
 */
import type { ChangeClass, JourneySide } from "@prisma/client";
import { SOURCE_JOURNEYS, type SourceJourney } from "./types";

export { SOURCE_JOURNEYS };
export type { SourceJourney };

/** The three atomic personas the documents' composite persona strings resolve to. */
export const PERSONAS = [
  {
    key: "POLICY_VIEWER",
    name: "Policy Viewer",
    color: "sky",
    description: "Reads a policy to understand what is on it. The default read-side audience.",
    goals: "See the contract's facts in one place without hunting across screens.",
    painPoints: "Values that are missing and values that failed to load look the same.",
  },
  {
    key: "UNDERWRITER",
    name: "Underwriter",
    color: "amber",
    description: "Assesses and prices risk, and makes the policy changes that follow from it.",
    goals: "Change coverage, exposure and rating with confidence about what each change affects.",
    painPoints: "Undecided behaviour and state-specific rules that are not written down.",
  },
  {
    key: "SERVICING_REP",
    name: "Servicing Rep",
    color: "teal",
    description: "Handles servicing updates: corrections that do not alter the risk.",
    goals: "Correct entity details, addresses and contacts without raising an endorsement.",
    painPoints: "Servicing corrections that behave like policy changes.",
  },
] as const;

/** Domains, in the order the documents are presented. */
export const DOMAINS = [
  { key: "BED", name: "Business Entity Data", color: "sky" },
  { key: "CPL", name: "Coverage Provisions & Limits", color: "violet" },
  { key: "ELS", name: "Exposure & Location Schedules", color: "emerald" },
  { key: "PLT", name: "Policy Lifecycle & Temporal Scoping", color: "amber" },
  { key: "RBP", name: "Rating, Bureau & Pricing Engine", color: "rose" },
  { key: "SVC", name: "Servicing & Relationships", color: "teal" },
  { key: "TLD", name: "Transaction Lifecycle & Drafts", color: "fuchsia" },
] as const;

type Domain = (typeof DOMAINS)[number];

const DOMAIN_BY_NAME = new Map<string, Domain>(DOMAINS.map((domain) => [domain.name, domain]));

const CHANGE_CLASS_BY_LABEL: Record<string, ChangeClass> = {
  "Policy change": "POLICY_CHANGE",
  "Servicing update": "SERVICING_UPDATE",
  Container: "CONTAINER",
};

/** Persona each change class is carried out by. Drives the requirement-level override. */
const PERSONA_BY_CHANGE_CLASS: Partial<Record<ChangeClass, string>> = {
  POLICY_CHANGE: "UNDERWRITER",
  SERVICING_UPDATE: "SERVICING_REP",
};

const PERSONA_KEY_BY_NAME: Record<string, string> = {
  "Policy Viewer": "POLICY_VIEWER",
  Underwriter: "UNDERWRITER",
  "Servicing Rep": "SERVICING_REP",
};

/** "Business Entity Data — Write" -> the Business Entity Data domain. */
export function domainFor(journey: SourceJourney) {
  const name = journey.domain.replace(/\s*—\s*Write$/u, "").trim();
  const domain = DOMAIN_BY_NAME.get(name);
  if (!domain) throw new Error(`Unknown domain "${name}" on ${journey.slug}`);
  return domain;
}

export function sideFor(journey: SourceJourney): JourneySide {
  return journey.side === "write" ? "WRITE" : "READ";
}

/** BED for the read side, BEDW for the write side. */
export function journeyKeyFor(journey: SourceJourney) {
  return `${domainFor(journey).key}${sideFor(journey) === "WRITE" ? "W" : ""}`;
}

export function changeClassFor(label: string | null | undefined): ChangeClass | null {
  if (!label) return null;
  const mapped = CHANGE_CLASS_BY_LABEL[label];
  if (!mapped) throw new Error(`Unknown requirement group class "${label}"`);
  return mapped;
}

/**
 * "Underwriter (Policy change) / Servicing Rep (Servicing update)" -> both persona
 * keys. The parenthetical qualifiers are dropped here; they resurface as the
 * per-section change class, which is what actually narrows the personas.
 */
export function personaKeysFor(personaField: string) {
  return personaField
    .split("/")
    .map((part) => part.replace(/\(.*?\)/gu, "").trim())
    .filter(Boolean)
    .map((name) => {
      const key = PERSONA_KEY_BY_NAME[name];
      if (!key) throw new Error(`Unknown persona "${name}"`);
      return key;
    })
    .filter((key, index, all) => all.indexOf(key) === index);
}

/**
 * Personas a requirement declares for itself. A section with a change class is
 * carried out by one role, so it overrides; everything else inherits the
 * journey's personas by holding none of its own.
 */
export function requirementPersonaKeys(changeClass: ChangeClass | null) {
  if (!changeClass) return [];
  const key = PERSONA_BY_CHANGE_CLASS[changeClass];
  return key ? [key] : [];
}

export function draftedOn(journey: SourceJourney) {
  const parsed = new Date(`${journey.drafted}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
