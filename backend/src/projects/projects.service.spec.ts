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
  it('forbids non-DeptHead/Admin from creating project (including PM and EMPLOYEE)', async () => {
    const prisma = {} as PrismaService;
    const accessService = {} as ProjectAccessService;
    const service = new ProjectsService(prisma, accessService);

    await expect(
      service.create({ name: 'New' }, { id: 'u-1', role: 'EMPLOYEE' }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    await expect(
      service.create({ name: 'New' }, { id: 'u-2', role: 'PM' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('creates team project when actor is DEPARTMENT_HEAD and assigns PM', async () => {
    const created = { id: 'p-new', name: 'New', kind: 'TEAM' };
    const tx = {
      project: {
        create: vi.fn().mockResolvedValue(created),
      },
    };
    const prisma = {
      $transaction: vi.fn().mockImplementation(async (cb) => cb(tx)),
      user: {
        findUnique: vi.fn().mockResolvedValue({ departmentId: 'dept-1' }),
      },
    } as unknown as PrismaService;
    const accessService = {} as ProjectAccessService;
    const service = new ProjectsService(prisma, accessService);

    const result = await service.create(
      { name: 'New', color: '#FF0000', pmId: 'pm-1' },
      { id: 'head-1', role: 'DEPARTMENT_HEAD', departmentId: 'dept-1' },
    );
    expect(result).toEqual(created);
    expect(tx.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'New',
          kind: 'TEAM',
          pmId: 'pm-1',
          members: {
            create: expect.arrayContaining([
              expect.objectContaining({
                userId: 'head-1',
                projectRole: 'DEPT_HEAD',
              }),
              expect.objectContaining({
                userId: 'pm-1',
                projectRole: 'PM',
              }),
            ]),
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

describe('ProjectsService.swapPm', () => {
  it('throws NotFoundException if project does not exist', async () => {
    const prisma = {
      project: { findUnique: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaService;
    const accessService = {} as ProjectAccessService;
    const service = new ProjectsService(prisma, accessService);

    await expect(
      service.swapPm('p-none', { newPmId: 'u-2' }, { id: 'admin-1', role: 'ADMIN' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('forbids non-DeptHead / non-Admin from swapping PM', async () => {
    const prisma = {
      project: {
        findUnique: vi.fn().mockResolvedValue({ id: 'p-1', pmId: 'u-1', departmentId: 'd-1' }),
      },
    } as unknown as PrismaService;
    const accessService = {} as ProjectAccessService;
    const service = new ProjectsService(prisma, accessService);

    await expect(
      service.swapPm('p-1', { newPmId: 'u-2' }, { id: 'emp-1', role: 'EMPLOYEE' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('successfully swaps PM in transaction for DEPARTMENT_HEAD', async () => {
    const project = { id: 'p-1', pmId: 'old-pm', departmentId: 'd-1' };
    const newPmUser = { id: 'new-pm', name: 'New PM', status: 'ACTIVE', departmentId: 'd-1' };
    const tx = {
      project: {
        update: vi.fn().mockResolvedValue({ ...project, pmId: 'new-pm' }),
      },
      projectMember: {
        upsert: vi.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      project: { findUnique: vi.fn().mockResolvedValue(project) },
      user: {
        findUnique: vi.fn().mockImplementation(({ where }) => {
          if (where.id === 'head-1') return Promise.resolve({ departmentId: 'd-1' });
          if (where.id === 'new-pm') return Promise.resolve(newPmUser);
          return Promise.resolve(null);
        }),
      },
      $transaction: vi.fn().mockImplementation(async (cb) => cb(tx)),
    } as unknown as PrismaService;
    const accessService = {} as ProjectAccessService;
    const service = new ProjectsService(prisma, accessService);

    const result = await service.swapPm(
      'p-1',
      { newPmId: 'new-pm', reason: 'Reorganizing team' },
      { id: 'head-1', role: 'DEPARTMENT_HEAD', departmentId: 'd-1' },
    );

    expect(result.pmId).toBe('new-pm');
    expect(tx.project.update).toHaveBeenCalledWith({
      where: { id: 'p-1' },
      data: { pmId: 'new-pm' },
      include: expect.any(Object),
    });
    expect(tx.projectMember.upsert).toHaveBeenCalledWith({
      where: { projectId_userId: { projectId: 'p-1', userId: 'old-pm' } },
      create: { projectId: 'p-1', userId: 'old-pm', projectRole: 'MEMBER' },
      update: { projectRole: 'MEMBER' },
    });
    expect(tx.projectMember.upsert).toHaveBeenCalledWith({
      where: { projectId_userId: { projectId: 'p-1', userId: 'new-pm' } },
      create: { projectId: 'p-1', userId: 'new-pm', projectRole: 'PM' },
      update: { projectRole: 'PM' },
    });
  });
});
