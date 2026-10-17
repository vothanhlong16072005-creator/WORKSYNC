import { z } from 'zod';

export const SubscribePushSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().optional(),
});

export type SubscribePushDto = z.infer<typeof SubscribePushSchema>;

export const UnsubscribePushSchema = z.object({
  endpoint: z.string().url(),
});

export type UnsubscribePushDto = z.infer<typeof UnsubscribePushSchema>;
