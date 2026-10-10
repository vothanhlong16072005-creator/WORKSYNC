import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { ProjectAccessService } from './project-access.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const teamProject = {
  id: 'team-1',
  kind: 'TEAM',
  personalOwnerId: null,
  members: [{ userId: 'member-1', projectRole: 'EMPLOYEE' }],
};

describe('ProjectAccessService.requireReadableProject', () => {
  it('allows a team member to read the shared project board', async () => {
    const prisma = {
      project: { findUnique: vi.fn().mockResolvedValue(teamProject) },
    } as unknown as PrismaService;
    const service = new ProjectAccessService(prisma);

    await expect(service.requireReadableProject('team-1', { id: 'member-1', role: 'EMPLOYEE' })).resolves.toMatchObject({
      projectId: 'team-1',
      projectRole: 'EMPLOYEE',
    });
  });

  it('rejects a user who is not a project member', async () => {
    const prisma = {
      project: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'team-1',
          kind: 'TEAM',
          personalOwnerId: null,
          members: [],
        }),
      },
    } as unknown as PrismaService;
    const service = new ProjectAccessService(prisma);

    await expect(service.requireReadableProject('team-1', { id: 'outsider-1', role: 'EMPLOYEE' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows personal project owner to read their personal project', async () => {
    const prisma = {
      project: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'personal-1',
          kind: 'PERSONAL',
          personalOwnerId: 'owner-1',
          members: [],
        }),
      },
    } as unknown as PrismaService;
    const service = new ProjectAccessService(prisma);

    await expect(service.requireReadableProject('personal-1', { id: 'owner-1', role: 'EMPLOYEE' })).resolves.toMatchObject({
      projectId: 'personal-1',
      kind: 'PERSONAL',
    });
  });

  it('rejects another user from reading someone else personal project', async () => {
    const prisma = {
      project: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'personal-1',
          kind: 'PERSONAL',
          personalOwnerId: 'owner-1',
          members: [],
        }),
      },
    } as unknown as PrismaService;
    const service = new ProjectAccessService(prisma);

    await expect(service.requireReadableProject('personal-1', { id: 'stranger-1', role: 'EMPLOYEE' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows an ADMIN to read any project', async () => {
    const prisma = {
      project: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'personal-1',
          kind: 'PERSONAL',
          personalOwnerId: 'owner-1',
          members: [],
        }),
      },
    } as unknown as PrismaService;
    const service = new ProjectAccessService(prisma);

    await expect(service.requireReadableProject('personal-1', { id: 'admin-1', role: 'ADMIN' })).resolves.toMatchObject({
      projectId: 'personal-1',
      kind: 'PERSONAL',
    });
  });

  it('returns not found for an unknown project', async () => {
    const prisma = {
      project: { findUnique: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const service = new ProjectAccessService(prisma);

    await expect(service.requireReadableProject('missing', { id: 'member-1', role: 'EMPLOYEE' }))
      .rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('ProjectAccessService.requireTaskMovePermission', () => {
  const baseTask = {
    id: 'task-1',
    projectId: 'team-1',
    assigneeId: 'assignee-1',
    project: {
      id: 'team-1',
      kind: 'TEAM',
      personalOwnerId: null,
      members: [{ projectRole: 'EMPLOYEE' }],
    },
  };

  it('allows assignee to move their own task', async () => {
    const prisma = {
      task: { findFirst: vi.fn().mockResolvedValue(baseTask) },
    } as unknown as PrismaService;
    const service = new ProjectAccessService(prisma);

    await expect(service.requireTaskMovePermission('task-1', { id: 'assignee-1', role: 'EMPLOYEE' }))
      .resolves.toEqual({ taskId: 'task-1', projectId: 'team-1' });
  });

  it('allows a PM project member to move a task even if not assignee', async () => {
    const prisma = {
      task: {
        findFirst: vi.fn().mockResolvedValue({
          ...baseTask,
          project: {
            ...baseTask.project,
            members: [{ projectRole: 'PM' }],
          },
        }),
      },
    } as unknown as PrismaService;
    const service = new ProjectAccessService(prisma);

    await expect(service.requireTaskMovePermission('task-1', { id: 'pm-1', role: 'EMPLOYEE' }))
      .resolves.toEqual({ taskId: 'task-1', projectId: 'team-1' });
  });

  it('allows an ADMIN to move any task', async () => {
    const prisma = {
      task: { findFirst: vi.fn().mockResolvedValue(baseTask) },
    } as unknown as PrismaService;
    const service = new ProjectAccessService(prisma);

    await expect(service.requireTaskMovePermission('task-1', { id: 'admin-1', role: 'ADMIN' }))
      .resolves.toEqual({ taskId: 'task-1', projectId: 'team-1' });
  });

  it('rejects a non-assignee regular employee', async () => {
    const prisma = {
      task: { findFirst: vi.fn().mockResolvedValue(baseTask) },
    } as unknown as PrismaService;
    const service = new ProjectAccessService(prisma);

    await expect(service.requireTaskMovePermission('task-1', { id: 'other-emp', role: 'EMPLOYEE' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an outsider who is not a project member', async () => {
    const prisma = {
      task: {
        findFirst: vi.fn().mockResolvedValue({
          ...baseTask,
          project: {
            ...baseTask.project,
            members: [],
          },
        }),
      },
    } as unknown as PrismaService;
    const service = new ProjectAccessService(prisma);

    await expect(service.requireTaskMovePermission('task-1', { id: 'outsider', role: 'EMPLOYEE' }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws NotFoundException when task does not exist', async () => {
    const prisma = {
      task: { findFirst: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const service = new ProjectAccessService(prisma);

    await expect(service.requireTaskMovePermission('not-found', { id: 'user-1', role: 'EMPLOYEE' }))
      .rejects.toBeInstanceOf(NotFoundException);
  });
});

