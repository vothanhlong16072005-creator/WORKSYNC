import { MeetingStatus } from '@prisma/client';
import { z } from 'zod';

export const UpdateMeetingSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional().nullable(),
  startTime: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Thời gian bắt đầu không hợp lệ' })
    .optional(),
  endTime: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Thời gian kết thúc không hợp lệ' })
    .optional(),
  status: z.nativeEnum(MeetingStatus).optional(),
  attendeeIds: z.array(z.string()).optional(),
  agenda: z.array(z.string()).optional(),
});

export type UpdateMeetingDto = z.infer<typeof UpdateMeetingSchema>;
