export type Role = 'ADMIN' | 'HR' | 'PM' | 'EMPLOYEE' | 'DEPARTMENT_HEAD';

export interface TaskSummary {
  total: number;
  todo: number;
  inProgress: number;
  inReview: number;
  blocked: number;
  done: number;
  completionRate: number;
  overdueCount: number;
  totalStoryPoints: number;
  totalEstimatedHours: number;
  totalActualHours: number;
}

export interface UrgentTask {
  id: string;
  title: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: string;
  dueDate: string | null;
  projectName: string;
  projectColor: string;
  storyPoints?: number | null;
}

export interface SprintProgress {
  id: string;
  name: string;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED';
  totalTasks: number;
  doneTasks: number;
  progressPercent: number;
}

export interface ProjectProgress {
  projectId: string;
  projectName: string;
  projectColor: string;
  totalTasks: number;
  doneTasks: number;
  progressPercent: number;
  myTasksCount?: number;
  activeSprint?: { id: string; name: string; endDate: string };
  sprints: SprintProgress[];
}

export interface TeamMemberWorkload {
  userId: string;
  userName: string;
  avatar: string | null;
  openTaskCount: number;
  totalStoryPoints: number | null;
}

export interface SystemHealth {
  activeUsers: number;
  totalProjects: number;
  totalTasks: number;
  completedTasks: number;
}

export interface WeeklyVelocityPoint {
  date: string;
  dayName: string;
  doneCount: number;
  createdCount: number;
}

export interface DistributionItem {
  name: string;
  label: string;
  count: number;
  percent: number;
  color: string;
}

export interface RecentActivity {
  id: string;
  title: string;
  status: string;
  priority: string;
  projectName: string;
  projectColor: string;
  updatedAt: string;
}

export interface ActiveSprintSummary {
  id: string;
  name: string;
  projectName: string;
  projectColor: string;
  daysRemaining: number;
  progressPercent: number;
  totalTasks: number;
  doneTasks: number;
  endDate: string;
}

export interface UpcomingMeeting {
  id: string;
  title: string;
  time: string;
  status: string;
  meetingUrl?: string;
}

export interface RecentDocument {
  id: string;
  title: string;
  type: string;
  updatedAt: string;
}

export interface DailyShift {
  date: string;
  dayName: string;
  dayNumber: string;
  type: 'OFFICE' | 'WFH' | 'LEAVE' | 'WEEKEND';
  badgeLabel: string;
  timeRange: string;
  isToday: boolean;
}

export interface EmployeeDashboardData {
  taskSummary: TaskSummary;
  urgentTasks: UrgentTask[];
  upcomingTasks: UrgentTask[];
  myWeeklyDone: number;
  weeklyVelocity: WeeklyVelocityPoint[];
  projectProgress: ProjectProgress[];
  statusDistribution: DistributionItem[];
  priorityDistribution: DistributionItem[];
  recentActivities: RecentActivity[];
  teamWorkload: TeamMemberWorkload[];
  activeSprint: ActiveSprintSummary | null;
  upcomingMeetings?: UpcomingMeeting[];
  recentDocuments?: RecentDocument[];
  weeklySchedule?: DailyShift[];
}

// PM Specific Interfaces
export interface SprintBurndownPoint {
  day: string;
  ideal: number;
  actual: number;
}

export interface RiskAlert {
  id: string;
  type: 'BLOCKED_TASK' | 'OVERDUE' | 'LATE_ASSIGNEE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  link?: string;
}

export interface PmKpiRibbon {
  totalProjects: number;
  activeProjects: number;
  openTasks: number;
  blockedTasks: number;
  overdueTasks: number;
  teamMembersCount: number;
  completionRate: number;
}

export interface AiSprintInsight {
  sprintName: string;
  completionRate: number;
  blockedTaskTitle?: string;
  blockedTaskId?: string;
  blockedDays?: number;
  recommendation: string;
  suggestedAction: string;
  releaseDate?: string;
}

export interface TeamMemberAvailability {
  id: string;
  name: string;
  avatar: string | null;
  role: string;
  status: 'OFFICE' | 'WFH' | 'LEAVE';
  checkInTime?: string | null;
}

export interface TeamCapacity {
  totalMembers: number;
  inOfficeToday: number;
  wfhToday: number;
  onLeaveToday: number;
  totalAvailableHoursWeek: number;
  maxCapacityHoursWeek: number;
  capacityPercent: number;
  membersSummary: TeamMemberAvailability[];
}

export interface SprintScopeCreep {
  sprintId: string;
  sprintName: string;
  initialStoryPoints: number;
  addedStoryPoints: number;
  currentStoryPoints: number;
  initialTasksCount: number;
  addedTasksCount: number;
  addedTasksList: Array<{ id: string; title: string; storyPoints: number; addedAt: string }>;
  creepPercent: number;
}

export interface PmDashboardData extends EmployeeDashboardData {
  pmKpi?: PmKpiRibbon;
  sprintBurndown?: SprintBurndownPoint[];
  risks?: RiskAlert[];
  aiSprintInsight?: AiSprintInsight;
  teamCapacity?: TeamCapacity;
  scopeCreep?: SprintScopeCreep;
}

