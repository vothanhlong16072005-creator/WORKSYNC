/**
 * MeetingAiService — Module M5.1
 * Reference: docs/M5.1-MEETING-AI-SUMMARY-PLAN.md
 *
 * Sinh AI summary (Summary + Action Items + Decisions + Risks/Q&A) từ:
 * 1. Live Transcript Chunks (MeetingTranscriptChunk) từ Web Speech API streaming
 * 2. Fallback sang MeetingMinute.content nếu chưa có chunks
 * Tích hợp Gemini 1.5 Flash (1M tokens context), hỗ trợ VI/EN, ánh xạ chính xác assigneeId,
 * và tự động xuất tài liệu sang Document (ClickUp Docs).
 */
import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { PrismaService } from '../prisma/prisma.service.js';

export interface ActionItem {
  task: string;
  assignee?: string | null;
  assigneeId?: string | null;
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
  rawTranscript?: string | null;
}

export interface ParticipantInfo {
  id: string;
  name: string;
  email: string;
  role?: string;
}

@Injectable()
export class MeetingAiService {
  private readonly logger = new Logger(MeetingAiService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sinh AI summary cho meeting (Full extraction từ Live Transcript hoặc Minutes)
   * @param meetingId ID cuộc họp
   * @param options Tùy chọn ngôn ngữ (VI | EN)
   */
  async generateSummary(
    meetingId: string,
    options?: { language?: 'VI' | 'EN' },
  ): Promise<MeetingSummaryResult> {
    const language = options?.language || 'VI';

    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        minutes: true,
        attendees: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
    });

    if (!meeting) {
      throw new NotFoundException(`Cuộc họp ${meetingId} không tồn tại`);
    }

    // 1. Lấy toàn bộ các transcript chunks được stream từ Web Speech API
    const chunks = await this.prisma.meetingTranscriptChunk.findMany({
      where: { meetingId },
      orderBy: { timestamp: 'asc' },
    });

    let transcriptText = '';
    if (chunks.length > 0) {
      // Ghép toàn bộ kịch bản có cấu trúc [HH:mm:ss] Tên: Lời nói
      transcriptText = chunks
        .map((c) => {
          const time = new Date(c.timestamp).toTimeString().split(' ')[0];
          return `[${time}] ${c.speakerName}: ${c.text}`;
        })
        .join('\n');

      // Đảm bảo meetingMinute tồn tại và lưu trữ rawTranscript
      await this.prisma.meetingMinute.upsert({
        where: { meetingId },
        create: {
          meetingId,
          content: transcriptText,
          rawTranscript: transcriptText,
          isTranscribing: false,
        },
        update: {
          rawTranscript: transcriptText,
          isTranscribing: false,
        },
      });
    }

    // Nguồn văn bản ưu tiên transcriptText từ giọng nói, fallback sang minutes.content
    const sourceContent = transcriptText || meeting.minutes?.content || '';

    if (sourceContent.trim().length < 30) {
      throw new BadRequestException(
        'Chưa có dữ liệu lời thoại được ghi lại từ cuộc họp. Vui lòng bật mic, bấm "Bắt đầu ghi AI" và phát biểu để hệ thống nhận diện giọng nói trước khi tạo biên bản.',
      );
    }

    const participants: ParticipantInfo[] = meeting.attendees.map((a) => ({
      id: a.user.id,
      name: a.user.name,
      email: a.user.email,
      role: a.user.role,
    }));

    // Lấy API key từ systemConfig hoặc process.env
    const systemConfig = await this.prisma.systemConfig.findFirst();
    const apiKey = systemConfig?.geminiApiKey || process.env.GEMINI_API_KEY;

    let result: MeetingSummaryResult;

    if (apiKey && apiKey !== 'your_gemini_api_key_here_paste_here' && process.env.NODE_ENV !== 'test') {
      try {
        result = await this.callGemini(apiKey, sourceContent, {
          title: meeting.title,
          participants,
          language,
        });
      } catch (error) {
        this.logger.warn(
          `Gemini API failed for meeting ${meetingId}: ${(error as Error).message}. Using heuristic fallback.`,
        );
        result = this.generateHeuristicSummary(sourceContent, {
          title: meeting.title,
          participants,
          language,
        });
      }
    } else {
      this.logger.debug(`No valid Gemini API key, using heuristic for meeting ${meetingId}`);
      result = this.generateHeuristicSummary(sourceContent, {
        title: meeting.title,
        participants,
        language,
      });
    }

