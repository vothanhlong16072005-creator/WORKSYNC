export class TaskSummaryDto {
  total!: number;
  inProgress!: number;
  inReview!: number;
  blocked!: number;
  done!: number;
  todo!: number;
  completionRate!: number;
  overdueCount!: number;
  totalStoryPoints!: number;
  totalEstimatedHours!: number;
  totalActualHours!: number;
}

export class UrgentTaskDto {
  id!: string;
  title!: string;
  priority!: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status!: string;
  dueDate!: string | null;
  projectName!: string;
  projectColor!: string;
  storyPoints?: number | null;
}

export class SprintProgressDto {
  id!: string;
  name!: string;
  status!: 'PLANNING' | 'ACTIVE' | 'COMPLETED';
  totalTasks!: number;
  doneTasks!: number;
  progressPercent!: number;
}

export class ProjectProgressDto {
  projectId!: string;
  projectName!: string;
  projectColor!: string;
  totalTasks!: number;
  doneTasks!: number;
  progressPercent!: number;
  myTasksCount?: number;
  activeSprint?: { id: string; name: string; endDate: string };
  sprints!: SprintProgressDto[];
}

export class TeamMemberWorkloadDto {
  userId!: string;
  userName!: string;
  avatar!: string | null;
  openTaskCount!: number;
  totalStoryPoints!: number | null;
}

export class SystemHealthDto {
  activeUsers!: number;
  totalProjects!: number;
  totalTasks!: number;
  completedTasks!: number;
}

export class WeeklyVelocityPointDto {
  date!: string;
  dayName!: string;
  doneCount!: number;
  createdCount!: number;
}

export class DistributionItemDto {
  name!: string;
  label!: string;
  count!: number;
  percent!: number;
  color!: string;
}

export class RecentActivityDto {
  id!: string;
  title!: string;
  status!: string;
  priority!: string;
  projectName!: string;
  projectColor!: string;
  updatedAt!: string;
}

export class ActiveSprintSummaryDto {
  id!: string;
  name!: string;
  projectName!: string;
  projectColor!: string;
  daysRemaining!: number;
  progressPercent!: number;
  totalTasks!: number;
  doneTasks!: number;
  endDate!: string;
}

export class UpcomingMeetingDto {
  id!: string;
  title!: string;
  time!: string;
  status!: string;
  meetingUrl?: string;
}

export class RecentDocumentDto {
  id!: string;
  title!: string;
  type!: string;
  updatedAt!: string;
}

export class DailyShiftDto {
  date!: string;
  dayName!: string;
  dayNumber!: string;
  type!: 'OFFICE' | 'WFH' | 'LEAVE' | 'WEEKEND';
  badgeLabel!: string;
  timeRange!: string;
  isToday!: boolean;
}

export class EmployeeDashboardDto {
  taskSummary!: TaskSummaryDto;
  urgentTasks!: UrgentTaskDto[];
  upcomingTasks!: UrgentTaskDto[];
  myWeeklyDone!: number;
  weeklyVelocity!: WeeklyVelocityPointDto[];
  projectProgress!: ProjectProgressDto[];
  statusDistribution!: DistributionItemDto[];
  priorityDistribution!: DistributionItemDto[];
  recentActivities!: RecentActivityDto[];
  teamWorkload!: TeamMemberWorkloadDto[];
  activeSprint!: ActiveSprintSummaryDto | null;
  upcomingMeetings!: UpcomingMeetingDto[];
  recentDocuments!: RecentDocumentDto[];
  weeklySchedule?: DailyShiftDto[];
}

// --- PM Specific DTOs ---
export class SprintBurndownPointDto {
  day!: string;
  ideal!: number;
  actual!: number;
}

export class RiskAlertDto {
  id!: string;
  type!: 'BLOCKED_TASK' | 'OVERDUE' | 'LATE_ASSIGNEE';
  severity!: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title!: string;
  description!: string;
  link?: string;
}

export class PmKpiRibbonDto {
  totalProjects!: number;
  activeProjects!: number;
  openTasks!: number;
  blockedTasks!: number;
  overdueTasks!: number;
  teamMembersCount!: number;
  completionRate!: number;
}

export class AiSprintInsightDto {
  sprintName!: string;
  completionRate!: number;
  blockedTaskTitle?: string;
  blockedTaskId?: string;
  blockedDays?: number;
  recommendation!: string;
  suggestedAction!: string;
  releaseDate?: string;
}

export class TeamMemberAvailabilityDto {
  id!: string;
  name!: string;
  avatar!: string | null;
  role!: string;
  status!: 'OFFICE' | 'WFH' | 'LEAVE';
  checkInTime?: string | null;
}

export class TeamCapacityDto {
  totalMembers!: number;
  inOfficeToday!: number;
  wfhToday!: number;
  onLeaveToday!: number;
  totalAvailableHoursWeek!: number;
  maxCapacityHoursWeek!: number;
  capacityPercent!: number;
  membersSummary!: TeamMemberAvailabilityDto[];
}

