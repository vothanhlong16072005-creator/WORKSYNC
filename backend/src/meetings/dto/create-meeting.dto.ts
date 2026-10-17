import { MeetingScope } from '@prisma/client';
import { z } from 'zod';

export const CreateMeetingSchema = z.object({
  title: z.string().min(1, 'Tiêu đề không được để trống').max(200),
  description: z.string().optional().nullable(),
  scopeType: z.nativeEnum(MeetingScope).default(MeetingScope.ONE_ON_ONE),
  projectId: z.string().optional().nullable(),
  departmentId: z.string().optional().nullable(),
  startTime: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Thời gian bắt đầu không hợp lệ' }),
  endTime: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: 'Thời gian kết thúc không hợp lệ' }),
  attendeeIds: z.array(z.string()).optional().default([]),
  agenda: z.array(z.string()).optional().default([]),
});

export type CreateMeetingDto = z.infer<typeof CreateMeetingSchema>;
