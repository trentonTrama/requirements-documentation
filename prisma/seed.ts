/**
 * Insurtech starter content. The data model itself is domain-neutral -- this
 * seed just saves you from staring at empty screens. Everything here is safe to
 * edit or delete from the UI.
 *
 * Idempotent: personas and categories upsert on their unique key, requirements
 * on their generated ref, so re-running does not duplicate rows.
 */
import { PrismaClient, type Prisma } from "@prisma/client";
import { formatCriterionRef, formatRequirementRef } from "../src/lib/refs";

const prisma = new PrismaClient();

const PERSONAS = [
  {
    key: "POLICYHOLDER",
    name: "Policyholder",
    color: "sky",
    description: "The insured customer who buys and manages a policy directly.",
    goals: "Understand what is covered, pay on time, and get claims settled quickly.",
    painPoints: "Opaque pricing, paper forms, and having to phone to make small changes.",
  },
  {
    key: "AGENT",
    name: "Independent Agent",
    color: "violet",
    description: "Third-party broker quoting and binding business across several carriers.",
    goals: "Quote fast, compare carriers, and bind without re-keying data.",
    painPoints: "Duplicate data entry, slow referrals, and unclear appetite rules.",
  },
  {
    key: "UNDERWRITER",
    name: "Underwriter",
    color: "amber",
    description: "Assesses and prices risk, and decides whether to accept it.",
    goals: "See complete risk data, apply guidelines consistently, and clear referrals quickly.",
    painPoints: "Incomplete submissions and manual rule checking.",
  },
  {
    key: "ADJUSTER",
    name: "Claims Adjuster",
    color: "rose",
    description: "Investigates, values and settles claims.",
    goals: "Triage claims accurately and pay valid ones without delay.",
    painPoints: "Fragmented documentation and duplicate fraud checks.",
  },
  {
    key: "CSR",
    name: "Customer Service Rep",
    color: "teal",
    description: "Handles inbound service requests across policy and billing.",
    goals: "Resolve a request in one contact.",
    painPoints: "Switching between systems to answer one question.",
  },
  {
    key: "COMPLIANCE",
    name: "Compliance Officer",
    color: "emerald",
    description: "Ensures products and processes meet regulatory obligations.",
    goals: "Evidence that filed rates and required disclosures are actually applied.",
    painPoints: "Reconstructing audit trails after the fact.",
  },
];

const CATEGORIES = [
  { key: "QUO", name: "Quoting & Rating", color: "sky", sortOrder: 0, description: "Premium calculation, quote capture and comparison." },
  { key: "UW", name: "Underwriting", color: "amber", sortOrder: 1, description: "Risk assessment, appetite rules and referrals." },
  { key: "POL", name: "Policy Administration", color: "violet", sortOrder: 2, description: "Issuance, endorsements, renewals and cancellations." },
  { key: "BIL", name: "Billing & Payments", color: "teal", sortOrder: 3, description: "Invoicing, payment methods, dunning and refunds." },
  { key: "CLM", name: "Claims", color: "rose", sortOrder: 4, description: "First notice of loss through to settlement." },
  { key: "REG", name: "Compliance & Regulatory", color: "emerald", sortOrder: 5, description: "Filings, disclosures, retention and audit." },
  { key: "AGT", name: "Agent & Broker Portal", color: "fuchsia", sortOrder: 6, description: "Producer-facing tooling and commissions." },
  { key: "INT", name: "Integrations", color: "slate", sortOrder: 7, description: "Third-party data, payment gateways and carrier APIs." },
];

type SeedCriterion = {
  statement: string;
  notes?: string;
  /** Persona keys. Omit to inherit the requirement's personas. */
  overridePersonas?: string[];
  comments?: { author: string; body: string }[];
  questions?: {
    body: string;
    askedBy: string;
    assignee?: string;
    answer?: { body: string; by: string };
  }[];
};

type SeedRequirement = {
  category: string;
  title: string;
  description: string;
  rationale?: string;
  assumptions?: string;
  status: "DRAFT" | "IN_REVIEW" | "APPROVED" | "IMPLEMENTED" | "DEPRECATED";
  priority: "MUST" | "SHOULD" | "COULD" | "WONT";
  personas: string[];
  criteria: SeedCriterion[];
  comments?: { author: string; body: string }[];
  questions?: {
    body: string;
    askedBy: string;
    assignee?: string;
    answer?: { body: string; by: string };
  }[];
};

