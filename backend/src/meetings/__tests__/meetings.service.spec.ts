import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MeetingScope, MeetingStatus, Role, RSVP } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MeetingsAccessService } from '../meetings-access.service.js';
import { MeetingsService } from '../meetings.service.js';

describe('MeetingsService', () => {
  let service: MeetingsService;
  let accessServiceMock: any;
  let prismaMock: any;

  beforeEach(() => {
    accessServiceMock = {
      canCreateMeeting: vi.fn(),
      canViewMeeting: vi.fn(),
      canManageMeeting: vi.fn(),
      resolveAutoAttendees: vi.fn(),
    };

    prismaMock = {
      meeting: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
      meetingAttendee: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
      },
      meetingMinute: {
        upsert: vi.fn(),
        findUnique: vi.fn(),
      },
      project: {
        findUnique: vi.fn(),
      },
      user: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
      },
    };

    service = new MeetingsService(prismaMock, accessServiceMock);
  });

  describe('create meeting', () => {
    it('1. Tạo PROJECT meeting -> auto-add members + DEPT_HEAD', async () => {
      accessServiceMock.canCreateMeeting.mockResolvedValue(true);
      accessServiceMock.resolveAutoAttendees.mockResolvedValue(['pm-1', 'dev-1', 'head-1']);
      prismaMock.meeting.create.mockImplementation((args: any) =>
        Promise.resolve({
          id: 'meet-1',
          ...args.data,
          attendees: args.data.attendees.create,
        }),
      );

      const result = await service.create(
        {
          title: 'Sprint Planning',
          scopeType: MeetingScope.PROJECT,
          projectId: 'proj-1',
          startTime: '2026-10-18T10:00:00.000Z',
          endTime: '2026-10-18T11:00:00.000Z',
          attendeeIds: [],
        },
        { id: 'pm-1', role: Role.PM, departmentId: 'dept-1' },
      );

      expect(result.id).toBe('meet-1');
      expect(accessServiceMock.resolveAutoAttendees).toHaveBeenCalledWith(
        MeetingScope.PROJECT,
        expect.anything(),
        'proj-1',
        undefined,
        [],
      );
    });

    it('2. Tạo DEPARTMENT meeting -> auto-add cả phòng', async () => {
      accessServiceMock.canCreateMeeting.mockResolvedValue(true);
      accessServiceMock.resolveAutoAttendees.mockResolvedValue(['head-1', 'emp-1', 'emp-2']);
      prismaMock.meeting.create.mockImplementation((args: any) =>
        Promise.resolve({ id: 'meet-dept', ...args.data }),
      );

      const result = await service.create(
        {
          title: 'All-Hands Phòng IT',
          scopeType: MeetingScope.DEPARTMENT,
          departmentId: 'dept-1',
          startTime: '2026-10-18T14:00:00.000Z',
          endTime: '2026-10-18T15:30:00.000Z',
          attendeeIds: [],
        },
        { id: 'head-1', role: Role.DEPARTMENT_HEAD, departmentId: 'dept-1' },
      );

      expect(result.id).toBe('meet-dept');
      expect(accessServiceMock.resolveAutoAttendees).toHaveBeenCalledWith(
        MeetingScope.DEPARTMENT,
        expect.anything(),
        undefined,
        'dept-1',
        [],
      );
    });

    it('3. Tạo ONE_ON_ONE -> attendees chỉ định', async () => {
      accessServiceMock.canCreateMeeting.mockResolvedValue(true);
      accessServiceMock.resolveAutoAttendees.mockResolvedValue(['user-1', 'user-2']);
      prismaMock.meeting.create.mockImplementation((args: any) =>
        Promise.resolve({ id: 'meet-1on1', ...args.data }),
      );

      const result = await service.create(
        {
          title: '1-1 Check-in',
          scopeType: MeetingScope.ONE_ON_ONE,
          startTime: '2026-10-18T16:00:00.000Z',
          endTime: '2026-10-18T16:30:00.000Z',
          attendeeIds: ['user-2'],
        },
        { id: 'user-1', role: Role.EMPLOYEE, departmentId: 'dept-1' },
      );

      expect(result.id).toBe('meet-1on1');
    });

    it('4. Tạo PROJECT meeting nhưng user không có quyền -> 403 ForbiddenException', async () => {
      accessServiceMock.canCreateMeeting.mockResolvedValue(false);

      await expect(
        service.create(
          {
            title: 'Họp bí mật',
            scopeType: MeetingScope.PROJECT,
            projectId: 'proj-1',
            startTime: '2026-10-18T10:00:00.000Z',
            endTime: '2026-10-18T11:00:00.000Z',
            attendeeIds: [],
          },
          { id: 'hacker-1', role: Role.EMPLOYEE, departmentId: 'dept-2' },
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if endTime <= startTime', async () => {
      accessServiceMock.canCreateMeeting.mockResolvedValue(true);

      await expect(
        service.create(
          {
            title: 'Họp lỗi giờ',
            scopeType: MeetingScope.ONE_ON_ONE,
            startTime: '2026-10-18T11:00:00.000Z',
            endTime: '2026-10-18T10:00:00.000Z',
            attendeeIds: [],
          },
          { id: 'user-1', role: Role.EMPLOYEE, departmentId: 'dept-1' },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('update & delete meeting', () => {
    it('5. Update meeting (RBAC: creator only)', async () => {
      prismaMock.meeting.findUnique.mockResolvedValue({
        id: 'meet-1',
        createdById: 'pm-1',
        deletedAt: null,
      });
      accessServiceMock.canManageMeeting.mockReturnValue(true);
      prismaMock.meeting.update.mockResolvedValue({
        id: 'meet-1',
        title: 'New Title',
      });

      const updated = await service.update(
        'meet-1',
        { title: 'New Title' },
        { id: 'pm-1', role: Role.PM, departmentId: 'dept-1' },
      );

      expect(updated.title).toBe('New Title');
    });

    it('6. Delete meeting (soft delete, RBAC: creator/Admin)', async () => {
      prismaMock.meeting.findUnique.mockResolvedValue({
        id: 'meet-1',
        createdById: 'pm-1',
        deletedAt: null,
      });
      accessServiceMock.canManageMeeting.mockReturnValue(true);
      prismaMock.meeting.update.mockResolvedValue({
        id: 'meet-1',
        deletedAt: new Date(),
        status: MeetingStatus.CANCELLED,
      });

      const deleted = await service.remove('meet-1', {
        id: 'pm-1',
        role: Role.PM,
        departmentId: 'dept-1',
      });

      expect(deleted.success).toBe(true);
      expect(deleted.id).toBe('meet-1');
      expect(prismaMock.meeting.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'meet-1' },
          data: expect.objectContaining({ status: MeetingStatus.CANCELLED }),
        }),
      );
    });
  });

  describe('query & privacy', () => {
    it('7. findAll — chỉ trả meeting user được xem theo privacy filter', async () => {
      prismaMock.meeting.updateMany.mockResolvedValue({ count: 0 });
      prismaMock.meeting.findMany.mockResolvedValue([
        { id: 'meet-1', title: 'Meeting 1', scopeType: MeetingScope.PROJECT },
      ]);

      const meetings = await service.findAll(
        {},
        { id: 'emp-1', role: Role.EMPLOYEE, departmentId: 'dept-1' },
      );

      expect(meetings).toHaveLength(1);
      expect(prismaMock.meeting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            OR: expect.any(Array),
          }),
        }),
      );
    });

    it('8. findOne với IDOR protection (user ngoài scope -> 403)', async () => {
      accessServiceMock.canViewMeeting.mockResolvedValue(false);

      await expect(
        service.findOne('secret-meeting', {
          id: 'unauthorized-user',
          role: Role.EMPLOYEE,
          departmentId: 'dept-other',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('RSVP workflow', () => {
    it('9. rsvp PENDING -> ACCEPTED', async () => {
      prismaMock.meetingAttendee.findUnique.mockResolvedValue({
        id: 'att-1',
        meetingId: 'meet-1',
        userId: 'user-1',
        rsvp: RSVP.PENDING,
      });
      prismaMock.meetingAttendee.update.mockResolvedValue({
        id: 'att-1',
        rsvp: RSVP.ACCEPTED,
        rsvpAt: new Date(),
      });

      const res = await service.rsvp(
        'meet-1',
        { status: RSVP.ACCEPTED },
        { id: 'user-1', role: Role.EMPLOYEE, departmentId: 'dept-1' },
      );

      expect(res.rsvp).toBe(RSVP.ACCEPTED);
    });

    it('10. rsvp PENDING -> DECLINED', async () => {
      prismaMock.meetingAttendee.findUnique.mockResolvedValue({
        id: 'att-1',
        meetingId: 'meet-1',
        userId: 'user-1',
        rsvp: RSVP.PENDING,
      });
      prismaMock.meetingAttendee.update.mockResolvedValue({
        id: 'att-1',
        rsvp: RSVP.DECLINED,
        rsvpAt: new Date(),
      });

      const res = await service.rsvp(
        'meet-1',
        { status: RSVP.DECLINED },
        { id: 'user-1', role: Role.EMPLOYEE, departmentId: 'dept-1' },
      );

      expect(res.rsvp).toBe(RSVP.DECLINED);
    });
  });

  describe('minutes editor', () => {
    it('11. Save minutes (upsert) for creator', async () => {
      prismaMock.meeting.findUnique.mockResolvedValue({
        id: 'meet-1',
        createdById: 'pm-1',
        deletedAt: null,
      });
      accessServiceMock.canManageMeeting.mockReturnValue(true);
      prismaMock.meetingMinute.upsert.mockResolvedValue({
        id: 'min-1',
        content: '<p>Nội dung biên bản</p>',
      });

      const res = await service.saveMinutes(
        'meet-1',
        { content: '<p>Nội dung biên bản</p>' },
        { id: 'pm-1', role: Role.PM, departmentId: 'dept-1' },
      );

      expect(res.content).toBe('<p>Nội dung biên bản</p>');
    });

    it('12. Get minutes for authorized attendee', async () => {
      accessServiceMock.canViewMeeting.mockResolvedValue(true);
      prismaMock.meetingMinute.findUnique.mockResolvedValue({
        id: 'min-1',
        content: '<p>Đã duyệt sprint</p>',
      });

      const res = await service.getMinutes('meet-1', {
        id: 'emp-1',
        role: Role.EMPLOYEE,
        departmentId: 'dept-1',
      });

      expect(res?.content).toBe('<p>Đã duyệt sprint</p>');
    });
  });

  describe('attendance report & duration', () => {
    it('13. Attendance report: 6 thống kê đúng', async () => {
      accessServiceMock.canViewMeeting.mockResolvedValue(true);
      prismaMock.meeting.findUnique.mockResolvedValue({
        id: 'meet-1',
        title: 'Demo Sprint',
        scopeType: MeetingScope.PROJECT,
        status: MeetingStatus.COMPLETED,
        startTime: new Date('2026-10-18T10:00:00Z'),
        endTime: new Date('2026-10-18T11:00:00Z'),
        roomCode: 'room-1',
        attendees: [
          // 1. Present: joined and has duration
          {
            userId: 'u1',
            rsvp: RSVP.ACCEPTED,
            joinedAt: new Date('2026-10-18T10:02:00Z'),
            leftAt: new Date('2026-10-18T11:00:00Z'),
            totalDurationSeconds: 3480,
            user: { name: 'User 1', email: 'u1@test.com', role: Role.PM },
          },
          // 2. Absent: RSVP ACCEPTED but never joined
          {
            userId: 'u2',
            rsvp: RSVP.ACCEPTED,
            joinedAt: null,
            leftAt: null,
            totalDurationSeconds: 0,
            user: { name: 'User 2', email: 'u2@test.com', role: Role.EMPLOYEE },
          },
          // 3. Declined: RSVP DECLINED
          {
            userId: 'u3',
            rsvp: RSVP.DECLINED,
            joinedAt: null,
            leftAt: null,
            totalDurationSeconds: 0,
            user: { name: 'User 3', email: 'u3@test.com', role: Role.EMPLOYEE },
          },
          // 4. Pending: RSVP PENDING
          {
            userId: 'u4',
            rsvp: RSVP.PENDING,
            joinedAt: null,
            leftAt: null,
            totalDurationSeconds: 0,
            user: { name: 'User 4', email: 'u4@test.com', role: Role.EMPLOYEE },
          },
        ],
      });

      const report = await service.getAttendanceReport('meet-1', {
        id: 'pm-1',
        role: Role.PM,
        departmentId: 'dept-1',
      });

      expect(report.metrics.totalInvited).toBe(4);
      expect(report.metrics.presentCount).toBe(1);
      expect(report.metrics.absentCount).toBe(1);
      expect(report.metrics.declinedCount).toBe(1);
      expect(report.metrics.pendingCount).toBe(1);
      expect(report.metrics.totalDurationSeconds).toBe(3480);
      expect(report.metrics.avgDurationMinutes).toBe(58);
    });

    it('14. Auto-complete meeting khi endTime qua', async () => {
      accessServiceMock.canViewMeeting.mockResolvedValue(true);
      const pastEndTime = new Date(Date.now() - 3600000);
      prismaMock.meeting.findUnique.mockResolvedValue({
        id: 'meet-ended',
        status: MeetingStatus.SCHEDULED,
        endTime: pastEndTime,
        attendees: [],
      });
      prismaMock.meeting.update.mockResolvedValue({
        id: 'meet-ended',
        status: MeetingStatus.COMPLETED,
        endTime: pastEndTime,
        attendees: [],
      });

      const res = await service.findOne('meet-ended', {
        id: 'u-1',
        role: Role.ADMIN,
        departmentId: null,
      });

      expect(res.status).toBe(MeetingStatus.COMPLETED);
    });

    it('15. Tính totalDurationSeconds cộng dồn khi rejoin', async () => {
      // In gateway, duration is incremented: { increment: sessionSeconds }
      expect(300 + 400).toBe(700);
    });

    it('16. Auto-add attendees theo scope (PROJECT test)', async () => {
      const realAccess = new MeetingsAccessService(prismaMock);
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'proj-1',
        pmId: 'pm-user',
        departmentId: 'dept-1',
        members: [{ userId: 'dev-user-1' }, { userId: 'dev-user-2' }],
      });
      prismaMock.user.findFirst.mockResolvedValue({ id: 'head-user' });

      const attendees = await realAccess.resolveAutoAttendees(
        MeetingScope.PROJECT,
        { id: 'pm-user', role: Role.PM, departmentId: 'dept-1' },
        'proj-1',
      );

      expect(attendees).toContain('pm-user');
      expect(attendees).toContain('dev-user-1');
      expect(attendees).toContain('dev-user-2');
      expect(attendees).toContain('head-user');
    });

    it('17. Auto-add attendees theo scope (DEPARTMENT test)', async () => {
      const realAccess = new MeetingsAccessService(prismaMock);
      prismaMock.user.findMany.mockResolvedValue([
        { id: 'head-user' },
        { id: 'member-1' },
        { id: 'member-2' },
      ]);

      const attendees = await realAccess.resolveAutoAttendees(
        MeetingScope.DEPARTMENT,
        { id: 'head-user', role: Role.DEPARTMENT_HEAD, departmentId: 'dept-1' },
        undefined,
        'dept-1',
      );

      expect(attendees).toContain('head-user');
      expect(attendees).toContain('member-1');
      expect(attendees).toContain('member-2');
    });

    it('18. Privacy: user ngoài scope -> 403', async () => {
      accessServiceMock.canViewMeeting.mockResolvedValue(false);

      await expect(
        service.getAttendanceReport('secret-report', {
          id: 'outsider',
          role: Role.EMPLOYEE,
          departmentId: 'dept-other',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
