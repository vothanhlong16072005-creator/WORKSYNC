-- CreateEnum
CREATE TYPE "ProjectKind" AS ENUM ('TEAM', 'PERSONAL');

-- AlterTable
ALTER TABLE "Project"
ADD COLUMN "kind" "ProjectKind" NOT NULL DEFAULT 'TEAM',
ADD COLUMN "personalOwnerId" TEXT;

-- Backfill one deterministic personal project for every existing user that lacks one.
INSERT INTO "Project" (
  "id",
  "name",
  "kind",
  "personalOwnerId",
  "createdById",
  "createdAt",
  "updatedAt"
)
SELECT
  'personal_' || "User"."id",
  'Việc cá nhân',
  'PERSONAL',
  "User"."id",
  "User"."id",
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "User"
WHERE NOT EXISTS (
  SELECT 1
  FROM "Project"
  WHERE "Project"."personalOwnerId" = "User"."id"
);

-- CreateIndex
CREATE UNIQUE INDEX "Project_personalOwnerId_key" ON "Project"("personalOwnerId");

-- AddForeignKey
ALTER TABLE "Project"
ADD CONSTRAINT "Project_personalOwnerId_fkey"
FOREIGN KEY ("personalOwnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
