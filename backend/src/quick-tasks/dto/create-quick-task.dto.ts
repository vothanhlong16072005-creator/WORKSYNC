/**
 * Create Quick Task DTO
 * Endpoint: POST /api/quick-tasks
 *
 * Cho phép PM/DEPT_HEAD/Admin giao việc nhanh không cần sprint.
 */
import { z } from 'zod';
import { Priority, TaskStatus } from '@prisma/client';

export const CreateQuickTaskSchema = z.object({
  title: z.string().min(3, 'Tiêu đề phải có ít nhất 3 ký tự').max(200),
  description: z.string().max(2000).optional(),
  assigneeId: z.string().min(1, 'Phải chọn người nhận'),
  projectId: z.string().optional(), // null = personal task
  dueDate: z.string().datetime().or(z.date()),
  priority: z.nativeEnum(Priority).default(Priority.MEDIUM),
  status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
});

export type CreateQuickTaskDto = z.infer<typeof CreateQuickTaskSchema>;
