/**
 * M12 — Role-Based Attendance DTOs
 * Strict-typed contracts between frontend & backend (PM/HR/Admin views).
 * Mirrors backend DTOs in `backend/src/attendance/dto/` & service responses.
 */

import type { AttendanceStatus } from './attendance.types';

// ---------- Query Parameters ----------

export interface TeamAttendanceQuery {
  projectId?: string;
  /** YYYY-MM-DD */
  date?: string;
}

export interface CompanyAttendanceQuery {
  /** YYYY-MM-DD */
  fromDate?: string;
  /** YYYY-MM-DD */
  toDate?: string;
  departmentId?: string;
}

// ---------- Team Attendance Response (PM/HR/ADMIN) ----------

export interface TeamMemberAttendance {
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    position?: string | null;
  };
  projectRoles: string[];
  projectNames: string[];
  status: AttendanceStatus | 'NOT_CHECKED_IN';
  checkInTime?: string | null;
  checkOutTime?: string | null;
  checkInMethod?: string | null;
}

export interface TeamAttendanceSummary {
  totalMembers: number;
  presentCount: number;
  onTimeCount: number;
  lateCount: number;
  wfhCount: number;
  missingCount: number;
}

export interface TeamAttendanceResponse {
  date: string;
  projects: Array<{ id: string; name: string; color: string }>;
  summary: TeamAttendanceSummary;
  members: TeamMemberAttendance[];
}

// ---------- Company Attendance Response (HR/ADMIN) ----------

export interface CompanyAttendanceRecord {
  id: string;
  userId: string;
  /** YYYY-MM-DD */
  date: string;
  status: AttendanceStatus;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  checkInMethod?: string | null;
  note?: string | null;
  departmentName: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    departmentId?: string | null;
  };
}

export interface CompanyAttendanceSummary {
  totalEmployees: number;
  totalRecords: number;
  onTime: number;
  late: number;
  wfh: number;
  absentApproved: number;
  earlyLeave: number;
}

export interface CompanyAttendanceResponse {
  dateRange: { from: string; to: string };
  departments: Array<{ id: string; name: string }>;
  summary: CompanyAttendanceSummary;
  records: CompanyAttendanceRecord[];
}

// ---------- Attendance Settings (ADMIN) ----------

export interface AttendanceSettings {
  companyName: string;
  timezone: string;
  workStartTime: string;
  workEndTime: string;
  checkinStartTime: string;
  checkinEndTime: string;
  officeLatitude: number;
  officeLongitude: number;
  gpsRadiusMeters: number;
  allowedIpRanges: string[];
  wfhAutoApproveTime: string;
}

export interface UpdateAttendanceSettingsPayload {
  companyName?: string;
  timezone?: string;
  workStartTime?: string;
  workEndTime?: string;
  checkinStartTime?: string;
  checkinEndTime?: string;
  officeLatitude?: number;
  officeLongitude?: number;
  gpsRadiusMeters?: number;
  allowedIpRanges?: string[];
  wfhAutoApproveTime?: string;
}

// ---------- Employee Attendance Audit (HR/ADMIN/DEPT_HEAD) ----------

export interface EmployeeAuditQuery {
  fromDate?: string;
  toDate?: string;
}

export interface EmployeeAuditRecord {
  id: string;
  date: string;
  status: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  workHours: number;
  note: string | null;
}

export interface EmployeeAuditRequests {
  leaves: Array<{
    id: string;
    startDate: string;
    endDate: string;
    reason: string;
    type: string;
    status: string;
    createdAt: string;
  }>;
  wfhs: Array<{
    id: string;
    date: string;
    reason: string;
    status: string;
    createdAt: string;
  }>;
  overtimes: Array<{
    id: string;
    date: string;
    hours: number;
    reason: string;
    status: string;
    createdAt: string;
  }>;
}

export interface EmployeeAuditResponse {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar: string | null;
    department: { id: string; name: string } | null;
  };
  period: { fromDate: string; toDate: string };
  kpis: {
    totalDays: number;
    attendedDays: number;
    onTimeDays: number;
    lateDays: number;
    wfhDays: number;
    leaveDays: number;
    earlyLeaveDays: number;
    totalWorkHours: number;
    averageDailyHours: number;
    punctualityRate: number;
  };
  records: EmployeeAuditRecord[];
  requests: EmployeeAuditRequests;
}

