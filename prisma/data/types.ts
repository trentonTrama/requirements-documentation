/**
 * Shape of `journeys.json`, which is the requirements corpus exactly as authored
 * (originally delivered as `window.REQUIREMENTS_DATA`). Keys are preserved
 * verbatim so the file stays diffable against the source; the only normalisation
 * applied on import was making `side`, `class` and `additionalUserStories`
 * present-but-empty rather than absent.
 */

export type SourceUserStory = {
  asA: string;
  iWant: string;
  soThat: string;
  covers: string;
  notCovered: string;
};

export type SourceAdditionalUserStory = {
  class: string | null;
  asA: string;
  iWant: string;
  soThat: string;
};

export type SourceRequirement = {
  fr: string;
  acceptanceCriteria: string[];
  sourceNotes: string;
  decisionRequired: boolean;
  stateSpecific: boolean;
};

export type SourceRequirementGroup = {
  category: string;
  /** "Policy change" | "Servicing update" | "Container", or null on read journeys. */
  class: string | null;
  stateSpecific: boolean;
  requirements: SourceRequirement[];
};

export type SourceArchiveItem = {
  item: string;
  source: string;
  disposition: string;
};

export type SourceJourney = {
  slug: string;
  domain: string;
  /** "write" for the write-side documents, null for the read-side ones. */
  side: string | null;
  status: string;
  author: string;
  drafted: string;
  /** One or more persona names, slash-separated, sometimes qualified in parentheses. */
  persona: string;
  primarySource: string;
  docFile: string;
  userStory: SourceUserStory;
  additionalUserStories: SourceAdditionalUserStory[];
  requirementGroups: SourceRequirementGroup[];
  archiveItemsNotCarried: SourceArchiveItem[];
  decisionsCarriedForward: string[];
  technicalNotes: string[];
  openQuestions: string[];
};

import journeys from "./journeys.json";

export const SOURCE_JOURNEYS = journeys as SourceJourney[];
