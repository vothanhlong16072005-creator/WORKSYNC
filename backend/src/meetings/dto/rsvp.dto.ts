import { RSVP } from '@prisma/client';
import { z } from 'zod';

export const RsvpSchema = z.object({
  status: z.enum([RSVP.ACCEPTED, RSVP.DECLINED]),
});

export type RsvpDto = z.infer<typeof RsvpSchema>;
