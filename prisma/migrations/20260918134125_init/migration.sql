-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "goals" TEXT NOT NULL DEFAULT '',
    "painPoints" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT 'slate',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "color" TEXT NOT NULL DEFAULT 'slate',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FunctionalRequirement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ref" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "rationale" TEXT NOT NULL DEFAULT '',
    "assumptions" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "priority" TEXT NOT NULL DEFAULT 'SHOULD',
    "categoryId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FunctionalRequirement_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AcceptanceCriterion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ref" TEXT NOT NULL,
    "requirementId" TEXT NOT NULL,
    "statement" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "AcceptanceCriterion_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "FunctionalRequirement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "body" TEXT NOT NULL,
    "authorName" TEXT NOT NULL DEFAULT 'Anonymous',
    "requirementId" TEXT,
    "acceptanceCriterionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Comment_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "FunctionalRequirement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_acceptanceCriterionId_fkey" FOREIGN KEY ("acceptanceCriterionId") REFERENCES "AcceptanceCriterion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "body" TEXT NOT NULL,
    "askedBy" TEXT NOT NULL DEFAULT 'Anonymous',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "answer" TEXT,
    "answeredBy" TEXT,
    "answeredAt" DATETIME,
    "assignee" TEXT,
    "requirementId" TEXT,
    "acceptanceCriterionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Question_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "FunctionalRequirement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Question_acceptanceCriterionId_fkey" FOREIGN KEY ("acceptanceCriterionId") REFERENCES "AcceptanceCriterion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RequirementLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromRequirementId" TEXT NOT NULL,
    "toRequirementId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'RELATES_TO',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RequirementLink_fromRequirementId_fkey" FOREIGN KEY ("fromRequirementId") REFERENCES "FunctionalRequirement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "RequirementLink_toRequirementId_fkey" FOREIGN KEY ("toRequirementId") REFERENCES "FunctionalRequirement" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ChangeLogEntry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityRef" TEXT NOT NULL DEFAULT '',
    "entityName" TEXT NOT NULL DEFAULT '',
    "field" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL DEFAULT '',
    "newValue" TEXT NOT NULL DEFAULT '',
    "summary" TEXT NOT NULL DEFAULT '',
    "authorName" TEXT NOT NULL DEFAULT 'System',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RefCounter" (
    "prefix" TEXT NOT NULL PRIMARY KEY,
    "nextValue" INTEGER NOT NULL DEFAULT 1
);

-- CreateTable
CREATE TABLE "_RequirementPersonas" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_RequirementPersonas_A_fkey" FOREIGN KEY ("A") REFERENCES "FunctionalRequirement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_RequirementPersonas_B_fkey" FOREIGN KEY ("B") REFERENCES "Persona" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_CriterionPersonas" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_CriterionPersonas_A_fkey" FOREIGN KEY ("A") REFERENCES "AcceptanceCriterion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_CriterionPersonas_B_fkey" FOREIGN KEY ("B") REFERENCES "Persona" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Persona_key_key" ON "Persona"("key");

-- CreateIndex
CREATE INDEX "Persona_name_idx" ON "Persona"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Category_key_key" ON "Category"("key");

-- CreateIndex
CREATE INDEX "Category_sortOrder_idx" ON "Category"("sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "FunctionalRequirement_ref_key" ON "FunctionalRequirement"("ref");

-- CreateIndex
CREATE INDEX "FunctionalRequirement_categoryId_idx" ON "FunctionalRequirement"("categoryId");

-- CreateIndex
CREATE INDEX "FunctionalRequirement_status_idx" ON "FunctionalRequirement"("status");

-- CreateIndex
CREATE INDEX "FunctionalRequirement_priority_idx" ON "FunctionalRequirement"("priority");

-- CreateIndex
CREATE UNIQUE INDEX "AcceptanceCriterion_ref_key" ON "AcceptanceCriterion"("ref");

-- CreateIndex
CREATE INDEX "AcceptanceCriterion_requirementId_sortOrder_idx" ON "AcceptanceCriterion"("requirementId", "sortOrder");

-- CreateIndex
CREATE INDEX "Comment_requirementId_idx" ON "Comment"("requirementId");

-- CreateIndex
CREATE INDEX "Comment_acceptanceCriterionId_idx" ON "Comment"("acceptanceCriterionId");

-- CreateIndex
CREATE INDEX "Comment_createdAt_idx" ON "Comment"("createdAt");

-- CreateIndex
CREATE INDEX "Question_status_idx" ON "Question"("status");

-- CreateIndex
CREATE INDEX "Question_requirementId_idx" ON "Question"("requirementId");

-- CreateIndex
CREATE INDEX "Question_acceptanceCriterionId_idx" ON "Question"("acceptanceCriterionId");

-- CreateIndex
CREATE INDEX "RequirementLink_toRequirementId_idx" ON "RequirementLink"("toRequirementId");

-- CreateIndex
CREATE UNIQUE INDEX "RequirementLink_fromRequirementId_toRequirementId_type_key" ON "RequirementLink"("fromRequirementId", "toRequirementId", "type");

-- CreateIndex
CREATE INDEX "ChangeLogEntry_entityType_entityId_idx" ON "ChangeLogEntry"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ChangeLogEntry_createdAt_idx" ON "ChangeLogEntry"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "_RequirementPersonas_AB_unique" ON "_RequirementPersonas"("A", "B");

-- CreateIndex
CREATE INDEX "_RequirementPersonas_B_index" ON "_RequirementPersonas"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CriterionPersonas_AB_unique" ON "_CriterionPersonas"("A", "B");

-- CreateIndex
CREATE INDEX "_CriterionPersonas_B_index" ON "_CriterionPersonas"("B");
