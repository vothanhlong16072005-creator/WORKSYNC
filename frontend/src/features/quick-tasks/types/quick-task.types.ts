/**
 * QuickTask Types — M3.5
 *
 * "Giao việc nhanh" — không cần sprint, không cần workflow, chỉ cần người nhận + deadline.
 * Use case chính: Trưởng phòng giao việc hàng ngày cho nhân viên phòng mình.
 */

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'BLOCKED' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface QuickTaskUser {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  position?: string;
}

export interface QuickTaskProjectRef {
  id: string;
  name: string;
  color: string;
}

export interface QuickTask {
  id: string;
  title: string;
  description: string | null;
  projectId: string | null;
  project: QuickTaskProjectRef | null;
  assigneeId: string;
  assignee: QuickTaskUser;
  assignedById: string;
  assignedBy: QuickTaskUser;
  dueDate: string; // ISO datetime
  priority: Priority;
  status: TaskStatus;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuickTaskStats {
  total: number;
  today: number;
  overdue: number;
  byStatus: Partial<Record<TaskStatus, number>>;
  byPriority: Partial<Record<Priority, number>>;
}

export interface CreateQuickTaskPayload {
  title: string;
  description?: string;
  assigneeId: string;
  projectId?: string;
  dueDate: string;
  priority?: Priority;
  status?: TaskStatus;
}

export interface UpdateQuickTaskPayload {
  title?: string;
  description?: string;
  dueDate?: string;
  priority?: Priority;
  status?: TaskStatus;
}
