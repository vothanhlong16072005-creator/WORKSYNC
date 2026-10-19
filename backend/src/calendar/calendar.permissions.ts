import { Role } from '@prisma/client';
import { ItemKind } from './types/timeline.types.js';

export interface AuthActor {
  id: string;
  role: Role;
  departmentId?: string | null;
}

export interface PermissionCheckItem {
  createdById?: string;
  creatorId?: string;
  creatorName?: string;
  assigneeId?: string | null;
  projectId?: string | null;
  userId?: string | null;
  isProjectPm?: boolean;
}

export type PermissionCheckResult =
  | { allowed: true }
  | { allowed: false; reason: string; creatorName?: string };

export function canReschedule(
  kind: ItemKind,
  item: PermissionCheckItem,
  user: AuthActor,
): PermissionCheckResult {
  const creatorId = item.createdById || item.creatorId || '';
  const creatorName = item.creatorName || 'người tạo';

  // 1. Leave, WFH, Overtime are NEVER draggable / reschedulable directly
  if (kind === 'leave' || kind === 'wfh' || kind === 'overtime') {
    return {
      allowed: false,
      reason: 'Không thể tự ý đổi lịch yêu cầu nhân sự. Vui lòng gửi yêu cầu mới tới HR.',
    };
  }

  // 2. Sprints can only be rescheduled by PM of the project or ADMIN
  if (kind === 'sprint') {
    if (user.role === Role.ADMIN || item.isProjectPm) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: 'Chỉ Quản trị viên hoặc PM của dự án mới có quyền đổi lịch Sprint.',
      creatorName,
    };
  }

  // 3. Meetings can only be rescheduled by creator or ADMIN
  if (kind === 'meeting') {
    if (user.role === Role.ADMIN || creatorId === user.id) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Chỉ người tạo cuộc họp mới đổi được lịch. Liên hệ ${creatorName}`,
      creatorName,
    };
  }

  // 4. Tasks can be rescheduled by assignee, creator, project PM, or ADMIN
  if (kind === 'task') {
    const isAssignee = item.assigneeId === user.id;
    const isCreator = creatorId === user.id;
    const isProjectPm = item.isProjectPm;
    const isAdmin = user.role === Role.ADMIN;

    if (isAssignee || isCreator || isProjectPm || isAdmin) {
      return { allowed: true };
    }
    return {
      allowed: false,
      reason: `Chỉ người tạo task hoặc người được giao mới đổi được lịch. Liên hệ ${creatorName}`,
      creatorName,
    };
  }

  return {
    allowed: false,
    reason: 'Không có quyền thay đổi lịch.',
  };
}
