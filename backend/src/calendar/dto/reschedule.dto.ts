import { z } from 'zod';

export const RescheduleSchema = z.object({
  newStart: z.string().refine((d) => !isNaN(Date.parse(d)), { message: 'Invalid newStart date' }),
  newEnd: z.string().refine((d) => !isNaN(Date.parse(d)), { message: 'Invalid newEnd date' }).optional(),
  reason: z.string().max(500).optional(),
});

export type RescheduleDto = z.infer<typeof RescheduleSchema>;
