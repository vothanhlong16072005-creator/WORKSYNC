import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationType } from '@prisma/client';

export interface MentionContext {
  type: 'TASK' | 'QUICK_TASK' | 'MEETING_MINUTES' | 'COMMENT';
  id: string;
  title: string;
  url: string;
}

@Injectable()
export class NotificationTriggersService {
  private readonly logger = new Logger(NotificationTriggersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ==========================================
  // 1. MEETING TRIGGERS
  // ==========================================

  async meetingCreated(meeting: {
    id: string;
    title: string;
    createdById: string;
    startTime: Date;
    attendeeIds?: string[];
  }) {
    // Find all attendees
    const attendees = await this.prisma.meetingAttendee.findMany({
      where: { meetingId: meeting.id },
      select: { userId: true },
    });

    const recipientIds = meeting.attendeeIds || attendees.map((a) => a.userId);

    for (const userId of recipientIds) {
      if (userId === meeting.createdById) continue; // Don't notify creator

      await this.notificationsService.create({
        userId,
        type: NotificationType.MEETING,
        category: 'meeting.created',
        title: `Cuộc họp mới: "${meeting.title}"`,
        body: `Bạn được mời tham gia cuộc họp vào lúc ${new Date(meeting.startTime).toLocaleString('vi-VN')}.`,
        data: {
          meetingId: meeting.id,
          url: `/meetings/${meeting.id}`,
        },
        actorId: meeting.createdById,
      });
    }
  }

  async meetingStarted(meetingId: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        attendees: {
          where: {
            rsvp: { in: ['ACCEPTED', 'PENDING'] },
            joinedAt: null, // Only notify attendees who have not joined yet
          },
        },
      },
    });

    if (!meeting) return;

    for (const attendee of meeting.attendees) {
      await this.notificationsService.create({
        userId: attendee.userId,
        type: NotificationType.MEETING,
        category: 'meeting.started',
        title: `🔴 Cuộc họp "${meeting.title}" đang diễn ra`,
        body: 'Cuộc họp đã bắt đầu. Nhấn để vào phòng chuẩn bị ngay!',
        data: {
          meetingId: meeting.id,
          url: `/meetings/${meeting.id}/prepare`,
        },
        actorId: meeting.createdById,
      });
    }
  }

  async meetingReminder1h(meetingId: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        attendees: {
          where: {
            rsvp: { in: ['ACCEPTED', 'PENDING'] },
          },
        },
      },
    });

    if (!meeting) return;

    for (const attendee of meeting.attendees) {
      await this.notificationsService.create({
        userId: attendee.userId,
        type: NotificationType.MEETING,
        category: 'meeting.reminder.1h',
        title: `Sắp diễn ra: "${meeting.title}"`,
        body: 'Cuộc họp sẽ bắt đầu trong vòng 1 giờ tới. Vui lòng kiểm tra thiết bị.',
        data: {
          meetingId: meeting.id,
          url: `/meetings/${meeting.id}/prepare`,
        },
        actorId: meeting.createdById,
      });
    }
  }

  // ==========================================
  // 2. ATTENDANCE APPROVAL TRIGGERS
  // ==========================================

  async attendanceRequestCreated(request: {
    id: string;
    userId: string;
    type: string; // 'WFH' | 'LEAVE' | 'EARLY_LEAVE' | 'OVERTIME'
    departmentId?: string | null;
  }) {
    // Notify Department Head + HR + Admin
    const approvers = await this.prisma.user.findMany({
      where: {
        OR: [
          { role: { in: ['ADMIN', 'HR'] } },
          ...(request.departmentId
            ? [{ departmentId: request.departmentId, role: 'DEPARTMENT_HEAD' as const }]
            : []),
        ],
        status: 'ACTIVE',
        NOT: { id: request.userId }, // Do not notify applicant
      },
      select: { id: true },
    });

    const requester = await this.prisma.user.findUnique({
      where: { id: request.userId },
      select: { name: true },
    });

    const requesterName = requester?.name || 'Nhân viên';

    for (const approver of approvers) {
      await this.notificationsService.create({
        userId: approver.id,
        type: NotificationType.ATTENDANCE_APPROVAL,
        category: 'attendance.pending',
        title: `⏳ Đơn ${request.type} mới chờ duyệt`,
        body: `${requesterName} vừa gửi đơn xin ${request.type}. Vui lòng kiểm tra và duyệt.`,
        data: {
          requestId: request.id,
          requestType: request.type,
          url: '/attendance?tab=approval',
        },
        actorId: request.userId,
      });
    }
  }

  async attendanceRequestReviewed(request: {
    id: string;
    userId: string;
    type: string;
    status: 'APPROVED' | 'REJECTED';
    reviewerId: string;
    reviewerName?: string;
  }) {
    const isApproved = request.status === 'APPROVED';
    const statusText = isApproved ? 'được duyệt' : 'bị từ chối';
    const iconPrefix = isApproved ? '✅' : '❌';

    await this.notificationsService.create({
      userId: request.userId,
      type: NotificationType.ATTENDANCE_APPROVAL,
      category: isApproved ? 'attendance.approved' : 'attendance.rejected',
      title: `${iconPrefix} Đơn ${request.type} đã ${statusText}`,
      body: `Đơn của bạn đã ${statusText} bởi ${request.reviewerName || 'người quản lý'}.`,
      data: {
        requestId: request.id,
        status: request.status,
        url: '/attendance?tab=my',
      },
      actorId: request.reviewerId,
    });
  }

  // ==========================================
  // 3. QUICK TASK TRIGGER
  // ==========================================

  async quickTaskAssigned(task: {
    id: string;
    title: string;
    assigneeId: string;
    assignedById: string;
    dueDate: Date;
  }) {
    const assigner = await this.prisma.user.findUnique({
      where: { id: task.assignedById },
      select: { name: true },
    });

    await this.notificationsService.create({
      userId: task.assigneeId,
      type: NotificationType.QUICK_TASK,
      category: 'quicktask.assigned',
      title: `⚡ Công việc nhanh mới: ${task.title}`,
      body: `${assigner?.name || 'Quản lý'} vừa giao việc cho bạn. Hạn chót: ${new Date(task.dueDate).toLocaleDateString('vi-VN')}.`,
      data: {
        taskId: task.id,
        url: `/quick-tasks/${task.id}`,
      },
      actorId: task.assignedById,
    });
  }

  // ==========================================
  // 4. MENTION TRIGGER
  // ==========================================

  async mentionInContent(
    content: string,
    author: { id: string; name: string },
    context: MentionContext,
  ) {
    // Regex for mentions like @username or @[Name](id) or @email
    // Find patterns like @(\w+) or match against user emails/names
    const mentionMatches = content.match(/@([\w.+-]+)/g);
    if (!mentionMatches || mentionMatches.length === 0) return;

    const rawMentions = Array.from(new Set(mentionMatches.map((m) => m.substring(1).toLowerCase())));

    // Lookup users by email prefix or name or id
    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          ...rawMentions.map((term) => ({
            email: { startsWith: term, mode: 'insensitive' as const },
          })),
          ...rawMentions.map((term) => ({
            name: { contains: term, mode: 'insensitive' as const },
          })),
        ],
        status: 'ACTIVE',
        NOT: { id: author.id },
      },
      select: { id: true, name: true },
    });

    for (const user of users) {
      await this.notificationsService.create({
        userId: user.id,
        type: NotificationType.MENTION,
        category: 'mention.user',
        title: `@ ${author.name} đã nhắc đến bạn`,
        body: `Trong "${context.title}": "${content.slice(0, 100)}${content.length > 100 ? '...' : ''}"`,
        data: {
          contextType: context.type,
          contextId: context.id,
          url: context.url,
        },
        actorId: author.id,
      });
    }
  }

  // ==========================================
  // 5. TASK TRIGGERS
  // ==========================================

  async taskAssigned(task: {
    id: string;
    title: string;
    projectId: string;
    projectName?: string;
    assigneeId: string;
    actorId: string;
  }) {
    const actor = await this.prisma.user.findUnique({
      where: { id: task.actorId },
      select: { name: true },
    });

    await this.notificationsService.create({
      userId: task.assigneeId,
      type: NotificationType.TASK,
      category: 'task.assigned',
      title: `📋 Bạn được giao công việc: ${task.title}`,
      body: `Dự án: ${task.projectName || 'Dự án'}. Người giao: ${actor?.name || 'Quản lý'}.`,
      data: {
        taskId: task.id,
        projectId: task.projectId,
        url: task.projectId ? `/projects/${task.projectId}/tasks?taskId=${task.id}` : `/tasks?taskId=${task.id}`,
      },
      actorId: task.actorId,
    });
  }

  async taskStatusChanged(task: {
    id: string;
    title: string;
    projectId: string;
    createdById: string;
    actorId: string;
    newStatus: string;
  }) {
    // If moved to IN_REVIEW, notify the reporter (creator)
    if (task.newStatus === 'IN_REVIEW' && task.createdById !== task.actorId) {
      const actor = await this.prisma.user.findUnique({
        where: { id: task.actorId },
        select: { name: true },
      });

      await this.notificationsService.create({
        userId: task.createdById,
        type: NotificationType.TASK,
        category: 'task.review',
        title: `👀 Công việc chờ duyệt: ${task.title}`,
        body: `${actor?.name || 'Thành viên'} đã chuyển công việc sang trạng thái Chờ duyệt.`,
        data: {
          taskId: task.id,
          projectId: task.projectId,
          url: task.projectId ? `/projects/${task.projectId}/tasks?taskId=${task.id}` : `/tasks?taskId=${task.id}`,
        },
        actorId: task.actorId,
      });
    }
  }

  async taskDeadlineReminder(task: {
    id: string;
    title: string;
    projectId: string;
    assigneeId: string;
    hoursLeft: number;
  }) {
    const hours = Math.max(1, Math.round(task.hoursLeft));
    const isUrgent = hours <= 1;

    await this.notificationsService.create({
      userId: task.assigneeId,
      type: NotificationType.TASK,
      category: isUrgent ? 'task.deadline.1h' : 'task.deadline.24h',
      title: `Hạn chót công việc sắp đến: ${task.title}`,
      body: `Công việc chỉ còn khoảng ${hours} giờ nữa là đến hạn chót!`,
      data: {
        taskId: task.id,
        projectId: task.projectId,
        url: task.projectId ? `/projects/${task.projectId}/tasks?taskId=${task.id}` : `/tasks?taskId=${task.id}`,
      },
    });
  }
}
