import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { TasksService } from './tasks.service.js';
import { TaskScope } from './dto/task-query.dto.js';
import { ProjectKind, Role, TaskStatus } from '@prisma/client';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { ProjectAccessService } from '../projects/project-access.service.js';

describe('TasksService.findAll', () => {
  it('throws BadRequestException when scope is project but projectId is missing', async () => {
    const prisma = {} as PrismaService;
    const accessService = {} as ProjectAccessService;
    const service = new TasksService(prisma, accessService);

    await expect(
      service.findAll({ scope: TaskScope.PROJECT }, { id: 'user-1', role: Role.EMPLOYEE }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('throws ForbiddenException when scope is project on a personal project', async () => {
    const prisma = {} as PrismaService;
    const accessService = {
      requireReadableProject: vi.fn().mockResolvedValue({
        projectId: 'p-1',
        kind: ProjectKind.PERSONAL,
      }),
    } as unknown as ProjectAccessService;
    const service = new TasksService(prisma, accessService);

    await expect(
      service.findAll({ scope: TaskScope.PROJECT, projectId: 'p-1' }, { id: 'user-1', role: Role.EMPLOYEE }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('returns all non-deleted project tasks for scope=project on a team project', async () => {
    const expectedTasks = [
      { id: 't-1', title: 'Task 1', position: 1024, projectId: 'team-1' },
      { id: 't-2', title: 'Task 2', position: 2048, projectId: 'team-1' },
    ];
    const prisma = {
      task: {
        findMany: vi.fn().mockResolvedValue(expectedTasks),
      },
    } as unknown as PrismaService;
    const accessService = {
      requireReadableProject: vi.fn().mockResolvedValue({
        projectId: 'team-1',
        kind: ProjectKind.TEAM,
      }),
    } as unknown as ProjectAccessService;
    const service = new TasksService(prisma, accessService);

    const result = await service.findAll(
      { scope: TaskScope.PROJECT, projectId: 'team-1' },
      { id: 'user-1', role: Role.EMPLOYEE },
    );
    expect(result).toEqual(expectedTasks);
    expect(accessService.requireReadableProject).toHaveBeenCalledWith('team-1', { id: 'user-1', role: Role.EMPLOYEE });
  });

  it('returns only assigned tasks for scope=mine on a specific project', async () => {
    const expectedTasks = [{ id: 't-1', title: 'My Task', assigneeId: 'user-1', projectId: 'team-1' }];
    const prisma = {
      task: {
        findMany: vi.fn().mockResolvedValue(expectedTasks),
      },
    } as unknown as PrismaService;
    const accessService = {
      requireReadableProject: vi.fn().mockResolvedValue({
        projectId: 'team-1',
        kind: ProjectKind.TEAM,
      }),
    } as unknown as ProjectAccessService;
    const service = new TasksService(prisma, accessService);

    const result = await service.findAll(
      { scope: TaskScope.MINE, projectId: 'team-1' },
      { id: 'user-1', role: Role.EMPLOYEE },
    );
    expect(result).toEqual(expectedTasks);
  });

  it('returns assigned tasks across accessible projects for cross-project scope=mine', async () => {
    const expectedTasks = [{ id: 't-1', title: 'Cross project task', assigneeId: 'user-1' }];
    const prisma = {
      task: {
        findMany: vi.fn().mockResolvedValue(expectedTasks),
      },
    } as unknown as PrismaService;
    const accessService = {} as ProjectAccessService;
    const service = new TasksService(prisma, accessService);

    const result = await service.findAll(
      { scope: TaskScope.MINE },
      { id: 'user-1', role: Role.EMPLOYEE },
    );
    expect(result).toEqual(expectedTasks);
  });
});

describe('TasksService.findOneWithAccess', () => {
  it('returns task when actor is project member', async () => {
    const task = { id: 't-1', projectId: 'team-1', deletedAt: null };
    const prisma = {
      task: { findFirst: vi.fn().mockResolvedValue(task) },
    } as unknown as PrismaService;
    const accessService = {
      requireReadableProject: vi.fn().mockResolvedValue({
        projectId: 'team-1',
        kind: ProjectKind.TEAM,
      }),
    } as unknown as ProjectAccessService;
    const service = new TasksService(prisma, accessService);

    const result = await service.findOneWithAccess('t-1', { id: 'user-1', role: Role.EMPLOYEE });
    expect(result).toEqual(task);
    expect(accessService.requireReadableProject).toHaveBeenCalledWith('team-1', { id: 'user-1', role: Role.EMPLOYEE });
  });

  it('throws NotFoundException when task does not exist', async () => {
    const prisma = {
      task: { findFirst: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const accessService = {} as ProjectAccessService;
    const service = new TasksService(prisma, accessService);

    await expect(
      service.findOneWithAccess('missing', { id: 'user-1', role: Role.EMPLOYEE }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('throws ForbiddenException when actor is not project member', async () => {
    const task = { id: 't-1', projectId: 'team-1', deletedAt: null };
    const prisma = {
      task: { findFirst: vi.fn().mockResolvedValue(task) },
    } as unknown as PrismaService;
    const accessService = {
      requireReadableProject: vi.fn().mockRejectedValue(new ForbiddenException('no access')),
    } as unknown as ProjectAccessService;
    const service = new TasksService(prisma, accessService);

    await expect(
      service.findOneWithAccess('t-1', { id: 'user-2', role: Role.EMPLOYEE }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('TasksService.updateWithAccess', () => {
  it('allows assignee to update their own task', async () => {
    const task = { id: 't-1', projectId: 'team-1', assigneeId: 'user-1', deletedAt: null };
    const updated = { id: 't-1', title: 'New Title' };
    const prisma = {
      task: {
        findFirst: vi.fn().mockResolvedValue(task),
        update: vi.fn().mockResolvedValue(updated),
      },
    } as unknown as PrismaService;
    const accessService = {
      isProjectPM: vi.fn().mockResolvedValue(false),
    } as unknown as ProjectAccessService;
    const service = new TasksService(prisma, accessService);

    const result = await service.updateWithAccess('t-1', { title: 'New Title' }, { id: 'user-1', role: Role.EMPLOYEE });
    expect(result).toEqual(updated);
  });

  it('allows PM of project to update any task', async () => {
    const task = { id: 't-1', projectId: 'team-1', assigneeId: 'user-2', deletedAt: null };
    const updated = { id: 't-1', title: 'PM Edit' };
    const prisma = {
      task: {
        findFirst: vi.fn().mockResolvedValue(task),
        update: vi.fn().mockResolvedValue(updated),
      },
    } as unknown as PrismaService;
    const accessService = {
      isProjectPM: vi.fn().mockResolvedValue(true),
    } as unknown as ProjectAccessService;
    const service = new TasksService(prisma, accessService);

    const result = await service.updateWithAccess('t-1', { title: 'PM Edit' }, { id: 'user-1', role: Role.EMPLOYEE });
    expect(result).toEqual(updated);
    expect(accessService.isProjectPM).toHaveBeenCalledWith('team-1', 'user-1');
  });

  it('forbids non-assignee non-PM from updating task', async () => {
    const task = { id: 't-1', projectId: 'team-1', assigneeId: 'user-2', deletedAt: null };
    const prisma = {
      task: { findFirst: vi.fn().mockResolvedValue(task) },
    } as unknown as PrismaService;
    const accessService = {
      isProjectPM: vi.fn().mockResolvedValue(false),
    } as unknown as ProjectAccessService;
    const service = new TasksService(prisma, accessService);

    await expect(
      service.updateWithAccess('t-1', { title: 'Hacked' }, { id: 'user-1', role: Role.EMPLOYEE }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows Admin to update any task', async () => {
    const task = { id: 't-1', projectId: 'team-1', assigneeId: 'user-2', deletedAt: null };
    const updated = { id: 't-1', title: 'Admin Edit' };
    const prisma = {
      task: {
        findFirst: vi.fn().mockResolvedValue(task),
        update: vi.fn().mockResolvedValue(updated),
      },
    } as unknown as PrismaService;
    const accessService = {} as ProjectAccessService;
    const service = new TasksService(prisma, accessService);

    const result = await service.updateWithAccess('t-1', { title: 'Admin Edit' }, { id: 'admin-1', role: Role.ADMIN });
    expect(result).toEqual(updated);
  });
});

describe('TasksService.removeWithAccess', () => {
  it('allows PM to soft-delete task', async () => {
    const task = { id: 't-1', projectId: 'team-1', deletedAt: null };
    const prisma = {
      task: {
        findFirst: vi.fn().mockResolvedValue(task),
        update: vi.fn().mockResolvedValue({ id: 't-1', deletedAt: new Date() }),
      },
    } as unknown as PrismaService;
    const accessService = {
      isProjectPM: vi.fn().mockResolvedValue(true),
    } as unknown as ProjectAccessService;
    const service = new TasksService(prisma, accessService);

    const result = await service.removeWithAccess('t-1', { id: 'user-1', role: Role.EMPLOYEE });
    expect(result.deletedAt).toBeDefined();
  });

  it('forbids assignee (non-PM) from deleting task', async () => {
    const task = { id: 't-1', projectId: 'team-1', assigneeId: 'user-1', deletedAt: null };
    const prisma = {
      task: { findFirst: vi.fn().mockResolvedValue(task) },
    } as unknown as PrismaService;
    const accessService = {
      isProjectPM: vi.fn().mockResolvedValue(false),
    } as unknown as ProjectAccessService;
    const service = new TasksService(prisma, accessService);

    await expect(
      service.removeWithAccess('t-1', { id: 'user-1', role: Role.EMPLOYEE }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('TasksService.moveOnBoard', () => {
  it('moves task to destinationIndex and normalizes positions in a transaction', async () => {
    const currentTask = {
      id: 'task-target',
      projectId: 'team-1',
      status: TaskStatus.TODO,
      position: 1024,
    };
    const existingColTasks = [
      { id: 'task-a', projectId: 'team-1', status: TaskStatus.IN_PROGRESS, position: 1000 },
      { id: 'task-b', projectId: 'team-1', status: TaskStatus.IN_PROGRESS, position: 2000 },
    ];
    const updatedTask = {
      ...currentTask,
      status: TaskStatus.IN_PROGRESS,
      position: 1024,
    };

    const updateCalls: Array<{ id: string; data: any }> = [];
    const tx = {
      task: {
        findFirst: vi.fn().mockResolvedValue(currentTask),
        findMany: vi.fn().mockResolvedValue(existingColTasks),
        update: vi.fn().mockImplementation(({ where, data }) => {
          updateCalls.push({ id: where.id, data });
          return Promise.resolve();
        }),
        findUnique: vi.fn().mockResolvedValue(updatedTask),
      },
    };

    const prisma = {
      $transaction: vi.fn().mockImplementation(async (callback) => callback(tx)),
    } as unknown as PrismaService;

    const accessService = {
      requireTaskMovePermission: vi.fn().mockResolvedValue({ taskId: 'task-target', projectId: 'team-1' }),
    } as unknown as ProjectAccessService;

    const service = new TasksService(prisma, accessService);

    const result = await service.moveOnBoard(
      'task-target',
      { id: 'user-1', role: Role.EMPLOYEE },
      { status: TaskStatus.IN_PROGRESS, destinationIndex: 0 },
    );

    expect(result).toEqual(updatedTask);
    expect(accessService.requireTaskMovePermission).toHaveBeenCalledWith('task-target', { id: 'user-1', role: Role.EMPLOYEE });
    // destinationIndex = 0 puts task-target first: new pos 1024, task-a: 2048, task-b: 3072
    expect(updateCalls).toEqual([
      { id: 'task-target', data: { status: TaskStatus.IN_PROGRESS, position: 1024 } },
      { id: 'task-a', data: { position: 2048 } },
      { id: 'task-b', data: { position: 3072 } },
    ]);
  });

  it('throws NotFoundException if task does not exist during transaction', async () => {
    const tx = {
      task: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    };
    const prisma = {
      $transaction: vi.fn().mockImplementation(async (callback) => callback(tx)),
    } as unknown as PrismaService;
    const accessService = {
      requireTaskMovePermission: vi.fn().mockResolvedValue({ taskId: 'task-missing', projectId: 'team-1' }),
    } as unknown as ProjectAccessService;

    const service = new TasksService(prisma, accessService);

    await expect(
      service.moveOnBoard(
        'task-missing',
        { id: 'user-1', role: Role.EMPLOYEE },
        { status: TaskStatus.DONE, destinationIndex: 0 },
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
