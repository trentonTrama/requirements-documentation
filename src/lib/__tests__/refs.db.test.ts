/**
 * Counter behaviour needs a real database: the guarantee under test is that refs
 * are monotonic per prefix and survive deletes.
 */
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { nextCriterionRef, nextRequirementRef } from "../refs";

let prisma: PrismaClient;
let dir: string;

/**
 * Builds the schema by replaying the committed migrations against a throwaway
 * file, so the test exercises the same DDL the app runs on.
 */
async function applyMigrations(client: PrismaClient) {
  const migrationsDir = path.join(process.cwd(), "prisma", "migrations");
  const folders = readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const folder of folders) {
    const sql = readFileSync(path.join(migrationsDir, folder, "migration.sql"), "utf8");
    for (const statement of sql.split(";").map((s) => s.trim()).filter(Boolean)) {
      await client.$executeRawUnsafe(statement);
    }
  }
}

beforeAll(async () => {
  dir = mkdtempSync(path.join(tmpdir(), "reqdoc-test-"));
  const url = `file:${path.join(dir, "test.db")}`;
  prisma = new PrismaClient({ datasources: { db: { url } } });
  await applyMigrations(prisma);
}, 60_000);

afterAll(async () => {
  await prisma?.$disconnect();
  rmSync(dir, { recursive: true, force: true });
});

describe("ref counters", () => {
  it("issues sequential requirement refs per journey", async () => {
    const refs = [
      await nextRequirementRef(prisma, "BED"),
      await nextRequirementRef(prisma, "BED"),
      await nextRequirementRef(prisma, "BED"),
    ];
    expect(refs).toEqual(["FR-BED-001", "FR-BED-002", "FR-BED-003"]);
  });

  it("keeps a separate sequence for each side of a domain", async () => {
    expect(await nextRequirementRef(prisma, "BEDW")).toBe("FR-BEDW-001");
    expect(await nextRequirementRef(prisma, "BED")).toBe("FR-BED-004");
  });

  it("never recycles a number after the requirement is deleted", async () => {
    const journey = await makeJourney("TMP", "tmp");
    const ref = await nextRequirementRef(prisma, "TMP");
    const requirement = await prisma.functionalRequirement.create({
      data: { ref, title: "Temporary", journeyId: journey.id },
    });

    await prisma.functionalRequirement.delete({ where: { id: requirement.id } });
    expect(await nextRequirementRef(prisma, "TMP")).toBe("FR-TMP-002");
  });

  it("nests criterion refs under the requirement ref", async () => {
    expect(await nextCriterionRef(prisma, "FR-BED-001")).toBe("FR-BED-001.AC-01");
    expect(await nextCriterionRef(prisma, "FR-BED-001")).toBe("FR-BED-001.AC-02");
    expect(await nextCriterionRef(prisma, "FR-BED-002")).toBe("FR-BED-002.AC-01");
  });

  it("leaves an existing ref untouched when the requirement moves to another journey", async () => {
    const [from, to] = await Promise.all([makeJourney("MOVEA", "move-a"), makeJourney("MOVEB", "move-b")]);
    const ref = await nextRequirementRef(prisma, from.key);
    const requirement = await prisma.functionalRequirement.create({
      data: { ref, title: "Moves journey", journeyId: from.id },
    });

    const moved = await prisma.functionalRequirement.update({
      where: { id: requirement.id },
      data: { journeyId: to.id },
    });

    expect(moved.ref).toBe(ref);
    expect(moved.journeyId).toBe(to.id);
  });
});

describe("cascade behaviour", () => {
  it("removes criteria, comments and questions with their requirement", async () => {
    const journey = await makeJourney("CASC", "cascade");
    const requirement = await prisma.functionalRequirement.create({
      data: { ref: "FR-CASC-001", title: "Cascades", journeyId: journey.id },
    });
    const criterion = await prisma.acceptanceCriterion.create({
      data: { ref: "FR-CASC-001.AC-01", requirementId: requirement.id, statement: "given…" },
    });
    await prisma.comment.create({ data: { body: "on criterion", acceptanceCriterionId: criterion.id } });
    await prisma.question.create({ data: { body: "on requirement", requirementId: requirement.id } });

    await prisma.functionalRequirement.delete({ where: { id: requirement.id } });

    expect(await prisma.acceptanceCriterion.count({ where: { requirementId: requirement.id } })).toBe(0);
    expect(await prisma.comment.count({ where: { acceptanceCriterionId: criterion.id } })).toBe(0);
    expect(await prisma.question.count({ where: { requirementId: requirement.id } })).toBe(0);
  });

  it("takes a journey's requirements, notes and questions with it", async () => {
    const journey = await makeJourney("JCASC", "journey-cascade");
    await prisma.functionalRequirement.create({
      data: { ref: "FR-JCASC-001", title: "Belongs to the journey", journeyId: journey.id },
    });
    await prisma.journeyNote.create({
      data: { journeyId: journey.id, kind: "DECISION", body: "decided" },
    });
    await prisma.archiveItem.create({ data: { journeyId: journey.id, item: "not carried" } });
    await prisma.question.create({ data: { body: "open question", journeyId: journey.id } });

    await prisma.journey.delete({ where: { id: journey.id } });

    expect(await prisma.functionalRequirement.count({ where: { journeyId: journey.id } })).toBe(0);
    expect(await prisma.journeyNote.count({ where: { journeyId: journey.id } })).toBe(0);
    expect(await prisma.archiveItem.count({ where: { journeyId: journey.id } })).toBe(0);
    expect(await prisma.question.count({ where: { journeyId: journey.id } })).toBe(0);
  });

  it("refuses to delete a domain that still holds journeys", async () => {
    const journey = await makeJourney("GUARD", "guard");
    await expect(prisma.category.delete({ where: { id: journey.categoryId } })).rejects.toThrow();
  });

  it("keeps requirements when a persona is deleted, dropping only the assignment", async () => {
    const journey = await makeJourney("PERS", "persona-test");
    const persona = await prisma.persona.create({ data: { key: "TESTP", name: "Test persona" } });
    const requirement = await prisma.functionalRequirement.create({
      data: {
        ref: "FR-PERS-001",
        title: "Has a persona",
        journeyId: journey.id,
        personas: { connect: { id: persona.id } },
      },
    });

    await prisma.persona.delete({ where: { id: persona.id } });

    const after = await prisma.functionalRequirement.findUnique({
      where: { id: requirement.id },
      include: { personas: true },
    });
    expect(after).not.toBeNull();
    expect(after!.personas).toEqual([]);
  });
});

/** A journey and the domain it needs, keyed so each test stays independent. */
async function makeJourney(key: string, slug: string) {
  const category = await prisma.category.create({ data: { key: `C-${key}`, name: `Domain ${key}` } });
  return prisma.journey.create({
    data: { key, slug, title: `Journey ${key}`, categoryId: category.id },
  });
}
