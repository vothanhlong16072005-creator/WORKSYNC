/**
 * Update Quick Task DTO
 * Endpoint: PATCH /api/quick-tasks/:id
 */
import { z } from 'zod';
import { Priority, TaskStatus } from '@prisma/client';

export const UpdateQuickTaskSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).optional(),
  dueDate: z.string().datetime().or(z.date()).optional(),
  priority: z.nativeEnum(Priority).optional(),
  status: z.nativeEnum(TaskStatus).optional(),
});

export type UpdateQuickTaskDto = z.infer<typeof UpdateQuickTaskSchema>;
