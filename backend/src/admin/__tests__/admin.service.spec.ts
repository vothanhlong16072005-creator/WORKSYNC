import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AdminService } from '../admin.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import { Role, UserStatus } from '@prisma/client';

describe('AdminService', () => {
  let prisma: any;
  let service: AdminService;

  beforeEach(() => {
    prisma = {
      user: {
        count: vi.fn().mockResolvedValue(10),
        groupBy: vi.fn().mockResolvedValue([
          { role: Role.ADMIN, _count: { id: 1 } },
          { role: Role.PM, _count: { id: 2 } },
          { role: Role.EMPLOYEE, _count: { id: 7 } },
        ]),
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      department: {
        count: vi.fn().mockResolvedValue(3),
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      project: {
        count: vi.fn().mockResolvedValue(5),
        findMany: vi.fn().mockResolvedValue([]),
      },
      document: {
        count: vi.fn().mockResolvedValue(12),
        findMany: vi.fn().mockResolvedValue([]),
      },
      meeting: {
        count: vi.fn().mockResolvedValue(4),
        findMany: vi.fn().mockResolvedValue([]),
      },
      attendanceRecord: {
        findMany: vi.fn().mockResolvedValue([
          { status: 'ON_TIME' },
          { status: 'LATE' },
          { status: 'WFH' },
        ]),
      },
      systemConfig: {
        findFirst: vi.fn().mockResolvedValue({ gpsRadiusMeters: 100 }),
      },
    };
    service = new AdminService(prisma as unknown as PrismaService);
  });

  it('getOverview calculates KPIs and role distribution correctly', async () => {
    const overview = await service.getOverview();

    expect(overview.kpis.totalUsers).toBe(10);
    expect(overview.kpis.activeUsers).toBe(10);
    expect(overview.kpis.totalDepartments).toBe(3);
    expect(overview.kpis.totalProjects).toBe(5);
    expect(overview.kpis.totalDocuments).toBe(12);
    expect(overview.kpis.totalMeetings).toBe(4);

    expect(overview.todayAttendance.present).toBe(3);
    expect(overview.todayAttendance.onTime).toBe(1);
    expect(overview.todayAttendance.late).toBe(1);
    expect(overview.todayAttendance.wfh).toBe(1);

    expect(overview.roleDistribution).toHaveLength(5);
    const adminRole = overview.roleDistribution.find((r) => r.role === Role.ADMIN);
    expect(adminRole?.count).toBe(1);
  });

  it('updateUserRole updates user role via prisma', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', name: 'Alice' });
    prisma.user.update.mockResolvedValue({ id: 'u1', name: 'Alice', role: Role.PM });

    const result = await service.updateUserRole('u1', Role.PM);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { role: Role.PM },
      select: expect.any(Object),
    });
    expect(result.role).toBe(Role.PM);
  });

  it('updateUserStatus updates user status via prisma', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', name: 'Alice' });
    prisma.user.update.mockResolvedValue({ id: 'u1', name: 'Alice', status: UserStatus.SUSPENDED });

    const result = await service.updateUserStatus('u1', UserStatus.SUSPENDED);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { status: UserStatus.SUSPENDED },
      select: expect.any(Object),
    });
    expect(result.status).toBe(UserStatus.SUSPENDED);
  });
});
