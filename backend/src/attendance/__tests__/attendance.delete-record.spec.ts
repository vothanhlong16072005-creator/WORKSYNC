import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceService } from '../attendance.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { IpValidationService } from '../ip-validation.service.js';
import type { GeoValidationService } from '../geo-validation.service.js';

/**
 * Regression tests cho:
 * 1. `checkOut` chặn trường hợp check-out TRƯỚC check-in (nguyên nhân gốc
 *    tạo ra bản ghi "vô lý" khiến UI hiện "Working 0.0h").
 * 2. `deleteRecord` — cho phép chủ bản ghi / quản lý xóa bản ghi sai.
 */
describe('AttendanceService — deleteRecord & checkOut guard', () => {
  let service: AttendanceService;
  let mockPrisma: any;
  let mockIpValidation: any;
  let mockGeoValidation: any;

  const mockConfig = {
    workStartTime: '08:30',
    workEndTime: '17:30',
    checkinStartTime: '06:00',
    checkinEndTime: '12:00',
    allowedIpRanges: ['127.0.0.1'],
    officeLatitude: 21.028511,
    officeLongitude: 105.782045,
    gpsRadiusMeters: 500,
    timezone: 'Asia/Ho_Chi_Minh',
  };

  beforeEach(() => {
    mockPrisma = {
      systemConfig: {
        findFirst: vi.fn().mockResolvedValue(mockConfig),
      },
      attendanceRecord: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn().mockResolvedValue({ id: 'record-1' }),
        findMany: vi.fn(),
      },
      wfhRequest: { findFirst: vi.fn().mockResolvedValue(null) },
      leaveRequest: { findFirst: vi.fn().mockResolvedValue(null) },
      earlyLeaveRequest: { findFirst: vi.fn().mockResolvedValue(null) },
      overtimeRequest: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    };

    mockIpValidation = { isAllowed: vi.fn().mockReturnValue(true) };
    mockGeoValidation = { isWithinRadius: vi.fn().mockReturnValue(true) };

    service = new AttendanceService(
      mockPrisma as PrismaService,
      mockIpValidation as IpValidationService,
      mockGeoValidation as GeoValidationService,
    );
  });

  describe('deleteRecord', () => {
    it('cho phép chủ sở hữu bản ghi xóa bản ghi của chính mình', async () => {
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue({
        id: 'record-1',
        userId: 'user-1',
        date: new Date('2026-10-24T00:00:00.000Z'),
      });

      const result = await service.deleteRecord('user-1', 'record-1', {
        id: 'user-1',
        role: 'EMPLOYEE',
      });

      expect(result.success).toBe(true);
      expect(mockPrisma.attendanceRecord.delete).toHaveBeenCalledWith({
        where: { id: 'record-1' },
      });
    });

    it('cho phép ADMIN xóa bản ghi của người khác', async () => {
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue({
        id: 'record-2',
        userId: 'other-user',
        date: new Date('2026-10-24T00:00:00.000Z'),
      });

      await expect(
        service.deleteRecord('admin-1', 'record-2', { id: 'admin-1', role: 'ADMIN' }),
      ).resolves.toEqual(expect.objectContaining({ success: true }));
      expect(mockPrisma.attendanceRecord.delete).toHaveBeenCalled();
    });

    it('từ chối EMPLOYEE xóa bản ghi của người khác (IDOR protection)', async () => {
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue({
        id: 'record-3',
        userId: 'other-user',
        date: new Date('2026-10-24T00:00:00.000Z'),
      });

      await expect(
        service.deleteRecord('user-1', 'record-3', { id: 'user-1', role: 'EMPLOYEE' }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(mockPrisma.attendanceRecord.delete).not.toHaveBeenCalled();
    });

    it('ném NotFoundException khi bản ghi không tồn tại', async () => {
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteRecord('user-1', 'missing', { id: 'user-1', role: 'EMPLOYEE' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('checkOut — chặn check-out trước check-in', () => {
    it('ném BadRequestException khi check-out sớm hơn check-in', async () => {
      const checkInTime = new Date('2026-10-24T01:18:00.000Z'); // 08:18 VN

      mockPrisma.attendanceRecord.findUnique.mockResolvedValue({
        id: 'record-1',
        userId: 'user-1',
        date: new Date('2026-10-24T00:00:00.000Z'),
        status: 'ON_TIME',
        checkInTime,
        checkOutTime: null,
        note: null,
      });

      // now = 2026-10-23T21:39Z (trước check-in) → dữ liệu sai
      const now = new Date('2026-10-23T21:39:09.235Z');

      await expect(service.checkOut('user-1', {}, now)).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(mockPrisma.attendanceRecord.update).not.toHaveBeenCalled();
    });

    it('vẫn cho phép check-out bình thường (sau check-in)', async () => {
      const checkInTime = new Date('2026-10-24T01:18:00.000Z');

      mockPrisma.attendanceRecord.findUnique.mockResolvedValue({
        id: 'record-1',
        userId: 'user-1',
        date: new Date('2026-10-24T00:00:00.000Z'),
        status: 'ON_TIME',
        checkInTime,
        checkOutTime: null,
        note: null,
      });
      mockPrisma.attendanceRecord.update.mockResolvedValue({ id: 'record-1' });

      const now = new Date('2026-10-24T10:00:00.000Z'); // 17:00 VN

      await expect(service.checkOut('user-1', {}, now)).resolves.toBeTruthy();
      expect(mockPrisma.attendanceRecord.update).toHaveBeenCalled();
    });
  });
});
