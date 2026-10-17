-- CreateEnum
CREATE TYPE "ProjectWorkflowType" AS ENUM ('SCRUM', 'KANBAN', 'DAILY', 'SIMPLE');

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'DEPARTMENT_HEAD';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "pmId" TEXT,
ADD COLUMN     "workflowType" "ProjectWorkflowType" NOT NULL DEFAULT 'KANBAN';

-- AlterTable
ALTER TABLE "Sprint" ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "durationDays" INTEGER NOT NULL DEFAULT 14;

-- CreateTable
CREATE TABLE "QuickTask" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "projectId" TEXT,
    "assigneeId" TEXT NOT NULL,
    "assignedById" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "QuickTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuickTask_assigneeId_status_idx" ON "QuickTask"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "QuickTask_dueDate_idx" ON "QuickTask"("dueDate");

-- CreateIndex
CREATE INDEX "QuickTask_projectId_idx" ON "QuickTask"("projectId");

-- CreateIndex
CREATE INDEX "Sprint_projectId_status_idx" ON "Sprint"("projectId", "status");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_pmId_fkey" FOREIGN KEY ("pmId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sprint" ADD CONSTRAINT "Sprint_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuickTask" ADD CONSTRAINT "QuickTask_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuickTask" ADD CONSTRAINT "QuickTask_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuickTask" ADD CONSTRAINT "QuickTask_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
