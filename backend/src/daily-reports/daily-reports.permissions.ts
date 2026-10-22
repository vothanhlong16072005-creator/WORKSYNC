import { Role } from '@prisma/client';

export interface ActorContext {
  id: string;
  role: Role;
  departmentId: string | null;
}

/**
 * Kiểm tra quyền xem báo cáo của user khác:
 * - ADMIN / HR: Xem được tất cả mọi người
 * - DEPARTMENT_HEAD: Xem được nhân sự cùng phòng ban
 * - PM: Xem được thành viên trong các dự án mình làm PM
 * - Chính bản thân: Luôn xem được
 */
export function canViewReportsOf(
  actor: ActorContext,
  targetUserId: string,
  context: { sameDepartment: boolean; isProjectMember: boolean },
): boolean {
  if (actor.id === targetUserId) return true;
  if (actor.role === Role.ADMIN || actor.role === Role.HR) return true;
  if (actor.role === Role.DEPARTMENT_HEAD && context.sameDepartment) return true;
  if (actor.role === Role.PM && context.isProjectMember) return true;
  return false;
}

/**
 * Kiểm tra quyền nộp báo cáo hộ nhân sự:
 * - ADMIN: Được nộp hộ bất kỳ ai
 * - DEPARTMENT_HEAD: Được nộp hộ nhân sự trong phòng ban
 * - PM: Được nộp hộ thành viên trong dự án
 */
export function canSubmitOnBehalf(
  actor: ActorContext,
  context: { sameDepartment: boolean; isProjectMember: boolean },
): boolean {
  if (actor.role === Role.ADMIN) return true;
  if (actor.role === Role.DEPARTMENT_HEAD && context.sameDepartment) return true;
  if (actor.role === Role.PM && context.isProjectMember) return true;
  return false;
}

/**
 * Kiểm tra quyền chỉnh sửa báo cáo:
 * - Báo cáo đã khoá (sau midnight): Không ai được sửa (kể cả nhân viên)
 * - Báo cáo chưa khoá: Người nộp (chính mình) hoặc ADMIN được chỉnh sửa
 */
export function canEditReport(
  actor: ActorContext,
  report: { userId: string; isLocked: boolean },
): boolean {
  if (report.isLocked) return false;
  if (report.userId === actor.id) return true;
  if (actor.role === Role.ADMIN) return true;
  return false;
}
