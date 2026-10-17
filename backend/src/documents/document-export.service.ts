import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { jsPDF } from 'jspdf';
import { Document as DocxDocument, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';

@Injectable()
export class DocumentExportService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Export document to PDF Buffer
   */
  async exportToPdf(documentId: string): Promise<{ buffer: Buffer; fileName: string }> {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        owner: { select: { name: true } },
      },
    });
    if (!doc || doc.deletedAt) {
      throw new NotFoundException('Tài liệu không tồn tại');
    }

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    let cursorY = 20;

    // Header / Title
    pdf.setFontSize(18);
    pdf.text(doc.title, 14, cursorY);
    cursorY += 10;

    // Meta
    pdf.setFontSize(10);
    pdf.setTextColor(120, 120, 120);
    const metaText = `Tác giả: ${doc.owner.name} | Phiên bản: v${doc.currentVersion} | Ngày: ${doc.updatedAt.toLocaleDateString('vi-VN')}`;
    pdf.text(metaText, 14, cursorY);
    cursorY += 10;

    pdf.setDrawColor(220, 220, 220);
    pdf.line(14, cursorY, pageWidth - 14, cursorY);
    cursorY += 8;

    // Content
    pdf.setFontSize(11);
    pdf.setTextColor(30, 30, 30);

    const bodyText = doc.contentText || '(Tài liệu chưa có nội dung)';
    const splitLines = pdf.splitTextToSize(bodyText, pageWidth - 28);

    for (const line of splitLines) {
      if (cursorY > 280) {
        pdf.addPage();
        cursorY = 20;
      }
      pdf.text(line, 14, cursorY);
      cursorY += 6;
    }

    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'));
    const safeFileName = `${doc.title.replace(/[^a-zA-Z0-9_\u0600-\u06FF\u00C0-\u1EF9]/g, '_')}.pdf`;

    return {
      buffer: pdfBuffer,
      fileName: safeFileName,
    };
  }

  /**
   * Export document to DOCX Buffer
   */
  async exportToDocx(documentId: string): Promise<{ buffer: Buffer; fileName: string }> {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        owner: { select: { name: true } },
      },
    });
    if (!doc || doc.deletedAt) {
      throw new NotFoundException('Tài liệu không tồn tại');
    }

    const paragraphs: Paragraph[] = [
      new Paragraph({
        text: doc.title,
        heading: HeadingLevel.TITLE,
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: `Tác giả: ${doc.owner.name} | Phiên bản: v${doc.currentVersion} | Cập nhật: ${doc.updatedAt.toLocaleDateString('vi-VN')}`,
            italics: true,
            color: '666666',
            size: 20,
          }),
        ],
      }),
      new Paragraph({ text: '' }),
    ];

    const lines = (doc.contentText || '').split('\n').filter((l) => l.trim().length > 0);
    if (lines.length === 0) {
      paragraphs.push(new Paragraph({ text: '(Tài liệu chưa có nội dung văn bản)' }));
    } else {
      for (const line of lines) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: line, size: 24 })],
            spacing: { after: 120 },
          }),
        );
      }
    }

    const docx = new DocxDocument({
      sections: [
        {
          properties: {},
          children: paragraphs,
        },
      ],
    });

    const buffer = await Packer.toBuffer(docx);
    const safeFileName = `${doc.title.replace(/[^a-zA-Z0-9_\u0600-\u06FF\u00C0-\u1EF9]/g, '_')}.docx`;

    return {
      buffer,
      fileName: safeFileName,
    };
  }
}