export class SprintScopeCreepDto {
  sprintId!: string;
  sprintName!: string;
  initialStoryPoints!: number;
  addedStoryPoints!: number;
  currentStoryPoints!: number;
  initialTasksCount!: number;
  addedTasksCount!: number;
  addedTasksList!: Array<{ id: string; title: string; storyPoints: number; addedAt: string }>;
  creepPercent!: number;
}

export class PmDashboardDto extends EmployeeDashboardDto {
  pmKpi!: PmKpiRibbonDto;
  sprintBurndown!: SprintBurndownPointDto[];
  risks!: RiskAlertDto[];
  aiSprintInsight?: AiSprintInsightDto;
  teamCapacity?: TeamCapacityDto;
  scopeCreep?: SprintScopeCreepDto;
}

// --- HR Specific DTOs ---
export class WorkforceSummaryDto {
  totalEmployees!: number;
  activeToday!: number;
  onLeave!: number;
  wfhToday!: number;
  absentUnapproved!: number;
}

export class AttendanceKpiDto {
  attendanceRate!: number;
  onTimeRate!: number;
  lateRate!: number;
  avgWorkHours!: number;
}

export class AttendanceDistributionDto {
  onTime!: number;
  late!: number;
  veryLate!: number;
  wfh!: number;
  absentApproved!: number;
  absentUnapproved!: number;
}

export class DepartmentMetricDto {
  departmentName!: string;
  totalMembers!: number;
  presentCount!: number;
  lateCount!: number;
  lateRate!: number;
  onLeaveCount!: number;
}

export class PendingApprovalsSummaryDto {
  wfhCount!: number;
  leaveCount!: number;
  total!: number;
}

export class ComplianceAlertDto {
  id!: string;
  userName!: string;
  department!: string;
  issue!: string;
  severity!: 'MEDIUM' | 'HIGH';
  date!: string;
}

export class QuickApprovalItemDto {
  id!: string;
  type!: 'WFH' | 'LEAVE';
  userId!: string;
  userName!: string;
  userAvatar!: string | null;
  departmentName!: string;
  dateOrRange!: string;
  reason!: string;
  createdAt!: string;
  urgentLevel!: 'NORMAL' | 'HIGH' | 'CRITICAL';
}

export class HeadcountTrendPointDto {
  month!: string;
  headcount!: number;
  newHires!: number;
  retentionRate!: number;
}

export class CultureEventDto {
  id!: string;
  userId!: string;
  userName!: string;
  userAvatar!: string | null;
  departmentName!: string;
  type!: 'BIRTHDAY' | 'WORK_ANNIVERSARY_1Y' | 'WORK_ANNIVERSARY_3Y' | 'WORK_ANNIVERSARY_5Y';
  title!: string;
  dateDesc!: string;
  badgeText!: string;
}

export class HrDashboardDto {
  taskSummary!: TaskSummaryDto;
  workforceSummary!: WorkforceSummaryDto;
  attendanceKpi!: AttendanceKpiDto;
  attendanceDistribution!: AttendanceDistributionDto;
  lateArrivalsByDepartment!: DepartmentMetricDto[];
  leaveUsageByDepartment!: DepartmentMetricDto[];
  pendingApprovals!: PendingApprovalsSummaryDto;
  complianceAlerts!: ComplianceAlertDto[];
  quickApprovals!: QuickApprovalItemDto[];
  headcountTrend!: HeadcountTrendPointDto[];
  cultureEvents!: CultureEventDto[];
}

// --- Admin Specific DTOs ---
export class PlatformHealthDto {
  activeUsers!: number;
  activeUsersNow!: number;
  apiRequestsToday!: number;
  errorRateToday!: number;
  dbSize!: string;
  uptime!: string;
}

export class SystemGaugesDto {
  cpuUsagePercent!: number;
  memoryUsagePercent!: number;
  dbConnectionsActive!: number;
  dbConnectionsMax!: number;
  storageUsedGb!: number;
  storageMaxGb!: number;
}

export class ApiLatencyDto {
  p50!: number;
  p95!: number;
  p99!: number;
}

export class ErrorLogEntryDto {
  id!: string;
  timestamp!: string;
  level!: 'WARN' | 'ERROR' | 'FATAL';
  source!: string;
  message!: string;
  resolved!: boolean;
}

export class AdminDashboardDto extends EmployeeDashboardDto {
  systemHealth!: SystemHealthDto;
  platformHealth!: PlatformHealthDto;
  systemGauges!: SystemGaugesDto;
  apiLatency!: ApiLatencyDto;
  errorLogs!: ErrorLogEntryDto[];
  configStatus!: {
    officeName: string;
    gpsRadiusMeters: number;
    ipRangesCount: number;
    workHours: string;
  };
}
