import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role, TaskStatus, Priority, MeetingScope, SprintStatus } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CalendarService } from '../calendar.service.js';
import { canReschedule, AuthActor } from '../calendar.permissions.js';

describe('CalendarService & Permissions', () => {
  let service: CalendarService;
  let prismaMock: any;

  const mockEmployee: AuthActor = { id: 'u-emp', role: Role.EMPLOYEE, departmentId: 'dept-1' };
  const mockPm: AuthActor = { id: 'u-pm', role: Role.PM, departmentId: 'dept-1' };
  const mockAdmin: AuthActor = { id: 'u-admin', role: Role.ADMIN, departmentId: 'dept-1' };

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: vi.fn(),
      },
      projectMember: {
        findMany: vi.fn().mockResolvedValue([]),
        findFirst: vi.fn().mockResolvedValue(null),
      },
      task: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      sprint: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      meeting: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      meetingAttendee: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      leaveRequest: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      wfhRequest: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      overtimeRequest: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    service = new CalendarService(prismaMock);
  });

  // =========================================================
  // 1. canReschedule helper (RBAC matrix) - 3 tests
  // =========================================================
  describe('canReschedule RBAC', () => {
    it('1. Task: assignee is allowed to reschedule', () => {
      const res = canReschedule('task', { assigneeId: 'u-emp', createdById: 'u-other' }, mockEmployee);
      expect(res.allowed).toBe(true);
    });

    it('2. Meeting: non-creator attendee is blocked from rescheduling', () => {
      const res = canReschedule('meeting', { createdById: 'u-pm', creatorName: 'PM Tuan' }, mockEmployee);
      expect(res.allowed).toBe(false);
      if (!res.allowed) {
        expect(res.reason).toContain('Chỉ người tạo cuộc họp');
        expect(res.creatorName).toBe('PM Tuan');
      }
    });

    it('3. Sprint: non-PM member is blocked from rescheduling', () => {
      const res = canReschedule('sprint', { isProjectPm: false, createdById: 'u-pm' }, mockEmployee);
      expect(res.allowed).toBe(false);
      if (!res.allowed) {
        expect(res.reason).toContain('Chỉ Quản trị viên hoặc PM');
      }
    });
  });

  // =========================================================
  // 2. getTimeline (6 tests)
  // =========================================================
  describe('getTimeline', () => {
    const validQuery = {
      from: '2026-10-20T00:00:00.000Z',
      to: '2026-10-27T00:00:00.000Z',
    };

    it('4. Throws error if from > to', async () => {
      await expect(
        service.getTimeline(
          { from: '2026-10-28T00:00:00.000Z', to: '2026-10-20T00:00:00.000Z', scope: 'mine' },
          mockEmployee,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('5. Rejects company scope for non-admin', async () => {
      await expect(
        service.getTimeline({ ...validQuery, scope: 'company' }, mockEmployee),
      ).rejects.toThrow(ForbiddenException);
    });

    it('6. Allows company scope for Admin', async () => {
      const res = await service.getTimeline({ ...validQuery, scope: 'company' }, mockAdmin);
      expect(res.scope).toBe('company');
      expect(res.items).toEqual([]);
    });

    it('7. Returns mine scope items for Employee', async () => {
      prismaMock.task.findMany.mockResolvedValue([
        {
          id: 'task-1',
          title: 'Implement Auth',
          description: 'JWT Auth',
          dueDate: new Date('2026-10-22T10:00:00.000Z'),
          projectId: 'p-1',
          status: TaskStatus.IN_PROGRESS,
          priority: Priority.HIGH,
          assigneeId: 'u-emp',
          createdById: 'u-pm',
          project: { id: 'p-1', name: 'WorkSync V2', pmId: 'u-pm' },
          assignee: { id: 'u-emp', name: 'Dev Long', departmentId: 'dept-1' },
          createdBy: { id: 'u-pm', name: 'PM Tuan' },
        },
      ]);

      const res = await service.getTimeline({ ...validQuery, scope: 'mine' }, mockEmployee);
      expect(res.items.length).toBe(1);
      expect(res.items[0].kind).toBe('task');
      expect(res.items[0].title).toBe('Implement Auth');
      expect(res.items[0].canReschedule).toBe(true);
    });

    it('8. Returns department scope items for Dept Head / PM', async () => {
      prismaMock.meeting.findMany.mockResolvedValue([
        {
          id: 'meet-1',
          title: 'Dept Weekly Sync',
          description: null,
          startTime: new Date('2026-10-21T09:00:00.000Z'),
          endTime: new Date('2026-10-21T10:00:00.000Z'),
          scopeType: MeetingScope.DEPARTMENT,
          projectId: null,
          departmentId: 'dept-1',
          roomCode: 'room-dept-sync',
          status: 'SCHEDULED',
          createdById: 'u-pm',
          createdBy: { id: 'u-pm', name: 'PM Tuan' },
          attendees: [{ userId: 'u-pm', user: { id: 'u-pm', name: 'PM Tuan' } }],
        },
      ]);

      const res = await service.getTimeline({ ...validQuery, scope: 'department' }, mockPm);
      expect(res.items.length).toBe(1);
      expect(res.items[0].kind).toBe('meeting');
      expect(res.items[0].title).toBe('Dept Weekly Sync');
    });

    it('9. Filters by specific types when provided', async () => {
      prismaMock.task.findMany.mockResolvedValue([]);
      const res = await service.getTimeline({ ...validQuery, scope: 'mine', types: ['task'] }, mockEmployee);
      expect(prismaMock.task.findMany).toHaveBeenCalled();
      expect(prismaMock.meeting.findMany).not.toHaveBeenCalled();
      expect(prismaMock.sprint.findMany).not.toHaveBeenCalled();
    });
  });

  // =========================================================
  // 3. reschedule (7 tests)
  // =========================================================
  describe('rescheduleItem', () => {
    it('10. Task: Assignee can reschedule task successfully', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't-1',
        title: 'Task 1',
        description: null,
        dueDate: new Date('2026-10-21T10:00:00.000Z'),
        projectId: 'p-1',
        status: TaskStatus.TODO,
        priority: Priority.MEDIUM,
        assigneeId: 'u-emp',
        createdById: 'u-pm',
        deletedAt: null,
        project: { pmId: 'u-pm' },
        createdBy: { id: 'u-pm', name: 'PM Tuan' },
        assignee: { id: 'u-emp', name: 'Dev Long' },
      });

      prismaMock.task.update.mockResolvedValue({
        id: 't-1',
        title: 'Task 1',
        description: null,
        dueDate: new Date('2026-10-23T10:00:00.000Z'),
        projectId: 'p-1',
        status: TaskStatus.TODO,
        priority: Priority.MEDIUM,
        assigneeId: 'u-emp',
        createdById: 'u-pm',
        project: { id: 'p-1', name: 'WorkSync V2' },
        createdBy: { id: 'u-pm', name: 'PM Tuan' },
        assignee: { id: 'u-emp', name: 'Dev Long' },
      });

      const res = await service.rescheduleItem(
        'task',
        't-1',
        { newStart: '2026-10-23T10:00:00.000Z' },
        mockEmployee,
      );

      expect(res.success).toBe(true);
      expect(prismaMock.task.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 't-1' },
          data: { dueDate: new Date('2026-10-23T10:00:00.000Z') },
        }),
      );
    });

    it('11. Task: Unauthorized user cannot reschedule task', async () => {
      prismaMock.task.findUnique.mockResolvedValue({
        id: 't-1',
        title: 'Task 1',
        dueDate: new Date('2026-10-21T10:00:00.000Z'),
        projectId: 'p-1',
        assigneeId: 'u-other-emp',
        createdById: 'u-pm',
        deletedAt: null,
        project: { pmId: 'u-pm' },
        createdBy: { id: 'u-pm', name: 'PM Tuan' },
      });

      await expect(
        service.rescheduleItem(
          'task',
          't-1',
          { newStart: '2026-10-23T10:00:00.000Z' },
          mockEmployee,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('12. Meeting: Creator can reschedule meeting', async () => {
      prismaMock.meeting.findUnique.mockResolvedValue({
        id: 'm-1',
        title: 'Standup',
        description: null,
        startTime: new Date('2026-10-21T09:00:00.000Z'),
        endTime: new Date('2026-10-21T09:30:00.000Z'),
        createdById: 'u-pm',
        scopeType: MeetingScope.PROJECT,
        deletedAt: null,
        createdBy: { id: 'u-pm', name: 'PM Tuan' },
        attendees: [],
      });

      prismaMock.meeting.update.mockResolvedValue({
        id: 'm-1',
        title: 'Standup',
        description: null,
        startTime: new Date('2026-10-22T09:00:00.000Z'),
        endTime: new Date('2026-10-22T09:30:00.000Z'),
        scopeType: MeetingScope.PROJECT,
        createdById: 'u-pm',
        status: 'SCHEDULED',
        projectId: 'p-1',
        departmentId: null,
        createdBy: { id: 'u-pm', name: 'PM Tuan' },
        attendees: [],
      });

      const res = await service.rescheduleItem(
        'meeting',
        'm-1',
        { newStart: '2026-10-22T09:00:00.000Z' },
        mockPm,
      );

      expect(res.success).toBe(true);
    });

    it('13. Meeting: Non-creator attendee cannot reschedule meeting', async () => {
      prismaMock.meeting.findUnique.mockResolvedValue({
        id: 'm-1',
        title: 'Standup',
        startTime: new Date('2026-10-21T09:00:00.000Z'),
        endTime: new Date('2026-10-21T09:30:00.000Z'),
        createdById: 'u-pm',
        deletedAt: null,
        createdBy: { id: 'u-pm', name: 'PM Tuan' },
      });

      await expect(
        service.rescheduleItem(
          'meeting',
          'm-1',
          { newStart: '2026-10-22T09:00:00.000Z' },
          mockEmployee,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('14. Sprint: PM can reschedule sprint', async () => {
      prismaMock.sprint.findUnique.mockResolvedValue({
        id: 'sp-1',
        name: 'Sprint 14',
        goal: null,
        startDate: new Date('2026-10-20T00:00:00.000Z'),
        endDate: new Date('2026-11-03T00:00:00.000Z'),
        projectId: 'p-1',
        status: SprintStatus.ACTIVE,
        createdById: 'u-pm',
        deletedAt: null,
        project: { id: 'p-1', name: 'WorkSync V2', pmId: 'u-pm' },
        createdBy: { id: 'u-pm', name: 'PM Tuan' },
      });

      prismaMock.sprint.update.mockResolvedValue({
        id: 'sp-1',
        name: 'Sprint 14',
        goal: null,
        startDate: new Date('2026-10-22T00:00:00.000Z'),
        endDate: new Date('2026-11-05T00:00:00.000Z'),
        projectId: 'p-1',
        status: SprintStatus.ACTIVE,
        createdById: 'u-pm',
        project: { id: 'p-1', name: 'WorkSync V2' },
        createdBy: { id: 'u-pm', name: 'PM Tuan' },
      });

      const res = await service.rescheduleItem(
        'sprint',
        'sp-1',
        { newStart: '2026-10-22T00:00:00.000Z' },
        mockPm,
      );

      expect(res.success).toBe(true);
    });

    it('15. Leave: Direct reschedule is strictly blocked', async () => {
      await expect(
        service.rescheduleItem(
          'leave',
          'leave-1',
          { newStart: '2026-10-25T00:00:00.000Z' },
          mockEmployee,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('16. Throws NotFoundException if item does not exist', async () => {
      prismaMock.task.findUnique.mockResolvedValue(null);
      await expect(
        service.rescheduleItem(
          'task',
          'non-existent',
          { newStart: '2026-10-23T10:00:00.000Z' },
          mockEmployee,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================
  // 4. detectConflicts (5 tests)
  // =========================================================
  describe('detectConflicts', () => {
    it('17. Detects meeting overlap when user has 2 meetings at the same time', async () => {
      prismaMock.meetingAttendee.findMany.mockResolvedValue([
        { meetingId: 'm-1', userId: 'u-emp', user: { id: 'u-emp', name: 'Dev Long' } },
        { meetingId: 'm-2', userId: 'u-emp', user: { id: 'u-emp', name: 'Dev Long' } },
      ]);

      const items: any[] = [
        {
          kind: 'meeting',
          id: 'm-1',
          title: 'Meeting Alpha',
          startAt: '2026-10-21T09:00:00.000Z',
          endAt: '2026-10-21T10:00:00.000Z',
        },
        {
          kind: 'meeting',
          id: 'm-2',
          title: 'Meeting Beta',
          startAt: '2026-10-21T09:30:00.000Z',
          endAt: '2026-10-21T10:30:00.000Z',
        },
      ];

      const conflicts = await service.detectConflicts(items);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].type).toBe('meeting_overlap');
      expect(conflicts[0].userId).toBe('u-emp');
    });

    it('18. Detects overdue overload when user has >= 3 overdue tasks', async () => {
      const items: any[] = [
        { kind: 'task', id: 't-1', isOverdue: true, assigneeId: 'u-emp', assigneeName: 'Dev Long' },
        { kind: 'task', id: 't-2', isOverdue: true, assigneeId: 'u-emp', assigneeName: 'Dev Long' },
        { kind: 'task', id: 't-3', isOverdue: true, assigneeId: 'u-emp', assigneeName: 'Dev Long' },
      ];

      const conflicts = await service.detectConflicts(items);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].type).toBe('overdue_overload');
      expect(conflicts[0].userId).toBe('u-emp');
    });

    it('19. Detects leave_during_meeting conflict', async () => {
      prismaMock.meetingAttendee.findMany.mockResolvedValue([
        { meetingId: 'm-1', userId: 'u-emp', user: { id: 'u-emp', name: 'Dev Long' } },
      ]);

      const items: any[] = [
        {
          kind: 'leave',
          id: 'l-1',
          userId: 'u-emp',
          userName: 'Dev Long',
          startAt: '2026-10-21T00:00:00.000Z',
          endAt: '2026-10-21T23:59:59.000Z',
        },
        {
          kind: 'meeting',
          id: 'm-1',
          title: 'Client Demo',
          startAt: '2026-10-21T14:00:00.000Z',
          endAt: '2026-10-21T15:00:00.000Z',
        },
      ];

      const conflicts = await service.detectConflicts(items);
      expect(conflicts.length).toBe(1);
      expect(conflicts[0].type).toBe('leave_during_meeting');
    });

    it('20. Returns empty array when there are no conflicts', async () => {
      const items: any[] = [
        {
          kind: 'task',
          id: 't-1',
          isOverdue: false,
          assigneeId: 'u-emp',
          assigneeName: 'Dev Long',
        },
      ];
      const conflicts = await service.detectConflicts(items);
      expect(conflicts).toEqual([]);
    });

    it('21. Does not flag overdue overload when tasks count < 3', async () => {
      const items: any[] = [
        { kind: 'task', id: 't-1', isOverdue: true, assigneeId: 'u-emp', assigneeName: 'Dev Long' },
        { kind: 'task', id: 't-2', isOverdue: true, assigneeId: 'u-emp', assigneeName: 'Dev Long' },
      ];
      const conflicts = await service.detectConflicts(items);
      expect(conflicts).toEqual([]);
    });
  });

  // =========================================================
  // 5. exportIcs (3 tests)
  // =========================================================
  describe('exportIcs', () => {
    it('22. Exports empty VCALENDAR when no items exist', async () => {
      const ics = await service.exportIcs(
        { from: '2026-10-20T00:00:00.000Z', to: '2026-10-27T00:00:00.000Z', scope: 'mine' },
        mockEmployee,
      );

      expect(ics).toContain('BEGIN:VCALENDAR');
      expect(ics).toContain('VERSION:2.0');
      expect(ics).toContain('END:VCALENDAR');
      expect(ics).not.toContain('BEGIN:VEVENT');
    });

    it('23. Exports VEVENT with correct RFC 5545 format for populated task', async () => {
      prismaMock.task.findMany.mockResolvedValue([
        {
          id: 'task-101',
          title: 'Design Review',
          description: 'Review Figma wireframes',
          dueDate: new Date('2026-10-22T09:00:00.000Z'),
          projectId: 'p-1',
          status: TaskStatus.TODO,
          priority: Priority.HIGH,
          assigneeId: 'u-emp',
          createdById: 'u-pm',
          project: { id: 'p-1', name: 'WorkSync V2', pmId: 'u-pm' },
          assignee: { id: 'u-emp', name: 'Dev Long' },
          createdBy: { id: 'u-pm', name: 'PM Tuan' },
        },
      ]);

      const ics = await service.exportIcs(
        { from: '2026-10-20T00:00:00.000Z', to: '2026-10-27T00:00:00.000Z', scope: 'mine', types: ['task'] },
        mockEmployee,
      );

      expect(ics).toContain('BEGIN:VEVENT');
      expect(ics).toContain('UID:task-task-101@worksync.vn');
      expect(ics).toContain('SUMMARY:[TASK] Design Review');
      expect(ics).toContain('DESCRIPTION:Review Figma wireframes');
      expect(ics).toContain('END:VEVENT');
    });

    it('24. Exports multi-kind items properly into single ICS stream', async () => {
      prismaMock.task.findMany.mockResolvedValue([
        {
          id: 't-1',
          title: 'Code Fix',
          description: null,
          dueDate: new Date('2026-10-22T09:00:00.000Z'),
          projectId: 'p-1',
          status: TaskStatus.TODO,
          priority: Priority.LOW,
          assigneeId: 'u-emp',
          createdById: 'u-pm',
          project: { id: 'p-1', name: 'WorkSync V2', pmId: 'u-pm' },
          assignee: { id: 'u-emp', name: 'Dev Long' },
          createdBy: { id: 'u-pm', name: 'PM Tuan' },
        },
      ]);
      prismaMock.meeting.findMany.mockResolvedValue([
        {
          id: 'm-1',
          title: 'Weekly Standup',
          description: 'Sprint catchup',
          startTime: new Date('2026-10-23T09:00:00.000Z'),
          endTime: new Date('2026-10-23T09:30:00.000Z'),
          scopeType: MeetingScope.PROJECT,
          projectId: 'p-1',
          departmentId: null,
          createdById: 'u-pm',
          status: 'SCHEDULED',
          createdBy: { id: 'u-pm', name: 'PM Tuan' },
          attendees: [],
        },
      ]);

      const ics = await service.exportIcs(
        { from: '2026-10-20T00:00:00.000Z', to: '2026-10-27T00:00:00.000Z', scope: 'mine' },
        mockEmployee,
      );

      expect(ics).toContain('UID:task-t-1@worksync.vn');
      expect(ics).toContain('UID:meeting-m-1@worksync.vn');
      expect(ics).toContain('SUMMARY:[TASK] Code Fix');
      expect(ics).toContain('SUMMARY:[MEETING] Weekly Standup');
    });
  });
});
