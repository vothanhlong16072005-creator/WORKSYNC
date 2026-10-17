import { DocumentScope, DocumentType } from '@prisma/client';
import { z } from 'zod';

export const DocumentQuerySchema = z.object({
  scope: z.nativeEnum(DocumentScope).optional(),
  type: z.nativeEnum(DocumentType).optional(),
  projectId: z.string().trim().optional(),
  departmentId: z.string().trim().optional(),
  linkedTaskId: z.string().trim().optional(),
  linkedMeetingId: z.string().trim().optional(),
  search: z.string().trim().optional(),
  tag: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(['updatedAt', 'createdAt', 'title', 'viewCount']).default('updatedAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type DocumentQueryDto = z.infer<typeof DocumentQuerySchema>;
