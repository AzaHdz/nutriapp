-- CreateEnum
CREATE TYPE "BacklogType" AS ENUM ('BUG', 'IMPROVEMENT', 'TECH_DEBT');

-- CreateEnum
CREATE TYPE "BacklogPriority" AS ENUM ('P1', 'P2', 'P3', 'P4');

-- CreateEnum
CREATE TYPE "BugSeverity" AS ENUM ('BLOCKER', 'MAJOR', 'MINOR', 'COSMETIC');

-- CreateEnum
CREATE TYPE "BacklogStatus" AS ENUM ('INBOX', 'TODO', 'IN_PROGRESS', 'DONE', 'WONT_FIX');

-- AlterTable
ALTER TABLE "FeatureRequest" ADD COLUMN     "backlogItemId" TEXT;

-- CreateTable
CREATE TABLE "BacklogItem" (
    "id" TEXT NOT NULL,
    "type" "BacklogType" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "priority" "BacklogPriority" NOT NULL DEFAULT 'P3',
    "severity" "BugSeverity",
    "area" TEXT,
    "status" "BacklogStatus" NOT NULL DEFAULT 'INBOX',
    "pageUrl" TEXT,
    "userAgent" TEXT,
    "viewport" TEXT,
    "stepsToRepro" TEXT,
    "resolution" TEXT,
    "commitRef" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BacklogItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BacklogItem_status_idx" ON "BacklogItem"("status");

-- CreateIndex
CREATE INDEX "BacklogItem_priority_idx" ON "BacklogItem"("priority");

-- CreateIndex
CREATE INDEX "FeatureRequest_backlogItemId_idx" ON "FeatureRequest"("backlogItemId");

-- AddForeignKey
ALTER TABLE "FeatureRequest" ADD CONSTRAINT "FeatureRequest_backlogItemId_fkey" FOREIGN KEY ("backlogItemId") REFERENCES "BacklogItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