// HR Specific Interfaces
export interface WorkforceSummary {
  totalEmployees: number;
  activeToday: number;
  onLeave: number;
  wfhToday: number;
  absentUnapproved: number;
}

export interface AttendanceKpi {
  attendanceRate: number;
  onTimeRate: number;
  lateRate: number;
  avgWorkHours: number;
}

export interface AttendanceDistribution {
  onTime: number;
  late: number;
  veryLate: number;
  wfh: number;
  absentApproved: number;
  absentUnapproved: number;
}

export interface DepartmentMetric {
  departmentName: string;
  totalMembers: number;
  presentCount: number;
  lateCount: number;
  lateRate: number;
  onLeaveCount: number;
}

export interface PendingApprovalsSummary {
  wfhCount: number;
  leaveCount: number;
  total: number;
}

export interface ComplianceAlert {
  id: string;
  userName: string;
  department: string;
  issue: string;
  severity: 'MEDIUM' | 'HIGH';
  date: string;
}

export interface QuickApprovalItem {
  id: string;
  type: 'WFH' | 'LEAVE';
  userId: string;
  userName: string;
  userAvatar: string | null;
  departmentName: string;
  dateOrRange: string;
  reason: string;
  createdAt: string;
  urgentLevel: 'NORMAL' | 'HIGH' | 'CRITICAL';
}

export interface HeadcountTrendPoint {
  month: string;
  headcount: number;
  newHires: number;
  retentionRate: number;
}

export interface CultureEvent {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  departmentName: string;
  type: 'BIRTHDAY' | 'WORK_ANNIVERSARY_1Y' | 'WORK_ANNIVERSARY_3Y' | 'WORK_ANNIVERSARY_5Y';
  title: string;
  dateDesc: string;
  badgeText: string;
}

export interface HrDashboardData {
  taskSummary: TaskSummary;
  workforceSummary: WorkforceSummary;
  attendanceKpi: AttendanceKpi;
  attendanceDistribution: AttendanceDistribution;
  lateArrivalsByDepartment: DepartmentMetric[];
  leaveUsageByDepartment: DepartmentMetric[];
  pendingApprovals: PendingApprovalsSummary;
  complianceAlerts: ComplianceAlert[];
  quickApprovals?: QuickApprovalItem[];
  headcountTrend?: HeadcountTrendPoint[];
  cultureEvents?: CultureEvent[];
}

// Admin Specific Interfaces
export interface PlatformHealth {
  activeUsers: number;
  activeUsersNow: number;
  apiRequestsToday: number;
  errorRateToday: number;
  dbSize: string;
  uptime: string;
}

export interface SystemGauges {
  cpuUsagePercent: number;
  memoryUsagePercent: number;
  dbConnectionsActive: number;
  dbConnectionsMax: number;
  storageUsedGb: number;
  storageMaxGb: number;
}

export interface ApiLatency {
  p50: number;
  p95: number;
  p99: number;
}

export interface ErrorLogEntry {
  id: string;
  timestamp: string;
  level: 'WARN' | 'ERROR' | 'FATAL';
  source: string;
  message: string;
  resolved: boolean;
}

export interface AdminDashboardData extends EmployeeDashboardData {
  systemHealth: SystemHealth;
  platformHealth?: PlatformHealth;
  systemGauges?: SystemGauges;
  apiLatency?: ApiLatency;
  errorLogs?: ErrorLogEntry[];
  configStatus?: {
    officeName: string;
    gpsRadiusMeters: number;
    ipRangesCount: number;
    workHours: string;
  };
}

export interface DepartmentHeadProject {
  id: string;
  name: string;
  description: string | null;
  color: string;
  workflowType: 'SCRUM' | 'KANBAN' | 'DAILY' | 'SIMPLE';
  status: string;
  startDate: string | null;
  endDate: string | null;
  pm: { id: string; name: string; avatar: string | null; email: string } | null;
  createdBy: { id: string; name: string; avatar: string | null } | null;
  memberCount: number;
  progressPercent: number;
  taskCounts: {
    total: number;
    done: number;
    inProgress: number;
    todo: number;
  };
  activeSprint: {
    id: string;
    name: string;
    goal: string | null;
    progressPercent: number;
    daysRemaining: number;
    totalTasks: number;
    doneTasks: number;
    endDate: string;
  } | null;
}

export interface DepartmentHeadActiveSprint {
  id: string;
  name: string;
  goal: string | null;
  projectId: string;
  projectName: string;
  projectColor: string;
  pmName: string;
  pmAvatar: string | null;
  progressPercent: number;
  daysRemaining: number;
  totalTasks: number;
  doneTasks: number;
  endDate: string;
}

export interface DepartmentHeadMemberWorkload {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  position: string | null;
  role: string;
  openTasks: number;
  overdueTasks: number;
  attendanceStatus: string;
  checkInTime: string | null;
}

export interface AttendanceInOfficeMember {
  id: string;
  name: string;
  avatar: string | null;
  position: string | null;
  email: string;
  checkInTime: string | null;
  checkInMethod: string;
  checkInIp?: string | null;
  status: string;
  note?: string | null;
}

