export type Role = 'ADMIN' | 'HR' | 'PM' | 'EMPLOYEE';

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
}

export interface PmDashboardData extends EmployeeDashboardData {}

export interface HrDashboardData {
  taskSummary: TaskSummary;
  attendanceSummary: null;
}

export interface AdminDashboardData extends EmployeeDashboardData {
  systemHealth: SystemHealth;
}

export type DashboardData = EmployeeDashboardData | PmDashboardData | HrDashboardData | AdminDashboardData;

export type DashboardState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: DashboardData; role: Role }
  | { status: 'error'; error: string };

export type DashboardRole = 'employee' | 'pm' | 'hr' | 'admin' | 'me';
