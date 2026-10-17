import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { DocumentsAccessService, CurrentActor } from './documents-access.service.js';
import * as fs from 'fs';
import * as path from 'path';

export interface ExpressUploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination?: string;
  filename?: string;
  path?: string;
  buffer?: Buffer;
}

@Injectable()
export class DocumentAttachmentsService {
  private readonly logger = new Logger(DocumentAttachmentsService.name);
  private readonly uploadDir = path.resolve(process.cwd(), 'uploads', 'documents');

  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: DocumentsAccessService,
  ) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Upload an attachment to a document
   */
  async uploadAttachment(
    documentId: string,
    file: ExpressUploadedFile,
    actor: CurrentActor,
  ) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!document || document.deletedAt) {
      throw new NotFoundException('Tài liệu không tồn tại');
    }

    const canEdit = await this.accessService.canEditDocument(document, actor);
    if (!canEdit) {
      throw new ForbiddenException('Bạn không có quyền đính kèm file vào tài liệu này');
    }

    const safeFilename = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const targetPath = path.join(this.uploadDir, safeFilename);

    if (file.buffer) {
      await fs.promises.writeFile(targetPath, file.buffer);
    } else if (file.path) {
      await fs.promises.copyFile(file.path, targetPath);
    }

    const attachment = await this.prisma.documentAttachment.create({
      data: {
        documentId,
        fileName: file.originalname,
        fileSize: file.size,
        mimeType: file.mimetype,
        minioKey: safeFilename,
        minioBucket: 'worksync-documents',
        uploadedById: actor.id,
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, avatar: true },
        },
      },
    });

    return attachment;
  }

  /**
   * Get all attachments for a document
   */
  async getAttachments(documentId: string, actor: CurrentActor) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!document || document.deletedAt) {
      throw new NotFoundException('Tài liệu không tồn tại');
    }

    const canView = await this.accessService.canViewDocument(document, actor);
    if (!canView) {
      throw new ForbiddenException('Bạn không có quyền xem tài liệu này');
    }

    return this.prisma.documentAttachment.findMany({
      where: { documentId },
      include: {
        uploadedBy: {
          select: { id: true, name: true, avatar: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get attachment file stream info
   */
  async getAttachmentFile(attachmentId: string, actor: CurrentActor) {
    const attachment = await this.prisma.documentAttachment.findUnique({
      where: { id: attachmentId },
      include: { document: true },
    });
    if (!attachment || !attachment.document || attachment.document.deletedAt) {
      throw new NotFoundException('File đính kèm không tồn tại');
    }

    const canView = await this.accessService.canViewDocument(attachment.document, actor);
    if (!canView) {
      throw new ForbiddenException('Bạn không có quyền truy cập file này');
    }

    const filePath = path.join(this.uploadDir, attachment.minioKey);
    if (!fs.existsSync(filePath)) {
      throw new NotFoundException('File không tìm thấy trên hệ thống lưu trữ');
    }

    return {
      filePath,
      fileName: attachment.fileName,
      mimeType: attachment.mimeType,
      fileSize: attachment.fileSize,
    };
  }

  /**
   * Delete an attachment
   */
  async deleteAttachment(attachmentId: string, actor: CurrentActor) {
    const attachment = await this.prisma.documentAttachment.findUnique({
      where: { id: attachmentId },
      include: { document: true },
    });
    if (!attachment || !attachment.document) {
      throw new NotFoundException('File đính kèm không tồn tại');
    }

    const canEdit = await this.accessService.canEditDocument(attachment.document, actor);
    if (!canEdit && attachment.uploadedById !== actor.id) {
      throw new ForbiddenException('Bạn không có quyền xóa file này');
    }

    const filePath = path.join(this.uploadDir, attachment.minioKey);
    if (fs.existsSync(filePath)) {
      try {
        await fs.promises.unlink(filePath);
      } catch (err) {
        this.logger.warn(`Failed to unlink file ${filePath}: ${(err as Error).message}`);
      }
    }

    await this.prisma.documentAttachment.delete({
      where: { id: attachmentId },
    });

    return { success: true, message: 'Đã xóa file đính kèm' };
  }
}
