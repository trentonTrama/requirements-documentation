/*
  Persona becomes Capability, and the actor prose it carried (goals, pain points)
  moves to the new Role model. The three corpus personas each stood for exactly
  one permission, so their rows -- and every journey, requirement and criterion
  assignment made against them -- are carried across and re-keyed rather than
  dropped. Roles that grant those capabilities are created by the seed.
*/
PRAGMA foreign_keys=OFF;

-- CreateTable
CREATE TABLE "Capability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "resource" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL DEFAULT 'VIEW',
    "color" TEXT NOT NULL DEFAULT 'slate',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

INSERT INTO "Capability" ("id", "key", "name", "description", "color", "createdAt", "updatedAt")
SELECT "id", "key", "name", "description", "color", "createdAt", "updatedAt" FROM "Persona";

-- Re-key the corpus personas to the permission each one was standing in for.
UPDATE "Capability"
SET "key" = 'POLICY_VIEW',
    "name" = 'View policy',
    "resource" = 'Policy',
    "action" = 'VIEW',
    "description" = 'Read the policy surface: the contract''s facts as they stand.'
WHERE "key" = 'POLICY_VIEWER';

UPDATE "Capability"
SET "key" = 'POLICY_CHANGE',
    "name" = 'Change policy',
    "resource" = 'Coverage, exposure and rating',
    "action" = 'UPDATE',
    "description" = 'Alter the risk: coverage, exposure and rating. Reaches the policy as an endorsement.'
WHERE "key" = 'UNDERWRITER';

UPDATE "Capability"
SET "key" = 'SERVICING_UPDATE',
    "name" = 'Update servicing details',
    "resource" = 'Entity details, addresses and contacts',
    "action" = 'UPDATE',
    "description" = 'Correct details that do not alter the risk, without raising an endorsement.'
WHERE "key" = 'SERVICING_REP';

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "goals" TEXT NOT NULL DEFAULT '',
    "painPoints" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT 'slate',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "color" TEXT NOT NULL DEFAULT 'slate',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "startsOn" DATETIME,
    "targetDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "_RoleCapabilities" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_RoleCapabilities_A_fkey" FOREIGN KEY ("A") REFERENCES "Capability" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_RoleCapabilities_B_fkey" FOREIGN KEY ("B") REFERENCES "Role" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ProjectCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ProjectCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ProjectCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ProjectJourneys" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ProjectJourneys_A_fkey" FOREIGN KEY ("A") REFERENCES "Journey" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ProjectJourneys_B_fkey" FOREIGN KEY ("B") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_ProjectRequirements" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ProjectRequirements_A_fkey" FOREIGN KEY ("A") REFERENCES "FunctionalRequirement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_ProjectRequirements_B_fkey" FOREIGN KEY ("B") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable: the assignment join tables, carried over row for row. Prisma orders
-- the two sides alphabetically by model, so Journey/Requirement move from column A
-- to column B as Persona becomes Capability.
CREATE TABLE "_JourneyCapabilities" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_JourneyCapabilities_A_fkey" FOREIGN KEY ("A") REFERENCES "Capability" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_JourneyCapabilities_B_fkey" FOREIGN KEY ("B") REFERENCES "Journey" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "_JourneyCapabilities" ("A", "B") SELECT "B", "A" FROM "_JourneyPersonas";

CREATE TABLE "_RequirementCapabilities" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_RequirementCapabilities_A_fkey" FOREIGN KEY ("A") REFERENCES "Capability" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_RequirementCapabilities_B_fkey" FOREIGN KEY ("B") REFERENCES "FunctionalRequirement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "_RequirementCapabilities" ("A", "B") SELECT "B", "A" FROM "_RequirementPersonas";

CREATE TABLE "_CriterionCapabilities" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_CriterionCapabilities_A_fkey" FOREIGN KEY ("A") REFERENCES "AcceptanceCriterion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_CriterionCapabilities_B_fkey" FOREIGN KEY ("B") REFERENCES "Capability" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "_CriterionCapabilities" ("A", "B") SELECT "A", "B" FROM "_CriterionPersonas";

-- DropTable
DROP TABLE "_JourneyPersonas";
DROP TABLE "_RequirementPersonas";
DROP TABLE "_CriterionPersonas";
DROP TABLE "Persona";

-- CreateIndex
CREATE UNIQUE INDEX "Capability_key_key" ON "Capability"("key");
CREATE INDEX "Capability_name_idx" ON "Capability"("name");
CREATE INDEX "Capability_action_idx" ON "Capability"("action");
CREATE UNIQUE INDEX "Role_key_key" ON "Role"("key");
CREATE INDEX "Role_sortOrder_idx" ON "Role"("sortOrder");
CREATE INDEX "Role_name_idx" ON "Role"("name");
CREATE UNIQUE INDEX "Project_key_key" ON "Project"("key");
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
CREATE INDEX "Project_status_idx" ON "Project"("status");
CREATE INDEX "Project_sortOrder_idx" ON "Project"("sortOrder");
CREATE UNIQUE INDEX "_RoleCapabilities_AB_unique" ON "_RoleCapabilities"("A", "B");
CREATE INDEX "_RoleCapabilities_B_index" ON "_RoleCapabilities"("B");
CREATE UNIQUE INDEX "_ProjectCategories_AB_unique" ON "_ProjectCategories"("A", "B");
CREATE INDEX "_ProjectCategories_B_index" ON "_ProjectCategories"("B");
CREATE UNIQUE INDEX "_ProjectJourneys_AB_unique" ON "_ProjectJourneys"("A", "B");
CREATE INDEX "_ProjectJourneys_B_index" ON "_ProjectJourneys"("B");
CREATE UNIQUE INDEX "_ProjectRequirements_AB_unique" ON "_ProjectRequirements"("A", "B");
CREATE INDEX "_ProjectRequirements_B_index" ON "_ProjectRequirements"("B");
CREATE UNIQUE INDEX "_JourneyCapabilities_AB_unique" ON "_JourneyCapabilities"("A", "B");
CREATE INDEX "_JourneyCapabilities_B_index" ON "_JourneyCapabilities"("B");
CREATE UNIQUE INDEX "_RequirementCapabilities_AB_unique" ON "_RequirementCapabilities"("A", "B");
CREATE INDEX "_RequirementCapabilities_B_index" ON "_RequirementCapabilities"("B");
CREATE UNIQUE INDEX "_CriterionCapabilities_AB_unique" ON "_CriterionCapabilities"("A", "B");
CREATE INDEX "_CriterionCapabilities_B_index" ON "_CriterionCapabilities"("B");

PRAGMA foreign_keys=ON;
