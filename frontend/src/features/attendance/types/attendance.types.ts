export type AttendanceStatus =
  | 'ON_TIME'
  | 'LATE'
  | 'VERY_LATE'
  | 'WFH'
  | 'BUSINESS_TRIP'
  | 'ABSENT_APPROVED'
  | 'ABSENT_UNAPPROVED'
  | 'EARLY_LEAVE_APPROVED'
  | 'EARLY_LEAVE_UNAPPROVED';

export type RequestStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'AUTO_APPROVED';

export type LeaveType =
  | 'ANNUAL'
  | 'SICK'
  | 'UNPAID'
  | 'COMPENSATORY';

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  status: AttendanceStatus;
  checkInTime: string | null;
  checkOutTime: string | null;
  checkInIp: string | null;
  checkInLat: number | null;
  checkInLng: number | null;
  checkInMethod: string | null;
  note: string | null;
  editedBy: string | null;
  editedAt: string | null;
  createdAt: string;
}

export interface WfhRequest {
  id: string;
  userId: string;
  date: string;
  reason: string;
  expectedStart: string;
  expectedEnd: string;
  status: RequestStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionNote: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    role: string;
    department?: { name: string } | null;
  };
}

export interface LeaveRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  leaveType: LeaveType;
  dayCount: number;
  reason: string;
  status: RequestStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    role: string;
    department?: { name: string } | null;
  };
}

export interface LeaveBalance {
  total: number;
  used: number;
  remaining: number;
}

export interface TodayAttendanceResponse {
  record: AttendanceRecord | null;
  wfhRequest: WfhRequest | null;
  leaveRequest: LeaveRequest | null;
  config: {
    workStartTime: string;
    workEndTime: string;
    checkinStartTime: string;
    checkinEndTime: string;
    officeLatitude: number;
    officeLongitude: number;
    gpsRadiusMeters: number;
  } | null;
}

export interface CheckInPayload {
  latitude?: number;
  longitude?: number;
  ipAddress?: string;
  note?: string;
}

export interface CheckOutPayload {
  note?: string;
}

export interface CreateWfhPayload {
  date: string; // YYYY-MM-DD
  reason: string;
  expectedStart: string;
  expectedEnd: string;
}

export interface CreateLeavePayload {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  leaveType: LeaveType;
  dayCount: number;
  reason: string;
}

export interface ReviewRequestPayload {
  rejectionNote?: string;
}
