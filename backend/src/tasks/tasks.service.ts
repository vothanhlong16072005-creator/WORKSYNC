import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Priority, ProjectKind, Role, TaskStatus, Prisma } from '@prisma/client';
import { CreateTaskDto } from './dto/create-task.dto.js';
import { UpdateTaskDto } from './dto/update-task.dto.js';
import { TaskQueryDto, TaskScope } from './dto/task-query.dto.js';
import { MoveTaskOnBoardDto } from './dto/move-task-on-board.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectAccessService, type CurrentActor } from '../projects/project-access.service.js';

const TASK_INCLUDE = {
  assignee: {
    select: { id: true, name: true, avatar: true },
  },
  project: {
    select: { id: true, name: true, color: true, kind: true },
  },
  createdBy: {
    select: { id: true, name: true, avatar: true },
  },
  completedBy: {
    select: { id: true, name: true, avatar: true },
  },
  sprint: {
    select: { id: true, name: true },
  },
  epic: {
    select: { id: true, title: true, color: true },
  },
  linkedDocuments: {
    where: { deletedAt: null },
    select: { id: true, title: true, type: true },
  },
};

import { NotificationTriggersService } from '../notifications/notification-triggers.service.js';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectAccessService: ProjectAccessService,
    private readonly triggers: NotificationTriggersService,
  ) {}

  async create(createTaskDto: CreateTaskDto, actorOrUserId: CurrentActor | string) {
    const actor: CurrentActor = typeof actorOrUserId === 'string'
      ? { id: actorOrUserId, role: Role.EMPLOYEE }
      : actorOrUserId;
    const userId = actor.id;

    const project = await this.prisma.project.findUnique({
      where: { id: createTaskDto.projectId },
      select: {
        id: true,
        kind: true,
        personalOwnerId: true,
        name: true,
        pmId: true,
        departmentId: true,
        createdById: true,
        members: {
          where: { userId },
          select: { projectRole: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Dự án không tồn tại hoặc đã bị xóa');
    }

    if (project.kind === ProjectKind.PERSONAL) {
      if (project.personalOwnerId !== userId) {
        throw new ForbiddenException('Bạn không có quyền tạo công việc trên bảng cá nhân của người khác');
      }
    } else {
      const isProjectPM = project.pmId === userId || project.members[0]?.projectRole === 'PM';
      const isDeptHead = actor.role === Role.DEPARTMENT_HEAD && (
        project.createdById === userId ||
        project.pmId === userId ||
        (!!actor.departmentId && project.departmentId === actor.departmentId)
      );
      const isAdmin = actor.role === Role.ADMIN;

      if (!isAdmin && !isDeptHead && !isProjectPM) {
        throw new ForbiddenException('Chỉ Quản trị viên, Trưởng phòng hoặc Quản lý dự án (PM) mới có quyền tạo công việc trong dự án nhóm');
      }
    }

    const status = createTaskDto.status || TaskStatus.TODO;
    const priority = createTaskDto.priority || Priority.MEDIUM;
    const assigneeId = createTaskDto.assigneeId || (project.kind === ProjectKind.PERSONAL ? userId : null);
    const labels = createTaskDto.labels || createTaskDto.tags || [];

    let position = createTaskDto.position;
    if (position === undefined) {
      const lastTask = await this.prisma.task.findFirst({
        where: { 
          projectId: createTaskDto.projectId,
          status,
          deletedAt: null,
        },
        orderBy: { position: 'desc' },
      });
      position = lastTask ? lastTask.position + 1024 : 1024;
    }

    const { tags, ...rest } = createTaskDto;

    const task = await this.prisma.task.create({
      data: {
        ...rest,
        status,
        priority,
        position,
        assigneeId,
        labels,
        createdById: userId,
      },
      include: TASK_INCLUDE,
    });

    try {
      if (task.assigneeId && task.assigneeId !== userId) {
        await this.triggers.taskAssigned({
          id: task.id,
          title: task.title,
          projectId: task.projectId,
          projectName: project?.name,
          assigneeId: task.assigneeId,
          actorId: userId,
        });
      }

      if (createTaskDto.description) {
        await this.triggers.mentionInContent(
          createTaskDto.description,
          { id: userId, name: task.createdBy.name },
          {
            type: 'TASK',
            id: task.id,
            title: task.title,
            url: `/projects/${task.projectId}/tasks/${task.id}`,
          },
        );
      }
    } catch (err) {
      // Non-blocking notification error
    }

    return task;
  }

  async findAll(query: TaskQueryDto, actor: CurrentActor) {
    const scope = query.scope || TaskScope.MINE;
    const { projectId } = query;
    const searchFilter = this.buildSearchFilter(query.q);

    if (scope === TaskScope.PROJECT) {
      if (!projectId) {
        throw new BadRequestException('projectId is required when scope is project');
      }

      const access = await this.projectAccessService.requireReadableProject(projectId, actor);
      if (access.kind === ProjectKind.PERSONAL) {
        throw new ForbiddenException('Project scope is not supported for personal projects');
      }

      return this.prisma.task.findMany({
        where: {
          projectId,
          deletedAt: null,
          ...searchFilter,
        },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        include: TASK_INCLUDE,
      });
    }

    // scope === TaskScope.MINE
    if (projectId) {
      await this.projectAccessService.requireReadableProject(projectId, actor);
      return this.prisma.task.findMany({
        where: {
          projectId,
          assigneeId: actor.id,
          deletedAt: null,
          ...searchFilter,
        },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
        include: TASK_INCLUDE,
      });
    }

    // Cross-project personal scope
    return this.prisma.task.findMany({
      where: {
        assigneeId: actor.id,
        deletedAt: null,
        ...searchFilter,
        project:
          actor.role === Role.ADMIN
            ? {
                deletedAt: null,
                OR: [
                  { kind: ProjectKind.TEAM },
                  { kind: ProjectKind.PERSONAL, personalOwnerId: actor.id },
                ],
              }
            : {
                deletedAt: null,
                OR: [
                  { kind: ProjectKind.PERSONAL, personalOwnerId: actor.id },
                  {
                    kind: ProjectKind.TEAM,
                    members: { some: { userId: actor.id } },
                  },
                ],
              },
      },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      include: TASK_INCLUDE,
    });
  }

  /**
   * Xây dựng điều kiện lọc theo từ khóa tìm kiếm.
   * → title (không phân biệt hoa thường), mã task (id), nhãn (labels).
   */
  private buildSearchFilter(q?: string): Prisma.TaskWhereInput {
    const keyword = q?.trim();
    if (!keyword) return {};

    return {
      OR: [
        { title: { contains: keyword, mode: 'insensitive' } },
        { id: { contains: keyword, mode: 'insensitive' } },
        { labels: { has: keyword } },
      ],
    };
  }

  async moveOnBoard(taskId: string, actor: CurrentActor, dto: MoveTaskOnBoardDto) {
    const { projectId } = await this.projectAccessService.requireTaskMovePermission(taskId, actor);
    const targetStatus = dto.status;
    let oldStatus: TaskStatus | null = null;

    const result = await this.prisma.$transaction(async (tx) => {
      const task = await tx.task.findFirst({
        where: { id: taskId, deletedAt: null },
      });

      if (!task) {
        throw new NotFoundException('Task not found');
      }

      oldStatus = task.status;
      const destIndex = Math.max(0, dto.destinationIndex);

      const columnTasks = await tx.task.findMany({
        where: {
          projectId,
          status: targetStatus,
          deletedAt: null,
          id: { not: taskId },
        },
        orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      });

      const insertIndex = Math.min(destIndex, columnTasks.length);
      const orderedTasks = [...columnTasks];
      orderedTasks.splice(insertIndex, 0, task);

      for (let i = 0; i < orderedTasks.length; i++) {
        const item = orderedTasks[i];
        const newPos = (i + 1) * 1024;
        if (item.id === taskId) {
          const isDone = targetStatus === TaskStatus.DONE;
          await tx.task.update({
            where: { id: taskId },
            data: {
              status: targetStatus,
              position: newPos,
              completedAt: isDone ? (task.completedAt || new Date()) : null,
              completedById: isDone ? (task.completedById || actor.id) : null,
            },
          });
        } else if (item.position !== newPos) {
          await tx.task.update({
            where: { id: item.id },
            data: { position: newPos },
          });
        }
      }

      return tx.task.findUnique({
        where: { id: taskId },
        include: TASK_INCLUDE,
      });
    });

    if (result && oldStatus && targetStatus !== oldStatus) {
      try {
        await this.triggers.taskStatusChanged({
          id: result.id,
          title: result.title,
          projectId: result.projectId,
          createdById: result.createdById,
          actorId: actor.id,
          newStatus: targetStatus,
        });
      } catch (err) {
        // Non-blocking notification
      }
    }

    return result;
  }

  async findAllByProject(projectId: string) {
    return this.prisma.task.findMany({
      where: { projectId, deletedAt: null },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      include: TASK_INCLUDE,
    });
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findFirst({
      where: { id, deletedAt: null },
      include: TASK_INCLUDE,
    });
    if (!task) throw new NotFoundException(`Task with ID ${id} not found`);
    return task;
  }

  async findOneWithAccess(id: string, actor: CurrentActor) {
    const task = await this.prisma.task.findFirst({
      where: { id, deletedAt: null },
      include: TASK_INCLUDE,
    });
    if (!task) throw new NotFoundException(`Task with ID ${id} not found`);

    // IDOR protection: verify actor can read this task's project
    await this.projectAccessService.requireReadableProject(task.projectId, actor);
    return task;
  }

  async updateWithAccess(id: string, updateTaskDto: UpdateTaskDto, actor: CurrentActor) {
    // 1. Find task
    const task = await this.prisma.task.findFirst({
      where: { id, deletedAt: null },
    });
    if (!task) throw new NotFoundException(`Task with ID ${id} not found`);

    // 2. Permission: Admin OR (assignee OR project PM)
    if (actor.role !== Role.ADMIN) {
      const isAssignee = task.assigneeId === actor.id;
      const isProjectPM = await this.projectAccessService.isProjectPM(task.projectId, actor.id);
      if (!isAssignee && !isProjectPM) {
        throw new ForbiddenException('Chỉ assignee hoặc PM mới có quyền sửa task');
      }
    }

    // 3. Update
    const dataToUpdate: Record<string, unknown> = { ...updateTaskDto };
    if (updateTaskDto.status !== undefined) {
      if (updateTaskDto.status === TaskStatus.DONE) {
        dataToUpdate.completedAt = task.completedAt || new Date();
        dataToUpdate.completedById = task.completedById || actor.id;
      } else {
        dataToUpdate.completedAt = null;
        dataToUpdate.completedById = null;
      }
    }

    const updated = await this.prisma.task.update({
      where: { id },
      data: dataToUpdate,
      include: TASK_INCLUDE,
    });

    try {
      if (updateTaskDto.assigneeId && updateTaskDto.assigneeId !== task.assigneeId) {
        await this.triggers.taskAssigned({
          id: updated.id,
          title: updated.title,
          projectId: updated.projectId,
          projectName: updated.project?.name,
          assigneeId: updateTaskDto.assigneeId,
          actorId: actor.id,
        });
      }

      if (updateTaskDto.status && updateTaskDto.status !== task.status) {
        await this.triggers.taskStatusChanged({
          id: updated.id,
          title: updated.title,
          projectId: updated.projectId,
          createdById: updated.createdById,
          actorId: actor.id,
          newStatus: updateTaskDto.status,
        });
      }

      if (updateTaskDto.description && updateTaskDto.description !== task.description) {
        await this.triggers.mentionInContent(
          updateTaskDto.description,
          { id: actor.id, name: updated.createdBy.name },
          {
            type: 'TASK',
            id: updated.id,
            title: updated.title,
            url: `/projects/${updated.projectId}/tasks/${updated.id}`,
          },
        );
      }
    } catch (err) {
      // Non-blocking notification error
    }

    return updated;
  }

  async removeWithAccess(id: string, actor: CurrentActor) {
    const task = await this.prisma.task.findFirst({
      where: { id, deletedAt: null },
    });
    if (!task) throw new NotFoundException(`Task with ID ${id} not found`);

    // Only PM or Admin can delete
    if (actor.role !== Role.ADMIN) {
      const isProjectPM = await this.projectAccessService.isProjectPM(task.projectId, actor.id);
      if (!isProjectPM) {
        throw new ForbiddenException('Chỉ PM của dự án hoặc Admin mới có quyền xóa task');
      }
    }

    return this.prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async update(id: string, updateTaskDto: UpdateTaskDto) {
    return this.prisma.task.update({
      where: { id },
      data: updateTaskDto,
      include: TASK_INCLUDE,
    });
  }

  async remove(id: string) {
    return this.prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