export interface AttendanceWfhMember {
  id: string;
  name: string;
  avatar: string | null;
  position: string | null;
  email: string;
  checkInTime: string | null;
  checkInMethod: string;
  status: string;
  reason?: string;
}

export interface AttendanceLeaveMember {
  id: string;
  name: string;
  avatar: string | null;
  position: string | null;
  email: string;
  leaveType: string;
  startDate?: string;
  endDate?: string;
  dayCount?: number;
  reason?: string;
  status: string;
}

export interface AttendanceNotCheckedInMember {
  id: string;
  name: string;
  avatar: string | null;
  position: string | null;
  email: string;
  pendingWfh?: string | null;
  pendingLeave?: string | null;
}

export interface AttendanceSummaryDetails {
  inOffice: AttendanceInOfficeMember[];
  wfh: AttendanceWfhMember[];
  leave: AttendanceLeaveMember[];
  notCheckedIn: AttendanceNotCheckedInMember[];
}

export interface DepartmentHeadDashboardData {
  department: {
    id: string;
    name: string;
    description: string | null;
  };
  metrics: {
    totalMembers: number;
    activeProjects: number;
    activeSprints: number;
    quickTasksToday: number;
    quickTasksOverdue: number;
    onTrackPercent: number;
    attendanceRate: number;
  };
  attendanceSummary: {
    inOffice: number;
    wfh: number;
    leave: number;
    notCheckedIn: number;
    totalMembers: number;
    details?: AttendanceSummaryDetails;
  };
  projects: DepartmentHeadProject[];
  activeSprints: DepartmentHeadActiveSprint[];
  quickTasks: any[];
  teamWorkload: DepartmentHeadMemberWorkload[];
}

export type DashboardData =
  | EmployeeDashboardData
  | PmDashboardData
  | HrDashboardData
  | AdminDashboardData
  | DepartmentHeadDashboardData;

export type DashboardState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: DashboardData; role: Role }
  | { status: 'error'; error: string };

export type DashboardRole = 'employee' | 'pm' | 'hr' | 'admin' | 'department-head' | 'me';

export interface DeptHeadProjectDetail {
  id: string;
  name: string;
  description: string | null;
  color: string;
  status: string;
  workflowType: string;
  startDate: string | null;
  endDate: string | null;
  pm: { id: string; name: string; email: string; avatar: string | null } | null;
  createdBy: { id: string; name: string; avatar: string | null } | null;
  memberCount: number;
  taskCounts: {
    total: number;
    done: number;
    inProgress: number;
    blocked: number;
    overdue: number;
  };
  progressPercent: number;
  members: Array<{
    id: string;
    name: string;
    avatar: string | null;
    projectRole: string;
    position?: string | null;
  }>;
  recentTasks: Array<{
    id: string;
    title: string;
    status: string;
    priority: string;
    assigneeName: string | null;
    updatedAt: string;
  }>;
  sprints: Array<{
    id: string;
    name: string;
    status: string;
    progressPercent: number;
    daysRemaining: number;
    endDate: string | null;
  }>;
  activeSprint: {
    id: string;
    name: string;
    progressPercent: number;
    daysRemaining: number;
    isAtRisk: boolean;
  } | null;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskReasons: string[];
}

export interface DeptHeadSprintDetail {
  id: string;
  name: string;
  goal: string | null;
  status: string;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  daysTotal: number;
  project: {
    id: string;
    name: string;
    color: string;
  };
  pm: { id: string; name: string; avatar: string | null } | null;
  totalTasks: number;
  doneTasks: number;
  inProgressTasks: number;
  blockedTasks: number;
  totalStoryPoints: number;
  doneStoryPoints: number;
  progressPercent: number;
  burndown: Array<{
    date: string;
    dayName: string;
    ideal: number;
    actual: number;
    isToday: boolean;
  }>;
  memberContribution: Array<{
    userId: string;
    userName: string;
    avatar: string | null;
    assignedTasks: number;
    doneTasks: number;
    doneStoryPoints: number;
    contributionPercent: number;
  }>;
  blockedTasksList: Array<{
    id: string;
    title: string;
    priority: string;
    blockedDays: number;
    assigneeName: string | null;
  }>;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskReasons: string[];
}

export interface DeptHeadMemberProfile {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  position: string | null;
  role: string;
  department: { id: string; name: string } | null;
  stats: {
    openTasks: number;
    overdueTasks: number;
    doneThisWeek: number;
    doneThisMonth: number;
  };
  attendanceHistory: Array<{
    date: string;
    dayName: string;
    status: 'OFFICE' | 'WFH' | 'LEAVE' | 'OFF' | 'PENDING';
    checkInTime: string | null;
  }>;
  recentQuickTasks: Array<{
    id: string;
    title: string;
    status: string;
    dueDate: string;
  }>;
  recentProjectTasks: Array<{
    id: string;
    title: string;
    status: string;
    projectName: string;
    projectColor: string;
  }>;
}

export interface SwapPmRequest {
  newPmId: string;
  reason?: string;
}

