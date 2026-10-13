import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { WfhService } from '../wfh.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

describe('WfhService', () => {
  let service: WfhService;
  let mockPrisma: any;

  // Tomorrow date string
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Yesterday date string
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  beforeEach(() => {
    mockPrisma = {
      wfhRequest: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn(),
      },
      leaveRequest: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      attendanceRecord: {
        updateMany: vi.fn(),
      },
    };
    service = new WfhService(mockPrisma as PrismaService);
  });

  describe('createRequest', () => {
    it('throws BadRequestException (DATE_IN_PAST) if requested date is in the past', async () => {
      await expect(
        service.createRequest('user-1', {
          date: yesterdayStr,
          reason: 'Làm việc từ xa hôm qua',
          expectedStart: '08:30',
          expectedEnd: '17:30',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException (INVALID_TIME_RANGE) if expectedEnd is before or equal to expectedStart', async () => {
      await expect(
        service.createRequest('user-1', {
          date: tomorrowStr,
          reason: 'Làm việc từ xa',
          expectedStart: '17:30',
          expectedEnd: '08:30', // Inverted
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException if active WFH request already exists for same date', async () => {
      mockPrisma.wfhRequest.findFirst.mockResolvedValue({
        id: 'wfh-1',
        status: 'PENDING',
      });

      await expect(
        service.createRequest('user-1', {
          date: tomorrowStr,
          reason: 'Làm việc từ xa',
          expectedStart: '08:30',
          expectedEnd: '17:30',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws ConflictException if user already has an active leave request on the same date', async () => {
      mockPrisma.wfhRequest.findFirst.mockResolvedValue(null);
      mockPrisma.leaveRequest.findFirst.mockResolvedValue({
        id: 'leave-1',
        status: 'APPROVED',
      });

      await expect(
        service.createRequest('user-1', {
          date: tomorrowStr,
          reason: 'Xin WFH trùng ngày nghỉ phép',
          expectedStart: '08:30',
          expectedEnd: '17:30',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates WFH request successfully for valid future date and times', async () => {
      mockPrisma.wfhRequest.findFirst.mockResolvedValue(null);
      mockPrisma.leaveRequest.findFirst.mockResolvedValue(null);
      mockPrisma.wfhRequest.create.mockResolvedValue({
        id: 'wfh-new',
        userId: 'user-1',
        status: 'PENDING',
      });

      const result = await service.createRequest('user-1', {
        date: tomorrowStr,
        reason: 'Sửa nhà',
        expectedStart: '08:30',
        expectedEnd: '17:30',
      });

      expect(result.id).toBe('wfh-new');
      expect(mockPrisma.wfhRequest.create).toHaveBeenCalled();
    });
  });

  describe('approveRequest', () => {
    it('throws NotFoundException if request does not exist', async () => {
      mockPrisma.wfhRequest.findUnique.mockResolvedValue(null);

      await expect(service.approveRequest('wfh-none', 'hr-1')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if request is already processed', async () => {
      mockPrisma.wfhRequest.findUnique.mockResolvedValue({
        id: 'wfh-1',
        status: 'APPROVED',
      });

      await expect(service.approveRequest('wfh-1', 'hr-1')).rejects.toThrow(BadRequestException);
    });

    it('approves request and updates existing attendance record to WFH', async () => {
      const mockRequest = {
        id: 'wfh-1',
        userId: 'user-1',
        date: new Date('2026-10-15T00:00:00.000Z'),
        status: 'PENDING',
      };
      mockPrisma.wfhRequest.findUnique.mockResolvedValue(mockRequest);
      mockPrisma.wfhRequest.update.mockResolvedValue({
        ...mockRequest,
        status: 'APPROVED',
      });

      const result = await service.approveRequest('wfh-1', 'hr-1');
      expect(result.status).toBe('APPROVED');
      expect(mockPrisma.attendanceRecord.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          date: mockRequest.date,
        },
        data: {
          status: 'WFH',
        },
      });
    });
  });

  describe('rejectRequest', () => {
    it('rejects request with rejection note', async () => {
      mockPrisma.wfhRequest.findUnique.mockResolvedValue({
        id: 'wfh-1',
        status: 'PENDING',
      });
      mockPrisma.wfhRequest.update.mockResolvedValue({
        id: 'wfh-1',
        status: 'REJECTED',
        rejectionNote: 'Dự án đang gấp',
      });

      const result = await service.rejectRequest('wfh-1', 'pm-1', 'Dự án đang gấp');
      expect(result.status).toBe('REJECTED');
      expect(result.rejectionNote).toBe('Dự án đang gấp');
    });
  });
});
