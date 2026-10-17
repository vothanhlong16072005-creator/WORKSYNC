import { MeetingScope, MeetingStatus } from '@prisma/client';
import { z } from 'zod';

export const MeetingQuerySchema = z.object({
  scope: z.nativeEnum(MeetingScope).optional(),
  status: z.nativeEnum(MeetingStatus).optional(),
  projectId: z.string().optional(),
  departmentId: z.string().optional(),
});

export type MeetingQueryDto = z.infer<typeof MeetingQuerySchema>;
export type AttendanceQueryDto = MeetingQueryDto;
