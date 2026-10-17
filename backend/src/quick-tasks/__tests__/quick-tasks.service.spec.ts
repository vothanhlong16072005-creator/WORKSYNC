import { describe, expect, it, beforeEach, vi } from 'vitest';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Role, TaskStatus, Priority, ProjectKind } from '@prisma/client';
import { QuickTaskService, type CurrentActor } from '../quick-tasks.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

/**
 * Test QuickTask RBAC theo M3.5:
 * - DEPT_HEAD chỉ giao được cho nhân viên CÙNG PHÒNG
 * - PM chỉ giao được trong project mình PM
 * - Admin giao được cho bất kỳ ai
 * - HR/EMPLOYEE: không có quyền
 */
describe('QuickTaskService.create — RBAC', () => {
  let prisma: any;
  let service: QuickTaskService;
  const engDeptId = 'dept-eng';
  const designDeptId = 'dept-design';

  const adminActor: CurrentActor = { id: 'admin-1', role: Role.ADMIN, departmentId: null };
  const headEngActor: CurrentActor = { id: 'head-1', role: Role.DEPARTMENT_HEAD, departmentId: engDeptId };
  const headDesignActor: CurrentActor = { id: 'head-2', role: Role.DEPARTMENT_HEAD, departmentId: designDeptId };
  const pmActor: CurrentActor = { id: 'pm-1', role: Role.PM, departmentId: engDeptId };
  const hrActor: CurrentActor = { id: 'hr-1', role: Role.HR, departmentId: null };
  const empActor: CurrentActor = { id: 'emp-1', role: Role.EMPLOYEE, departmentId: engDeptId };

  beforeEach(() => {
    prisma = {
      user: { findUnique: vi.fn() },
      project: { findUnique: vi.fn(), findMany: vi.fn() },
      quickTask: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), groupBy: vi.fn(), update: vi.fn(), delete: vi.fn() },
    };
    service = new QuickTaskService(prisma as unknown as PrismaService);
  });

  it('Admin có thể giao cho bất kỳ ai', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'target-1', departmentId: designDeptId, name: 'Target', role: Role.EMPLOYEE, status: 'ACTIVE',
    });
    prisma.quickTask.create.mockResolvedValue({ id: 'qt-new', title: 'Task' });

    const result = await service.create(
      { title: 'Test task', assigneeId: 'target-1', dueDate: new Date().toISOString(), priority: Priority.MEDIUM, status: TaskStatus.TODO },
      adminActor,
    );
    expect(result).toBeDefined();
    expect(prisma.quickTask.create).toHaveBeenCalled();
  });

  it('DEPT_HEAD giao được cho nhân viên CÙNG PHÒNG', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'target-1', departmentId: engDeptId, name: 'Target', role: Role.EMPLOYEE, status: 'ACTIVE',
    });
    prisma.quickTask.create.mockResolvedValue({ id: 'qt-new' });

    const result = await service.create(
      { title: 'Cùng phòng', assigneeId: 'target-1', dueDate: new Date().toISOString(), priority: Priority.HIGH, status: TaskStatus.TODO },
      headEngActor,
    );
    expect(result).toBeDefined();
  });

  it('DEPT_HEAD KHÔNG giao được cho nhân viên KHÁC PHÒNG', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'target-1', departmentId: designDeptId, name: 'Target', role: Role.EMPLOYEE, status: 'ACTIVE',
    });

    await expect(
      service.create(
        { title: 'Khác phòng', assigneeId: 'target-1', dueDate: new Date().toISOString(), priority: Priority.MEDIUM, status: TaskStatus.TODO },
        headEngActor,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('PM giao task trong project mình PM: OK', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'target-1', departmentId: engDeptId, name: 'Target', role: Role.EMPLOYEE, status: 'ACTIVE',
    });
    prisma.project.findUnique.mockResolvedValue({ id: 'p-1', deletedAt: null, pmId: 'pm-1', members: [] });
    prisma.quickTask.create.mockResolvedValue({ id: 'qt-new' });

    const result = await service.create(
      { title: 'PM task', assigneeId: 'target-1', projectId: 'p-1', dueDate: new Date().toISOString(), priority: Priority.MEDIUM, status: TaskStatus.TODO },
      pmActor,
    );
    expect(result).toBeDefined();
  });

  it('PM KHÔNG giao được task trong project NGƯỜI KHÁC PM', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'target-1', departmentId: engDeptId, name: 'Target', role: Role.EMPLOYEE, status: 'ACTIVE',
    });
    prisma.project.findUnique.mockResolvedValue({ id: 'p-1', deletedAt: null, pmId: 'pm-OTHER', members: [] });

    await expect(
      service.create(
        { title: 'PM khác', assigneeId: 'target-1', projectId: 'p-1', dueDate: new Date().toISOString(), priority: Priority.MEDIUM, status: TaskStatus.TODO },
        pmActor,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('HR KHÔNG có quyền giao Quick Task', async () => {
    await expect(
      service.create(
        { title: 'HR task', assigneeId: 'target-1', dueDate: new Date().toISOString(), priority: Priority.MEDIUM, status: TaskStatus.TODO },
        hrActor,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('EMPLOYEE KHÔNG có quyền giao Quick Task', async () => {
    await expect(
      service.create(
        { title: 'Employee task', assigneeId: 'target-1', dueDate: new Date().toISOString(), priority: Priority.MEDIUM, status: TaskStatus.TODO },
        empActor,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('Báo lỗi khi assignee không tồn tại', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.create(
        { title: 'No user', assigneeId: 'missing', dueDate: new Date().toISOString(), priority: Priority.MEDIUM, status: TaskStatus.TODO },
        adminActor,
      ),
    ).rejects.toThrow(NotFoundException);
  });
});

describe('QuickTaskService.findAll — phạm vi theo role', () => {
  let prisma: any;
  let service: QuickTaskService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: vi.fn() },
      project: { findUnique: vi.fn(), findMany: vi.fn() },
      quickTask: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), groupBy: vi.fn(), update: vi.fn(), delete: vi.fn() },
    };
    service = new QuickTaskService(prisma as unknown as PrismaService);
  });

  it('EMPLOYEE chỉ thấy task của mình', async () => {
    prisma.quickTask.findMany.mockResolvedValue([]);
    await service.findAll({ id: 'emp-1', role: Role.EMPLOYEE, departmentId: 'dept-eng' });
    expect(prisma.quickTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ assigneeId: 'emp-1' }),
      }),
    );
  });

  it('DEPT_HEAD thấy task của nhân viên phòng mình + task mình giao', async () => {
    prisma.quickTask.findMany.mockResolvedValue([]);
    await service.findAll({ id: 'head-1', role: Role.DEPARTMENT_HEAD, departmentId: 'dept-eng' });
    expect(prisma.quickTask.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.arrayContaining([
            expect.objectContaining({ assignedById: 'head-1' }),
          ]),
        }),
      }),
    );
  });

  it('Admin thấy tất cả (không filter)', async () => {
    prisma.quickTask.findMany.mockResolvedValue([]);
    await service.findAll({ id: 'admin-1', role: Role.ADMIN, departmentId: null });
    const call = prisma.quickTask.findMany.mock.calls[0][0];
    expect(call.where).toEqual({});
  });
});

