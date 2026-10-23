import { z } from 'zod';

export const SendCultureWishSchema = z.object({
  targetUserId: z.string().min(1, 'Target user ID is required'),
  eventType: z.string().min(1, 'Event type is required'),
  eventTitle: z.string().min(1, 'Event title is required'),
  customMessage: z.string().optional(),
});

export type SendCultureWishDto = z.infer<typeof SendCultureWishSchema>;
