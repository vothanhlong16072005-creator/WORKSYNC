/**
 * QuickTask Service
 *
 * Quy tắc nghiệp vụ (M3.5):
 * - DEPT_HEAD chỉ có thể giao Quick Task cho nhân viên CÙNG PHÒNG với mình
 * - PM chỉ có thể giao Quick Task cho thành viên project của mình
 * - Admin có thể giao cho bất kỳ ai
 * - Assignee có thể update status / completedAt
 * - Người giao (assignedBy) có thể xóa task mình tạo
 */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { Role, TaskStatus, type Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateQuickTaskDto } from './dto/create-quick-task.dto.js';
import { UpdateQuickTaskDto } from './dto/update-quick-task.dto.js';

export interface CurrentActor {
  id: string;
  role: Role;
  departmentId: string | null;
}

import { NotificationTriggersService } from '../notifications/notification-triggers.service.js';

@Injectable()
export class QuickTaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly triggers: NotificationTriggersService,
  ) {}

  /**
   * Tạo Quick Task
   * - Validate RBAC role-level trước (fail-fast cho HR/EMPLOYEE)
   * - Validate assignee tồn tại
   * - Validate scope-level RBAC (cùng phòng, cùng project)
   * - Validate project nếu có
   */
  async create(dto: CreateQuickTaskDto, actor: CurrentActor) {
    // 1. RBAC role-level (fail-fast: chặn HR/EMPLOYEE ngay)
    this.validateRolePermission(actor);

    // 2. Validate assignee tồn tại
    const assignee = await this.prisma.user.findUnique({
      where: { id: dto.assigneeId },
      select: { id: true, departmentId: true, name: true, role: true, status: true },
    });
    if (!assignee || assignee.status === 'INACTIVE') {
      throw new NotFoundException('Người nhận không tồn tại hoặc đã bị vô hiệu hóa');
    }

    // 3. RBAC scope-level (DEPT_HEAD: cùng phòng, PM: cùng project)
    await this.validateScopePermission(actor, assignee.departmentId, dto.projectId);

    // 4. Validate project nếu có
    if (dto.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: dto.projectId },
        select: { id: true, deletedAt: true },
      });
      if (!project || project.deletedAt) {
        throw new NotFoundException('Dự án không tồn tại');
      }
    }

    // 5. Tạo
    const task = await this.prisma.quickTask.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        projectId: dto.projectId ?? null,
        assigneeId: dto.assigneeId,
        assignedById: actor.id,
        dueDate: new Date(dto.dueDate),
        priority: dto.priority,
        status: dto.status,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        assignedBy: { select: { id: true, name: true, email: true, avatar: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    });

    try {
      await this.triggers.quickTaskAssigned({
        id: task.id,
        title: task.title,
        assigneeId: task.assigneeId,
        assignedById: task.assignedById,
        dueDate: task.dueDate,
      });

      if (dto.description) {
        await this.triggers.mentionInContent(
          dto.description,
          { id: actor.id, name: task.assignedBy.name },
          {
            type: 'QUICK_TASK',
            id: task.id,
            title: task.title,
            url: `/quick-tasks/${task.id}`,
          },
        );
      }
    } catch (err) {
      // Non-blocking notification
    }

    return task;
  }

  /**
   * Lấy danh sách QuickTask
   * - Admin: tất cả
   * - DEPT_HEAD: của nhân viên phòng mình (giao hoặc nhận)
   * - PM/HR: của mình (giao hoặc nhận) + member project mình PM
   * - EMPLOYEE: chỉ của mình
   */
  async findAll(actor: CurrentActor, filters?: { status?: TaskStatus; assigneeId?: string }) {
    const where: Prisma.QuickTaskWhereInput = {};

    if (actor.role === Role.EMPLOYEE) {
      where.assigneeId = actor.id;
    } else if (actor.role === Role.DEPARTMENT_HEAD) {
      const deptId = await this.getActorDepartmentId(actor);
      // QuickTask giao cho hoặc do nhân viên phòng mình
      where.OR = [
        ...(deptId ? [{ assignee: { departmentId: deptId } }] : []),
        { assignedById: actor.id },
        { assigneeId: actor.id },
      ];
    } else if (actor.role === Role.PM) {
      // QuickTask của member project mình PM
      const myProjectIds = await this.prisma.project.findMany({
        where: { pmId: actor.id, deletedAt: null },
        select: { id: true },
      });
      const projectIds = myProjectIds.map((p) => p.id);

      where.OR = [
        { assignedById: actor.id },
        { assigneeId: actor.id },
        { projectId: { in: projectIds } },
      ];
    }
    // Admin: thấy tất cả, không cần filter

    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.assigneeId) {
      where.assigneeId = filters.assigneeId;
    }

    return this.prisma.quickTask.findMany({
      where,
      include: {
        assignee: { select: { id: true, name: true, email: true, avatar: true, position: true } },
        assignedBy: { select: { id: true, name: true, email: true, avatar: true } },
        project: { select: { id: true, name: true, color: true } },
      },
      orderBy: [{ dueDate: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Lấy 1 QuickTask theo id
   */
  async findOne(id: string, actor: CurrentActor) {
    const task = await this.prisma.quickTask.findUnique({
      where: { id },
      include: {
        assignee: { select: { id: true, name: true, email: true, avatar: true, departmentId: true, position: true } },
        assignedBy: { select: { id: true, name: true, email: true, avatar: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    });
    if (!task) {
      throw new NotFoundException('Quick task không tồn tại');
    }
    await this.validateViewPermission(actor, task);
    return task;
  }

  /**
   * Cập nhật QuickTask
   * - Assignee: có thể update status (mark done)
   * - Người giao: update mọi thứ
   * - Admin: update mọi thứ
   */
  async update(id: string, dto: UpdateQuickTaskDto, actor: CurrentActor) {
    const task = await this.prisma.quickTask.findUnique({ where: { id } });
    if (!task) {
      throw new NotFoundException('Quick task không tồn tại');
    }

    const isAssignee = task.assigneeId === actor.id;
    const isAssigner = task.assignedById === actor.id;
    const isAdmin = actor.role === Role.ADMIN;

    if (!isAssignee && !isAssigner && !isAdmin) {
      throw new ForbiddenException('Bạn không có quyền sửa task này');
    }

    // Assignee chỉ được đổi status
    if (isAssignee && !isAssigner && !isAdmin) {
      const allowedFields = Object.keys(dto);
      const onlyStatusUpdate = allowedFields.every((k) => k === 'status');
      if (!onlyStatusUpdate) {
        throw new ForbiddenException('Assignee chỉ có thể cập nhật trạng thái');
      }
    }

    const data: Prisma.QuickTaskUpdateInput = {
      ...(dto.title !== undefined && { title: dto.title }),
      ...(dto.description !== undefined && { description: dto.description }),
      ...(dto.dueDate !== undefined && { dueDate: new Date(dto.dueDate) }),
      ...(dto.priority !== undefined && { priority: dto.priority }),
      ...(dto.status !== undefined && { status: dto.status }),
    };

    // Auto set completedAt
    const isRevertingDone = task.status === TaskStatus.DONE && dto.status !== TaskStatus.DONE;
    if (dto.status === TaskStatus.DONE) {
      data.completedAt = new Date();
    } else if (isRevertingDone && task.completedAt) {
      data.completedAt = null;
    }

    return this.prisma.quickTask.update({
      where: { id },
      data,
      include: {
        assignee: { select: { id: true, name: true, email: true, avatar: true } },
        assignedBy: { select: { id: true, name: true, email: true, avatar: true } },
        project: { select: { id: true, name: true, color: true } },
      },
    });
  }

  /**
   * Xóa QuickTask
   * - Người giao, Admin, hoặc PM (nếu thuộc project) mới được xóa
   */
  async remove(id: string, actor: CurrentActor) {
    const task = await this.prisma.quickTask.findUnique({ where: { id } });
    if (!task) {
      throw new NotFoundException('Quick task không tồn tại');
    }

    const isAssigner = task.assignedById === actor.id;
    const isAdmin = actor.role === Role.ADMIN;
    const isPm = actor.role === Role.PM && task.projectId !== null;
    let canDeleteAsPm = false;
    if (isPm && task.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: task.projectId },
        select: { pmId: true },
      });
      canDeleteAsPm = project?.pmId === actor.id;
    }

    if (!isAssigner && !isAdmin && !canDeleteAsPm) {
      throw new ForbiddenException('Bạn không có quyền xóa task này');
    }

    await this.prisma.quickTask.delete({ where: { id } });
    return { id, deleted: true };
  }

  // ============================================================
  // RBAC helpers
  // ============================================================

  /**
   * Validate role-level (Admin, DEPT_HEAD, PM có thể giao; HR/EMPLOYEE không)
   */
  private validateRolePermission(actor: CurrentActor) {
    if (actor.role === Role.ADMIN) return;
    if (actor.role === Role.DEPARTMENT_HEAD) return;
    if (actor.role === Role.PM) return;
    throw new ForbiddenException('Bạn không có quyền giao Quick Task');
  }

  /**
   * Validate scope-level (DEPT_HEAD cùng phòng, PM cùng project)
   */
  private async validateScopePermission(
    actor: CurrentActor,
    assigneeDeptId: string | null,
    projectId: string | undefined,
  ) {
    if (actor.role === Role.ADMIN) return;

    if (actor.role === Role.DEPARTMENT_HEAD) {
      const deptId = await this.getActorDepartmentId(actor);
      if (!deptId) {
        throw new ForbiddenException('Trưởng phòng chưa được gán vào phòng ban nào');
      }
      if (assigneeDeptId !== deptId) {
        throw new ForbiddenException(
          'Trưởng phòng chỉ có thể giao việc cho nhân viên CÙNG PHÒNG',
        );
      }
      return;
    }

    if (actor.role === Role.PM) {
      if (!projectId) return; // Personal task: PM tự do
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, pmId: true },
      });
      if (!project) {
        throw new NotFoundException('Dự án không tồn tại');
      }
      if (project.pmId !== actor.id) {
        throw new ForbiddenException('Chỉ PM chính của dự án mới có thể giao task');
      }
      return;
    }
  }

  private async getActorDepartmentId(actor: CurrentActor): Promise<string | null> {
    if (actor.departmentId) return actor.departmentId;
    if (typeof this.prisma.user?.findUnique === 'function') {
      const u = await this.prisma.user.findUnique({
        where: { id: actor.id },
        select: { departmentId: true },
      });
      return u?.departmentId ?? null;
    }
    return null;
  }

  /**
   * Validate quyền xem
   */
  private async validateViewPermission(
    actor: CurrentActor,
    task: {
      assigneeId: string;
      assignedById: string;
      projectId: string | null;
      assignee: { departmentId: string | null };
    },
  ) {
    if (actor.role === Role.ADMIN) return;
    if (task.assigneeId === actor.id || task.assignedById === actor.id) return;

    if (actor.role === Role.DEPARTMENT_HEAD) {
      const deptId = await this.getActorDepartmentId(actor);
      if (deptId && task.assignee.departmentId === deptId) return;
    }

    if (actor.role === Role.PM && task.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: task.projectId },
        select: { pmId: true, members: { select: { userId: true } } },
      });
      if (project?.pmId === actor.id) return;
      if (project?.members.some((m) => m.userId === actor.id)) return;
    }

    throw new ForbiddenException('Bạn không có quyền xem Quick Task này');
  }

  /**
   * Thống kê cho dashboard
   * - Số task hôm nay, overdue, theo priority
   */
  async getStats(actor: CurrentActor) {
    const deptId = await this.getActorDepartmentId(actor);
    const resolvedActor = { ...actor, departmentId: deptId };
    const baseWhere = this.buildStatsWhere(resolvedActor);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [total, today, overdue, byStatus, byPriority] = await Promise.all([
      this.prisma.quickTask.count({ where: baseWhere }),
      this.prisma.quickTask.count({
        where: { ...baseWhere, dueDate: { gte: startOfToday, lt: new Date(startOfToday.getTime() + 86_400_000) } },
      }),
      this.prisma.quickTask.count({
        where: { ...baseWhere, dueDate: { lt: startOfToday }, status: { not: TaskStatus.DONE } },
      }),
      this.prisma.quickTask.groupBy({
        by: ['status'],
        where: baseWhere,
        _count: { _all: true },
      }),
      this.prisma.quickTask.groupBy({
        by: ['priority'],
        where: baseWhere,
        _count: { _all: true },
      }),
    ]);

    return {
      total,
      today,
      overdue,
      byStatus: byStatus.reduce(
        (acc, item) => ({ ...acc, [item.status]: item._count._all }),
        {} as Record<TaskStatus, number>,
      ),
      byPriority: byPriority.reduce(
        (acc, item) => ({ ...acc, [item.priority]: item._count._all }),
        {} as Record<string, number>,
      ),
    };
  }

  private buildStatsWhere(actor: CurrentActor): Prisma.QuickTaskWhereInput {
    if (actor.role === Role.EMPLOYEE) {
      return { assigneeId: actor.id };
    }
    if (actor.role === Role.DEPARTMENT_HEAD) {
      return {
        OR: [
          ...(actor.departmentId ? [{ assignee: { departmentId: actor.departmentId } }] : []),
          { assignedById: actor.id },
          { assigneeId: actor.id },
        ],
      };
    }
    if (actor.role === Role.PM) {
      return {
        OR: [{ assignedById: actor.id }, { assigneeId: actor.id }],
      };
    }
    return {}; // Admin: all
  }
}
