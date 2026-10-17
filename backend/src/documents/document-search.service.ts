import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { DocumentsAccessService, CurrentActor } from './documents-access.service.js';
import { DocumentScope } from '@prisma/client';

export interface SearchDocumentsQuery {
  q: string;
  scope?: DocumentScope;
  projectId?: string;
  departmentId?: string;
  tag?: string;
  limit?: number;
}

@Injectable()
export class DocumentSearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: DocumentsAccessService,
  ) {}

  /**
   * Search documents using fulltext / pattern matching
   */
  async search(query: SearchDocumentsQuery, actor: CurrentActor) {
    const { q, scope, projectId, departmentId, tag, limit = 20 } = query;
    const trimmed = (q || '').trim();

    // Query candidate documents matching text, scope, project, tag
    const documents = await this.prisma.document.findMany({
      where: {
        deletedAt: null,
        ...(scope ? { scope } : {}),
        ...(projectId ? { projectId } : {}),
        ...(departmentId ? { departmentId } : {}),
        ...(tag ? { tags: { has: tag } } : {}),
        ...(trimmed
          ? {
              OR: [
                { title: { contains: trimmed, mode: 'insensitive' } },
                { contentText: { contains: trimmed, mode: 'insensitive' } },
                { tags: { has: trimmed } },
              ],
            }
          : {}),
      },
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        project: { select: { id: true, name: true, color: true } },
        department: { select: { id: true, name: true } },
        _count: { select: { versions: true, attachments: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: Math.min(limit * 2, 100),
    });

    // Filter by actor permissions
    const accessibleDocs: typeof documents = [];
    for (const doc of documents) {
      const canView = await this.accessService.canViewDocument(doc, actor);
      if (canView) {
        accessibleDocs.push(doc);
        if (accessibleDocs.length >= limit) break;
      }
    }

    // Format results with snippet
    return accessibleDocs.map((doc) => {
      let snippet = '';
      if (trimmed && doc.contentText) {
        const lowerText = doc.contentText.toLowerCase();
        const idx = lowerText.indexOf(trimmed.toLowerCase());
        if (idx !== -1) {
          const start = Math.max(0, idx - 40);
          const end = Math.min(doc.contentText.length, idx + trimmed.length + 60);
          snippet = (start > 0 ? '...' : '') + doc.contentText.substring(start, end) + (end < doc.contentText.length ? '...' : '');
        } else {
          snippet = doc.contentText.substring(0, 100);
        }
      } else {
        snippet = doc.contentText ? doc.contentText.substring(0, 100) : '';
      }

      return {
        id: doc.id,
        title: doc.title,
        scope: doc.scope,
        type: doc.type,
        snippet,
        tags: doc.tags,
        owner: doc.owner,
        project: doc.project,
        department: doc.department,
        currentVersion: doc.currentVersion,
        viewCount: doc.viewCount,
        updatedAt: doc.updatedAt,
        attachmentsCount: doc._count.attachments,
        versionsCount: doc._count.versions,
      };
    });
  }
}