describe('QuickTaskService.update — quyền cập nhật', () => {
  let prisma: any;
  let service: QuickTaskService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: vi.fn() },
      project: { findUnique: vi.fn(), findMany: vi.fn() },
      quickTask: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), groupBy: vi.fn(), update: vi.fn(), delete: vi.fn() },
    };
    service = new QuickTaskService(prisma as unknown as PrismaService);
  });

  it('Assignee chỉ được update status', async () => {
    prisma.quickTask.findUnique.mockResolvedValue({
      id: 'qt-1', assigneeId: 'emp-1', assignedById: 'head-1', status: TaskStatus.TODO, completedAt: null, projectId: null,
    });
    prisma.quickTask.update.mockResolvedValue({ id: 'qt-1' });

    // Cập nhật status → OK
    await expect(
      service.update('qt-1', { status: TaskStatus.DONE }, { id: 'emp-1', role: Role.EMPLOYEE, departmentId: 'dept-eng' }),
    ).resolves.toBeDefined();

    // Cập nhật title → FAIL
    prisma.quickTask.findUnique.mockResolvedValue({
      id: 'qt-1', assigneeId: 'emp-1', assignedById: 'head-1', status: TaskStatus.TODO, completedAt: null, projectId: null,
    });
    await expect(
      service.update('qt-1', { title: 'New title' }, { id: 'emp-1', role: Role.EMPLOYEE, departmentId: 'dept-eng' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('Người giao (assigner) update được mọi thứ', async () => {
    prisma.quickTask.findUnique.mockResolvedValue({
      id: 'qt-1', assigneeId: 'emp-1', assignedById: 'head-1', status: TaskStatus.TODO, completedAt: null, projectId: null,
    });
    prisma.quickTask.update.mockResolvedValue({ id: 'qt-1' });

    await expect(
      service.update('qt-1', { title: 'Updated by assigner' }, { id: 'head-1', role: Role.DEPARTMENT_HEAD, departmentId: 'dept-eng' }),
    ).resolves.toBeDefined();
  });

  it('Auto set completedAt khi status = DONE', async () => {
    prisma.quickTask.findUnique.mockResolvedValue({
      id: 'qt-1', assigneeId: 'emp-1', assignedById: 'head-1', status: TaskStatus.IN_PROGRESS, completedAt: null, projectId: null,
    });
    prisma.quickTask.update.mockResolvedValue({ id: 'qt-1' });

    await service.update('qt-1', { status: TaskStatus.DONE }, { id: 'emp-1', role: Role.EMPLOYEE, departmentId: 'dept-eng' });
    const callArg = prisma.quickTask.update.mock.calls[0][0];
    expect(callArg.data.completedAt).toBeInstanceOf(Date);
  });

  it('Clear completedAt khi revert từ DONE sang status khác', async () => {
    prisma.quickTask.findUnique.mockResolvedValue({
      id: 'qt-1', assigneeId: 'emp-1', assignedById: 'head-1', status: TaskStatus.DONE, completedAt: new Date('2026-01-01'), projectId: null,
    });
    prisma.quickTask.update.mockResolvedValue({ id: 'qt-1' });

    await service.update('qt-1', { status: TaskStatus.IN_PROGRESS }, { id: 'emp-1', role: Role.EMPLOYEE, departmentId: 'dept-eng' });
    const callArg = prisma.quickTask.update.mock.calls[0][0];
    expect(callArg.data.completedAt).toBeNull();
  });
});
