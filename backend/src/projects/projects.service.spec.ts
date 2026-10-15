import { describe, expect, it, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProjectsService } from './projects.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { ProjectAccessService } from './project-access.service.js';

describe('ProjectsService.findMine', () => {
  it('returns accessible projects with the signed-in user’s open task count', async () => {
    const prisma = {
      project: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'team-1',
            name: 'Team delivery',
            kind: 'TEAM',
            color: '#4D7FC2',
            _count: { tasks: 3 },
          },
        ]),
      },
    } as unknown as PrismaService;
    const accessService = {} as ProjectAccessService;
    const service = new ProjectsService(prisma, accessService);

    await expect(service.findMine({ id: 'member-1', role: 'EMPLOYEE' })).resolves.toEqual([
      {
        id: 'team-1',
        name: 'Team delivery',
        kind: 'TEAM',
        color: '#4D7FC2',
        openAssignedTaskCount: 3,
      },
    ]);
  });
});

describe('ProjectsService.create', () => {
  it('forbids non-PM/Admin from creating project', async () => {
    const prisma = {} as PrismaService;
    const accessService = {} as ProjectAccessService;
    const service = new ProjectsService(prisma, accessService);

    await expect(
      service.create({ name: 'New' }, { id: 'u-1', role: 'EMPLOYEE' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates team project and assigns creator as PM', async () => {
    const created = { id: 'p-new', name: 'New', kind: 'TEAM' };
    const tx = {
      project: {
        create: vi.fn().mockResolvedValue(created),
      },
    };
    const prisma = {
      $transaction: vi.fn().mockImplementation(async (cb) => cb(tx)),
    } as unknown as PrismaService;
    const accessService = {} as ProjectAccessService;
    const service = new ProjectsService(prisma, accessService);

    const result = await service.create(
      { name: 'New', color: '#FF0000' },
      { id: 'u-1', role: 'PM' },
    );
    expect(result).toEqual(created);
    expect(tx.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'New',
          kind: 'TEAM',
          members: {
            create: expect.objectContaining({
              userId: 'u-1',
              projectRole: 'PM',
            }),
          },
        }),
      }),
    );
  });
});

describe('ProjectsService.update', () => {
  it('forbids non-PM/Admin from updating project', async () => {
    const prisma = {
      project: {
        findFirst: vi.fn().mockResolvedValue({ id: 'p-1' }),
        update: vi.fn(),
      },
    } as unknown as PrismaService;
    const accessService = {
      isProjectPM: vi.fn().mockResolvedValue(false), // not PM
    } as unknown as ProjectAccessService;
    const service = new ProjectsService(prisma, accessService);

    await expect(
      service.update('p-1', { name: 'X' }, { id: 'u-1', role: 'EMPLOYEE' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows PM to update own project', async () => {
    const updated = { id: 'p-1', name: 'Updated' };
    const prisma = {
      project: {
        findFirst: vi.fn().mockResolvedValue({ id: 'p-1' }),
        update: vi.fn().mockResolvedValue(updated),
      },
    } as unknown as PrismaService;
    const accessService = {
      isProjectPM: vi.fn().mockResolvedValue(true),
    } as unknown as ProjectAccessService;
    const service = new ProjectsService(prisma, accessService);

    const result = await service.update('p-1', { name: 'Updated' }, { id: 'u-1', role: 'EMPLOYEE' });
    expect(result).toEqual(updated);
  });

  it('allows Admin to update any project', async () => {
    const updated = { id: 'p-1', name: 'Admin Update' };
    const prisma = {
      project: {
        findFirst: vi.fn().mockResolvedValue({ id: 'p-1' }),
        update: vi.fn().mockResolvedValue(updated),
      },
    } as unknown as PrismaService;
    const accessService = {
      isProjectPM: vi.fn().mockResolvedValue(false), // not PM, but Admin
    } as unknown as ProjectAccessService;
    const service = new ProjectsService(prisma, accessService);

    const result = await service.update('p-1', { name: 'Admin Update' }, { id: 'admin', role: 'ADMIN' });
    expect(result).toEqual(updated);
  });
});

describe('ProjectsService.remove', () => {
  it('soft-deletes project when actor is PM', async () => {
    const deleted = { id: 'p-1', deletedAt: new Date() };
    const prisma = {
      project: {
        findFirst: vi.fn().mockResolvedValue({ id: 'p-1' }),
        update: vi.fn().mockResolvedValue(deleted),
      },
    } as unknown as PrismaService;
    const accessService = {
      isProjectPM: vi.fn().mockResolvedValue(true),
    } as unknown as ProjectAccessService;
    const service = new ProjectsService(prisma, accessService);

    const result = await service.remove('p-1', { id: 'u-1', role: 'EMPLOYEE' });
    expect(result.deletedAt).toBeDefined();
  });

  it('throws NotFoundException when project does not exist', async () => {
    const prisma = {
      project: { findFirst: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const accessService = {} as ProjectAccessService;
    const service = new ProjectsService(prisma, accessService);

    await expect(
      service.remove('missing', { id: 'u-1', role: 'ADMIN' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('forbids non-PM from removing project', async () => {
    const prisma = {
      project: {
        findFirst: vi.fn().mockResolvedValue({ id: 'p-1' }),
        update: vi.fn(),
      },
    } as unknown as PrismaService;
    const accessService = {
      isProjectPM: vi.fn().mockResolvedValue(false),
    } as unknown as ProjectAccessService;
    const service = new ProjectsService(prisma, accessService);

    await expect(
      service.remove('p-1', { id: 'u-1', role: 'EMPLOYEE' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('ProjectsService.addMember', () => {
  it('allows PM to add member', async () => {
    const created = { projectId: 'p-1', userId: 'u-2', projectRole: 'MEMBER' };
    const prisma = {
      projectMember: { create: vi.fn().mockResolvedValue(created) },
    } as unknown as PrismaService;
    const accessService = {
      isProjectPM: vi.fn().mockResolvedValue(true),
    } as unknown as ProjectAccessService;
    const service = new ProjectsService(prisma, accessService);

    const result = await service.addMember('p-1', { userId: 'u-2' }, { id: 'u-1', role: 'EMPLOYEE' });
    expect(result).toEqual(created);
  });
});

describe('ProjectsService.changeMemberRole', () => {
  it('allows PM to change member role', async () => {
    const updated = { projectId: 'p-1', userId: 'u-2', projectRole: 'LEAD' };
    const prisma = {
      projectMember: { update: vi.fn().mockResolvedValue(updated) },
    } as unknown as PrismaService;
    const accessService = {
      isProjectPM: vi.fn().mockResolvedValue(true),
    } as unknown as ProjectAccessService;
    const service = new ProjectsService(prisma, accessService);

    const result = await service.changeMemberRole('p-1', 'u-2', { projectRole: 'LEAD' }, { id: 'u-1', role: 'EMPLOYEE' });
    expect(result).toEqual(updated);
  });
});
