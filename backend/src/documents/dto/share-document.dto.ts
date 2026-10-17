import { z } from 'zod';

export const ShareDocumentSchema = z.object({
  userId: z.string().trim().min(1, 'Mã người dùng không được để trống'),
  canEdit: z.boolean().default(false),
  canComment: z.boolean().default(true),
  canShare: z.boolean().default(false),
});

export type ShareDocumentDto = z.infer<typeof ShareDocumentSchema>;
