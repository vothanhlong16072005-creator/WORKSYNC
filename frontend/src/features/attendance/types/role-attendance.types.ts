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
