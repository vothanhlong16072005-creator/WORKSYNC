import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Res,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ZodSchema } from 'zod';
import * as fs from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { DocumentsService } from './documents.service.js';
import { DocumentSearchService } from './document-search.service.js';
import { DocumentTemplatesService, CreateTemplateInput } from './document-templates.service.js';
import { DocumentAttachmentsService, ExpressUploadedFile } from './document-attachments.service.js';
import { DocumentAiService } from './document-ai.service.js';
import { DocumentExportService } from './document-export.service.js';
import type { CurrentActor } from './documents-access.service.js';
import { CreateDocumentSchema } from './dto/create-document.dto.js';
import { UpdateDocumentSchema } from './dto/update-document.dto.js';
import { DocumentQuerySchema } from './dto/document-query.dto.js';
import { CreateFromTemplateSchema } from './dto/create-from-template.dto.js';
import { SubmitTaskDeliverableSchema } from './dto/submit-task-deliverable.dto.js';
import { ShareDocumentSchema } from './dto/share-document.dto.js';
import { DocumentScope } from '@prisma/client';

function parseOrThrow<T>(schema: ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const firstIssue = result.error.issues[0];
    const path = firstIssue?.path?.join('.') ?? 'body';
    const msg = firstIssue?.message ?? 'Invalid request body';
    throw new BadRequestException(`[${path}] ${msg}`);
  }
  return result.data;
}

