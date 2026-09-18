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
  it("issues sequential requirement refs per category", async () => {
    const refs = [
      await nextRequirementRef(prisma, "BIL"),
      await nextRequirementRef(prisma, "BIL"),
      await nextRequirementRef(prisma, "BIL"),
    ];
    expect(refs).toEqual(["FR-BIL-001", "FR-BIL-002", "FR-BIL-003"]);
  });

  it("keeps a separate sequence for each category", async () => {
    expect(await nextRequirementRef(prisma, "CLM")).toBe("FR-CLM-001");
    expect(await nextRequirementRef(prisma, "BIL")).toBe("FR-BIL-004");
  });

  it("never recycles a number after the requirement is deleted", async () => {
    const category = await prisma.category.create({ data: { key: "TMP", name: "Temp" } });
    const ref = await nextRequirementRef(prisma, "TMP");
    const requirement = await prisma.functionalRequirement.create({
      data: { ref, title: "Temporary", categoryId: category.id },
    });

    await prisma.functionalRequirement.delete({ where: { id: requirement.id } });
    expect(await nextRequirementRef(prisma, "TMP")).toBe("FR-TMP-002");
  });

  it("nests criterion refs under the requirement ref", async () => {
    expect(await nextCriterionRef(prisma, "FR-BIL-001")).toBe("FR-BIL-001.AC-01");
    expect(await nextCriterionRef(prisma, "FR-BIL-001")).toBe("FR-BIL-001.AC-02");
    expect(await nextCriterionRef(prisma, "FR-BIL-002")).toBe("FR-BIL-002.AC-01");
  });

  it("leaves an existing ref untouched when the requirement changes category", async () => {
    const [billing, claims] = await Promise.all([
      prisma.category.create({ data: { key: "MOVEA", name: "Move A" } }),
      prisma.category.create({ data: { key: "MOVEB", name: "Move B" } }),
    ]);
    const ref = await nextRequirementRef(prisma, billing.key);
    const requirement = await prisma.functionalRequirement.create({
      data: { ref, title: "Moves category", categoryId: billing.id },
    });

    const moved = await prisma.functionalRequirement.update({
      where: { id: requirement.id },
      data: { categoryId: claims.id },
    });

    expect(moved.ref).toBe(ref);
    expect(moved.categoryId).toBe(claims.id);
  });
});

describe("cascade behaviour", () => {
  it("removes criteria, comments and questions with their requirement", async () => {
    const category = await prisma.category.create({ data: { key: "CASC", name: "Cascade" } });
    const requirement = await prisma.functionalRequirement.create({
      data: { ref: "FR-CASC-001", title: "Cascades", categoryId: category.id },
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

  it("keeps requirements when a persona is deleted, dropping only the assignment", async () => {
    const category = await prisma.category.create({ data: { key: "PERS", name: "Persona test" } });
    const persona = await prisma.persona.create({ data: { key: "TESTP", name: "Test persona" } });
    const requirement = await prisma.functionalRequirement.create({
      data: {
        ref: "FR-PERS-001",
        title: "Has a persona",
        categoryId: category.id,
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
