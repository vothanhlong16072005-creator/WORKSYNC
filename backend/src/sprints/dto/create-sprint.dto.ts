/**
 * Create Sprint DTO
 * Endpoint: POST /api/sprints
 *
 * Chỉ PM của dự án hoặc Admin mới có quyền tạo Sprint.
 */
import { z } from 'zod';

export const CreateSprintSchema = z.object({
  projectId: z.string().min(1, 'Project ID là bắt buộc'),
  name: z.string().min(2, 'Tên sprint phải có ít nhất 2 ký tự').max(100),
  goal: z.string().max(1000).optional(),
  startDate: z.string().datetime().or(z.date()).optional(),
  durationDays: z.number().int().min(1).max(90).default(14),
  endDate: z.string().datetime().or(z.date()).optional(),
});

export type CreateSprintDto = z.infer<typeof CreateSprintSchema>;
