import { z } from 'zod';
import { NotificationType } from '@prisma/client';

export const CreateNotificationSchema = z.object({
  userId: z.string().min(1),
  type: z.nativeEnum(NotificationType),
  category: z.string().min(1),
  title: z.string().min(1),
  body: z.string().optional().nullable(),
  data: z.record(z.string(), z.unknown()).optional().nullable(),
  icon: z.string().optional().nullable(),
  actorId: z.string().optional().nullable(),
});

export type CreateNotificationDto = z.infer<typeof CreateNotificationSchema>;