const REQUIREMENTS: SeedRequirement[] = [
  {
    category: "QUO",
    title: "Produce an indicative auto quote from minimal input",
    description:
      "Given vehicle, driver and address details, the system returns an indicative annual premium and the rating factors that drove it.",
    rationale:
      "Abandonment rises sharply when a quote takes more than a minute, and agents will not re-key data that we can derive.",
    assumptions: "VIN decoding and address validation are available from the integrations layer.",
    status: "APPROVED",
    priority: "MUST",
    personas: ["POLICYHOLDER", "AGENT"],
    criteria: [
      {
        statement:
          "Given a valid VIN, postcode and licence number, when the quote is requested, then an indicative premium returns within 3 seconds.",
        comments: [{ author: "Dana", body: "3 seconds is the p95 target agreed with the rating team." }],
      },
      {
        statement:
          "Given a quote has been produced, when the user opens the breakdown, then each rating factor and its premium contribution is listed.",
        notes: "Breakdown must reconcile exactly to the total.",
        questions: [
          {
            body: "Do we show the base rate to policyholders, or only to agents?",
            askedBy: "Dana",
            assignee: "Compliance",
          },
        ],
      },
      {
        statement:
          "Given a risk falls outside filed rating territory, when the quote is requested, then the underwriter receives a referral instead of a price.",
        // Only the underwriter sees this path, so it overrides the inherited set.
        overridePersonas: ["UNDERWRITER"],
        notes: "Example of an acceptance criterion that overrides its requirement's personas.",
      },
    ],
    comments: [
      { author: "Priya", body: "Scope is indicative pricing only — bindable quotes are FR-QUO-002." },
    ],
    questions: [
      {
        body: "Which states are in scope for the first release?",
        askedBy: "Priya",
        assignee: "Product",
        answer: { body: "TX, AZ and NV for launch; remaining states follow the filing schedule.", by: "Marcus" },
      },
    ],
  },
  {
    category: "QUO",
    title: "Save and resume an in-progress quote",
    description: "A partially completed quote can be saved and resumed later from the same or another device.",
    rationale: "Most personal-lines quotes are abandoned mid-flow and completed in a second session.",
    status: "IN_REVIEW",
    priority: "SHOULD",
    personas: ["POLICYHOLDER"],
    criteria: [
      {
        statement:
          "Given an incomplete quote, when the user leaves the flow, then the entered data is retained for 30 days.",
      },
      {
        statement:
          "Given a saved quote older than the rate effective date, when it is resumed, then it is re-rated and the user is told the premium changed.",
      },
    ],
  },
  {
    category: "UW",
    title: "Apply appetite rules automatically at submission",
    description:
      "Submissions are scored against the current appetite ruleset and routed to accept, refer or decline without manual triage.",
    rationale: "Manual triage is the single largest source of quote turnaround time.",
    assumptions: "The appetite ruleset is maintained by underwriting and versioned.",
    status: "DRAFT",
    priority: "MUST",
    personas: ["UNDERWRITER", "AGENT"],
    criteria: [
      {
        statement:
          "Given a submission matching a decline rule, when it is submitted, then it is declined with the triggering rule named.",
      },
      {
        statement:
          "Given a submission matching a referral rule, when it is submitted, then it appears in the underwriter's queue within 1 minute.",
      },
      {
        statement:
          "Given the ruleset changes, when a submission is re-evaluated, then the decision records which ruleset version was applied.",
        overridePersonas: ["COMPLIANCE", "UNDERWRITER"],
        notes: "Auditability requirement — compliance is the primary consumer here.",
      },
    ],
    questions: [
      {
        body: "Do declines need a state-specific adverse action notice at this stage?",
        askedBy: "Marcus",
        assignee: "Compliance",
      },
    ],
  },
  {
    category: "POL",
    title: "Self-service mid-term endorsement for address change",
    description:
      "A policyholder can change the garaging address mid-term, see the premium impact, and confirm the endorsement without contacting support.",
    rationale: "Address changes are the highest-volume service request and are almost entirely mechanical.",
    status: "APPROVED",
    priority: "MUST",
    personas: ["POLICYHOLDER", "CSR"],
    criteria: [
      {
        statement:
          "Given a change of garaging address, when the policyholder submits it, then the pro-rated premium adjustment is displayed before confirmation.",
      },
      {
        statement:
          "Given a confirmed endorsement, when it is processed, then an updated declarations page is available within 5 minutes.",
      },
      {
        statement:
          "Given the address change moves the risk outside the filed territory, when it is submitted, then it is referred to underwriting rather than applied.",
        overridePersonas: ["UNDERWRITER"],
      },
    ],
    comments: [
      { author: "Sam", body: "CSRs need the same flow internally so they can walk a caller through it." },
    ],
  },
  {
    category: "BIL",
    title: "Pay a premium by stored card",
    description:
      "Policyholders can store a card and pay scheduled or ad-hoc premium instalments from it.",
    rationale: "Card autopay materially reduces lapse rates versus manual payment.",
    assumptions: "Card data is tokenised by the gateway; no PAN is stored by this system.",
    status: "IMPLEMENTED",
    priority: "MUST",
    personas: ["POLICYHOLDER", "CSR"],
    criteria: [
      {
        statement:
          "Given a stored card, when the policyholder confirms payment, then the premium is applied to the policy within 5 seconds.",
        comments: [{ author: "Dana", body: "Verified against the gateway sandbox — p95 is 1.8s." }],
      },
      {
        statement:
          "Given a declined card, when payment is attempted, then the policyholder sees the decline reason and the instalment stays unpaid.",
      },
      {
        statement:
          "Given a successful payment, when the receipt is generated, then it records the tokenised card reference and never the full card number.",
        overridePersonas: ["COMPLIANCE"],
        notes: "PCI scope control.",
      },
    ],
    questions: [
      {
        body: "Do we support partial payments against an instalment?",
        askedBy: "Sam",
        answer: { body: "Not in v1. Partial payments are deferred to the dunning workstream.", by: "Priya" },
      },
    ],
  },
  {
    category: "CLM",
    title: "Submit first notice of loss with photo evidence",
    description:
      "A policyholder can report a loss and attach photos from a phone, producing a claim ready for triage.",
    rationale: "Photo-first FNOL shortens cycle time and reduces the number of adjuster call-backs.",
    status: "IN_REVIEW",
    priority: "MUST",
    personas: ["POLICYHOLDER", "ADJUSTER"],
    criteria: [
      {
        statement:
          "Given an active policy, when the policyholder submits FNOL, then a claim number is issued immediately and shown on screen.",
      },
      {
        statement:
          "Given photos are attached, when the claim is created, then each image is stored with its capture timestamp and geolocation if present.",
      },
      {
        statement:
          "Given a claim is created, when triage runs, then a severity score and an assigned adjuster are recorded.",
        overridePersonas: ["ADJUSTER"],
      },
    ],
    questions: [
      {
        body: "What is the maximum number and size of photos per claim?",
        askedBy: "Dana",
        assignee: "Engineering",
      },
    ],
  },
  {
    category: "REG",
    title: "Retain an auditable record of every rate applied",
    description:
      "Every premium calculation records the rate version, ruleset version and inputs used, retained for the statutory period.",
    rationale: "Regulators ask us to reproduce a historical quote; today that requires manual reconstruction.",
    assumptions: "Seven-year retention satisfies the states in scope.",
    status: "APPROVED",
    priority: "MUST",
    personas: ["COMPLIANCE"],
    criteria: [
      {
        statement:
          "Given any premium calculation, when it completes, then the rate version, ruleset version, inputs and output are persisted immutably.",
      },
      {
        statement:
          "Given an audit request, when a historical quote is reproduced, then the recalculated premium matches the original to the cent.",
      },
    ],
    comments: [
      { author: "Marcus", body: "This one underpins the filing evidence pack — treat it as non-negotiable." },
    ],
  },
  {
    category: "AGT",
    title: "Agent commission statement download",
    description: "Agents can download a monthly commission statement as CSV and PDF from the portal.",
    rationale: "Commission queries are a significant share of agency support volume.",
    status: "DRAFT",
    priority: "SHOULD",
    personas: ["AGENT"],
    criteria: [
      {
        statement:
          "Given a closed accounting month, when the agent opens the portal, then the statement for that month is available in CSV and PDF.",
      },
      {
        statement:
          "Given a statement is downloaded, when the totals are summed, then they reconcile with the ledger for that agent and month.",
      },
    ],
    questions: [
      {
        body: "Should sub-producers see only their own commission, or the whole agency's?",
        askedBy: "Sam",
        assignee: "Product",
      },
    ],
  },
];

