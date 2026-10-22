import { z } from 'zod';

export const SubmitDailyReportSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Định dạng ngày phải là YYYY-MM-DD'),
  content: z.string().min(1, 'Nội dung báo cáo không được để trống').max(10000),
  tasksDone: z.array(z.string()).default([]),
  blockers: z.string().max(3000).optional().nullable(),
  plannedTomorrow: z.string().max(3000).optional().nullable(),
  aiDrafted: z.boolean().optional().default(false),
  targetUserId: z.string().optional(),
});

export type SubmitDailyReportDto = z.infer<typeof SubmitDailyReportSchema>;

export const UpdateDailyReportSchema = z.object({
  content: z.string().min(1, 'Nội dung báo cáo không được để trống').max(10000).optional(),
  tasksDone: z.array(z.string()).optional(),
  blockers: z.string().max(3000).optional().nullable(),
  plannedTomorrow: z.string().max(3000).optional().nullable(),
});

export type UpdateDailyReportDto = z.infer<typeof UpdateDailyReportSchema>;

export const ListDailyReportsQuerySchema = z.object({
  date: z.string().optional(),
  weekStart: z.string().optional(),
  userId: z.string().optional(),
  departmentId: z.string().optional(),
  projectId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export type ListDailyReportsQueryDto = z.infer<typeof ListDailyReportsQuerySchema>;
