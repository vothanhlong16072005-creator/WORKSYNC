import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class DocumentAiService {
  private readonly logger = new Logger(DocumentAiService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate an executive summary of a document using Gemini 1.5 Flash
   */
  async generateSummary(documentId: string): Promise<{ summary: string; keyPoints: string[]; provider: string }> {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
    });
    if (!doc) {
      throw new Error('Tài liệu không tồn tại');
    }

    const textToSummarize = doc.contentText || doc.title;

    // Check system config for Gemini API Key or env variable
    const systemConfig = await this.prisma.systemConfig.findFirst();
    const apiKey = systemConfig?.geminiApiKey || process.env.GEMINI_API_KEY;

    if (apiKey && textToSummarize.length > 20 && process.env.NODE_ENV !== 'test') {
      const candidateModels = [
        'gemini-3.5-flash-lite',
        'gemini-3.6-flash',
        'gemini-3.5-flash',
        'gemini-3.8-flash',
        'gemini-2.5-flash-lite',
        'gemini-1.5-flash',
      ];

      const prompt = `
Bạn là trợ lý AI chuyên nghiệp phân tích tài liệu doanh nghiệp. Hãy tóm tắt tài liệu sau đây bằng Tiếng Việt.
Định dạng câu trả lời:
- Đoạn tóm tắt tổng quan súc tích (1-2 câu).
- Danh sách 3-5 gạch đầu dòng các ý chính hoặc quyết định/hành động quan trọng nhất.

Tiêu đề tài liệu: ${doc.title}
Nội dung:
${textToSummarize.substring(0, 10000)}
`;

      const genAI = new GoogleGenerativeAI(apiKey);

      for (const modelName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent(prompt);
          const responseText = result.response.text().trim();

          // Save AI summary to document
          await this.prisma.document.update({
            where: { id: documentId },
            data: { aiSummary: responseText },
          });

          const lines = responseText.split('\n').filter((l) => l.trim().length > 0);
          const keyPoints = lines.filter((l) => l.startsWith('-') || l.startsWith('*') || /^\d+\./.test(l));

          return {
            summary: responseText,
            keyPoints,
            provider: modelName,
          };
        } catch (error) {
          this.logger.warn(`Model ${modelName} failed for document: ${(error as Error).message}. Trying next candidate...`);
        }
      }
    }

    // Heuristic Fallback Summary if Gemini is unavailable
    const fallbackSummary = this.generateFallbackSummary(doc.title, textToSummarize, !!apiKey);
    await this.prisma.document.update({
      where: { id: documentId },
      data: { aiSummary: fallbackSummary.summary },
    });

    return fallbackSummary;
  }

  private generateFallbackSummary(title: string, contentText: string, hasKey: boolean): { summary: string; keyPoints: string[]; provider: string } {
    const sentences = contentText
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 10);

    const prefix = hasKey
      ? '⚠️ [Fallback do kết nối Gemini gặp lỗi tạm thời]\n\n'
      : 'ℹ️ [Chế độ Heuristic Fallback — Để sử dụng trực tiếp mô hình Google Gemini 1.5 Flash Cloud, vui lòng thêm GEMINI_API_KEY vào backend/.env]\n\n';

    const rawSummary = sentences.slice(0, 2).join(' ') || `Tài liệu: ${title}. Chưa có đủ nội dung để tạo tóm tắt chi tiết.`;
    const summaryText = `${prefix}${rawSummary}`;
    const keyPoints = sentences.slice(0, 4).map((s) => `- ${s}`);

    return {
      summary: summaryText,
      keyPoints,
      provider: 'fallback-heuristic',
    };
  }
}
