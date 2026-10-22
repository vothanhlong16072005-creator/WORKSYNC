import { apiClient } from '@/lib/api-client';
import type {
  DraftPayload,
  DailyReportItem,
  TeamWeeklyOverviewResponse,
  SubmitDailyReportPayload,
  UpdateDailyReportPayload,
} from '../types/daily-report.types';

export const dailyReportsApi = {
  /**
   * 1. Lấy dữ liệu điền sẵn (draft) từ 4 nguồn + task quá hạn
   */
  async getTodayDraft(date?: string): Promise<DraftPayload> {
    const res = await apiClient.get<DraftPayload>('/daily-reports/draft/today', {
      params: date ? { date } : undefined,
    });
    return res.data;
  },

  /**
   * 2. Nộp báo cáo ngày
   */
  async submitReport(payload: SubmitDailyReportPayload): Promise<DailyReportItem> {
    const res = await apiClient.post<DailyReportItem>('/daily-reports', payload);
    return res.data;
  },

  /**
   * 3. Lịch sử báo cáo cá nhân
   */
  async getMyReports(params?: {
    date?: string;
    weekStart?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: DailyReportItem[]; total: number; totalPages: number }> {
    const res = await apiClient.get<{ items: DailyReportItem[]; total: number; totalPages: number }>(
      '/daily-reports/mine',
      { params },
    );
    return res.data;
  },

  /**
   * 4. Ma trận báo cáo tuần của team (Mon -> Sun)
   */
  async getTeamWeeklyOverview(weekStart?: string): Promise<TeamWeeklyOverviewResponse> {
    const res = await apiClient.get<TeamWeeklyOverviewResponse>('/daily-reports/team/weekly', {
      params: weekStart ? { weekStart } : undefined,
    });
    return res.data;
  },

  /**
   * 5. Chi tiết báo cáo của team theo ngày
   */
  async getTeamDailyReports(params?: {
    date?: string;
    userId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: DailyReportItem[]; total: number; totalPages: number }> {
    const res = await apiClient.get<{ items: DailyReportItem[]; total: number; totalPages: number }>(
      '/daily-reports/team/daily',
      { params },
    );
    return res.data;
  },

  /**
   * 6. Lấy chi tiết báo cáo theo ID
   */
  async getReportById(id: string): Promise<DailyReportItem> {
    const res = await apiClient.get<DailyReportItem>(`/daily-reports/${id}`);
    return res.data;
  },

  /**
   * 7. Cập nhật báo cáo
   */
  async updateReport(id: string, payload: UpdateDailyReportPayload): Promise<DailyReportItem> {
    const res = await apiClient.patch<DailyReportItem>(`/daily-reports/${id}`, payload);
    return res.data;
  },
};
