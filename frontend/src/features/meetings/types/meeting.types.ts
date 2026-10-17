/**
 * Meeting Types — Module M5
 * Reference: PLAN-2026-10-17-M5-MEETINGS-V2.md
 */

export type MeetingScope = 'PROJECT' | 'DEPARTMENT' | 'ONE_ON_ONE';

export type MeetingStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export type RSVP = 'PENDING' | 'ACCEPTED' | 'DECLINED';

export interface MeetingUser {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: string;
  departmentId?: string | null;
}

export interface MeetingAttendee {
  id: string;
  meetingId: string;
  userId: string;
  user: MeetingUser;
  rsvp: RSVP;
  rsvpAt?: string | null;
  joinedAt?: string | null;
  leftAt?: string | null;
  totalDurationSeconds: number;
}

export interface MeetingMinute {
  id: string;
  meetingId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Meeting {
  id: string;
  title: string;
  description?: string | null;
  scopeType: MeetingScope;
  projectId?: string | null;
  project?: {
    id: string;
    name: string;
    code?: string | null;
    departmentId?: string | null;
    pmId?: string | null;
  } | null;
  departmentId?: string | null;
  department?: {
    id: string;
    name: string;
  } | null;
  startTime: string;
  endTime: string;
  status: MeetingStatus;
  roomCode: string;
  createdById: string;
  createdBy: MeetingUser;
  attendees: MeetingAttendee[];
  minutes?: MeetingMinute | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface CreateMeetingInput {
  title: string;
  description?: string | null;
  scopeType: MeetingScope;
  projectId?: string | null;
  departmentId?: string | null;
  startTime: string;
  endTime: string;
  attendeeIds?: string[];
  agenda?: string[];
}

export interface UpdateMeetingInput {
  title?: string;
  description?: string | null;
  startTime?: string;
  endTime?: string;
  status?: MeetingStatus;
  attendeeIds?: string[];
  agenda?: string[];
}

export interface RsvpInput {
  status: 'ACCEPTED' | 'DECLINED';
}

export interface SaveMinutesInput {
  content: string;
}

export interface AttendanceReportMetric {
  totalInvited: number;
  presentCount: number;
  absentCount: number;
  declinedCount: number;
  pendingCount: number;
  totalDurationSeconds: number;
  avgDurationMinutes: number;
}

export interface AttendanceReportDetail {
  userId: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: string;
  rsvp: RSVP;
  rsvpAt?: string | null;
  joinedAt?: string | null;
  leftAt?: string | null;
  durationMinutes: number;
  durationSeconds: number;
  isPresent: boolean;
  statusLabel: string;
}

export interface AttendanceReportData {
  meeting: {
    id: string;
    title: string;
    scopeType: MeetingScope;
    status: MeetingStatus;
    startTime: string;
    endTime: string;
    roomCode: string;
    project?: { id: string; name: string; code?: string | null } | null;
    department?: { id: string; name: string } | null;
    createdBy: { id: string; name: string };
  };
  metrics: AttendanceReportMetric;
  details: AttendanceReportDetail[];
}

export interface ChatMessage {
  id: string;
  meetingId: string;
  text: string;
  sender: {
    id: string;
    name: string;
    avatar?: string;
  };
  createdAt: string;
}
