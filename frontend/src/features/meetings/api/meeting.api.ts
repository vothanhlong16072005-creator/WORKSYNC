/**
 * Meeting API Client — Module M5
 * Reference: PLAN-2026-10-17-M5-MEETINGS-V2.md
 */
import { apiClient } from '@/lib/api-client';
import type {
  AttendanceReportData,
  CreateMeetingInput,
  Meeting,
  MeetingAttendee,
  MeetingMinute,
  MeetingScope,
  MeetingStatus,
  MeetingSummaryResult,
  MeetingTranscriptChunk,
  UpdateMeetingInput,
} from '../types/meeting.types';

export const meetingApi = {
  /**
   * Lấy danh sách cuộc họp theo bộ lọc
   */
  async getAll(params?: {
    scope?: MeetingScope;
    status?: MeetingStatus;
    projectId?: string;
    departmentId?: string;
  }): Promise<Meeting[]> {
    const res = await apiClient.get<Meeting[]>('/meetings', { params });
    return res.data;
  },

  /**
   * Cuộc họp sắp tới (7 ngày)
   */
  async getUpcoming(): Promise<Meeting[]> {
    const res = await apiClient.get<Meeting[]>('/meetings/upcoming');
    return res.data;
  },

  /**
   * Cuộc họp đã qua (30 ngày)
   */
  async getPast(): Promise<Meeting[]> {
    const res = await apiClient.get<Meeting[]>('/meetings/past');
    return res.data;
  },

  /**
   * Chi tiết cuộc họp
   */
  async getById(id: string): Promise<Meeting> {
    const res = await apiClient.get<Meeting>(`/meetings/${id}`);
    return res.data;
  },

  /**
   * Tạo cuộc họp mới (PROJECT / DEPARTMENT / ONE_ON_ONE)
   */
  async create(data: CreateMeetingInput): Promise<Meeting> {
    const res = await apiClient.post<Meeting>('/meetings', data);
    return res.data;
  },

  /**
   * Cập nhật cuộc họp
   */
  async update(id: string, data: UpdateMeetingInput): Promise<Meeting> {
    const res = await apiClient.patch<Meeting>(`/meetings/${id}`, data);
    return res.data;
  },

  /**
   * Xóa mềm cuộc họp
   */
  async delete(id: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete<{ success: boolean }>(`/meetings/${id}`);
    return res.data;
  },

  /**
   * Phản hồi lời mời tham gia (RSVP)
   */
  async rsvp(id: string, status: 'ACCEPTED' | 'DECLINED'): Promise<MeetingAttendee> {
    const res = await apiClient.post<MeetingAttendee>(`/meetings/${id}/rsvp`, { status });
    return res.data;
  },

  /**
   * Danh sách người tham gia
   */
  async getAttendees(id: string): Promise<MeetingAttendee[]> {
    const res = await apiClient.get<MeetingAttendee[]>(`/meetings/${id}/attendees`);
    return res.data;
  },

  /**
   * Lưu biên bản cuộc họp
   */
  async saveMinutes(id: string, content: string): Promise<MeetingMinute> {
    const res = await apiClient.post<MeetingMinute>(`/meetings/${id}/minutes`, { content });
    return res.data;
  },

  /**
   * Xem biên bản cuộc họp
   */
  async getMinutes(id: string): Promise<MeetingMinute | null> {
    const res = await apiClient.get<MeetingMinute | null>(`/meetings/${id}/minutes`);
    return res.data;
  },

  /**
   * Xem báo cáo chuyên cần sau cuộc họp (6 metrics)
   */
  async getReport(id: string): Promise<AttendanceReportData> {
    const res = await apiClient.get<AttendanceReportData>(`/meetings/${id}/report`);
    return res.data;
  },

  /**
   * ⭐ M5.1 — Lấy AI Summary đã lưu
   */
  async getAiSummary(id: string): Promise<MeetingSummaryResult> {
    const res = await apiClient.get<MeetingSummaryResult>(`/meetings/${id}/ai-summary`);
    return res.data;
  },

  /**
   * ⭐ M5.1 — Kích hoạt sinh AI Summary (Gemini 1.5 Flash)
   *
   * `referenceContent` (optional): nội dung tham chiếu định hướng AI.
   * Khi có trường này, AI bám theo nội dung tham chiếu làm chuẩn (hữu ích cho demo
   * khi chất lượng STT tiếng Việt chưa tốt).
   */
  async generateAiSummary(
    id: string,
    options?: { language?: 'VI' | 'EN'; referenceContent?: string },
  ): Promise<MeetingSummaryResult> {
    const res = await apiClient.post<MeetingSummaryResult>(`/meetings/${id}/ai-summary/generate`, options || {});
    return res.data;
  },

  /**
   * ⭐ M5.1 — Lấy toàn bộ các transcript chunks được stream từ Web Speech API
   */
  async getTranscripts(id: string): Promise<MeetingTranscriptChunk[]> {
    const res = await apiClient.get<MeetingTranscriptChunk[]>(`/meetings/${id}/transcripts`);
    return res.data;
  },

  /**
   * ⭐ M5.1 — Xuất biên bản AI sang ClickUp Docs
   */
  async exportToDocument(id: string): Promise<{ id: string; title: string }> {
    const res = await apiClient.post<{ id: string; title: string }>(`/meetings/${id}/export-doc`);
    return res.data;
  },

  /**
   * Lấy lịch sử chat và file đính kèm trong cuộc họp
   */
  async getChatHistory(id: string): Promise<any[]> {
    const res = await apiClient.get<any[]>(`/meetings/${id}/chat`);
    return res.data;
  },
};
