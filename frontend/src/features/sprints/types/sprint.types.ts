/**
 * Sprint Types — M3.5
 */

export type SprintStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED';

export interface SprintTask {
  id: string;
  title: string;
  status: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  storyPoints: number | null;
  assignee?: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
}

export interface SprintProgress {
  totalTasks: number;
  doneTasks: number;
  totalStoryPoints: number;
  completedStoryPoints: number;
  percent: number;
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  status: SprintStatus;
  startDate: string | null;
  endDate: string | null;
  durationDays: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  progress?: SprintProgress;
  tasks?: SprintTask[];
  createdBy?: {
    id: string;
    name: string;
    avatar: string | null;
  } | null;
  project?: {
    id: string;
    name: string;
    workflowType: string;
    pmId: string | null;
    departmentId: string | null;
  };
}

export interface BurndownDayPoint {
  date: string;
  ideal: number;
  actual: number;
}

export interface SprintBurndown {
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

export interface CreateSprintInput {
  projectId: string;
  name: string;
  goal?: string;
  durationDays?: number;
  startDate?: string;
  endDate?: string;
}

export interface UpdateSprintInput {
  name?: string;
  goal?: string | null;
  durationDays?: number;
  startDate?: string | null;
  endDate?: string | null;
  status?: SprintStatus;
}
