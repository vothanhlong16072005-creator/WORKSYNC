import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotificationTriggersService } from '../notification-triggers.service.js';
import { NotificationType } from '@prisma/client';

describe('NotificationTriggersService', () => {
  let triggers: NotificationTriggersService;
  let mockPrisma: any;
  let mockNotificationsService: any;

  beforeEach(() => {
    mockPrisma = {
      meetingAttendee: {
        findMany: vi.fn(),
      },
      meeting: {
        findUnique: vi.fn(),
      },
      user: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      task: {
        findUnique: vi.fn(),
      },
    };

    mockNotificationsService = {
      create: vi.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    triggers = new NotificationTriggersService(
      mockPrisma as any,
      mockNotificationsService as any,
    );
  });

  describe('meetingCreated', () => {
    it('should notify all attendees except creator', async () => {
      mockPrisma.meetingAttendee.findMany.mockResolvedValue([
        { userId: 'user-1' },
        { userId: 'pm-1' }, // creator
        { userId: 'user-2' },
      ]);

      await triggers.meetingCreated({
        id: 'meeting-1',
        title: 'Sprint Planning',
        createdById: 'pm-1',
        startTime: new Date('2026-10-20T10:00:00Z'),
      });

      expect(mockNotificationsService.create).toHaveBeenCalledTimes(2);
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-1',
          type: NotificationType.MEETING,
          category: 'meeting.created',
        }),
      );
    });
  });

  describe('meetingStarted', () => {
    it('should notify only attendees who have not joined yet', async () => {
      mockPrisma.meeting.findUnique.mockResolvedValue({
        id: 'm-1',
        title: 'Daily Standup',
        createdById: 'pm-1',
        attendees: [
          { userId: 'user-1', joinedAt: null },
          { userId: 'user-2', joinedAt: null },
        ],
      });

      await triggers.meetingStarted('m-1');

      expect(mockNotificationsService.create).toHaveBeenCalledTimes(2);
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          type: NotificationType.MEETING,
          category: 'meeting.started',
        }),
      );
    });
  });

  describe('attendanceRequestCreated', () => {
    it('should notify approvers (HR, Admin, Department Head)', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'admin-1' },
        { id: 'dept-head-1' },
      ]);
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Nguyễn Văn A' });

      await triggers.attendanceRequestCreated({
        id: 'req-1',
        userId: 'emp-1',
        type: 'WFH',
        departmentId: 'dept-eng',
      });

      expect(mockNotificationsService.create).toHaveBeenCalledTimes(2);
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-1',
          type: NotificationType.ATTENDANCE_APPROVAL,
          category: 'attendance.pending',
        }),
      );
    });
  });

  describe('attendanceRequestReviewed', () => {
    it('should notify requester of approval', async () => {
      await triggers.attendanceRequestReviewed({
        id: 'req-1',
        userId: 'emp-1',
        type: 'WFH',
        status: 'APPROVED',
        reviewerId: 'head-1',
        reviewerName: 'Trưởng phòng',
      });

      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'emp-1',
          type: NotificationType.ATTENDANCE_APPROVAL,
          category: 'attendance.approved',
        }),
      );
    });
  });

  describe('quickTaskAssigned', () => {
    it('should notify assignee with due date', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Trưởng phòng' });

      await triggers.quickTaskAssigned({
        id: 'qt-1',
        title: 'Review urgent doc',
        assigneeId: 'emp-1',
        assignedById: 'head-1',
        dueDate: new Date('2026-10-22'),
      });

      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'emp-1',
          type: NotificationType.QUICK_TASK,
          category: 'quicktask.assigned',
        }),
      );
    });
  });

  describe('mentionInContent', () => {
    it('should parse @username and notify mentioned user', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'user-bob', name: 'Bob' },
      ]);

      await triggers.mentionInContent(
        'Vui lòng xem lại task này @bob nhé',
        { id: 'author-1', name: 'Alice' },
        {
          type: 'TASK',
          id: 'task-1',
          title: 'Design UI',
          url: '/projects/p1/tasks/task-1',
        },
      );

      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-bob',
          type: NotificationType.MENTION,
          category: 'mention.user',
        }),
      );
    });
  });

  describe('taskAssigned', () => {
    it('should notify assignee on task assignment', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'PM Alice' });

      await triggers.taskAssigned({
        id: 'task-1',
        title: 'Implement notifications',
        projectId: 'p-1',
        projectName: 'WorkSync',
        assigneeId: 'dev-1',
        actorId: 'pm-1',
      });

      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'dev-1',
          type: NotificationType.TASK,
          category: 'task.assigned',
        }),
      );
    });
  });

  describe('taskStatusChanged', () => {
    it('should notify creator when task moved to IN_REVIEW', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ name: 'Dev Bob' });

      await triggers.taskStatusChanged({
        id: 'task-1',
        title: 'Implement notifications',
        projectId: 'p-1',
        createdById: 'pm-1',
        actorId: 'dev-1',
        newStatus: 'IN_REVIEW',
      });

      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'pm-1',
          type: NotificationType.TASK,
          category: 'task.review',
        }),
      );
    });
  });

  describe('taskDeadlineReminder', () => {
    it('should send 1h deadline alert when hoursLeft <= 1', async () => {
      await triggers.taskDeadlineReminder({
        id: 'task-1',
        title: 'Fix critical bug',
        projectId: 'p-1',
        assigneeId: 'dev-1',
        hoursLeft: 0.8,
      });

      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'dev-1',
          type: NotificationType.TASK,
          category: 'task.deadline.1h',
        }),
      );
    });
  });
});
