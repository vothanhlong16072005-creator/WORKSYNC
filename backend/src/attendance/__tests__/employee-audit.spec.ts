import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AttendanceService } from '../attendance.service.js';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

describe('AttendanceService.getEmployeeAudit', () => {
  let service: AttendanceService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
      attendanceRecord: {
        findMany: vi.fn(),
      },
      leaveRequest: {
        findMany: vi.fn(),
      },
      wfhRequest: {
        findMany: vi.fn(),
      },
      overtimeRequest: {
        findMany: vi.fn(),
      },
      systemConfig: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    };

    service = new AttendanceService(mockPrisma, {} as any, {} as any);
  });

  it('throws NotFoundException if user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.getEmployeeAudit('u-unknown', {}, { id: 'hr-1', role: 'HR', departmentId: 'dept-hr' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException if department head audits user outside department', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u-dev-1',
      name: 'Dev One',
      departmentId: 'dept-eng',
    });

    await expect(
      service.getEmployeeAudit('u-dev-1', {}, { id: 'head-sales', role: 'DEPARTMENT_HEAD', departmentId: 'dept-sales' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('calculates working hours, punctuality rate, and aggregates requests accurately', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u-1',
      name: 'Nguyen Van A',
      email: 'a@worksync.com',
      role: 'EMPLOYEE',
      departmentId: 'dept-eng',
      department: { id: 'dept-eng', name: 'Engineering' },
    });

    const checkInTime = new Date('2026-10-20T08:30:00.000Z');
    const checkOutTime = new Date('2026-10-20T17:30:00.000Z'); // 9.0 hours

    mockPrisma.attendanceRecord.findMany.mockResolvedValue([
      {
        id: 'rec-1',
        date: new Date('2026-10-20T00:00:00.000Z'),
        status: 'ON_TIME',
        checkInTime,
        checkOutTime,
        checkInMethod: 'GPS',
        checkInIp: '127.0.0.1',
        note: null,
      },
      {
        id: 'rec-2',
        date: new Date('2026-10-21T00:00:00.000Z'),
        status: 'WFH',
        checkInTime: null,
        checkOutTime: null,
        checkInMethod: 'WEB',
        checkInIp: '127.0.0.1',
        note: null,
      },
    ]);

    mockPrisma.leaveRequest.findMany.mockResolvedValue([
      {
        id: 'leave-1',
        startDate: new Date('2026-10-22T00:00:00.000Z'),
        endDate: new Date('2026-10-22T23:59:59.000Z'),
        leaveType: 'ANNUAL',
        reason: 'Nghi viec gia dinh',
        status: 'APPROVED',
        dayCount: 1,
        reviewedAt: new Date(),
      },
    ]);

    mockPrisma.wfhRequest.findMany.mockResolvedValue([]);
    mockPrisma.overtimeRequest.findMany.mockResolvedValue([]);

    const result = await service.getEmployeeAudit(
      'u-1',
      { fromDate: '2026-10-01', toDate: '2026-10-31' },
      { id: 'hr-1', role: 'HR', departmentId: 'dept-hr' },
    );

    expect(result.user.name).toBe('Nguyen Van A');
    expect(result.kpi.totalDays).toBe(2);
    expect(result.kpi.attendedDays).toBe(2);
    expect(result.kpi.onTimeDays).toBe(1);
    expect(result.kpi.wfhDays).toBe(1);
    expect(result.kpi.totalWorkHours).toBe(17); // 9h + 8h
    expect(result.kpi.punctualityRate).toBe(50); // 1 on-time out of 2 attended
    expect(result.requests.leaves).toHaveLength(1);
  });
});
