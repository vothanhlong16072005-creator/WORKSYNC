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
import type {
  TeamAttendanceQuery,
  TeamAttendanceResponse,
  CompanyAttendanceQuery,
  CompanyAttendanceResponse,
  AttendanceSettings,
  UpdateAttendanceSettingsPayload,
  EmployeeAuditQuery,
  EmployeeAuditResponse,
} from '../types/role-attendance.types';
import type {
  EarlyLeaveRequest,
  OvertimeRequest,
  BreakLog,
} from '../types/attendance-gd2.types';

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

  /** Xóa bản ghi điểm danh (dùng để gỡ bản ghi sai) */
  async deleteRecord(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(
      `/attendance/records/${id}`,
    );
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
  async getPendingWfhRequests(status?: string): Promise<WfhRequest[]> {
    const res = await apiClient.get<WfhRequest[]>('/attendance/wfh-requests', {
      params: status ? { status } : undefined,
    });
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

  async revertWfh(id: string): Promise<WfhRequest> {
    const res = await apiClient.patch<WfhRequest>(`/attendance/wfh-requests/${id}/revert`);
    return res.data;
  },

  async getPendingLeaveRequests(status?: string): Promise<LeaveRequest[]> {
    const res = await apiClient.get<LeaveRequest[]>('/attendance/leave-requests', {
      params: status ? { status } : undefined,
    });
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

  async revertLeave(id: string): Promise<LeaveRequest> {
    const res = await apiClient.patch<LeaveRequest>(`/attendance/leave-requests/${id}/revert`);
    return res.data;
  },

  async triggerAutoApprove(): Promise<{ approved: number }> {
    const res = await apiClient.patch<{ approved: number }>('/attendance/wfh-requests/auto-approve-pending');
    return res.data;
  },

  // GD2: Early Leave
  async createEarlyLeave(payload: {
    date: string;
    expectedLeaveTime: string;
    reason: string;
  }): Promise<EarlyLeaveRequest> {
    const res = await apiClient.post<EarlyLeaveRequest>('/attendance/early-leave', payload);
    return res.data;
  },

  async getMyEarlyLeave(): Promise<EarlyLeaveRequest[]> {
    const res = await apiClient.get<EarlyLeaveRequest[]>('/attendance/early-leave/mine');
    return res.data;
  },

  async getPendingEarlyLeave(): Promise<EarlyLeaveRequest[]> {
    const res = await apiClient.get<EarlyLeaveRequest[]>('/attendance/early-leave/pending');
    return res.data;
  },

  async approveEarlyLeave(id: string): Promise<EarlyLeaveRequest> {
    const res = await apiClient.patch<EarlyLeaveRequest>(`/attendance/early-leave/${id}/approve`);
    return res.data;
  },

  async rejectEarlyLeave(id: string, rejectionNote?: string): Promise<EarlyLeaveRequest> {
    const res = await apiClient.patch<EarlyLeaveRequest>(
      `/attendance/early-leave/${id}/reject`,
      { rejectionNote },
    );
    return res.data;
  },

  // GD2: Overtime
  async createOvertime(payload: {
    date: string;
    registeredStart: string;
    registeredEnd: string;
    reason: string;
  }): Promise<OvertimeRequest> {
    const res = await apiClient.post<OvertimeRequest>('/attendance/overtime', payload);
    return res.data;
  },

  async getMyOvertime(): Promise<OvertimeRequest[]> {
    const res = await apiClient.get<OvertimeRequest[]>('/attendance/overtime/mine');
    return res.data;
  },

  async getPendingOvertime(): Promise<OvertimeRequest[]> {
    const res = await apiClient.get<OvertimeRequest[]>('/attendance/overtime/pending');
    return res.data;
  },

  async approveOvertime(id: string): Promise<OvertimeRequest> {
    const res = await apiClient.patch<OvertimeRequest>(`/attendance/overtime/${id}/approve`);
    return res.data;
  },

  async rejectOvertime(id: string, rejectionNote?: string): Promise<OvertimeRequest> {
    const res = await apiClient.patch<OvertimeRequest>(
      `/attendance/overtime/${id}/reject`,
      { rejectionNote },
    );
    return res.data;
  },

  // GD2: Break
  async startBreak(reason?: string): Promise<BreakLog> {
    const res = await apiClient.post<BreakLog>('/attendance/break/start', { reason });
    return res.data;
  },

  async endBreak(): Promise<BreakLog> {
    const res = await apiClient.post<BreakLog>('/attendance/break/end', {});
    return res.data;
  },

  async getTodayBreaks(): Promise<BreakLog[]> {
    const res = await apiClient.get<BreakLog[]>('/attendance/break/today');
    return res.data;
  },

  // M12 Step 1: Role-Based Attendance Endpoints (strict-typed)
  async getTeamAttendance(
    params?: TeamAttendanceQuery,
  ): Promise<TeamAttendanceResponse> {
    const res = await apiClient.get<TeamAttendanceResponse>('/attendance/team', { params });
    return res.data;
  },

  async getCompanyAttendance(
    params?: CompanyAttendanceQuery,
  ): Promise<CompanyAttendanceResponse> {
    const res = await apiClient.get<CompanyAttendanceResponse>('/attendance/company', { params });
    return res.data;
  },

  async getSettings(): Promise<AttendanceSettings> {
    const res = await apiClient.get<AttendanceSettings>('/attendance/settings');
    return res.data;
  },

  async updateSettings(payload: UpdateAttendanceSettingsPayload): Promise<AttendanceSettings> {
    const res = await apiClient.patch<AttendanceSettings>('/attendance/settings', payload);
    return res.data;
  },

  async getEmployeeAudit(
    userId: string,
    params?: EmployeeAuditQuery,
  ): Promise<EmployeeAuditResponse> {
    const res = await apiClient.get<EmployeeAuditResponse>(`/attendance/audit/${userId}`, {
      params,
    });
    return res.data;
  },
};
