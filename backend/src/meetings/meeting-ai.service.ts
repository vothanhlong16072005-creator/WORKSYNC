/**
 * MeetingAiService — Module M5.1
 * Reference: docs/M5.1-MEETING-AI-SUMMARY-PLAN.md
 *
 * Sinh AI summary (Summary + Action Items + Decisions + Risks/Q&A) từ MeetingMinute.content
 * dùng Google Gemini 1.5 Flash. Có fallback heuristic khi API fail.
 */
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../prisma/prisma.service.js';

export interface ActionItem {
  task: string;
  assignee?: string | null;
  deadline?: string | null;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence?: number;
}

export interface MeetingSummaryResult {
  summary: string;
  actionItems: ActionItem[];
  decisions: string[];
  risksAndQuestions: {
    risks: string[];
    openQuestions: string[];
  };
  model: string;
  tokensUsed?: number;
  generatedAt: Date;
}

@Injectable()
export class MeetingAiService {
  private readonly logger = new Logger(MeetingAiService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sinh AI summary cho meeting (Full extraction)
   * @throws NotFoundException nếu meeting hoặc minute không tồn tại
   * @throws BadRequestException nếu content quá ngắn (< 50 chars)
   */
  async generateSummary(meetingId: string): Promise<MeetingSummaryResult> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        minutes: true,
        attendees: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    if (!meeting) {
      throw new NotFoundException(`Cuộc họp ${meetingId} không tồn tại`);
    }
    if (!meeting.minutes) {
      throw new NotFoundException(`Chưa có biên bản cho cuộc họp ${meetingId}`);
    }

    const content = meeting.minutes.content;
    if (content.trim().length < 50) {
      throw new BadRequestException('Biên bản quá ngắn để tóm tắt (cần ≥ 50 ký tự)');
    }

    // Lấy API key từ system config hoặc env
    const systemConfig = await this.prisma.systemConfig.findFirst();
    const apiKey = systemConfig?.geminiApiKey || process.env.GEMINI_API_KEY;

    let result: MeetingSummaryResult;

    if (apiKey) {
      try {
        result = await this.callGemini(apiKey, content, {
          title: meeting.title,
          attendees: meeting.attendees.map(a => a.user),
        });
      } catch (error) {
        this.logger.warn(
          `Gemini API failed for meeting ${meetingId}: ${(error as Error).message}. Using heuristic fallback.`,
        );
        result = this.generateHeuristicSummary(content, {
          title: meeting.title,
          attendees: meeting.attendees.map(a => a.user),
        });
      }
    } else {
      this.logger.debug(`No Gemini API key, using heuristic for meeting ${meetingId}`);
      result = this.generateHeuristicSummary(content, {
        title: meeting.title,
        attendees: meeting.attendees.map(a => a.user),
      });
    }

    // Save to DB
    await this.saveSummary(meetingId, result);

    // Update linked Document (M6 U4) nếu có
    await this.updateLinkedDocumentSummary(meetingId, result.summary);

    return result;
  }

