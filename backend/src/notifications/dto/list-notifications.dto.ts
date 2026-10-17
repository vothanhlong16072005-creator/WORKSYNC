import { z } from 'zod';
import { NotificationType } from '@prisma/client';

export const ListNotificationsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  isRead: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional(),
  type: z.nativeEnum(NotificationType).optional(),
  category: z.string().optional(),
});

export type ListNotificationsDto = z.infer<typeof ListNotificationsSchema>;
