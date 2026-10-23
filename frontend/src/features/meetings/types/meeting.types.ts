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
  rawTranscript?: string | null;
  isTranscribing?: boolean;
  aiSummary?: string | null;
  actionItems?: ActionItem[] | null;
  decisions?: string[] | null;
  risksAndQuestions?: { risks: string[]; openQuestions: string[] } | null;
  aiGeneratedAt?: string | null;
  aiModel?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActionItem {
  task: string;
  assignee?: string | null;
  assigneeId?: string | null;
  deadline?: string | null;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  confidence?: number;
}

export interface MeetingSummaryResult {
  hasSummary: boolean;
  summary: string;
  actionItems: ActionItem[];
  decisions: string[];
  risksAndQuestions: {
    risks: string[];
    openQuestions: string[];
  };
  model?: string;
  tokensUsed?: number;
  generatedAt?: string;
  rawTranscript?: string | null;
}

export interface MeetingTranscriptChunk {
  id: string;
  meetingId: string;
  speakerId: string;
  speakerName: string;
  speakerRole?: string | null;
  text: string;
  timestamp: string;
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
    description?: string | null;
    minutes?: any;
    documents?: any[];
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
  attachment?: {
    name: string;
    url: string;
    size?: number;
    type?: string;
  };
  createdAt: string;
}

export type InMeetingMessage = ChatMessage;

export interface RemotePeer {
  socketId: string;
  userId: string;
  name: string;
  avatar?: string;
  /** Camera stream (transceiver 0) */
  camStream: MediaStream | null;
  /** Screen share stream (transceiver 1) — null if not sharing */
  screenStream: MediaStream | null;
  audioEnabled: boolean;
  videoEnabled: boolean;
  isScreenSharing: boolean;
  connectionState: RTCPeerConnectionState;
}

