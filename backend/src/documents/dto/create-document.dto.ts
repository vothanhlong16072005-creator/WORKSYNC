import { DocumentScope, DocumentType } from '@prisma/client';
import { z } from 'zod';

export const CreateDocumentSchema = z.object({
  title: z.string().trim().min(1, 'Tiêu đề không được để trống').max(255),
  content: z.any().optional().default({ type: 'doc', content: [] }),
  contentText: z.string().optional().default(''),
  scope: z.nativeEnum(DocumentScope).default(DocumentScope.PERSONAL),
  type: z.nativeEnum(DocumentType).default(DocumentType.STANDARD),
  projectId: z.string().trim().min(1).optional().nullable(),
  departmentId: z.string().trim().min(1).optional().nullable(),
  linkedTaskId: z.string().trim().min(1).optional().nullable(),
  linkedMeetingId: z.string().trim().min(1).optional().nullable(),
  templateKey: z.string().trim().min(1).optional().nullable(),
  parentId: z.string().trim().min(1).optional().nullable(),
  tags: z.array(z.string().trim()).optional().default([]),
});

export type CreateDocumentDto = z.infer<typeof CreateDocumentSchema>;
