export interface DraftTaskItem {
  id: string;
  title: string;
  projectName: string;
  status: string;
  completedAt: string | null;
  workLogs: { id: string; duration: number; description: string | null }[];
}

export interface DraftMeetingItem {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  roomCode: string | null;
}

export interface OverdueTaskItem {
  id: string;
  title: string;
  projectName: string;
  dueDate: string;
  daysOverdue: number;
  priority: string;
}

export interface DraftPayload {
  date: string;
  attendance: {
    checkInTime: string | null;
    checkOutTime: string | null;
    status: string | null;
    workHours: number | null;
    breakMinutes: number | null;
  };
  completedTasks: DraftTaskItem[];
  completedQuickTasks: DraftTaskItem[];
  workLogs: {
    id: string;
    taskTitle: string;
    duration: number;
    description: string | null;
    logDate: string;
  }[];
  attendedMeetings: DraftMeetingItem[];
  overdueTasks: OverdueTaskItem[];
  suggestedContent: string;
  suggestedBlockers: string;
  suggestedPlannedTomorrow: string;
  totalWorkMinutes: number;
}

export interface DailyReportItem {
  id: string;
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar: string | null;
    role: string;
    department?: { id: string; name: string } | null;
  };
  date: string;
  content: string;
  tasksDone: string[];
  blockers: string | null;
  plannedTomorrow: string | null;
  aiDrafted: boolean;
  isLocked: boolean;
  lateSubmission: boolean;
  submittedAt: string | null;
  submittedById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeekDaySummary {
  date: string;
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  isSubmitted: boolean;
  isLocked: boolean;
  reportId?: string;
  summaryText?: string;
}

export interface MemberWeekSummary {
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string | null;
  departmentName?: string;
  submittedCount: number;
  days: WeekDaySummary[];
}
