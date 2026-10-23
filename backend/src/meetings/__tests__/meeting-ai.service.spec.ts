import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MeetingAiService } from '../meeting-ai.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('MeetingAiService', () => {
  let service: MeetingAiService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      meeting: {
        findUnique: vi.fn(),
      },
      meetingMinute: {
        findUnique: vi.fn(),
        upsert: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
      },
      meetingTranscriptChunk: {
        findMany: vi.fn(),
      },
      systemConfig: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      document: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn(),
        update: vi.fn().mockResolvedValue({}),
      },
    };

    service = new MeetingAiService(mockPrisma as unknown as PrismaService);
  });

  it('should generate summary from streamed transcript chunks and match assigneeId', async () => {
    const meetingId = 'meet-123';
    const mockMeeting = {
      id: meetingId,
      title: 'Scrum Planning Sprint 12',
      scopeType: 'PROJECT',
      projectId: 'proj-456',
      departmentId: null,
      startTime: new Date('2026-10-19T09:00:00Z'),
      endTime: new Date('2026-10-19T10:00:00Z'),
      attendees: [
        {
          userId: 'user-tuan',
          user: { id: 'user-tuan', name: 'Nguyễn Minh Tuấn', email: 'tuan@worksync.com', role: 'PM' },
        },
        {
          userId: 'user-long',
          user: { id: 'user-long', name: 'Võ Thành Long', email: 'long@worksync.com', role: 'EMPLOYEE' },
        },
      ],
      minutes: null,
    };

    mockPrisma.meeting.findUnique.mockResolvedValue(mockMeeting);

    // Chunks from Web Speech API stream
    const mockChunks = [
      {
        id: 'chunk-1',
        meetingId,
        speakerId: 'user-tuan',
        speakerName: 'Nguyễn Minh Tuấn',
        speakerRole: 'PM',
        text: 'Chúng ta quyết định chốt dùng PostgreSQL cho dự án.',
        timestamp: new Date('2026-10-19T09:05:00Z'),
      },
      {
        id: 'chunk-2',
        meetingId,
        speakerId: 'user-long',
        speakerName: 'Võ Thành Long',
        speakerRole: 'EMPLOYEE',
        text: 'Võ Thành Long sẽ phụ trách viết toàn bộ API module Meetings trong tuần này.',
        timestamp: new Date('2026-10-19T09:07:00Z'),
      },
    ];

    mockPrisma.meetingTranscriptChunk.findMany.mockResolvedValue(mockChunks);

    const result = await service.generateSummary(meetingId, { language: 'VI' });

    expect(result).toBeDefined();
    expect(result.summary).toBeDefined();
    expect(result.decisions.length).toBeGreaterThan(0);
    expect(result.decisions[0]).toContain('quyết định chốt dùng PostgreSQL cho dự án');
    expect(result.rawTranscript).toContain('Nguyễn Minh Tuấn: Chúng ta quyết định chốt dùng PostgreSQL cho dự án.');
    expect(result.rawTranscript).toContain('Võ Thành Long sẽ phụ trách viết toàn bộ API module Meetings trong tuần này.');

    // Check that assigneeId was mapped accurately from the participant list (Constraint 2)
    const longActionItem = result.actionItems.find((a) => a.assignee === 'Võ Thành Long');
    expect(longActionItem).toBeDefined();
    expect(longActionItem?.assigneeId).toBe('user-long');

    expect(mockPrisma.meetingMinute.upsert).toHaveBeenCalled();
    expect(mockPrisma.meetingMinute.update).toHaveBeenCalled();
  });

  it('should export meeting AI summary to ClickUp Docs (Constraint 3)', async () => {
    const meetingId = 'meet-123';
    const userId = 'user-tuan';

    mockPrisma.meeting.findUnique.mockResolvedValue({
      id: meetingId,
      title: 'Họp Dự Án Alpha',
      scopeType: 'PROJECT',
      projectId: 'proj-1',
      departmentId: null,
      startTime: new Date(),
      endTime: new Date(),
      minutes: {
        aiSummary: 'Tóm tắt điều hành cuộc họp.',
        decisions: ['Chốt kiến trúc Microservices.'],
        actionItems: [{ task: 'Viết migration', assignee: 'Võ Thành Long', assigneeId: 'user-long' }],
        risksAndQuestions: { risks: ['Tiến độ gấp'], openQuestions: [] },
        rawTranscript: '[09:00:00] Tuấn: Bắt đầu.',
      },
    });

    mockPrisma.document.create.mockResolvedValue({
      id: 'doc-new-1',
      title: 'Biên bản: Họp Dự Án Alpha',
      templateKey: 'meeting_minutes',
      linkedMeetingId: meetingId,
    });

    const exportedDoc = await service.exportToDocument(meetingId, userId);

    expect(exportedDoc).toBeDefined();
    expect(exportedDoc.templateKey).toBe('meeting_minutes');
    expect(mockPrisma.document.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: 'Biên bản: Họp Dự Án Alpha',
          templateKey: 'meeting_minutes',
          linkedMeetingId: meetingId,
          scope: 'PROJECT',
        }),
      }),
    );
  });

  it('should use referenceContent as the primary source over the transcript (Phase 5)', async () => {
    const meetingId = 'meet-123';
    const referenceContent = `
BIÊN BẢN THAM CHIẾU — DỰ ÁN TTĐN
I. QUYẾT ĐỊNH
- Chốt triển khai cơ chế nội dung tham chiếu cho biên bản AI trước khi cải thiện STT.
II. CÔNG VIỆC CẦN LÀM
- PM: Hoàn thiện đồng bộ track media, hạn cuối tuần này, ưu tiên cao.
    `;

    mockPrisma.meeting.findUnique.mockResolvedValue({
      id: meetingId,
      title: 'Họp Dự Án TTĐN',
      scopeType: 'PROJECT',
      projectId: 'proj-1',
      departmentId: null,
      startTime: new Date(),
      endTime: new Date(),
      attendees: [
        {
          userId: 'user-tuan',
          user: { id: 'user-tuan', name: 'Nguyễn Minh Tuấn', email: 'tuan@worksync.com', role: 'PM' },
        },
      ],
      minutes: null,
    });

    // Transcript rác (STT tiếng Việt kém) — KHÔNG được ghi đè nội dung tham chiếu
    mockPrisma.meetingTranscriptChunk.findMany.mockResolvedValue([
      {
        id: 'chunk-1',
        meetingId,
        speakerId: 'user-tuan',
        speakerName: 'Nguyễn Minh Tuấn',
        speakerRole: 'PM',
        text: 'xong giong dau roi mot hai ba bon',
        timestamp: new Date(),
      },
    ]);

    const result = await service.generateSummary(meetingId, {
      language: 'VI',
      referenceContent,
    });

    expect(result).toBeDefined();
    expect(result.summary).toBeDefined();
    // Nội dung tham chiếu phải chi phối kết quả
    expect(result.summary).toContain('đồng bộ track media');
    // Transcript vẫn được giữ lại làm nguyên liệu hỗ trợ
    expect(result.rawTranscript).toContain('xong giong dau roi');
  });

  it('should prefer minutes.content over transcript when no referenceContent is given', async () => {
    const meetingId = 'meet-123';

    mockPrisma.meeting.findUnique.mockResolvedValue({
      id: meetingId,
      title: 'Họp Dự Án TTĐN',
      scopeType: 'PROJECT',
      projectId: 'proj-1',
      departmentId: null,
      startTime: new Date(),
      endTime: new Date(),
      attendees: [
        {
          userId: 'user-tuan',
          user: { id: 'user-tuan', name: 'Nguyễn Minh Tuấn', email: 'tuan@worksync.com', role: 'PM' },
        },
      ],
      minutes: {
        content:
          'Nội dung biên bản viết tay trong MinutesEditor: chốt triển khai module họp trực tuyến trong quý này.',
      },
    });

    mockPrisma.meetingTranscriptChunk.findMany.mockResolvedValue([
      {
        id: 'chunk-1',
        meetingId,
        speakerId: 'user-tuan',
        speakerName: 'Nguyễn Minh Tuấn',
        speakerRole: 'PM',
        text: 'garbled transcript content that should not win',
        timestamp: new Date(),
      },
    ]);

    const result = await service.generateSummary(meetingId, { language: 'VI' });

    expect(result.summary).toContain('module họp trực tuyến');
    expect(result.summary).not.toContain('garbled transcript content that should not win');
  });

  it('should throw BadRequest when there is no usable source content', async () => {
    const meetingId = 'meet-empty';

    mockPrisma.meeting.findUnique.mockResolvedValue({
      id: meetingId,
      title: 'Họp trống',
      scopeType: 'PROJECT',
      projectId: 'proj-1',
      departmentId: null,
      startTime: new Date(),
      endTime: new Date(),
      attendees: [],
      minutes: null,
    });

    mockPrisma.meetingTranscriptChunk.findMany.mockResolvedValue([]);

    await expect(service.generateSummary(meetingId, { language: 'VI' })).rejects.toThrow();
  });
});
