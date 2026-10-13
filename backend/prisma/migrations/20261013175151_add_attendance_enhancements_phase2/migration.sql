-- CreateEnum
CREATE TYPE "BreakType" AS ENUM ('MANUAL', 'EARLY_LEAVE_OUT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AttendanceStatus" ADD VALUE 'EARLY_LEAVE_APPROVED';
ALTER TYPE "AttendanceStatus" ADD VALUE 'EARLY_LEAVE_UNAPPROVED';

-- CreateTable
CREATE TABLE "EarlyLeaveRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "expectedLeaveTime" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EarlyLeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OvertimeRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "registeredStart" TIMESTAMP(3) NOT NULL,
    "registeredEnd" TIMESTAMP(3) NOT NULL,
    "registeredHours" DOUBLE PRECISION NOT NULL,
    "actualHours" DOUBLE PRECISION,
    "reason" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OvertimeRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreakLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "duration" INTEGER,
    "reason" TEXT,
    "type" "BreakType" NOT NULL DEFAULT 'MANUAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BreakLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EarlyLeaveRequest_userId_date_idx" ON "EarlyLeaveRequest"("userId", "date");

-- CreateIndex
CREATE INDEX "EarlyLeaveRequest_status_idx" ON "EarlyLeaveRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EarlyLeaveRequest_userId_date_key" ON "EarlyLeaveRequest"("userId", "date");

-- CreateIndex
CREATE INDEX "OvertimeRequest_userId_date_idx" ON "OvertimeRequest"("userId", "date");

-- CreateIndex
CREATE INDEX "OvertimeRequest_status_idx" ON "OvertimeRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OvertimeRequest_userId_date_key" ON "OvertimeRequest"("userId", "date");

-- CreateIndex
CREATE INDEX "BreakLog_userId_date_idx" ON "BreakLog"("userId", "date");

-- AddForeignKey
ALTER TABLE "EarlyLeaveRequest" ADD CONSTRAINT "EarlyLeaveRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarlyLeaveRequest" ADD CONSTRAINT "EarlyLeaveRequest_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OvertimeRequest" ADD CONSTRAINT "OvertimeRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OvertimeRequest" ADD CONSTRAINT "OvertimeRequest_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakLog" ADD CONSTRAINT "BreakLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
