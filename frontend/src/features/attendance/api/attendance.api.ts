import { apiClient } from '@/lib/api-client';
import type {
  AttendanceRecord,
  TodayAttendanceResponse,
  LeaveBalance,
  WfhRequest,
  LeaveRequest,
  CheckInPayload,
  CheckOutPayload,
  CreateWfhPayload,
  CreateLeavePayload,
  ReviewRequestPayload,
} from '../types/attendance.types';

export const attendanceApi = {
  async getToday(): Promise<TodayAttendanceResponse> {
    const res = await apiClient.get<TodayAttendanceResponse>('/attendance/today');
    return res.data;
  },

  async checkIn(payload: CheckInPayload): Promise<AttendanceRecord> {
    const res = await apiClient.post<AttendanceRecord>('/attendance/check-in', payload);
    return res.data;
  },

  async checkOut(payload: CheckOutPayload): Promise<AttendanceRecord> {
    const res = await apiClient.post<AttendanceRecord>('/attendance/check-out', payload);
    return res.data;
  },

  async getHistory(fromDate?: string, toDate?: string): Promise<AttendanceRecord[]> {
    const res = await apiClient.get<AttendanceRecord[]>('/attendance/history', {
      params: { fromDate, toDate },
    });
    return res.data;
  },

  async getLeaveBalance(): Promise<LeaveBalance> {
    const res = await apiClient.get<LeaveBalance>('/attendance/leave-balance');
    return res.data;
  },

  async getMyRequests(): Promise<{ wfh: WfhRequest[]; leaves: LeaveRequest[] }> {
    const res = await apiClient.get<{ wfh: WfhRequest[]; leaves: LeaveRequest[] }>('/attendance/requests');
    return res.data;
  },

  async createWfh(payload: CreateWfhPayload): Promise<WfhRequest> {
    const res = await apiClient.post<WfhRequest>('/attendance/wfh', payload);
    return res.data;
  },

  async createLeave(payload: CreateLeavePayload): Promise<LeaveRequest> {
    const res = await apiClient.post<LeaveRequest>('/attendance/leave-request', payload);
    return res.data;
  },

  // HR / PM Queues
  async getPendingWfhRequests(): Promise<WfhRequest[]> {
    const res = await apiClient.get<WfhRequest[]>('/attendance/wfh-requests');
    return res.data;
  },

  async approveWfh(id: string): Promise<WfhRequest> {
    const res = await apiClient.patch<WfhRequest>(`/attendance/wfh-requests/${id}/approve`);
    return res.data;
  },

  async rejectWfh(id: string, payload?: ReviewRequestPayload): Promise<WfhRequest> {
    const res = await apiClient.patch<WfhRequest>(`/attendance/wfh-requests/${id}/reject`, payload);
    return res.data;
  },

  async getPendingLeaveRequests(): Promise<LeaveRequest[]> {
    const res = await apiClient.get<LeaveRequest[]>('/attendance/leave-requests');
    return res.data;
  },

  async approveLeave(id: string): Promise<LeaveRequest> {
    const res = await apiClient.patch<LeaveRequest>(`/attendance/leave-requests/${id}/approve`);
    return res.data;
  },

  async rejectLeave(id: string): Promise<LeaveRequest> {
    const res = await apiClient.patch<LeaveRequest>(`/attendance/leave-requests/${id}/reject`);
    return res.data;
  },

  async triggerAutoApprove(): Promise<{ approved: number }> {
    const res = await apiClient.patch<{ approved: number }>('/attendance/wfh-requests/auto-approve-pending');
    return res.data;
  },

  // GD2: Early Leave
  async createEarlyLeave(payload: { date: string; expectedLeaveTime: string; reason: string }): Promise<unknown> {
    const res = await apiClient.post('/attendance/early-leave', payload);
    return res.data;
  },

  async getMyEarlyLeave(): Promise<unknown[]> {
    const res = await apiClient.get<unknown[]>('/attendance/early-leave/mine');
    return res.data;
  },

  async getPendingEarlyLeave(): Promise<unknown[]> {
    const res = await apiClient.get<unknown[]>('/attendance/early-leave/pending');
    return res.data;
  },

  async approveEarlyLeave(id: string): Promise<unknown> {
    const res = await apiClient.patch(`/attendance/early-leave/${id}/approve`);
    return res.data;
  },

  async rejectEarlyLeave(id: string, rejectionNote?: string): Promise<unknown> {
    const res = await apiClient.patch(`/attendance/early-leave/${id}/reject`, { rejectionNote });
    return res.data;
  },

  // GD2: Overtime
  async createOvertime(payload: { date: string; registeredStart: string; registeredEnd: string; reason: string }): Promise<unknown> {
    const res = await apiClient.post('/attendance/overtime', payload);
    return res.data;
  },

  async getMyOvertime(): Promise<unknown[]> {
    const res = await apiClient.get<unknown[]>('/attendance/overtime/mine');
    return res.data;
  },

  async getPendingOvertime(): Promise<unknown[]> {
    const res = await apiClient.get<unknown[]>('/attendance/overtime/pending');
    return res.data;
  },

  async approveOvertime(id: string): Promise<unknown> {
    const res = await apiClient.patch(`/attendance/overtime/${id}/approve`);
    return res.data;
  },

  async rejectOvertime(id: string, rejectionNote?: string): Promise<unknown> {
    const res = await apiClient.patch(`/attendance/overtime/${id}/reject`, { rejectionNote });
    return res.data;
  },

  // GD2: Break
  async startBreak(reason?: string): Promise<unknown> {
    const res = await apiClient.post('/attendance/break/start', { reason });
    return res.data;
  },

  async endBreak(): Promise<unknown> {
    const res = await apiClient.post('/attendance/break/end', {});
    return res.data;
  },

  async getTodayBreaks(): Promise<unknown[]> {
    const res = await apiClient.get<unknown[]>('/attendance/break/today');
    return res.data;
  },
};