  /**
   * Lấy cached AI summary (không generate mới)
   */
  async getSummary(meetingId: string): Promise<MeetingSummaryResult | null> {
    const minute = await this.prisma.meetingMinute.findUnique({
      where: { meetingId },
      select: {
        aiSummary: true,
        actionItems: true,
        decisions: true,
        risksAndQuestions: true,
        aiGeneratedAt: true,
        aiModel: true,
        aiTokensUsed: true,
      },
    });

    if (!minute || !minute.aiSummary) return null;

    return {
      summary: minute.aiSummary,
      actionItems: (minute.actionItems as unknown as ActionItem[]) || [],
      decisions: (minute.decisions as unknown as string[]) || [],
      risksAndQuestions: (minute.risksAndQuestions as unknown as { risks: string[]; openQuestions: string[] }) || {
        risks: [],
        openQuestions: [],
      },
      model: minute.aiModel || 'unknown',
      tokensUsed: minute.aiTokensUsed ?? undefined,
      generatedAt: minute.aiGeneratedAt || new Date(),
    };
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private async callGemini(
    apiKey: string,
    content: string,
    meeting: { title: string; attendees: Array<{ name: string; email: string }> },
  ): Promise<MeetingSummaryResult> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
        maxOutputTokens: 2048,
      },
    });

    const attendees = meeting.attendees.map(a => a.name).join(', ');

    const prompt = `Bạn là trợ lý AI chuyên phân tích biên bản cuộc họp doanh nghiệp. Hãy phân tích biên bản sau và trả về JSON hợp lệ với cấu trúc chính xác:

{
  "summary": "Tóm tắt tổng quan 3-5 đoạn văn ngắn gọn, súc tích, bằng Tiếng Việt",
  "actionItems": [
    {
      "task": "Mô tả công việc cần làm (bắt buộc, rõ ràng)",
      "assignee": "Tên người phụ trách (nếu đề cập trong biên bản, nếu không thì null)",
      "deadline": "YYYY-MM-DD (nếu đề cập deadline cụ thể, nếu không thì null)",
      "priority": "HIGH | MEDIUM | LOW (đánh giá theo ngôn ngữ và mức độ quan trọng)",
      "confidence": 0.0-1.0 (độ tin cậy khi parse action item này)
    }
  ],
  "decisions": ["Quyết định quan trọng 1", "Quyết định quan trọng 2"],
  "risksAndQuestions": {
    "risks": ["Rủi ro 1", "Rủi ro 2"],
    "openQuestions": ["Câu hỏi chưa giải quyết 1"]
  }
}

Quy tắc quan trọng:
- Action items: chỉ trích xuất task CỤ THỂ có người phụ trách hoặc deadline rõ ràng, bỏ qua câu chung chung
- Decisions: các quyết định đã được đồng ý/thống nhất trong cuộc họp
- Risks: rủi ro được nêu rõ trong cuộc họp
- Open Questions: câu hỏi chưa có câu trả lời cuối cùng
- Nếu không có dữ liệu cho section nào, trả về mảng rỗng []
- Sử dụng Tiếng Việt trong toàn bộ output
- Deadline phải là ISO date format YYYY-MM-DD nếu có

Thông tin cuộc họp:
- Tiêu đề: ${meeting.title}
- Thành viên tham dự: ${attendees}

Nội dung biên bản:
"""
${content.substring(0, 15000)}
"""

Trả về JSON hợp lệ, KHÔNG kèm markdown code block, KHÔNG kèm giải thích.`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    const parsed = JSON.parse(responseText) as {
      summary?: string;
      actionItems?: ActionItem[];
      decisions?: string[];
      risksAndQuestions?: { risks?: string[]; openQuestions?: string[] };
    };

    // Validate structure (defensive — Gemini đôi khi thiếu field)
    return {
      summary: parsed.summary || '',
      actionItems: Array.isArray(parsed.actionItems) ? parsed.actionItems : [],
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
      risksAndQuestions: {
        risks: Array.isArray(parsed.risksAndQuestions?.risks) ? parsed.risksAndQuestions.risks : [],
        openQuestions: Array.isArray(parsed.risksAndQuestions?.openQuestions)
          ? parsed.risksAndQuestions.openQuestions
          : [],
      },
      model: 'gemini-1.5-flash',
      tokensUsed: result.response.usageMetadata?.totalTokenCount,
      generatedAt: new Date(),
    };
  }

  private generateHeuristicSummary(
    content: string,
    meeting: { title: string; attendees: Array<{ name: string; email: string }> },
  ): MeetingSummaryResult {
    // Tách câu
    const sentences = content
      .split(/(?<=[.!?])\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 15);

    const summary = sentences.slice(0, 5).join(' ') || `Cuộc họp "${meeting.title}" với ${meeting.attendees.length} thành viên. Xem chi tiết trong biên bản.`;

    // Detect action items: pattern "Tên + động từ + nội dung"
    const actionItemRegex = /([A-ZÀ-Ỹ][a-zà-ỹ]+(?:\s+[A-ZÀ-Ỹ][a-zà-ỹ]+){0,3})\s+(sẽ|được giao|phụ trách|nhận|lo|cần|phải|đảm nhận)\s+([^.!?\n]{10,200})/g;
    const actionItems: ActionItem[] = [];
    let match: RegExpExecArray | null;
    while ((match = actionItemRegex.exec(content)) !== null) {
      actionItems.push({
        task: match[3].trim(),
        assignee: match[1].trim(),
        confidence: 0.5,
        priority: 'MEDIUM',
      });
      if (actionItems.length >= 10) break; // Cap
    }

    // Detect decisions bằng keyword
    const decisionKeywords = ['quyết định', 'thống nhất', 'đồng ý', 'sẽ chọn', 'sẽ dùng', 'sẽ áp dụng'];
    const decisions: string[] = [];
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      if (decisionKeywords.some(kw => lower.includes(kw))) {
        decisions.push(sentence);
        if (decisions.length >= 5) break;
      }
    }

    // Detect risks
    const riskKeywords = ['rủi ro', 'nguy cơ', 'có thể delay', 'có thể trễ', 'khó khăn'];
    const risks: string[] = [];
    for (const sentence of sentences) {
      if (riskKeywords.some(kw => sentence.toLowerCase().includes(kw))) {
        risks.push(sentence);
        if (risks.length >= 3) break;
      }
    }

    return {
      summary,
      actionItems,
      decisions,
      risksAndQuestions: { risks, openQuestions: [] },
      model: 'fallback-heuristic',
      generatedAt: new Date(),
    };
  }

  private async saveSummary(meetingId: string, result: MeetingSummaryResult): Promise<void> {
    await this.prisma.meetingMinute.update({
      where: { meetingId },
      data: {
        aiSummary: result.summary,
        actionItems: result.actionItems as unknown as object,
        decisions: result.decisions as unknown as object,
        risksAndQuestions: result.risksAndQuestions as unknown as object,
        aiGeneratedAt: result.generatedAt,
        aiModel: result.model,
        aiTokensUsed: result.tokensUsed ?? null,
      },
    });
  }

  /**
   * Update linked Document (M6 U4) với summary
   * Best-effort, không block nếu fail
   */
  private async updateLinkedDocumentSummary(meetingId: string, summary: string): Promise<void> {
    try {
      const linkedDoc = await this.prisma.document.findFirst({
        where: { linkedMeetingId: meetingId, deletedAt: null },
      });
      if (linkedDoc && !linkedDoc.aiSummary) {
        await this.prisma.document.update({
          where: { id: linkedDoc.id },
          data: { aiSummary: summary },
        });
        this.logger.debug(`Updated linked Document ${linkedDoc.id} with AI summary`);
      }
    } catch (err) {
      this.logger.warn(`Failed to update linked Document: ${(err as Error).message}`);
    }
  }
}
