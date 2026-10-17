import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { DocumentsAccessService, CurrentActor } from './documents-access.service.js';
import { DocumentTemplatesService } from './document-templates.service.js';
import { CreateDocumentDto } from './dto/create-document.dto.js';
import { UpdateDocumentDto } from './dto/update-document.dto.js';
import { DocumentQueryDto } from './dto/document-query.dto.js';
import { CreateFromTemplateDto } from './dto/create-from-template.dto.js';
import { SubmitTaskDeliverableDto } from './dto/submit-task-deliverable.dto.js';
import { ShareDocumentDto } from './dto/share-document.dto.js';
import { DocumentScope, DocumentType, Prisma } from '@prisma/client';

export function extractTextFromTiptap(node: unknown): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  const obj = node as { text?: string; content?: unknown[] };
  if (obj.text) return obj.text;
  if (Array.isArray(obj.content)) {
    return obj.content.map(extractTextFromTiptap).filter(Boolean).join(' ');
  }
  return '';
}

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: DocumentsAccessService,
    private readonly templatesService: DocumentTemplatesService,
  ) {}

  /**
   * 1. Create a document
   */
  async create(dto: CreateDocumentDto, actor: CurrentActor) {
    const canCreate = await this.accessService.canCreateDocument(
      actor,
      dto.scope,
      dto.type,
      dto.projectId,
      dto.departmentId,
      dto.linkedTaskId,
    );
    if (!canCreate) {
      throw new ForbiddenException('Bạn không có quyền tạo tài liệu trong phạm vi này');
    }

    const plainText = dto.contentText?.trim() || extractTextFromTiptap(dto.content);

    const doc = await this.prisma.document.create({
      data: {
        title: dto.title,
        content: (dto.content ?? { type: 'doc', content: [] }) as Prisma.InputJsonValue,
        contentText: plainText,
        scope: dto.scope,
        type: dto.type,
        ownerId: actor.id,
        createdById: actor.id,
        projectId: dto.projectId,
        departmentId: dto.departmentId || (dto.scope === DocumentScope.DEPARTMENT ? actor.departmentId : null),
        linkedTaskId: dto.linkedTaskId,
        linkedMeetingId: dto.linkedMeetingId,
        templateKey: dto.templateKey,
        parentId: dto.parentId,
        tags: dto.tags,
        currentVersion: 1,
        versions: {
          create: {
            version: 1,
            title: dto.title,
            content: (dto.content ?? { type: 'doc', content: [] }) as Prisma.InputJsonValue,
            contentText: plainText,
            changeNote: 'Khởi tạo tài liệu',
            savedById: actor.id,
          },
        },
      },
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        project: { select: { id: true, name: true, color: true } },
        department: { select: { id: true, name: true } },
      },
    });

    return doc;
  }

  /**
   * 2. Find all documents with filters & pagination
   */
  async findAll(query: Partial<DocumentQueryDto>, actor: CurrentActor) {
    const {
      scope,
      type,
      projectId,
      departmentId,
      linkedTaskId,
      linkedMeetingId,
      search,
      tag,
      page = 1,
      limit = 20,
      sortBy = 'updatedAt',
      sortOrder = 'desc',
    } = query;

    const trimmedSearch = (search || '').trim();

    const where: Prisma.DocumentWhereInput = {
      deletedAt: null,
      ...(scope ? { scope } : {}),
      ...(type ? { type } : {}),
      ...(projectId ? { projectId } : {}),
      ...(departmentId ? { departmentId } : {}),
      ...(linkedTaskId ? { linkedTaskId } : {}),
      ...(linkedMeetingId ? { linkedMeetingId } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
      ...(trimmedSearch
        ? {
            OR: [
              { title: { contains: trimmedSearch, mode: 'insensitive' } },
              { contentText: { contains: trimmedSearch, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    // Retrieve documents
    const candidateDocs = await this.prisma.document.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        project: { select: { id: true, name: true, color: true } },
        department: { select: { id: true, name: true } },
        linkedTask: { select: { id: true, title: true, status: true } },
        linkedMeeting: { select: { id: true, title: true, startTime: true } },
        _count: { select: { versions: true, attachments: true } },
      },
      orderBy: { [sortBy]: sortOrder },
    });

    // Enforce view authorization
    const accessibleDocs: typeof candidateDocs = [];
    for (const doc of candidateDocs) {
      const canView = await this.accessService.canViewDocument(doc, actor);
      if (canView) {
        accessibleDocs.push(doc);
      }
    }

    const total = accessibleDocs.length;
    const paginated = accessibleDocs.slice((page - 1) * limit, page * limit);

    return {
      items: paginated,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  /**
   * 3. Find one document by ID
   */
  async findOne(id: string, actor: CurrentActor) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, name: true, avatar: true, email: true } },
        createdBy: { select: { id: true, name: true, avatar: true } },
        updatedBy: { select: { id: true, name: true, avatar: true } },
        project: { select: { id: true, name: true, color: true, pmId: true } },
        department: { select: { id: true, name: true } },
        linkedTask: { select: { id: true, title: true, status: true, assigneeId: true } },
        linkedMeeting: { select: { id: true, title: true, startTime: true } },
        attachments: {
          include: {
            uploadedBy: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        permissions: {
          include: {
            user: { select: { id: true, name: true, avatar: true, email: true } },
            grantedBy: { select: { id: true, name: true } },
          },
        },
        versions: {
          select: {
            id: true,
            version: true,
            title: true,
            changeNote: true,
            createdAt: true,
            savedBy: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { version: 'desc' },
          take: 10,
        },
      },
    });

    if (!doc || doc.deletedAt) {
      throw new NotFoundException('Tài liệu không tồn tại hoặc đã bị xóa');
    }

    const canView = await this.accessService.canViewDocument(doc, actor);
    if (!canView) {
      throw new ForbiddenException('Bạn không có quyền xem tài liệu này');
    }

    // Increment viewCount asynchronously
    await this.prisma.document.update({
      where: { id },
      data: {
        viewCount: { increment: 1 },
        lastViewedAt: new Date(),
      },
    });

    const canEdit = await this.accessService.canEditDocument(doc, actor);
    const canDelete = await this.accessService.canDeleteDocument(doc, actor);

    return {
      ...doc,
      canEdit,
      canDelete,
    };
  }

  /**
   * 4. Update document (with optional version archiving)
   */
  async update(id: string, dto: UpdateDocumentDto, actor: CurrentActor) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
    });
    if (!doc || doc.deletedAt) {
      throw new NotFoundException('Tài liệu không tồn tại');
    }

    const canEdit = await this.accessService.canEditDocument(doc, actor);
    if (!canEdit) {
      throw new ForbiddenException('Bạn không có quyền chỉnh sửa tài liệu này');
    }

    const nextPlainText =
      dto.contentText !== undefined
        ? dto.contentText.trim()
        : dto.content !== undefined
          ? extractTextFromTiptap(dto.content)
          : doc.contentText;

    let newVersion = doc.currentVersion;

    if (dto.saveVersion) {
      newVersion = doc.currentVersion + 1;
      await this.prisma.documentVersion.create({
        data: {
          documentId: id,
          version: newVersion,
          title: dto.title ?? doc.title,
          content: ((dto.content ?? doc.content) ?? { type: 'doc', content: [] }) as Prisma.InputJsonValue,
          contentText: nextPlainText,
          changeNote: dto.changeNote || `Cập nhật phiên bản v${newVersion}`,
          savedById: actor.id,
        },
      });
    }

    const updated = await this.prisma.document.update({
      where: { id },
      data: {
        ...(dto.title !== undefined ? { title: dto.title } : {}),
        ...(dto.content !== undefined ? { content: dto.content as Prisma.InputJsonValue } : {}),
        contentText: nextPlainText,
        ...(dto.scope !== undefined ? { scope: dto.scope } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.projectId !== undefined ? { projectId: dto.projectId } : {}),
        ...(dto.departmentId !== undefined ? { departmentId: dto.departmentId } : {}),
        ...(dto.linkedTaskId !== undefined ? { linkedTaskId: dto.linkedTaskId } : {}),
        ...(dto.linkedMeetingId !== undefined ? { linkedMeetingId: dto.linkedMeetingId } : {}),
        ...(dto.parentId !== undefined ? { parentId: dto.parentId } : {}),
        ...(dto.tags !== undefined ? { tags: dto.tags } : {}),
        currentVersion: newVersion,
        updatedById: actor.id,
      },
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        updatedBy: { select: { id: true, name: true, avatar: true } },
      },
    });

    return updated;
  }

  /**
   * 5. Delete document (soft delete)
   */
  async remove(id: string, actor: CurrentActor) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
    });
    if (!doc || doc.deletedAt) {
      throw new NotFoundException('Tài liệu không tồn tại');
    }

    const canDelete = await this.accessService.canDeleteDocument(doc, actor);
    if (!canDelete) {
      throw new ForbiddenException('Bạn không có quyền xóa tài liệu này');
    }

    await this.prisma.document.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { success: true, message: 'Đã xóa tài liệu' };
  }

  /**
   * 6. Get versions list
   */
  async getVersions(id: string, actor: CurrentActor) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc || doc.deletedAt) throw new NotFoundException('Tài liệu không tồn tại');

    const canView = await this.accessService.canViewDocument(doc, actor);
    if (!canView) throw new ForbiddenException('Không có quyền xem lịch sử phiên bản');

    return this.prisma.documentVersion.findMany({
      where: { documentId: id },
      include: {
        savedBy: { select: { id: true, name: true, avatar: true } },
      },
      orderBy: { version: 'desc' },
    });
  }

  /**
   * 7. Get specific version content
   */
  async getVersion(id: string, version: number, actor: CurrentActor) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc || doc.deletedAt) throw new NotFoundException('Tài liệu không tồn tại');

    const canView = await this.accessService.canViewDocument(doc, actor);
    if (!canView) throw new ForbiddenException('Không có quyền xem phiên bản');

    const versionRecord = await this.prisma.documentVersion.findUnique({
      where: {
        documentId_version: {
          documentId: id,
          version,
        },
      },
      include: {
        savedBy: { select: { id: true, name: true, avatar: true } },
      },
    });

    if (!versionRecord) {
      throw new NotFoundException(`Phiên bản v${version} không tồn tại`);
    }

    return versionRecord;
  }

  /**
   * 8. Restore document to specific version
   */
  async restoreVersion(id: string, version: number, actor: CurrentActor) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc || doc.deletedAt) throw new NotFoundException('Tài liệu không tồn tại');

    const canEdit = await this.accessService.canEditDocument(doc, actor);
    if (!canEdit) throw new ForbiddenException('Bạn không có quyền khôi phục phiên bản');

    const targetVersion = await this.prisma.documentVersion.findUnique({
      where: {
        documentId_version: {
          documentId: id,
          version,
        },
      },
    });
    if (!targetVersion) {
      throw new NotFoundException(`Phiên bản v${version} không tồn tại`);
    }

    const nextVersion = doc.currentVersion + 1;

    // Create a new version representing the restoration
    await this.prisma.documentVersion.create({
      data: {
        documentId: id,
        version: nextVersion,
        title: targetVersion.title,
        content: targetVersion.content as Prisma.InputJsonValue,
        contentText: targetVersion.contentText,
        changeNote: `Khôi phục từ phiên bản v${version}`,
        savedById: actor.id,
      },
    });

    return this.prisma.document.update({
      where: { id },
      data: {
        title: targetVersion.title,
        content: targetVersion.content as Prisma.InputJsonValue,
        contentText: targetVersion.contentText,
        currentVersion: nextVersion,
        updatedById: actor.id,
      },
      include: {
        owner: { select: { id: true, name: true, avatar: true } },
        updatedBy: { select: { id: true, name: true, avatar: true } },
      },
    });
  }

  /**
   * 9. Get recent documents
   */
  async getRecent(actor: CurrentActor, limit: number = 10) {
    return this.findAll({ page: 1, limit, sortBy: 'updatedAt', sortOrder: 'desc' }, actor);
  }

  /**
   * 10. Get company documents (U5)
   */
  async getCompanyDocuments(actor: CurrentActor) {
    return this.findAll({ scope: DocumentScope.COMPANY, limit: 50, sortBy: 'updatedAt', sortOrder: 'desc' }, actor);
  }

  /**
   * 11. Get project documents (U3)
   */
  async getProjectDocuments(projectId: string, actor: CurrentActor) {
    return this.findAll({ projectId, limit: 50, sortBy: 'updatedAt', sortOrder: 'desc' }, actor);
  }

  /**
   * 12. Get task documents: specs (U1) & deliverables (U2)
   */
  async getTaskDocuments(taskId: string, actor: CurrentActor) {
    return this.findAll({ linkedTaskId: taskId, limit: 50, sortBy: 'createdAt', sortOrder: 'asc' }, actor);
  }

  /**
   * 13. Submit Task Deliverable (U2)
   */
  async submitTaskDeliverable(dto: SubmitTaskDeliverableDto, actor: CurrentActor) {
    const task = await this.prisma.task.findUnique({
      where: { id: dto.taskId },
      include: { project: true },
    });
    if (!task || task.deletedAt) {
      throw new NotFoundException('Task không tồn tại');
    }

    if (task.assigneeId !== actor.id && actor.role !== 'ADMIN' && actor.role !== 'PM') {
      throw new ForbiddenException('Chỉ người được giao việc mới có thể nộp bằng chứng hoàn thành');
    }

    return this.create(
      {
        title: dto.title,
        content: dto.content,
        contentText: dto.note || '',
        scope: DocumentScope.PROJECT,
        type: DocumentType.TASK_SUBMISSION,
        projectId: task.projectId,
        linkedTaskId: task.id,
        tags: dto.tags,
      },
      actor,
    );
  }

  /**
   * 14. Get meeting documents (U4)
   */
  async getMeetingDocuments(meetingId: string, actor: CurrentActor) {
    return this.findAll({ linkedMeetingId: meetingId, limit: 20 }, actor);
  }

  /**
   * 15. Create Document from Template
   */
  async createFromTemplate(dto: CreateFromTemplateDto, actor: CurrentActor) {
    const template = await this.templatesService.getTemplateByKey(dto.templateKey);

    return this.create(
      {
        title: dto.title,
        content: template.content,
        contentText: extractTextFromTiptap(template.content),
        scope: dto.scope,
        type: DocumentType.STANDARD,
        projectId: dto.projectId,
        departmentId: dto.departmentId,
        linkedTaskId: dto.linkedTaskId,
        linkedMeetingId: dto.linkedMeetingId,
        templateKey: dto.templateKey,
        tags: [dto.templateKey],
      },
      actor,
    );
  }

  /**
   * 16. Share document with a user
   */
  async shareDocument(id: string, dto: ShareDocumentDto, actor: CurrentActor) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc || doc.deletedAt) throw new NotFoundException('Tài liệu không tồn tại');

    if (doc.ownerId !== actor.id && actor.role !== 'ADMIN') {
      throw new ForbiddenException('Chỉ chủ sở hữu hoặc Quản trị viên mới có quyền chia sẻ tài liệu');
    }

    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('Người dùng được chia sẻ không tồn tại');

    return this.prisma.documentPermission.upsert({
      where: {
        documentId_userId: {
          documentId: id,
          userId: dto.userId,
        },
      },
      create: {
        documentId: id,
        userId: dto.userId,
        canEdit: dto.canEdit,
        canComment: dto.canComment,
        canShare: dto.canShare,
        grantedById: actor.id,
      },
      update: {
        canEdit: dto.canEdit,
        canComment: dto.canComment,
        canShare: dto.canShare,
      },
      include: {
        user: { select: { id: true, name: true, avatar: true, email: true } },
      },
    });
  }

  /**
   * 17. Unshare document
   */
  async unshareDocument(id: string, userId: string, actor: CurrentActor) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc || doc.deletedAt) throw new NotFoundException('Tài liệu không tồn tại');

    if (doc.ownerId !== actor.id && actor.role !== 'ADMIN') {
      throw new ForbiddenException('Không có quyền gỡ bỏ quyền chia sẻ');
    }

    await this.prisma.documentPermission.deleteMany({
      where: { documentId: id, userId },
    });

    return { success: true, message: 'Đã gỡ quyền chia sẻ' };
  }

  /**
   * 18. Get shared users
   */
  async getShares(id: string, actor: CurrentActor) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc || doc.deletedAt) throw new NotFoundException('Tài liệu không tồn tại');

    const canView = await this.accessService.canViewDocument(doc, actor);
    if (!canView) throw new ForbiddenException('Không có quyền xem thông tin chia sẻ');

    return this.prisma.documentPermission.findMany({
      where: { documentId: id },
      include: {
        user: { select: { id: true, name: true, avatar: true, email: true } },
        grantedBy: { select: { id: true, name: true } },
      },
    });
  }
}