    result.rawTranscript = transcriptText || null;

    // Save to DB
    await this.saveSummary(meetingId, result);

    // Cập nhật Document liên kết nếu đã có
    await this.updateLinkedDocumentSummary(meetingId, result.summary);

    return result;
  }

  /**
   * Lấy cached AI summary
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
        rawTranscript: true,
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
      rawTranscript: minute.rawTranscript,
    };
  }

  /**
   * Lấy toàn bộ transcript chunks đã được ghi
   */
  async getTranscripts(meetingId: string) {
    return this.prisma.meetingTranscriptChunk.findMany({
      where: { meetingId },
      orderBy: { timestamp: 'asc' },
    });
  }

  /**
   * Tự động xuất biên bản AI thành tài liệu mới trong bảng Document (ClickUp Docs)
   * Constraint 3
   */
  async exportToDocument(meetingId: string, userId: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        minutes: true,
        project: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
      },
    });

    if (!meeting) {
      throw new NotFoundException(`Cuộc họp ${meetingId} không tồn tại`);
    }

    // Kiểm tra xem đã xuất tài liệu cho cuộc họp này chưa
    const existingDoc = await this.prisma.document.findFirst({
      where: { linkedMeetingId: meetingId, deletedAt: null },
    });

    if (existingDoc) {
      return existingDoc;
    }

    const minute = meeting.minutes;
    const summary = minute?.aiSummary || 'Chưa có tóm tắt AI';
    const decisions = (minute?.decisions as unknown as string[]) || [];
    const actionItems = (minute?.actionItems as unknown as ActionItem[]) || [];
    const risksAndQ = (minute?.risksAndQuestions as unknown as { risks?: string[]; openQuestions?: string[] }) || {};

    // Xây dựng nội dung plain text
    const contentText = [
      `BIÊN BẢN CUỘC HỌP: ${meeting.title.toUpperCase()}`,
      `Thời gian: ${meeting.startTime.toLocaleString('vi-VN')} - ${meeting.endTime.toLocaleString('vi-VN')}`,
      `\n1. TÓM TẮT ĐIỀU HÀNH (EXECUTIVE SUMMARY):\n${summary}`,
      `\n2. CÁC QUYẾT ĐỊNH ĐÃ THỐNG NHẤT (KEY DECISIONS):`,
      ...decisions.map((d, i) => `  ${i + 1}. ${d}`),
      `\n3. CÔNG VIỆC CẦN LÀM (ACTION ITEMS):`,
      ...actionItems.map(
        (a, i) =>
          `  ${i + 1}. [${a.priority || 'MEDIUM'}] ${a.task} - Người làm: ${a.assignee || 'Chưa gán'}${
            a.deadline ? ` (Hạn: ${a.deadline})` : ''
          }`,
      ),
      `\n4. RỦI RO & VẤN ĐỀ TỒN ĐỌNG:`,
      ...(risksAndQ.risks || []).map((r, i) => `  - Rủi ro ${i + 1}: ${r}`),
      ...(risksAndQ.openQuestions || []).map((q, i) => `  - Câu hỏi ${i + 1}: ${q}`),
      minute?.rawTranscript ? `\n5. PHỤ LỤC TOÀN VĂN LỜI THOẠI (TRANSCRIPT):\n${minute.rawTranscript}` : '',
    ].join('\n');

    // Cấu trúc Tiptap JSON đơn giản, hợp lệ
    const tiptapJson = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: `Biên bản cuộc họp: ${meeting.title}` }],
        },
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: `Thời gian: ${meeting.startTime.toLocaleString('vi-VN')} | Phạm vi: ${meeting.scopeType}`,
            },
          ],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: '1. Tóm tắt nội dung chính' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: summary }],
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: '2. Các quyết định đã thống nhất' }],
        },
        {
          type: 'bulletList',
          content: decisions.map((d) => ({
            type: 'listItem',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: d }] }],
          })),
        },
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text: '3. Danh sách công việc cần làm (Action Items)' }],
        },
        {
          type: 'bulletList',
          content: actionItems.map((a) => ({
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: `${a.task} — Phụ trách: ${a.assignee || 'N/A'}${a.deadline ? ` (Hạn: ${a.deadline})` : ''}`,
                  },
                ],
              },
            ],
          })),
        },
      ],
    };

    // Xác định scope của Document tương ứng với Meeting
    const docScope =
      meeting.scopeType === 'PROJECT' && meeting.projectId
        ? 'PROJECT'
        : meeting.scopeType === 'DEPARTMENT' && meeting.departmentId
        ? 'DEPARTMENT'
        : 'PERSONAL';

    const newDoc = await this.prisma.document.create({
      data: {
        title: `Biên bản: ${meeting.title}`,
        content: tiptapJson,
        contentText,
        scope: docScope,
        type: 'STANDARD',
        templateKey: 'meeting_minutes',
        ownerId: userId,
        createdById: userId,
        projectId: meeting.projectId,
        departmentId: meeting.departmentId,
        linkedMeetingId: meeting.id,
        aiSummary: summary,
        tags: ['meeting', 'ai-summary', 'minutes'],
      },
    });

    return newDoc;
  }

  // ============================================================
  // PRIVATE METHODS
  // ============================================================

  private async callGemini(
    apiKey: string,
    content: string,
    context: {
      title: string;
      participants: ParticipantInfo[];
      language: 'VI' | 'EN';
    },
  ): Promise<MeetingSummaryResult> {
    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = [
      'gemini-3.5-flash-lite',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.8-flash',
      'gemini-2.5-flash-lite',
      'gemini-1.5-flash',
    ];

    const isEnglish = context.language === 'EN';
    const participantsList = context.participants
      .map((p) => `- ID: "${p.id}" | Tên: "${p.name}" | Email: "${p.email}"`)
      .join('\n');

    const prompt = `Bạn là Trợ lý Thư ký AI Doanh nghiệp cấp cao của hệ thống WorkSync.
Nhiệm vụ của bạn là phân tích toàn bộ kịch bản lời thoại hoặc ghi chú cuộc họp dưới đây để tạo biên bản cuộc họp chuyên nghiệp, súc tích và có tính hành động cao.

Ngôn ngữ xuất kết quả: ${isEnglish ? 'English' : 'Tiếng Việt'}

Cấu trúc JSON yêu cầu trả về chính xác:
{
  "summary": "${isEnglish ? 'Executive summary in 3-5 concise paragraphs' : 'Tóm tắt điều hành toàn diện từ 3 đến 5 đoạn văn mạch lạc, súc tích, chuẩn văn phong doanh nghiệp'}",
  "actionItems": [
    {
      "task": "Mô tả công việc cụ thể cần thực hiện",
      "assignee": "Tên người phụ trách (nếu được đề cập, nếu không thì null)",
      "assigneeId": "ID người phụ trách khớp chính xác từ danh sách người tham gia dưới đây, nếu không khớp thì null",
      "deadline": "YYYY-MM-DD (nếu được đề cập ngày cụ thể, nếu không thì null)",
      "priority": "HIGH | MEDIUM | LOW",
      "confidence": 0.8
    }
  ],
  "decisions": ["Quyết định hoặc thống nhất quan trọng 1", "Quyết định 2"],
  "risksAndQuestions": {
    "risks": ["Rủi ro hoặc khó khăn kỹ thuật / tiến độ 1"],
    "openQuestions": ["Vấn đề hoặc câu hỏi thảo luận còn bỏ ngỏ chưa chốt"]
  }
}

DANH SÁCH NGƯỜI THAM GIA CUỘC HỌP (Dùng để đối chiếu gán assigneeId):
${participantsList}

QUY TẮC BẮT BUỘC:
1. "assigneeId": Khi trích xuất action item, hãy đối chiếu tên người phụ trách với danh sách người tham gia ở trên và trả về đúng trường "assigneeId" tương ứng.
2. "actionItems": Chỉ trích xuất các công việc hành động cụ thể, có mục tiêu rõ ràng.
3. "decisions": Các quyết định đã được các bên thống nhất trong buổi họp.
4. "summary": Phải bao quát được diễn biến chính, giải pháp đưa ra và kết luận.
5. Trả về định dạng JSON thuần, không bọc markdown block (\`\`\`json), không giải thích thêm.

THÔNG TIN CUỘC HỌP:
- Tiêu đề: ${context.title}

NỘI DUNG LỜI THOẠI / BIÊN BẢN:
"""
${content.substring(0, 45000)}
"""`;

    let lastError: Error | null = null;
    for (const modelName of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
            maxOutputTokens: 3000,
          },
        });

        const result = await model.generateContent(prompt);
        let responseText = result.response.text().trim();

        // Loại bỏ markdown code fence nếu có
        if (responseText.startsWith('```json')) {
          responseText = responseText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (responseText.startsWith('```')) {
          responseText = responseText.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        const parsed = JSON.parse(responseText) as {
          summary?: string;
          actionItems?: ActionItem[];
          decisions?: string[];
          risksAndQuestions?: { risks?: string[]; openQuestions?: string[] };
        };

        return {
          summary: parsed.summary || '',
          actionItems: Array.isArray(parsed.actionItems)
            ? parsed.actionItems.map((item) => {
                let matchedId = item.assigneeId;
                if (!matchedId && item.assignee) {
                  const matchedParticipant = context.participants.find(
                    (p) => p.name.toLowerCase() === item.assignee?.toLowerCase(),
                  );
                  matchedId = matchedParticipant?.id || null;
                }
                return {
                  ...item,
                  assigneeId: matchedId || null,
                };
              })
            : [],
          decisions: Array.isArray(parsed.decisions) ? parsed.decisions : [],
          risksAndQuestions: {
            risks: Array.isArray(parsed.risksAndQuestions?.risks) ? parsed.risksAndQuestions.risks : [],
            openQuestions: Array.isArray(parsed.risksAndQuestions?.openQuestions)
              ? parsed.risksAndQuestions.openQuestions
              : [],
          },
          model: modelName,
          tokensUsed: result.response.usageMetadata?.totalTokenCount,
          generatedAt: new Date(),
        };
      } catch (err) {
        lastError = err as Error;
        this.logger.warn(`Model ${modelName} call failed: ${(err as Error).message}. Trying next candidate...`);
      }
    }

    throw lastError || new Error('All Gemini candidate models failed to generate content');
  }

  private generateHeuristicSummary(
    content: string,
    context: {
      title: string;
      participants: ParticipantInfo[];
      language: 'VI' | 'EN';
    },
  ): MeetingSummaryResult {
    const sentences = content
      .split(/(?<=[.!?\n])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 15);

    const summary =
      sentences.slice(0, 5).join(' ') ||
      `Cuộc họp "${context.title}" với ${context.participants.length} thành viên tham dự. Xem chi tiết nội dung lời thoại bên dưới.`;

    const actionItems: ActionItem[] = [];

    // Tìm kiếm phân công công việc từ tên thành viên
    for (const participant of context.participants) {
      const escapedName = participant.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(
        `${escapedName}\\s+(sẽ|được giao|phụ trách|nhận|lo|cần|phải|đảm nhận)\\s+([^.!?\\n]{10,200})`,
        'gi',
      );
      let match: RegExpExecArray | null;
      while ((match = regex.exec(content)) !== null) {
        actionItems.push({
          task: match[2].trim(),
          assignee: participant.name,
          assigneeId: participant.id,
          confidence: 0.7,
          priority: 'MEDIUM',
        });
        if (actionItems.length >= 8) break;
      }
    }

    const decisionKeywords = ['quyết định', 'thống nhất', 'đồng ý', 'chốt', 'sẽ dùng', 'decided', 'agreed'];
    const decisions: string[] = [];
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      if (decisionKeywords.some((kw) => lower.includes(kw))) {
        decisions.push(sentence);
        if (decisions.length >= 5) break;
      }
    }

    const riskKeywords = ['rủi ro', 'nguy cơ', 'delay', 'trễ', 'khó khăn', 'vướng', 'risk'];
    const risks: string[] = [];
    for (const sentence of sentences) {
      if (riskKeywords.some((kw) => sentence.toLowerCase().includes(kw))) {
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