async function main() {
  const personas = new Map<string, string>();
  for (const persona of PERSONAS) {
    const record = await prisma.persona.upsert({
      where: { key: persona.key },
      create: persona,
      update: persona,
    });
    personas.set(persona.key, record.id);
  }

  const categories = new Map<string, { id: string; key: string }>();
  for (const category of CATEGORIES) {
    const record = await prisma.category.upsert({
      where: { key: category.key },
      create: category,
      update: category,
    });
    categories.set(category.key, { id: record.id, key: record.key });
  }

  // Refs are assigned deterministically here so re-running the seed updates the
  // same rows rather than minting new ones; the counters are then advanced past
  // what the seed used, so the app keeps numbering from the right place.
  const perCategory = new Map<string, number>();
  const createdRefs: string[] = [];

  for (const seed of REQUIREMENTS) {
    const category = categories.get(seed.category);
    if (!category) throw new Error(`Unknown category ${seed.category}`);

    const index = (perCategory.get(category.key) ?? 0) + 1;
    perCategory.set(category.key, index);
    const ref = formatRequirementRef(category.key, index);
    createdRefs.push(ref);

    const personaConnect = seed.personas.map((key) => ({ id: requirePersona(personas, key) }));
    const data = {
      title: seed.title,
      description: seed.description,
      rationale: seed.rationale ?? "",
      assumptions: seed.assumptions ?? "",
      status: seed.status,
      priority: seed.priority,
      categoryId: category.id,
      personas: { set: personaConnect },
    } satisfies Prisma.FunctionalRequirementUpdateInput | object;

    const requirement = await prisma.functionalRequirement.upsert({
      where: { ref },
      create: { ref, ...data, personas: { connect: personaConnect } },
      update: data,
    });

    // Replace the requirement's children so repeated seeding stays clean.
    await prisma.acceptanceCriterion.deleteMany({ where: { requirementId: requirement.id } });
    await prisma.comment.deleteMany({ where: { requirementId: requirement.id } });
    await prisma.question.deleteMany({ where: { requirementId: requirement.id } });

    for (const [criterionIndex, criterion] of seed.criteria.entries()) {
      const created = await prisma.acceptanceCriterion.create({
        data: {
          ref: formatCriterionRef(ref, criterionIndex + 1),
          requirementId: requirement.id,
          statement: criterion.statement,
          notes: criterion.notes ?? "",
          sortOrder: criterionIndex,
          personas: {
            connect: (criterion.overridePersonas ?? []).map((key) => ({
              id: requirePersona(personas, key),
            })),
          },
        },
      });

      for (const comment of criterion.comments ?? []) {
        await prisma.comment.create({
          data: { body: comment.body, authorName: comment.author, acceptanceCriterionId: created.id },
        });
      }
      for (const question of criterion.questions ?? []) {
        await prisma.question.create({
          data: questionData(question, { acceptanceCriterionId: created.id }),
        });
      }

      await advanceCounter(`${ref}.AC`, criterionIndex + 2);
    }

    for (const comment of seed.comments ?? []) {
      await prisma.comment.create({
        data: { body: comment.body, authorName: comment.author, requirementId: requirement.id },
      });
    }
    for (const question of seed.questions ?? []) {
      await prisma.question.create({ data: questionData(question, { requirementId: requirement.id }) });
    }

    await advanceCounter(`FR-${category.key}`, index + 1);
  }

  await prisma.changeLogEntry.deleteMany({ where: { authorName: "Seed" } });
  await prisma.changeLogEntry.create({
    data: {
      entityType: "System",
      entityId: "seed",
      field: "created",
      summary: `Seeded ${PERSONAS.length} personas, ${CATEGORIES.length} categories and ${REQUIREMENTS.length} requirements`,
      authorName: "Seed",
    },
  });

  console.log(`Seeded ${createdRefs.length} requirements: ${createdRefs.join(", ")}`);
}

function requirePersona(personas: Map<string, string>, key: string) {
  const id = personas.get(key);
  if (!id) throw new Error(`Unknown persona ${key}`);
  return id;
}

function questionData(
  question: { body: string; askedBy: string; assignee?: string; answer?: { body: string; by: string } },
  target: { requirementId?: string; acceptanceCriterionId?: string },
) {
  return {
    body: question.body,
    askedBy: question.askedBy,
    assignee: question.assignee ?? null,
    status: question.answer ? ("ANSWERED" as const) : ("OPEN" as const),
    answer: question.answer?.body ?? null,
    answeredBy: question.answer?.by ?? null,
    answeredAt: question.answer ? new Date() : null,
    ...target,
  };
}

/** Keep the app's ref counters ahead of anything the seed created. */
async function advanceCounter(prefix: string, nextValue: number) {
  const existing = await prisma.refCounter.findUnique({ where: { prefix } });
  if (existing && existing.nextValue >= nextValue) return;
  await prisma.refCounter.upsert({
    where: { prefix },
    create: { prefix, nextValue },
    update: { nextValue },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