@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly searchService: DocumentSearchService,
    private readonly templatesService: DocumentTemplatesService,
    private readonly attachmentsService: DocumentAttachmentsService,
    private readonly aiService: DocumentAiService,
    private readonly exportService: DocumentExportService,
  ) {}

  // ========================================================
  // 1. Static / Pre-ID GET & Search Endpoints
  // ========================================================

  @Get()
  findAll(@Query() query: unknown, @CurrentUser() actor: CurrentActor) {
    const parsed = parseOrThrow(DocumentQuerySchema, query);
    return this.documentsService.findAll(parsed, actor);
  }

  @Get('recent')
  getRecent(@Query('limit') limit: string, @CurrentUser() actor: CurrentActor) {
    return this.documentsService.getRecent(actor, limit ? parseInt(limit, 10) : 10);
  }

  @Get('company')
  getCompanyDocuments(@CurrentUser() actor: CurrentActor) {
    return this.documentsService.getCompanyDocuments(actor);
  }

  @Get('project/:projectId')
  getProjectDocuments(@Param('projectId') projectId: string, @CurrentUser() actor: CurrentActor) {
    return this.documentsService.getProjectDocuments(projectId, actor);
  }

  @Get('task/:taskId')
  getTaskDocuments(@Param('taskId') taskId: string, @CurrentUser() actor: CurrentActor) {
    return this.documentsService.getTaskDocuments(taskId, actor);
  }

  @Get('meeting/:meetingId')
  getMeetingDocuments(@Param('meetingId') meetingId: string, @CurrentUser() actor: CurrentActor) {
    return this.documentsService.getMeetingDocuments(meetingId, actor);
  }

  @Get('search/fulltext')
  search(
    @Query('q') q: string,
    @Query('scope') scope: DocumentScope,
    @Query('projectId') projectId: string,
    @Query('departmentId') departmentId: string,
    @Query('tag') tag: string,
    @Query('limit') limit: string,
    @CurrentUser() actor: CurrentActor,
  ) {
    return this.searchService.search(
      {
        q,
        scope,
        projectId,
        departmentId,
        tag,
        limit: limit ? parseInt(limit, 10) : 20,
      },
      actor,
    );
  }

  @Get('templates/all')
  getAllTemplates() {
    return this.templatesService.getAllTemplates();
  }

  @Post('templates/create')
  createTemplate(@Body() body: unknown, @CurrentUser() actor: CurrentActor) {
    return this.templatesService.createTemplate(body as CreateTemplateInput, actor);
  }

  @Post('from-template')
  createFromTemplate(@Body() body: unknown, @CurrentUser() actor: CurrentActor) {
    const dto = parseOrThrow(CreateFromTemplateSchema, body);
    return this.documentsService.createFromTemplate(dto, actor);
  }

  @Post('task/submit')
  submitTaskDeliverable(@Body() body: unknown, @CurrentUser() actor: CurrentActor) {
    const dto = parseOrThrow(SubmitTaskDeliverableSchema, body);
    return this.documentsService.submitTaskDeliverable(dto, actor);
  }

  // ========================================================
  // 2. Attachments Standalone Download & Delete
  // ========================================================

  @Get('attachments/:attId/download')
  async downloadAttachment(
    @Param('attId') attId: string,
    @CurrentUser() actor: CurrentActor,
    @Res() res: Response,
  ) {
    const fileInfo = await this.attachmentsService.getAttachmentFile(attId, actor);
    const stat = fs.statSync(fileInfo.filePath);
    res.setHeader('Content-Type', fileInfo.mimeType || 'application/octet-stream');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(fileInfo.fileName)}"`,
    );
    res.setHeader('Content-Length', stat.size);
    const stream = fs.createReadStream(fileInfo.filePath);
    stream.pipe(res);
  }

  @Delete('attachments/:attId')
  deleteAttachment(@Param('attId') attId: string, @CurrentUser() actor: CurrentActor) {
    return this.attachmentsService.deleteAttachment(attId, actor);
  }

  // ========================================================
  // 3. Document CRUD & Details
  // ========================================================

  @Post()
  create(@Body() body: unknown, @CurrentUser() actor: CurrentActor) {
    const dto = parseOrThrow(CreateDocumentSchema, body);
    return this.documentsService.create(dto, actor);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() actor: CurrentActor) {
    return this.documentsService.findOne(id, actor);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() actor: CurrentActor,
  ) {
    const dto = parseOrThrow(UpdateDocumentSchema, body);
    return this.documentsService.update(id, dto, actor);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() actor: CurrentActor) {
    return this.documentsService.remove(id, actor);
  }

  // ========================================================
  // 4. Versioning Endpoints
  // ========================================================

  @Get(':id/versions')
  getVersions(@Param('id') id: string, @CurrentUser() actor: CurrentActor) {
    return this.documentsService.getVersions(id, actor);
  }

  @Get(':id/versions/:version')
  getVersion(
    @Param('id') id: string,
    @Param('version', ParseIntPipe) version: number,
    @CurrentUser() actor: CurrentActor,
  ) {
    return this.documentsService.getVersion(id, version, actor);
  }

  @Post(':id/versions/:version/restore')
  restoreVersion(
    @Param('id') id: string,
    @Param('version', ParseIntPipe) version: number,
    @CurrentUser() actor: CurrentActor,
  ) {
    return this.documentsService.restoreVersion(id, version, actor);
  }

  // ========================================================
  // 5. Attachments Upload & List per Document
  // ========================================================

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file'))
  uploadAttachment(
    @Param('id') id: string,
    @UploadedFile() file: any,
    @CurrentUser() actor: CurrentActor,
  ) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn file cần tải lên');
    }
    return this.attachmentsService.uploadAttachment(id, file, actor);
  }

  @Get(':id/attachments')
  getAttachments(@Param('id') id: string, @CurrentUser() actor: CurrentActor) {
    return this.attachmentsService.getAttachments(id, actor);
  }

  // ========================================================
  // 6. AI Summary & Export
  // ========================================================

  @Post(':id/ai-summary')
  generateAiSummary(@Param('id') id: string) {
    return this.aiService.generateSummary(id);
  }

  @Get(':id/export/pdf')
  async exportPdf(@Param('id') id: string, @Res() res: Response) {
    const { buffer, fileName } = await this.exportService.exportToPdf(id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(buffer);
  }

  @Get(':id/export/docx')
  async exportDocx(@Param('id') id: string, @Res() res: Response) {
    const { buffer, fileName } = await this.exportService.exportToDocx(id);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
    res.send(buffer);
  }

  // ========================================================
  // 7. Sharing & Permissions
  // ========================================================

  @Post(':id/share')
  shareDocument(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() actor: CurrentActor,
  ) {
    const dto = parseOrThrow(ShareDocumentSchema, body);
    return this.documentsService.shareDocument(id, dto, actor);
  }

  @Delete(':id/share/:userId')
  unshareDocument(
    @Param('id') id: string,
    @Param('userId') userId: string,
    @CurrentUser() actor: CurrentActor,
  ) {
    return this.documentsService.unshareDocument(id, userId, actor);
  }

  @Get(':id/share')
  getShares(@Param('id') id: string, @CurrentUser() actor: CurrentActor) {
    return this.documentsService.getShares(id, actor);
  }
}
