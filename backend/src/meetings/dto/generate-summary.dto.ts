import { z } from 'zod';

/**
 * Payload cho POST /api/meetings/:id/ai-summary/generate
 *
 * `referenceContent` là nội dung tham chiếu do người dùng nhập tay (hoặc
 * kịch bản demo) để định hướng AI. Khi có trường này, AI phải bám theo
 * nội dung tham chiếu thay vì tự suy diễn từ transcript rác của STT.
 */
export const GenerateSummarySchema = z.object({
  language: z.enum(['VI', 'EN']).optional().default('VI'),
  referenceContent: z
    .string()
    .max(20000, 'Nội dung tham chiếu không được vượt quá 20000 ký tự')
    .optional()
    .nullable()
    .transform((v) => {
      const trimmed = v?.trim();
      return trimmed && trimmed.length > 0 ? trimmed : null;
    }),
});

export type GenerateSummaryDto = z.infer<typeof GenerateSummarySchema>;
