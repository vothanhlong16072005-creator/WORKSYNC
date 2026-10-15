import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AttendanceService } from '../attendance.service.js';

describe('AttendanceService - Role-Based Methods (M12)', () => {
  let service: AttendanceService;
  let mockPrisma: any;
  let mockIpValidation: any;
  let mockGeoValidation: any;

  beforeEach(() => {
    mockPrisma = {
      systemConfig: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'cfg-1',
          companyName: 'FPT Software',
          timezone: 'Asia/Ho_Chi_Minh',
          workStartTime: '08:30',
          workEndTime: '17:30',
          checkinStartTime: '06:00',
          checkinEndTime: '12:00',
          officeLatitude: 15.9686,
          officeLongitude: 108.2608,
          gpsRadiusMeters: 500,
          allowedIpRanges: ['118.69.0.0/16'],
        }),
        create: vi.fn(),
        update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'cfg-1', ...data })),
      },
      project: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'proj-1',
            name: 'WorkSync Mobile App',
            color: '#3B82F6',
            members: [
              {
                userId: 'user-1',
                projectRole: 'DEV',
                user: { id: 'user-1', name: 'Dev One', email: 'dev1@fpt.com' },
              },
              {
                userId: 'user-2',
                projectRole: 'QA',
                user: { id: 'user-2', name: 'QA Two', email: 'qa2@fpt.com' },
              },
            ],
          },
        ]),
      },
      attendanceRecord: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'rec-1',
            userId: 'user-1',
            date: new Date('2026-10-15T00:00:00.000Z'),
            status: 'ON_TIME',
            checkInTime: new Date('2026-10-15T08:15:00.000Z'),
            checkOutTime: null,
            checkInMethod: 'GPS',
            user: { id: 'user-1', name: 'Dev One', email: 'dev1@fpt.com', departmentId: 'dept-1' },
          },
        ]),
      },
      user: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'user-1', name: 'Dev One', email: 'dev1@fpt.com', role: 'EMPLOYEE', departmentId: 'dept-1' },
          { id: 'user-2', name: 'QA Two', email: 'qa2@fpt.com', role: 'EMPLOYEE', departmentId: 'dept-1' },
        ]),
      },
      department: {
        findMany: vi.fn().mockResolvedValue([
          { id: 'dept-1', name: 'Platform Core' },
        ]),
      },
    };

    mockIpValidation = { isAllowed: vi.fn().mockReturnValue(true) };
    mockGeoValidation = { isWithinRadius: vi.fn().mockReturnValue(true) };

    service = new AttendanceService(mockPrisma, mockIpValidation, mockGeoValidation);
  });

  describe('getTeamAttendance', () => {
    it('returns team members with attendance records and marks missing members as NOT_CHECKED_IN', async () => {
      const res = await service.getTeamAttendance('pm-user-id', 'PM', { date: '2026-10-15' });

      expect(res.summary.totalMembers).toBe(2);
      expect(res.summary.presentCount).toBe(1);
      expect(res.summary.onTimeCount).toBe(1);
      expect(res.summary.missingCount).toBe(1);

      expect(res.members).toHaveLength(2);
      const user1 = res.members.find((m) => m.userId === 'user-1');
      const user2 = res.members.find((m) => m.userId === 'user-2');

      expect(user1?.status).toBe('ON_TIME');
      expect(user2?.status).toBe('NOT_CHECKED_IN');
    });

    it('filters by projectId if provided', async () => {
      await service.getTeamAttendance('pm-user-id', 'PM', { projectId: 'proj-1' });
      expect(mockPrisma.project.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'proj-1' }),
        }),
      );
    });
  });

  describe('getCompanyAttendance', () => {
    it('returns company-wide stats and department mapping', async () => {
      const res = await service.getCompanyAttendance({ fromDate: '2026-10-15', toDate: '2026-10-15' });

      expect(res.summary.totalEmployees).toBe(2);
      expect(res.summary.totalRecords).toBe(1);
      expect(res.summary.onTime).toBe(1);
      expect(res.departments).toHaveLength(1);
      expect(res.departments[0].name).toBe('Platform Core');
    });
  });

  describe('getSettings and updateSettings', () => {
    it('returns current system configuration', async () => {
      const settings = await service.getSettings();
      expect(settings.companyName).toBe('FPT Software');
      expect(settings.gpsRadiusMeters).toBe(500);
    });

    it('updates system configuration when requested by admin', async () => {
      const updated = await service.updateSettings({
        companyName: 'FPT Software Da Nang',
        gpsRadiusMeters: 600,
      });

      expect(mockPrisma.systemConfig.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            companyName: 'FPT Software Da Nang',
            gpsRadiusMeters: 600,
          },
        }),
      );
      expect(updated.companyName).toBe('FPT Software Da Nang');
    });
  });
});
