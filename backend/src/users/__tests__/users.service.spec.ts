import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UsersService } from '../users.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { Role } from '@prisma/client';

/**
 * Test UsersService.findByDepartmentOrMine — M3.5 RBAC
 *  - DEPT_HEAD: chỉ users cùng department
 *  - PM: members của projects mình PM
 *  - Admin/HR: tất cả
 */
describe('UsersService.findByDepartmentOrMine — M3.5 RBAC', () => {
  let prisma: any;
  let service: UsersService;

  beforeEach(() => {
    prisma = {
      user: { findMany: vi.fn().mockResolvedValue([]) },
      project: { findMany: vi.fn().mockResolvedValue([]) },
    };
    service = new UsersService(prisma as unknown as PrismaService);
  });

  it('DEPT_HEAD: chỉ thấy users cùng department', async () => {
    prisma.user.findMany.mockResolvedValue([
      { id: 'u1', name: 'Eng 1', email: 'u1@x.com', avatar: null, position: 'Dev', role: Role.EMPLOYEE, departmentId: 'dept-eng' },
    ]);

    const result = await service.findByDepartmentOrMine({
      id: 'head-1',
      role: Role.DEPARTMENT_HEAD,
      departmentId: 'dept-eng',
    });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'ACTIVE',
          deletedAt: null,
          departmentId: 'dept-eng',
        }),
      }),
    );
    expect(result).toHaveLength(1);
  });

  it('DEPT_HEAD: trả về [] nếu chưa gán department', async () => {
    const result = await service.findByDepartmentOrMine({
      id: 'head-1',
      role: Role.DEPARTMENT_HEAD,
      departmentId: null,
    });
    expect(result).toEqual([]);
    expect(prisma.user.findMany).not.toHaveBeenCalled();
  });

  it('PM: chỉ thấy members của projects mình PM (kèm chính mình)', async () => {
    prisma.project.findMany.mockResolvedValue([
      { members: [{ userId: 'u2' }, { userId: 'u3' }] },
    ]);

    await service.findByDepartmentOrMine({
      id: 'pm-1',
      role: Role.PM,
      departmentId: 'dept-eng',
    });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'ACTIVE',
          deletedAt: null,
          id: expect.objectContaining({ in: expect.arrayContaining(['u2', 'u3', 'pm-1']) }),
        }),
      }),
    );
  });

  it('ADMIN: thấy tất cả users active (không filter departmentId)', async () => {
    prisma.user.findMany.mockResolvedValue([]);

    await service.findByDepartmentOrMine({
      id: 'admin-1',
      role: Role.ADMIN,
      departmentId: null,
    });

    const callArg = prisma.user.findMany.mock.calls[0][0];
    expect(callArg.where).not.toHaveProperty('departmentId');
    expect(callArg.where).toMatchObject({ status: 'ACTIVE', deletedAt: null });
  });

  it('HR: thấy tất cả users active (không filter departmentId)', async () => {
    prisma.user.findMany.mockResolvedValue([]);

    await service.findByDepartmentOrMine({
      id: 'hr-1',
      role: Role.HR,
      departmentId: null,
    });

    const callArg = prisma.user.findMany.mock.calls[0][0];
    expect(callArg.where).not.toHaveProperty('departmentId');
  });
});
