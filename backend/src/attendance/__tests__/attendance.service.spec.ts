import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConflictException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { AttendanceService } from '../attendance.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { IpValidationService } from '../ip-validation.service.js';
import type { GeoValidationService } from '../geo-validation.service.js';

describe('AttendanceService', () => {
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
        findMany: vi.fn(),
      },
      wfhRequest: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      leaveRequest: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      earlyLeaveRequest: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      overtimeRequest: {
        findFirst: vi.fn().mockResolvedValue(null),
        update: vi.fn(),
      },
    };

    mockIpValidation = {
      isAllowed: vi.fn().mockReturnValue(true),
    };

    mockGeoValidation = {
      isWithinRadius: vi.fn().mockReturnValue(true),
    };

    service = new AttendanceService(
      mockPrisma as PrismaService,
      mockIpValidation as IpValidationService,
      mockGeoValidation as GeoValidationService,
    );
  });

  describe('checkIn', () => {
    it('throws InternalServerErrorException if systemConfig is missing', async () => {
      mockPrisma.systemConfig.findFirst.mockResolvedValue(null);

      await expect(
        service.checkIn('user-1', { ipAddress: '127.0.0.1' }),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('throws BadRequestException (OUTSIDE_CHECKIN_WINDOW) when checking in before 06:00 AM (e.g. 03:00 AM)', async () => {
      // 03:00 AM VN time (20:00 UTC previous day)
      const earlyMorning = new Date('2026-10-15T20:00:00.000Z');

      await expect(
        service.checkIn('user-1', { ipAddress: '127.0.0.1' }, earlyMorning),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException (OUTSIDE_CHECKIN_WINDOW) when checking in after 12:00 PM (e.g. 14:00 PM)', async () => {
      // 14:00 PM VN time (07:00 UTC)
      const afternoon = new Date('2026-10-15T07:00:00.000Z');

      await expect(
        service.checkIn('user-1', { ipAddress: '127.0.0.1' }, afternoon),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException if already checked in today', async () => {
      // 08:00 AM VN time (01:00 UTC)
      const morningTime = new Date('2026-10-15T01:00:00.000Z');
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue({
        id: 'rec-1',
        userId: 'user-1',
      });

      await expect(
        service.checkIn('user-1', { ipAddress: '127.0.0.1' }, morningTime),
      ).rejects.toThrow(ConflictException);
    });

    it('successfully checks in with ON_TIME status when within work hours (08:15 AM)', async () => {
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue(null);
      mockPrisma.attendanceRecord.create.mockImplementation((args: any) => ({
        id: 'rec-new',
        ...args.data,
      }));

      // 08:15 AM VN time (01:15 UTC)
      const fixedTime = new Date('2026-10-15T01:15:00.000Z');

      const result = await service.checkIn('user-1', {
        ipAddress: '127.0.0.1',
        latitude: 21.028511,
        longitude: 105.782045,
      }, fixedTime);

      expect(result.status).toBe('ON_TIME');
      expect(result.checkInMethod).toBe('GPS');
      expect(mockPrisma.attendanceRecord.create).toHaveBeenCalled();
    });

    it('sets status to LATE when checking in 10 minutes past start time (08:40 AM)', async () => {
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue(null);
      mockPrisma.attendanceRecord.create.mockImplementation((args: any) => ({
        id: 'rec-late',
        ...args.data,
      }));

      // 08:40 AM VN time (01:40 UTC)
      const lateTime = new Date('2026-10-15T01:40:00.000Z');

      const result = await service.checkIn('user-1', { ipAddress: '127.0.0.1' }, lateTime);
      expect(result.status).toBe('LATE');
    });

    it('sets status to WFH when user has approved WFH request today', async () => {
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue(null);
      mockPrisma.wfhRequest.findFirst.mockResolvedValue({
        id: 'wfh-1',
        status: 'APPROVED',
      });
      mockPrisma.attendanceRecord.create.mockImplementation((args: any) => ({
        id: 'rec-wfh',
        ...args.data,
      }));

      // 08:30 AM VN time (01:30 UTC)
      const morning = new Date('2026-10-15T01:30:00.000Z');

      const result = await service.checkIn('user-1', { ipAddress: '8.8.8.8' }, morning);
      expect(result.status).toBe('WFH');
    });
  });

  describe('checkOut', () => {
    it('throws BadRequestException if user has not checked in today', async () => {
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue(null);

      await expect(service.checkOut('user-1', {})).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException if user already checked out', async () => {
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue({
        id: 'rec-1',
        checkInTime: new Date(),
        checkOutTime: new Date(),
      });

      await expect(service.checkOut('user-1', {})).rejects.toThrow(ConflictException);
    });

    it('successfully checks out', async () => {
      mockPrisma.attendanceRecord.findUnique.mockResolvedValue({
        id: 'rec-1',
        checkInTime: new Date(),
        checkOutTime: null,
      });
      mockPrisma.attendanceRecord.update.mockResolvedValue({
        id: 'rec-1',
        checkOutTime: new Date(),
      });

      const result = await service.checkOut('user-1', {});
      expect(result.checkOutTime).toBeDefined();
    });
  });
});
