/**
 * Turns the authored corpus into the shapes the database stores. Kept separate
 * from the seed script so the derivations -- journey keys, capability splitting,
 * change classes -- are testable without a database.
 */
import type { CapabilityAction, ChangeClass, JourneySide } from "@prisma/client";
import { SOURCE_JOURNEYS, type SourceJourney } from "./types";

export { SOURCE_JOURNEYS };
export type { SourceJourney };

/**
 * The permissions the documents are written against. The corpus names actors
 * ("Underwriter"), but what each one contributes to a requirement is a single
 * permission, so that is what the requirement carries: the actor is reconstructed
 * as a ROLES entry below, out of the capabilities it holds.
 */
export const CAPABILITIES = [
  {
    key: "POLICY_VIEW",
    name: "View policy",
    resource: "Policy",
    action: "VIEW" as CapabilityAction,
    color: "sky",
    description: "Read the policy surface: the contract's facts as they stand.",
  },
  {
    key: "POLICY_CHANGE",
    name: "Change policy",
    resource: "Coverage, exposure and rating",
    action: "UPDATE" as CapabilityAction,
    color: "amber",
    description:
      "Alter the risk: coverage, exposure and rating. Reaches the policy as an endorsement.",
  },
  {
    key: "SERVICING_UPDATE",
    name: "Update servicing details",
    resource: "Entity details, addresses and contacts",
    action: "UPDATE" as CapabilityAction,
    color: "teal",
    description: "Correct details that do not alter the risk, without raising an endorsement.",
  },
] as const;

/**
 * The actors the documents name, each configured as the set of capabilities it
 * holds. Everyone can read the policy; what separates the two write-side roles is
 * which kind of change they are allowed to make.
 */
export const ROLES = [
  {
    key: "POLICY_VIEWER",
    name: "Policy Viewer",
    color: "sky",
    capabilities: ["POLICY_VIEW"],
    description: "Reads a policy to understand what is on it. The default read-side audience.",
    goals: "See the contract's facts in one place without hunting across screens.",
    painPoints: "Values that are missing and values that failed to load look the same.",
  },
  {
    key: "UNDERWRITER",
    name: "Underwriter",
    color: "amber",
    capabilities: ["POLICY_VIEW", "POLICY_CHANGE"],
    description: "Assesses and prices risk, and makes the policy changes that follow from it.",
    goals: "Change coverage, exposure and rating with confidence about what each change affects.",
    painPoints: "Undecided behaviour and state-specific rules that are not written down.",
  },
  {
    key: "SERVICING_REP",
    name: "Servicing Rep",
    color: "teal",
    capabilities: ["POLICY_VIEW", "SERVICING_UPDATE"],
    description: "Handles servicing updates: corrections that do not alter the risk.",
    goals: "Correct entity details, addresses and contacts without raising an endorsement.",
    painPoints: "Servicing corrections that behave like policy changes.",
  },
] as const;

/**
 * The corpus arrived as one body of work, so it seeds as one project holding every
 * domain. Projects are a cross-cutting collection -- add journeys or individual
 * requirements to a second project in the app and nothing here has to change.
 */
export const PROJECTS = [
  {
    key: "WCPOLICY",
    slug: "workers-comp-policy",
    name: "Workers-Comp Policy Platform",
    status: "ACTIVE" as const,
    color: "violet",
    description:
      "The whole authored corpus: every domain, its read and write journeys, and the requirements under them.",
    categories: "all" as const,
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

/** Capability each change class exercises. Drives the requirement-level override. */
const CAPABILITY_BY_CHANGE_CLASS: Partial<Record<ChangeClass, string>> = {
  POLICY_CHANGE: "POLICY_CHANGE",
  SERVICING_UPDATE: "SERVICING_UPDATE",
};

/**
 * The actor a document names, reduced to the capability it is there to exercise:
 * a Policy Viewer is on the document to read it, an Underwriter to change the
 * policy. The wider set each actor holds lives on the role, not on the document.
 */
const CAPABILITY_KEY_BY_ACTOR: Record<string, string> = {
  "Policy Viewer": "POLICY_VIEW",
  Underwriter: "POLICY_CHANGE",
  "Servicing Rep": "SERVICING_UPDATE",
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
 * "Underwriter (Policy change) / Servicing Rep (Servicing update)" -> both
 * capability keys. The parenthetical qualifiers are dropped here; they resurface
 * as the per-section change class, which is what actually narrows the capabilities.
 */
export function capabilityKeysFor(actorField: string) {
  return actorField
    .split("/")
    .map((part) => part.replace(/\(.*?\)/gu, "").trim())
    .filter(Boolean)
    .map((name) => {
      const key = CAPABILITY_KEY_BY_ACTOR[name];
      if (!key) throw new Error(`Unknown actor "${name}"`);
      return key;
    })
    .filter((key, index, all) => all.indexOf(key) === index);
}

/**
 * Capabilities a requirement declares for itself. A section with a change class
 * exercises exactly one permission, so it overrides; everything else inherits the
 * journey's capabilities by holding none of its own.
 */
export function requirementCapabilityKeys(changeClass: ChangeClass | null) {
  if (!changeClass) return [];
  const key = CAPABILITY_BY_CHANGE_CLASS[changeClass];
  return key ? [key] : [];
}

export function draftedOn(journey: SourceJourney) {
  const parsed = new Date(`${journey.drafted}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
