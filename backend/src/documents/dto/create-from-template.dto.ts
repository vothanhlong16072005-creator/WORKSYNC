import { DocumentScope } from '@prisma/client';
import { z } from 'zod';

export const CreateFromTemplateSchema = z.object({
  templateKey: z.string().trim().min(1, 'Key template không được để trống'),
  title: z.string().trim().min(1, 'Tiêu đề không được để trống').max(255),
  scope: z.nativeEnum(DocumentScope).default(DocumentScope.PERSONAL),
  projectId: z.string().trim().min(1).optional().nullable(),
  departmentId: z.string().trim().min(1).optional().nullable(),
  linkedTaskId: z.string().trim().min(1).optional().nullable(),
  linkedMeetingId: z.string().trim().min(1).optional().nullable(),
});

export type CreateFromTemplateDto = z.infer<typeof CreateFromTemplateSchema>;
