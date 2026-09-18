/**
 * Runs the real seed script against a throwaway database. The interesting case
 * is the second run: requirements can be moved between journeys in the app, and
 * a reset keyed only on journeyId would leave a moved row behind to collide with
 * the ref the seed recreates.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

let prisma: PrismaClient;
let dir: string;
let url: string;

const EXPECTED = {
  capabilities: 3,
  roles: 3,
  projects: 1,
  categories: 7,
  journeys: 12,
  requirements: 117,
  criteria: 254,
  questions: 56,
  notes: 88,
  archiveItems: 106,
  decisionRequired: 48,
  stateSpecific: 11,
};

function runSeed() {
  execFileSync("npx", ["tsx", "prisma/seed.ts"], {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL: url },
    stdio: "ignore",
  });
}

async function counts() {
  return {
    capabilities: await prisma.capability.count(),
    roles: await prisma.role.count(),
    projects: await prisma.project.count(),
    categories: await prisma.category.count(),
    journeys: await prisma.journey.count(),
    requirements: await prisma.functionalRequirement.count(),
    criteria: await prisma.acceptanceCriterion.count(),
    questions: await prisma.question.count(),
    notes: await prisma.journeyNote.count(),
    archiveItems: await prisma.archiveItem.count(),
    decisionRequired: await prisma.functionalRequirement.count({ where: { decisionRequired: true } }),
    stateSpecific: await prisma.functionalRequirement.count({ where: { stateSpecific: true } }),
  };
}

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), "reqdoc-seed-"));
  url = `file:${path.join(dir, "seed.db")}`;
  prisma = new PrismaClient({ datasources: { db: { url } } });

  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  const folders = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const folder of folders) {
    const sql = readFileSync(path.join(migrationsDir, folder, "migration.sql"), "utf8");
    for (const statement of sql.split(";").map((s) => s.trim()).filter(Boolean)) {
      await prisma.$executeRawUnsafe(statement);
    }
  }

  runSeed();
}, 180_000);

afterAll(async () => {
  await prisma?.$disconnect();
  rmSync(dir, { recursive: true, force: true });
});

describe("seeding the corpus", () => {
  it("imports every document and its children", async () => {
    expect(await counts()).toEqual(EXPECTED);
  });

  it("derives journey keys that distinguish the read and write sides", async () => {
    const journeys = await prisma.journey.findMany({ select: { key: true, side: true } });
    expect(journeys.filter((j) => j.side === "WRITE")).toHaveLength(6);
    expect(journeys.map((j) => j.key).sort()).toEqual(
      ["BED", "BEDW", "CPL", "CPLW", "ELS", "ELSW", "PLT", "RBP", "RBPW", "SVC", "SVCW", "TLDW"].sort(),
    );
  });

  it("overrides capabilities only on sections with a change class", async () => {
    const overriding = await prisma.functionalRequirement.count({
      where: { capabilities: { some: {} } },
    });
    expect(overriding).toBe(47);

    const policyChange = await prisma.functionalRequirement.findFirst({
      where: { changeClass: "POLICY_CHANGE" },
      include: { capabilities: true },
    });
    expect(policyChange?.capabilities.map((c) => c.key)).toEqual(["POLICY_CHANGE"]);

    const inheriting = await prisma.functionalRequirement.findFirst({
      where: { changeClass: null },
      include: { capabilities: true },
    });
    expect(inheriting?.capabilities).toEqual([]);
  });

  it("configures each role over capabilities that exist", async () => {
    const roles = await prisma.role.findMany({
      orderBy: { sortOrder: "asc" },
      include: { capabilities: { orderBy: { key: "asc" } } },
    });
    expect(roles.map((role) => role.key)).toEqual([
      "POLICY_VIEWER",
      "UNDERWRITER",
      "SERVICING_REP",
    ]);
    expect(roles.map((role) => role.capabilities.map((c) => c.key))).toEqual([
      ["POLICY_VIEW"],
      ["POLICY_CHANGE", "POLICY_VIEW"],
      ["POLICY_VIEW", "SERVICING_UPDATE"],
    ]);
  });

  it("collects the whole corpus into one project, through its domains", async () => {
    const project = await prisma.project.findUniqueOrThrow({
      where: { key: "WCPOLICY" },
      include: { categories: true, journeys: true, requirements: true },
    });
    expect(project.categories).toHaveLength(EXPECTED.categories);
    // Journeys and requirements are reached through the domains, not added on
    // their own, which is what makes membership cross-cutting.
    expect(project.journeys).toHaveLength(0);
    expect(project.requirements).toHaveLength(0);

    const reached = await prisma.functionalRequirement.count({
      where: { journey: { category: { projects: { some: { id: project.id } } } } },
    });
    expect(reached).toBe(EXPECTED.requirements);
  });

  it("writes the journey's capability rather than the actor the document names", async () => {
    const journey = await prisma.journey.findUniqueOrThrow({
      where: { key: "BED" },
      include: { capabilities: true },
    });
    expect(journey.capabilities.map((c) => c.key)).toEqual(["POLICY_VIEW"]);
  });

  it("attaches the documents' open questions as tracked records", async () => {
    const open = await prisma.question.count({ where: { status: "OPEN", journeyId: { not: null } } });
    expect(open).toBe(56);
  });

  it("leaves the ref counters ahead of what it created", async () => {
    const counter = await prisma.refCounter.findUnique({ where: { prefix: "FR-BED" } });
    // Business Entity Data (read) holds 5 requirements, so the next is 006.
    expect(counter?.nextValue).toBe(6);
  });

  it("is idempotent", async () => {
    runSeed();
    expect(await counts()).toEqual(EXPECTED);
  }, 120_000);

  it("puts a requirement moved to another journey back where the corpus says it belongs", async () => {
    const target = await prisma.journey.findUniqueOrThrow({ where: { key: "SVCW" } });
    await prisma.functionalRequirement.update({
      where: { ref: "FR-SVC-001" },
      data: { journeyId: target.id },
    });

    runSeed();

    const moved = await prisma.functionalRequirement.findUniqueOrThrow({
      where: { ref: "FR-SVC-001" },
      include: { journey: { select: { key: true } } },
    });
    expect(moved.journey.key).toBe("SVC");
    expect(await counts()).toEqual(EXPECTED);
  }, 120_000);
});
