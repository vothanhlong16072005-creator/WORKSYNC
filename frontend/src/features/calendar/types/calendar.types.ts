export type ItemKind = 'task' | 'sprint' | 'meeting' | 'leave' | 'wfh' | 'overtime';

export type CalendarScope = 'mine' | 'department' | 'company';
export type CalendarView = 'day' | 'week' | 'month';

export interface BaseTimelineItem {
  kind: ItemKind;
  id: string;
  startAt: string;   // ISO string
  endAt: string;     // ISO string
  title: string;
  canReschedule: boolean;
  creatorName: string;
  creatorId: string;
  userId?: string;
  description?: string | null;
}

export interface TaskTimelineItem extends BaseTimelineItem {
  kind: 'task';
  projectId: string;
  projectName: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'BLOCKED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  assigneeId: string;
  assigneeName: string;
  isOverdue?: boolean;
}

export interface MeetingTimelineItem extends BaseTimelineItem {
  kind: 'meeting';
  scope: 'PROJECT' | 'DEPARTMENT' | 'ONE_ON_ONE';
  projectId: string | null;
  departmentId: string | null;
  attendeeCount: number;
  roomCode?: string;
  status: string;
}

export interface LeaveTimelineItem extends BaseTimelineItem {
  kind: 'leave';
  userId: string;
  userName: string;
  leaveType: string;
  dayCount: number;
}

export interface WfhTimelineItem extends BaseTimelineItem {
  kind: 'wfh';
  userId: string;
  userName: string;
  reason?: string;
}

export interface OvertimeTimelineItem extends BaseTimelineItem {
  kind: 'overtime';
  userId: string;
  userName: string;
  registeredHours: number;
  reason?: string;
}

export interface SprintTimelineItem extends BaseTimelineItem {
  kind: 'sprint';
  projectId: string;
  projectName: string;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED';
  goal?: string | null;
}

export type TimelineItem =
  | TaskTimelineItem
  | SprintTimelineItem
  | MeetingTimelineItem
  | LeaveTimelineItem
  | WfhTimelineItem
  | OvertimeTimelineItem;

export interface Conflict {
  userId: string;
  userName: string;
  type: 'meeting_overlap' | 'overdue_overload' | 'leave_during_meeting';
  message: string;
  involvedItemIds: string[];
}

export interface TimelineResponse {
  range: { from: string; to: string };
  scope: CalendarScope;
  items: TimelineItem[];
  conflicts: Conflict[];
}

export interface TimelineQueryParams {
  from: string;
  to: string;
  scope?: CalendarScope;
  projectId?: string | null;
  assigneeId?: string | null;
  types?: ItemKind[];
  status?: string[];
  priority?: string[];
  query?: string | null;
}

export interface RescheduleDto {
  newStart: string;
  newEnd?: string;
  reason?: string;
}

export interface RescheduleResult {
  success: boolean;
  message?: string;
  item?: TimelineItem;
}
