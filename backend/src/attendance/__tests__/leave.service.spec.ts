import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { LeaveService } from '../leave.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { LeaveBalanceService } from '../leave-balance.service.js';
import { LeaveType, AttendanceStatus } from '@prisma/client';

describe('LeaveService', () => {
  let service: LeaveService;
  let mockPrisma: any;
  let mockLeaveBalance: any;

  beforeEach(() => {
    mockPrisma = {
      $transaction: vi.fn((callback) => callback(mockPrisma)),
      leaveRequest: {
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
      attendanceRecord: {
        upsert: vi.fn().mockResolvedValue({}),
      },
    };

    mockLeaveBalance = {
      validateBalance: vi.fn().mockResolvedValue(undefined),
      getBalance: vi.fn().mockResolvedValue({ total: 12, used: 2, remaining: 10 }),
    };

    service = new LeaveService(
      mockPrisma as PrismaService,
      mockLeaveBalance as LeaveBalanceService,
    );
  });

  describe('createRequest', () => {
    it('throws BadRequestException if startDate is after endDate', async () => {
      await expect(
        service.createRequest('user-1', {
          startDate: '2026-10-20',
          endDate: '2026-10-18',
          leaveType: LeaveType.ANNUAL,
          dayCount: 1,
          reason: 'Nghỉ mát',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException (DAY_COUNT_MISMATCH) if user submits incorrect dayCount', async () => {
      // 3 days range (2026-10-18 to 2026-10-20) but dayCount=1
      await expect(
        service.createRequest('user-1', {
          startDate: '2026-10-18',
          endDate: '2026-10-20',
          leaveType: LeaveType.ANNUAL,
          dayCount: 1,
          reason: 'Gian lận ngày nghỉ',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows 0.5 dayCount only when startDate === endDate', async () => {
      mockPrisma.leaveRequest.create.mockResolvedValue({ id: 'leave-half', status: 'PENDING' });

      // Single day with 0.5
      await expect(
        service.createRequest('user-1', {
          startDate: '2026-10-18',
          endDate: '2026-10-18',
          leaveType: LeaveType.ANNUAL,
          dayCount: 0.5,
          reason: 'Nghỉ nửa ngày',
        }),
      ).resolves.toBeDefined();

      // Multi-day with 0.5 should fail
      await expect(
        service.createRequest('user-1', {
          startDate: '2026-10-18',
          endDate: '2026-10-19',
          leaveType: LeaveType.ANNUAL,
          dayCount: 0.5,
          reason: 'Nghỉ nửa ngày',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException if requested dates overlap with an existing request', async () => {
      mockPrisma.leaveRequest.findFirst.mockResolvedValue({
        id: 'existing-overlap',
        status: 'PENDING',
      });

      await expect(
        service.createRequest('user-1', {
          startDate: '2026-10-18',
          endDate: '2026-10-19',
          leaveType: LeaveType.ANNUAL,
          dayCount: 2,
          reason: 'Trùng ngày',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('validates leave balance inside transaction for ANNUAL leave', async () => {
      mockPrisma.leaveRequest.create.mockResolvedValue({
        id: 'leave-1',
        status: 'PENDING',
      });

      await service.createRequest('user-1', {
        startDate: '2026-10-18',
        endDate: '2026-10-19',
        leaveType: LeaveType.ANNUAL,
        dayCount: 2,
        reason: 'Nghỉ phép',
      });

      expect(mockLeaveBalance.validateBalance).toHaveBeenCalledWith('user-1', 2, expect.any(Number), mockPrisma);
      expect(mockPrisma.leaveRequest.create).toHaveBeenCalled();
    });
  });

  describe('approveRequest', () => {
    it('throws NotFoundException if request not found', async () => {
      mockPrisma.leaveRequest.findUnique.mockResolvedValue(null);

      await expect(service.approveRequest('leave-none', 'hr-1')).rejects.toThrow(NotFoundException);
    });

    it('approves request and upserts attendance records for EVERY date in the range', async () => {
      const mockReq = {
        id: 'leave-1',
        userId: 'user-1',
        startDate: new Date('2026-10-18T00:00:00.000Z'),
        endDate: new Date('2026-10-20T00:00:00.000Z'), // 3 days: 18, 19, 20
        status: 'PENDING',
        leaveType: LeaveType.ANNUAL,
        reason: 'Du lịch',
      };
      mockPrisma.leaveRequest.findUnique.mockResolvedValue(mockReq);
      mockPrisma.leaveRequest.update.mockResolvedValue({
        ...mockReq,
        status: 'APPROVED',
      });

      const result = await service.approveRequest('leave-1', 'hr-1');
      expect(result.status).toBe('APPROVED');
      // Should upsert 3 times (for 18th, 19th, and 20th)
      expect(mockPrisma.attendanceRecord.upsert).toHaveBeenCalledTimes(3);
      expect(mockPrisma.attendanceRecord.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId_date: {
              userId: 'user-1',
              date: mockReq.startDate,
            },
          },
          create: expect.objectContaining({
            status: AttendanceStatus.ABSENT_APPROVED,
          }),
          update: expect.objectContaining({
            status: AttendanceStatus.ABSENT_APPROVED,
          }),
        }),
      );
    });
  });
});
