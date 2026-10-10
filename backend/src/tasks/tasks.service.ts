import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Priority, ProjectKind, Role, TaskStatus } from '@prisma/client';
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
  sprint: {
    select: { id: true, name: true },
  },
  epic: {
    select: { id: true, title: true, color: true },
  },
};

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  async create(createTaskDto: CreateTaskDto, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: createTaskDto.projectId },
      select: { kind: true, personalOwnerId: true },
    });

    const status = createTaskDto.status || TaskStatus.TODO;
    const priority = createTaskDto.priority || Priority.MEDIUM;
    const assigneeId = createTaskDto.assigneeId || (project?.kind === ProjectKind.PERSONAL ? userId : null);
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

    return this.prisma.task.create({
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
  }

  async findAll(query: TaskQueryDto, actor: CurrentActor) {
    const scope = query.scope || TaskScope.MINE;
    const { projectId } = query;

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

  async moveOnBoard(taskId: string, actor: CurrentActor, dto: MoveTaskOnBoardDto) {
    const { projectId } = await this.projectAccessService.requireTaskMovePermission(taskId, actor);

    return this.prisma.$transaction(async (tx) => {
      const task = await tx.task.findFirst({
        where: { id: taskId, deletedAt: null },
      });

      if (!task) {
        throw new NotFoundException('Task not found');
      }

      const targetStatus = dto.status;
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
          await tx.task.update({
            where: { id: taskId },
            data: {
              status: targetStatus,
              position: newPos,
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
