import { apiClient } from '@/lib/api-client';
import { z } from 'zod';
import type { DashboardData } from '../types/dashboard.types';

export const TaskSummarySchema = z.object({
  total: z.number(),
  inProgress: z.number(),
  blocked: z.number(),
  done: z.number(),
});

export const UrgentTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']),
  status: z.string(),
  dueDate: z.string().nullable(),
  projectName: z.string(),
  projectColor: z.string(),
});

export const SprintProgressSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['PLANNING', 'ACTIVE', 'COMPLETED']),
  totalTasks: z.number(),
  doneTasks: z.number(),
  progressPercent: z.number(),
});

export const ProjectProgressSchema = z.object({
  projectId: z.string(),
  projectName: z.string(),
  projectColor: z.string(),
  totalTasks: z.number(),
  doneTasks: z.number(),
  progressPercent: z.number(),
  activeSprint: z
    .object({
      id: z.string(),
      name: z.string(),
      endDate: z.string(),
    })
    .optional(),
  sprints: z.array(SprintProgressSchema),
});

export const TeamMemberWorkloadSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  avatar: z.string().nullable(),
  openTaskCount: z.number(),
  totalStoryPoints: z.number().nullable(),
});

export const SystemHealthSchema = z.object({
  activeUsers: z.number(),
  totalProjects: z.number(),
  totalTasks: z.number(),
  completedTasks: z.number(),
});

export const EmployeeDashboardSchema = z.object({
  taskSummary: TaskSummarySchema,
  urgentTasks: z.array(UrgentTaskSchema),
  myWeeklyDone: z.number(),
});

export const PmDashboardSchema = EmployeeDashboardSchema.extend({
  projectProgress: z.array(ProjectProgressSchema),
  teamWorkload: z.array(TeamMemberWorkloadSchema),
});

export const HrDashboardSchema = z.object({
  taskSummary: TaskSummarySchema,
  attendanceSummary: z.null(),
});

export const AdminDashboardSchema = z.object({
  taskSummary: TaskSummarySchema,
  projectProgress: z.array(ProjectProgressSchema),
  systemHealth: SystemHealthSchema,
});

export async function fetchDashboardData(roleEndpoint: string): Promise<DashboardData> {
  const response = await apiClient.get<{ success: boolean; data: unknown }>(`/dashboard/${roleEndpoint}`);
  return response.data.data as DashboardData;
}
