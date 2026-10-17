import { z } from 'zod';

export const SaveMinutesSchema = z.object({
  content: z.string(),
});

export type SaveMinutesDto = z.infer<typeof SaveMinutesSchema>;
