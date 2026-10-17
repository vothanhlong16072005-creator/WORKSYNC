/**
 * Update Sprint DTO
 * Endpoint: PATCH /api/sprints/:id
 */
import { z } from 'zod';
import { SprintStatus } from '@prisma/client';

export const UpdateSprintSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  goal: z.string().max(1000).optional().nullable(),
  startDate: z.string().datetime().or(z.date()).optional().nullable(),
  durationDays: z.number().int().min(1).max(90).optional(),
  endDate: z.string().datetime().or(z.date()).optional().nullable(),
  status: z.nativeEnum(SprintStatus).optional(),
});

export type UpdateSprintDto = z.infer<typeof UpdateSprintSchema>;
