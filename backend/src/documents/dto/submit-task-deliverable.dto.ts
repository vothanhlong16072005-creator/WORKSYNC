import { z } from 'zod';

export const SubmitTaskDeliverableSchema = z.object({
  taskId: z.string().trim().min(1, 'Mã task không được để trống'),
  title: z.string().trim().min(1, 'Tiêu đề không được để trống').max(255),
  note: z.string().trim().max(1000).optional(),
  content: z.any().optional().default({ type: 'doc', content: [] }),
  tags: z.array(z.string().trim()).optional().default(['deliverable', 'submission']),
});

export type SubmitTaskDeliverableDto = z.infer<typeof SubmitTaskDeliverableSchema>;
