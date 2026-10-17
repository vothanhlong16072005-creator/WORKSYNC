/**
 * Project Types — M3.5
 */

export type ProjectWorkflowType = 'SCRUM' | 'KANBAN' | 'DAILY' | 'SIMPLE';

export type ProjectStatus = 'PLANNING' | 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';

export interface ProjectMemberUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  role: string;
}

export interface ProjectMemberItem {
  id: string;
  userId: string;
  projectId: string;
  projectRole: string;
  joinedAt: string;
  user: ProjectMemberUser;
}

export interface ProjectProgress {
  totalTasks: number;
  doneTasks: number;
  inProgressTasks: number;
  todoTasks: number;
  blockedTasks: number;
  percent: number;
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string | null;
  kind: 'TEAM' | 'PERSONAL';
  color: string;
  icon: string | null;
  workflowType: ProjectWorkflowType;
  status: ProjectStatus;
  startDate: string | null;
  endDate: string | null;
  pmId: string | null;
  departmentId: string | null;
  pm?: {
    id: string;
    name: string;
    avatar: string | null;
    email: string;
  } | null;
  department?: {
    id: string;
    name: string;
  } | null;
  createdBy?: {
    id: string;
    name: string;
    avatar: string | null;
    email: string;
  } | null;
  members?: ProjectMemberItem[];
  memberCount?: number;
  openAssignedTaskCount?: number;
  activeSprint?: {
    id: string;
    name: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    durationDays: number;
  } | null;
  sprints?: Array<{
    id: string;
    name: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    durationDays: number;
  }>;
  progress?: ProjectProgress;
}
