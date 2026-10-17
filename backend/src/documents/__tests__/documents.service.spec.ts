import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DocumentsService, extractTextFromTiptap } from '../documents.service.js';
import { DocumentScope, DocumentType, Role } from '@prisma/client';
import { CurrentActor } from '../documents-access.service.js';

describe('DocumentsService', () => {
  let service: DocumentsService;
  let mockPrisma: any;
  let mockAccessService: any;
  let mockTemplatesService: any;

  const actor: CurrentActor = { id: 'user-1', role: Role.EMPLOYEE, departmentId: 'dept-eng' };

  beforeEach(() => {
    mockPrisma = {
      document: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      documentVersion: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      documentPermission: {
        findMany: vi.fn(),
        upsert: vi.fn(),
        deleteMany: vi.fn(),
      },
      task: {
        findUnique: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
    };

    mockAccessService = {
      canCreateDocument: vi.fn().mockResolvedValue(true),
      canViewDocument: vi.fn().mockResolvedValue(true),
      canEditDocument: vi.fn().mockResolvedValue(true),
      canDeleteDocument: vi.fn().mockResolvedValue(true),
    };

    mockTemplatesService = {
      getTemplateByKey: vi.fn(),
    };

    service = new DocumentsService(mockPrisma, mockAccessService, mockTemplatesService);
  });

  describe('extractTextFromTiptap', () => {
    it('1. Correctly extracts plain text from nested Tiptap JSON nodes', () => {
      const tiptapJson = {
        type: 'doc',
        content: [
          {
            type: 'heading',
            content: [{ type: 'text', text: 'Tiêu đề tài liệu' }],
          },
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Đoạn văn thứ nhất.' },
              { type: 'text', text: 'Nội dung tiếp theo.' },
            ],
          },
        ],
      };

      const extracted = extractTextFromTiptap(tiptapJson);
      expect(extracted).toContain('Tiêu đề tài liệu');
      expect(extracted).toContain('Đoạn văn thứ nhất.');
      expect(extracted).toContain('Nội dung tiếp theo.');
    });
  });

  describe('create', () => {
    it('2. Creates document and initial version v1', async () => {
      const dto = {
        title: 'Tài liệu kiến trúc hệ thống',
        content: { type: 'doc', content: [{ type: 'text', text: 'Microservices architecture' }] },
        scope: DocumentScope.PROJECT,
        type: DocumentType.STANDARD,
        projectId: 'proj-1',
        tags: ['architecture', 'backend'],
      };

      mockPrisma.document.create.mockResolvedValue({
        id: 'doc-1',
        title: dto.title,
        currentVersion: 1,
        scope: dto.scope,
      });

      const result = await service.create(dto as any, actor);
      expect(result.id).toBe('doc-1');
      expect(mockPrisma.document.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: dto.title,
            currentVersion: 1,
            versions: expect.objectContaining({
              create: expect.objectContaining({ version: 1 }),
            }),
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('3. Filters documents and returns pagination metadata', async () => {
      const docs = [
        { id: 'doc-1', title: 'Doc 1' },
        { id: 'doc-2', title: 'Doc 2' },
      ];
      mockPrisma.document.findMany.mockResolvedValue(docs);

      const result = await service.findAll({ page: 1, limit: 10 }, actor);
      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
    });
  });

  describe('findOne', () => {
    it('4. Returns document with canEdit and increments viewCount', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        title: 'Doc 1',
        deletedAt: null,
        ownerId: actor.id,
      });
      mockPrisma.document.update.mockResolvedValue({});

      const result = await service.findOne('doc-1', actor);
      expect(result.id).toBe('doc-1');
      expect(result.canEdit).toBe(true);
      expect(mockPrisma.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'doc-1' },
          data: expect.objectContaining({
            viewCount: { increment: 1 },
          }),
        }),
      );
    });
  });

  describe('update & versioning', () => {
    it('5. Creates new version when saveVersion is true', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        title: 'Old Title',
        content: {},
        contentText: 'Old text',
        currentVersion: 1,
        deletedAt: null,
      });

      mockPrisma.documentVersion.create.mockResolvedValue({});
      mockPrisma.document.update.mockResolvedValue({
        id: 'doc-1',
        title: 'New Title',
        currentVersion: 2,
      });

      const updated = await service.update(
        'doc-1',
        { title: 'New Title', saveVersion: true, changeNote: 'Đổi tiêu đề' },
        actor,
      );

      expect(updated.currentVersion).toBe(2);
      expect(mockPrisma.documentVersion.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            documentId: 'doc-1',
            version: 2,
            changeNote: 'Đổi tiêu đề',
          }),
        }),
      );
    });

    it('6. Restores content from past version', async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        id: 'doc-1',
        title: 'Current Title',
        currentVersion: 3,
        deletedAt: null,
      });

      mockPrisma.documentVersion.findUnique.mockResolvedValue({
        documentId: 'doc-1',
        version: 1,
        title: 'Version 1 Title',
        content: { type: 'doc' },
        contentText: 'Version 1 text',
      });

      mockPrisma.documentVersion.create.mockResolvedValue({});
      mockPrisma.document.update.mockResolvedValue({
        id: 'doc-1',
        title: 'Version 1 Title',
        currentVersion: 4,
      });

      const restored = await service.restoreVersion('doc-1', 1, actor);
      expect(restored.currentVersion).toBe(4);
      expect(restored.title).toBe('Version 1 Title');
    });
  });

  describe('U2: submitTaskDeliverable', () => {
    it('7. Submits task deliverable for assignee', async () => {
      mockPrisma.task.findUnique.mockResolvedValue({
        id: 'task-105',
        title: 'Implement OAuth Google Login',
        assigneeId: actor.id,
        projectId: 'proj-1',
        deletedAt: null,
      });

      mockPrisma.document.create.mockResolvedValue({
        id: 'doc-sub-1',
        title: 'Bằng chứng nộp kết quả task 105',
        type: DocumentType.TASK_SUBMISSION,
      });

      const result = await service.submitTaskDeliverable(
        {
          taskId: 'task-105',
          title: 'Bằng chứng nộp kết quả task 105',
          note: 'Đã hoàn thành module đăng nhập Google',
          tags: ['deliverable'],
        },
        actor,
      );

      expect(result.id).toBe('doc-sub-1');
      expect(mockPrisma.document.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: DocumentType.TASK_SUBMISSION,
            linkedTaskId: 'task-105',
          }),
        }),
      );
    });
  });
});
