/**
 * M12 — Phase 2 Types (GD2)
 * Strict-typed contracts cho Early Leave, Overtime, Break tracking.
 */

export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'AUTO_APPROVED' | 'CANCELLED';

export interface BaseRequest {
  id: string;
  userId: string;
  date: string;
  status: RequestStatus;
  rejectionNote?: string | null;
  approvedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------- Early Leave ----------

export interface EarlyLeaveRequest extends BaseRequest {
  expectedLeaveTime: string;
  reason: string;
  approvedAt?: string | null;
}

// ---------- Overtime ----------

export interface OvertimeRequest extends BaseRequest {
  registeredStart: string;
  registeredEnd: string;
  /** Giờ đăng ký ban đầu, mặc định 3.0 */
  registeredHours: number;
  /** min(registeredHours, thực tế checkOut - 17:30) */
  actualHours: number | null;
  reason: string;
  approvedAt?: string | null;
}

// ---------- Break Tracking ----------

export type BreakType = 'PERSONAL' | 'LUNCH' | 'ERRAND';

export interface BreakLog {
  id: string;
  userId: string;
  /** ISO datetime string */
  startTime: string;
  /** ISO datetime string, null nếu đang nghỉ */
  endTime: string | null;
  durationMinutes: number | null;
  breakType: BreakType;
  reason: string | null;
}
