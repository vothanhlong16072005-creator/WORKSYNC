import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module.js';
import { DocumentsController } from './documents.controller.js';
import { DocumentsService } from './documents.service.js';
import { DocumentsAccessService } from './documents-access.service.js';
import { DocumentSearchService } from './document-search.service.js';
import { DocumentTemplatesService } from './document-templates.service.js';
import { DocumentAttachmentsService } from './document-attachments.service.js';
import { DocumentAiService } from './document-ai.service.js';
import { DocumentExportService } from './document-export.service.js';
import { DocumentsGateway } from './documents.gateway.js';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'worksync-secret-key-change-in-prod',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [DocumentsController],
  providers: [
    DocumentsService,
    DocumentsAccessService,
    DocumentSearchService,
    DocumentTemplatesService,
    DocumentAttachmentsService,
    DocumentAiService,
    DocumentExportService,
    DocumentsGateway,
  ],
  exports: [
    DocumentsService,
    DocumentsAccessService,
    DocumentAiService,
    DocumentTemplatesService,
  ],
})
export class DocumentsModule {}
