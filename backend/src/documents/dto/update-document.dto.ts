import { DocumentScope, DocumentType } from '@prisma/client';
import { z } from 'zod';

export const UpdateDocumentSchema = z.object({
  title: z.string().trim().min(1, 'Tiêu đề không được để trống').max(255).optional(),
  content: z.any().optional(),
  contentText: z.string().optional(),
  scope: z.nativeEnum(DocumentScope).optional(),
  type: z.nativeEnum(DocumentType).optional(),
  projectId: z.string().trim().min(1).optional().nullable(),
  departmentId: z.string().trim().min(1).optional().nullable(),
  linkedTaskId: z.string().trim().min(1).optional().nullable(),
  linkedMeetingId: z.string().trim().min(1).optional().nullable(),
  parentId: z.string().trim().min(1).optional().nullable(),
  tags: z.array(z.string().trim()).optional(),
  changeNote: z.string().trim().max(500).optional().nullable(),
  saveVersion: z.boolean().optional().default(false),
});

export type UpdateDocumentDto = z.infer<typeof UpdateDocumentSchema>;
