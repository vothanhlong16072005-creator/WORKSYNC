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
}

export class PmDashboardDto extends EmployeeDashboardDto {}

export class HrDashboardDto {
  taskSummary!: TaskSummaryDto;
  attendanceSummary!: null;
}

export class AdminDashboardDto extends EmployeeDashboardDto {
  systemHealth!: SystemHealthDto;
}
