import { z } from 'zod';

export const ProjectKindSchema = z.enum(['TEAM', 'PERSONAL']);
export type ProjectKind = z.infer<typeof ProjectKindSchema>;

export const ProjectSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: ProjectKindSchema,
  color: z.string(),
  openAssignedTaskCount: z.number(),
});
export type ProjectSummary = z.infer<typeof ProjectSummarySchema>;

export const TaskStatusSchema = z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const PrioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']);
export type Priority = z.infer<typeof PrioritySchema>;

export const TaskAssigneeSchema = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().nullable().optional(),
});
export type TaskAssignee = z.infer<typeof TaskAssigneeSchema>;

export const TaskProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  color: z.string(),
  kind: ProjectKindSchema.optional(),
});
export type TaskProject = z.infer<typeof TaskProjectSchema>;

export const BoardTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  status: TaskStatusSchema,
  priority: PrioritySchema,
  projectId: z.string(),
  position: z.number(),
  labels: z.array(z.string()).default([]),
  dueDate: z.string().nullable().optional(),
  timeEstimate: z.number().nullable().optional(),
  timeTracked: z.number().nullable().optional(),
  storyPoints: z.number().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  assignee: TaskAssigneeSchema.nullable().optional(),
  createdBy: TaskAssigneeSchema.nullable().optional(),
  project: TaskProjectSchema.optional(),
  sprint: z.object({ id: z.string(), name: z.string() }).nullable().optional(),
  epic: z.object({ id: z.string(), title: z.string(), color: z.string().nullable().optional() }).nullable().optional(),
});
export type BoardTask = z.infer<typeof BoardTaskSchema>;

export const TaskScopeSchema = z.object({
  scope: z.enum(['mine', 'project']),
  projectId: z.string().optional(),
});
export type TaskScope = z.infer<typeof TaskScopeSchema>;

export const MoveTaskInputSchema = z.object({
  status: TaskStatusSchema,
  destinationIndex: z.number().int().min(0),
});
export type MoveTaskInput = z.infer<typeof MoveTaskInputSchema>;
