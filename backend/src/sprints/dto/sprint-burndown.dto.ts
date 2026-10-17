/**
 * Sprint Burndown Response DTO
 * Endpoint: GET /api/sprints/:id/burndown
 */
import { SprintStatus } from '@prisma/client';

export interface BurndownDayPoint {
  date: string; // YYYY-MM-DD
  ideal: number;
  actual: number;
}

export interface SprintBurndownResponse {
  sprintId: string;
  sprintName: string;
  status: SprintStatus;
  startDate: string | null;
  endDate: string | null;
  totalStoryPoints: number;
  completedStoryPoints: number;
  remainingStoryPoints: number;
  dailyData: BurndownDayPoint[];
}
