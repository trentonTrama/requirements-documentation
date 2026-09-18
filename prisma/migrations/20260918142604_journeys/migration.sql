/*
  Warnings:

  - You are about to drop the column `categoryId` on the `FunctionalRequirement` table. All the data in the column will be lost.
  - Added the required column `journeyId` to the `FunctionalRequirement` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "Journey" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "side" TEXT NOT NULL DEFAULT 'READ',
    "categoryId" TEXT NOT NULL,
    "statusNote" TEXT NOT NULL DEFAULT '',
    "author" TEXT NOT NULL DEFAULT '',
    "primarySource" TEXT NOT NULL DEFAULT '',
    "docFile" TEXT NOT NULL DEFAULT '',
    "asA" TEXT NOT NULL DEFAULT '',
    "iWant" TEXT NOT NULL DEFAULT '',
    "soThat" TEXT NOT NULL DEFAULT '',
    "covers" TEXT NOT NULL DEFAULT '',
    "notCovered" TEXT NOT NULL DEFAULT '',
    "draftedOn" DATETIME,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Journey_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AdditionalUserStory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "journeyId" TEXT NOT NULL,
    "changeClass" TEXT,
    "asA" TEXT NOT NULL,
    "iWant" TEXT NOT NULL,
    "soThat" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "AdditionalUserStory_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JourneyNote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "journeyId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "JourneyNote_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ArchiveItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "journeyId" TEXT NOT NULL,
    "item" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT '',
    "disposition" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ArchiveItem_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_JourneyPersonas" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_JourneyPersonas_A_fkey" FOREIGN KEY ("A") REFERENCES "Journey" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_JourneyPersonas_B_fkey" FOREIGN KEY ("B") REFERENCES "Persona" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "body" TEXT NOT NULL,
    "authorName" TEXT NOT NULL DEFAULT 'Anonymous',
    "journeyId" TEXT,
    "requirementId" TEXT,
    "acceptanceCriterionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Comment_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "FunctionalRequirement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Comment_acceptanceCriterionId_fkey" FOREIGN KEY ("acceptanceCriterionId") REFERENCES "AcceptanceCriterion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Comment" ("acceptanceCriterionId", "authorName", "body", "createdAt", "id", "requirementId", "updatedAt") SELECT "acceptanceCriterionId", "authorName", "body", "createdAt", "id", "requirementId", "updatedAt" FROM "Comment";
DROP TABLE "Comment";
ALTER TABLE "new_Comment" RENAME TO "Comment";
CREATE INDEX "Comment_journeyId_idx" ON "Comment"("journeyId");
CREATE INDEX "Comment_requirementId_idx" ON "Comment"("requirementId");
CREATE INDEX "Comment_acceptanceCriterionId_idx" ON "Comment"("acceptanceCriterionId");
CREATE INDEX "Comment_createdAt_idx" ON "Comment"("createdAt");
CREATE TABLE "new_FunctionalRequirement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ref" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "rationale" TEXT NOT NULL DEFAULT '',
    "assumptions" TEXT NOT NULL DEFAULT '',
    "sourceNotes" TEXT NOT NULL DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "priority" TEXT NOT NULL DEFAULT 'SHOULD',
    "section" TEXT NOT NULL DEFAULT '',
    "sectionOrder" INTEGER NOT NULL DEFAULT 0,
    "sectionStateSpecific" BOOLEAN NOT NULL DEFAULT false,
    "changeClass" TEXT,
    "decisionRequired" BOOLEAN NOT NULL DEFAULT false,
    "stateSpecific" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FunctionalRequirement_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_FunctionalRequirement" ("assumptions", "createdAt", "description", "id", "priority", "rationale", "ref", "status", "title", "updatedAt") SELECT "assumptions", "createdAt", "description", "id", "priority", "rationale", "ref", "status", "title", "updatedAt" FROM "FunctionalRequirement";
DROP TABLE "FunctionalRequirement";
ALTER TABLE "new_FunctionalRequirement" RENAME TO "FunctionalRequirement";
CREATE UNIQUE INDEX "FunctionalRequirement_ref_key" ON "FunctionalRequirement"("ref");
CREATE INDEX "FunctionalRequirement_journeyId_sectionOrder_sortOrder_idx" ON "FunctionalRequirement"("journeyId", "sectionOrder", "sortOrder");
CREATE INDEX "FunctionalRequirement_status_idx" ON "FunctionalRequirement"("status");
CREATE INDEX "FunctionalRequirement_priority_idx" ON "FunctionalRequirement"("priority");
CREATE INDEX "FunctionalRequirement_decisionRequired_idx" ON "FunctionalRequirement"("decisionRequired");
CREATE INDEX "FunctionalRequirement_stateSpecific_idx" ON "FunctionalRequirement"("stateSpecific");
CREATE TABLE "new_Question" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "body" TEXT NOT NULL,
    "askedBy" TEXT NOT NULL DEFAULT 'Anonymous',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "answer" TEXT,
    "answeredBy" TEXT,
    "answeredAt" DATETIME,
    "assignee" TEXT,
    "journeyId" TEXT,
    "requirementId" TEXT,
    "acceptanceCriterionId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Question_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "Journey" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Question_requirementId_fkey" FOREIGN KEY ("requirementId") REFERENCES "FunctionalRequirement" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Question_acceptanceCriterionId_fkey" FOREIGN KEY ("acceptanceCriterionId") REFERENCES "AcceptanceCriterion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Question" ("acceptanceCriterionId", "answer", "answeredAt", "answeredBy", "askedBy", "assignee", "body", "createdAt", "id", "requirementId", "status", "updatedAt") SELECT "acceptanceCriterionId", "answer", "answeredAt", "answeredBy", "askedBy", "assignee", "body", "createdAt", "id", "requirementId", "status", "updatedAt" FROM "Question";
DROP TABLE "Question";
ALTER TABLE "new_Question" RENAME TO "Question";
CREATE INDEX "Question_status_idx" ON "Question"("status");
CREATE INDEX "Question_journeyId_idx" ON "Question"("journeyId");
CREATE INDEX "Question_requirementId_idx" ON "Question"("requirementId");
CREATE INDEX "Question_acceptanceCriterionId_idx" ON "Question"("acceptanceCriterionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Journey_slug_key" ON "Journey"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Journey_key_key" ON "Journey"("key");

-- CreateIndex
CREATE INDEX "Journey_categoryId_sortOrder_idx" ON "Journey"("categoryId", "sortOrder");

-- CreateIndex
CREATE INDEX "Journey_side_idx" ON "Journey"("side");

-- CreateIndex
CREATE INDEX "AdditionalUserStory_journeyId_sortOrder_idx" ON "AdditionalUserStory"("journeyId", "sortOrder");

-- CreateIndex
CREATE INDEX "JourneyNote_journeyId_kind_sortOrder_idx" ON "JourneyNote"("journeyId", "kind", "sortOrder");

-- CreateIndex
CREATE INDEX "ArchiveItem_journeyId_sortOrder_idx" ON "ArchiveItem"("journeyId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "_JourneyPersonas_AB_unique" ON "_JourneyPersonas"("A", "B");

-- CreateIndex
CREATE INDEX "_JourneyPersonas_B_index" ON "_JourneyPersonas"("B");
