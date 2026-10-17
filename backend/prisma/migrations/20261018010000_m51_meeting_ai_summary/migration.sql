-- Migration: M5.1 — Meeting AI Summary
-- Date: 2026-10-18
-- Reference: docs/M5.1-MEETING-AI-SUMMARY-PLAN.md

-- Add 7 new fields to MeetingMinute table
ALTER TABLE "MeetingMinute" ADD COLUMN "aiSummary" TEXT;
ALTER TABLE "MeetingMinute" ADD COLUMN "actionItems" JSONB;
ALTER TABLE "MeetingMinute" ADD COLUMN "decisions" JSONB;
ALTER TABLE "MeetingMinute" ADD COLUMN "risksAndQuestions" JSONB;
ALTER TABLE "MeetingMinute" ADD COLUMN "aiGeneratedAt" TIMESTAMP(3);
ALTER TABLE "MeetingMinute" ADD COLUMN "aiModel" TEXT;
ALTER TABLE "MeetingMinute" ADD COLUMN "aiTokensUsed" INTEGER;

-- Index for fast lookup by meetingId (already exists via @unique on meetingId, but explicit index helps JOIN queries)
CREATE INDEX IF NOT EXISTS "MeetingMinute_meetingId_idx" ON "MeetingMinute"("meetingId");
