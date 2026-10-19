/**
 * Meetings Service — Core business logic, RSVP, and Attendance Report
 * Reference: PLAN-2026-10-17-M5-MEETINGS-V2.md
 */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DocumentScope, DocumentType, MeetingScope, MeetingStatus, Role, RSVP } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CurrentActor } from '../projects/project-access.service.js';
import { AttendanceQueryDto, MeetingQueryDto } from './dto/attendance-query.dto.js';
import { CreateMeetingDto } from './dto/create-meeting.dto.js';
import { RsvpDto } from './dto/rsvp.dto.js';
import { SaveMinutesDto } from './dto/save-minutes.dto.js';
import { UpdateMeetingDto } from './dto/update-meeting.dto.js';
import { MeetingsAccessService } from './meetings-access.service.js';
import { NotificationTriggersService } from '../notifications/notification-triggers.service.js';
import { MeetingAiService } from './meeting-ai.service.js';

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: MeetingsAccessService,
    private readonly triggers: NotificationTriggersService,
    private readonly meetingAi: MeetingAiService,
  ) {}

  /**
   * Helper to auto-complete overdue meetings on read
   * ⭐ M5.1: Returns list of meetingIds that were auto-completed
   *          để caller trigger AI summary cho từng meeting
   */
  private async autoCompleteOverdueMeetings(): Promise<string[]> {
    const now = new Date();
    const overdue = await this.prisma.meeting.findMany({
      where: {
        status: { in: [MeetingStatus.SCHEDULED, MeetingStatus.IN_PROGRESS] },
        endTime: { lte: now },
        deletedAt: null,
      },
      select: { id: true },
    });

    if (overdue.length === 0) return [];

    await this.prisma.meeting.updateMany({
      where: {
        id: { in: overdue.map(m => m.id) },
      },
      data: { status: MeetingStatus.COMPLETED },
    });

    return overdue.map(m => m.id);
  }

  /**
   * ⭐ M5.1: Trigger AI summary cho các meeting vừa bị auto-complete
   * Chỉ chạy khi meeting có MeetingMinute với content ≥ 50 ký tự
   * Fire-and-forget, non-blocking
   */
  private triggerAiSummaryForMeetings(meetingIds: string[]): void {
    if (meetingIds.length === 0) return;
    // Không await — chạy background
    setImmediate(async () => {
      for (const id of meetingIds) {
        try {
          const minute = await this.prisma.meetingMinute.findUnique({
            where: { meetingId: id },
            select: { content: true, aiSummary: true },
          });
          // Skip nếu đã có summary hoặc content quá ngắn
          if (!minute || minute.aiSummary || minute.content.length < 50) continue;
          await this.meetingAi.generateSummary(id);
          this.logger.debug(`Auto AI summary generated for meeting ${id}`);
        } catch (err) {
          this.logger.warn(`Auto AI summary failed for ${id}: ${(err as Error).message}`);
        }
      }
    });
  }

  /**
   * 1. Create a meeting with scope-based attendee resolution
   */
  async create(dto: CreateMeetingDto, actor: CurrentActor) {
    const canCreate = await this.accessService.canCreateMeeting(
      actor,
      dto.scopeType,
      dto.projectId ?? undefined,
      dto.departmentId ?? undefined,
    );
    if (!canCreate) {
      throw new ForbiddenException(
        'Bạn không có quyền tạo cuộc họp với phạm vi này (Scope RBAC violation)',
      );
    }

    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Thời gian bắt đầu hoặc kết thúc không hợp lệ');
    }
    if (end <= start) {
      throw new BadRequestException('Thời gian kết thúc phải diễn ra sau thời gian bắt đầu');
    }

    // Resolve attendee user IDs
    const resolvedAttendeeIds = await this.accessService.resolveAutoAttendees(
      dto.scopeType,
      actor,
      dto.projectId ?? undefined,
      dto.departmentId ?? undefined,
      dto.attendeeIds ?? [],
    );

    const roomCode = `room-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    const meeting = await this.prisma.meeting.create({
      data: {
        title: dto.title,
        description: dto.description ?? null,
        scopeType: dto.scopeType,
        projectId: dto.projectId ?? null,
        departmentId: dto.departmentId ?? null,
        startTime: start,
        endTime: end,
        roomCode,
        status: MeetingStatus.SCHEDULED,
        createdById: actor.id,
        attendees: {
          create: resolvedAttendeeIds.map((userId) => ({
            userId,
            rsvp: userId === actor.id ? RSVP.ACCEPTED : RSVP.PENDING,
            rsvpAt: userId === actor.id ? new Date() : null,
          })),
        },
      },
      include: {
        attendees: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true, role: true },
            },
          },
        },
        project: {
          select: { id: true, name: true, departmentId: true, pmId: true },
        },
        department: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, avatar: true },
        },
      },
    });

    try {
      await this.triggers.meetingCreated({
        id: meeting.id,
        title: meeting.title,
        createdById: meeting.createdById,
        startTime: meeting.startTime,
        attendeeIds: meeting.attendees.map((a) => a.userId),
      });
    } catch (err) {
      // Non-blocking notification error
    }

    return meeting;
  }

  /**
   * 2. Find all meetings visible to the actor (Strict privacy filter)
   */
  async findAll(query: MeetingQueryDto, actor: CurrentActor) {
    const autoCompletedIds = await this.autoCompleteOverdueMeetings();
    this.triggerAiSummaryForMeetings(autoCompletedIds);

    // Base conditions
    const whereCondition: any = {
      deletedAt: null,
    };

    if (query.scope) {
      whereCondition.scopeType = query.scope;
    }
    if (query.status) {
      whereCondition.status = query.status;
    }
    if (query.projectId) {
      whereCondition.projectId = query.projectId;
    }
    if (query.departmentId) {
      whereCondition.departmentId = query.departmentId;
    }

    // Privacy restrictions for non-ADMIN users
    if (actor.role !== Role.ADMIN) {
      const orClauses: any[] = [
        { createdById: actor.id },
        { attendees: { some: { userId: actor.id } } },
      ];

      // PROJECT scope visibility: project member, project PM, or dept head of project's department
      orClauses.push({
        scopeType: MeetingScope.PROJECT,
        project: {
          OR: [
            { members: { some: { userId: actor.id } } },
            { pmId: actor.id },
            ...(actor.role === Role.DEPARTMENT_HEAD && actor.departmentId
              ? [{ departmentId: actor.departmentId }]
              : []),
          ],
        },
      });

      // DEPARTMENT scope visibility: same department
      if (actor.departmentId) {
        orClauses.push({
          scopeType: MeetingScope.DEPARTMENT,
          departmentId: actor.departmentId,
        });
      }

      whereCondition.OR = orClauses;
    }

    return this.prisma.meeting.findMany({
      where: whereCondition,
      include: {
        attendees: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true, role: true },
            },
          },
        },
        project: {
          select: { id: true, name: true },
        },
        department: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, avatar: true },
        },
        minutes: {
          select: { id: true, updatedAt: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  /**
   * 3. Find upcoming meetings (next 7 days)
   */
  async findUpcoming(actor: CurrentActor) {
    const autoCompletedIds = await this.autoCompleteOverdueMeetings();
    this.triggerAiSummaryForMeetings(autoCompletedIds);
    const now = new Date();
    const next7Days = new Date();
    next7Days.setDate(now.getDate() + 7);

    return this.findAll(
      {
        status: MeetingStatus.SCHEDULED,
      },
      actor,
    ).then((meetings) =>
      meetings.filter((m) => new Date(m.startTime) >= now && new Date(m.startTime) <= next7Days),
    );
  }

  /**
   * 4. Find past meetings (past 30 days)
   */
  async findPast(actor: CurrentActor) {
    const autoCompletedIds = await this.autoCompleteOverdueMeetings();
    this.triggerAiSummaryForMeetings(autoCompletedIds);
    const now = new Date();
    const past30Days = new Date();
    past30Days.setDate(now.getDate() - 30);

    const all = await this.findAll({}, actor);
    return all.filter(
      (m) =>
        m.status === MeetingStatus.COMPLETED ||
        m.status === MeetingStatus.CANCELLED ||
        new Date(m.endTime) < now,
    );
  }

  /**
   * 5. Find one meeting by ID with IDOR protection
   */
  async findOne(id: string, actor: CurrentActor) {
    const canView = await this.accessService.canViewMeeting(id, actor);
    if (!canView) {
      throw new ForbiddenException('Bạn không có quyền truy cập thông tin cuộc họp này');
    }

    const meeting = await this.prisma.meeting.findUnique({
      where: { id },
      include: {
        attendees: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true, role: true, departmentId: true },
            },
          },
        },
        project: {
          select: { id: true, name: true, departmentId: true, pmId: true },
        },
        department: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true, avatar: true, role: true },
        },
        minutes: true,
      },
    });

    if (!meeting || meeting.deletedAt) {
      throw new NotFoundException('Cuộc họp không tồn tại hoặc đã bị xóa');
    }

    // Auto-update to COMPLETED if overdue
    if (
      (meeting.status === MeetingStatus.SCHEDULED || meeting.status === MeetingStatus.IN_PROGRESS) &&
      new Date() > new Date(meeting.endTime)
    ) {
      const updated = await this.prisma.meeting.update({
        where: { id },
        data: { status: MeetingStatus.COMPLETED },
        include: {
          attendees: {
            include: {
              user: {
                select: { id: true, name: true, email: true, avatar: true, role: true, departmentId: true },
              },
            },
          },
          project: {
            select: { id: true, name: true, departmentId: true, pmId: true },
          },
          department: {
            select: { id: true, name: true },
          },
          createdBy: {
            select: { id: true, name: true, email: true, avatar: true, role: true },
          },
          minutes: true,
        },
      });

      // ⭐ M5.1: Trigger AI summary async (non-blocking)
      if (updated.minutes && updated.minutes.content.length >= 50) {
        this.meetingAi.generateSummary(updated.id).catch(err => {
          this.logger.warn(`Auto AI summary failed for meeting ${updated.id}: ${(err as Error).message}`);
        });
      }

      return updated;
    }

    return meeting;
  }

  /**
   * 6. Update meeting details (creator or Admin only)
   */
  async update(id: string, dto: UpdateMeetingDto, actor: CurrentActor) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id },
      select: { id: true, createdById: true, deletedAt: true },
    });
    if (!meeting || meeting.deletedAt) {
      throw new NotFoundException('Cuộc họp không tồn tại');
    }

    if (!this.accessService.canManageMeeting(meeting, actor)) {
      throw new ForbiddenException('Chỉ người tạo cuộc họp hoặc Admin mới có quyền cập nhật');
    }

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.startTime !== undefined) data.startTime = new Date(dto.startTime);
    if (dto.endTime !== undefined) data.endTime = new Date(dto.endTime);
    if (dto.status !== undefined) data.status = dto.status;

    // Validate times if both or either updated
    if (data.startTime && data.endTime && data.endTime <= data.startTime) {
      throw new BadRequestException('Thời gian kết thúc phải sau thời gian bắt đầu');
    }

    // Update attendees if specified
    if (dto.attendeeIds) {
      // Find current attendees
      const existingAttendees = await this.prisma.meetingAttendee.findMany({
        where: { meetingId: id },
        select: { userId: true },
      });
      const existingUserIds = new Set(existingAttendees.map((a) => a.userId));
      const newUserIds = new Set(dto.attendeeIds);

      // Add missing
      const toAdd = dto.attendeeIds.filter((uid) => !existingUserIds.has(uid));
      for (const uid of toAdd) {
        await this.prisma.meetingAttendee.create({
          data: {
            meetingId: id,
            userId: uid,
            rsvp: RSVP.PENDING,
          },
        });
      }

      // Remove unselected (except creator)
      const toRemove = existingAttendees
        .filter((a) => !newUserIds.has(a.userId) && a.userId !== meeting.createdById)
        .map((a) => a.userId);

      if (toRemove.length > 0) {
        await this.prisma.meetingAttendee.deleteMany({
          where: {
            meetingId: id,
            userId: { in: toRemove },
          },
        });
      }
    }

    const updated = await this.prisma.meeting.update({
      where: { id },
      data,
      include: {
        attendees: {
          include: {
            user: { select: { id: true, name: true, email: true, avatar: true, role: true } },
          },
        },
      },
    });

    if (data.status === MeetingStatus.IN_PROGRESS) {
      try {
        await this.triggers.meetingStarted(id);
      } catch (err) {
        // Non-blocking notification error
      }
    }

    return updated;
  }

  /**
   * 7. Soft delete meeting (creator or Admin only)
   */
  async remove(id: string, actor: CurrentActor) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id },
      select: { id: true, createdById: true, deletedAt: true },
    });
    if (!meeting || meeting.deletedAt) {
      throw new NotFoundException('Cuộc họp không tồn tại');
    }

    if (!this.accessService.canManageMeeting(meeting, actor)) {
      throw new ForbiddenException('Chỉ người tạo cuộc họp hoặc Admin mới có quyền xóa');
    }

    await this.prisma.meeting.update({
      where: { id },
      data: { deletedAt: new Date(), status: MeetingStatus.CANCELLED },
    });

    return { success: true as const, id, deletedAt: new Date() };
  }

  /**
   * 8. RSVP to meeting (Accepted / Declined)
   */
  async rsvp(id: string, dto: RsvpDto, actor: CurrentActor) {
    const attendee = await this.prisma.meetingAttendee.findUnique({
      where: {
        meetingId_userId: {
          meetingId: id,
          userId: actor.id,
        },
      },
    });

    if (!attendee) {
      throw new ForbiddenException('Bạn không nằm trong danh sách người tham gia cuộc họp này');
    }

    return this.prisma.meetingAttendee.update({
      where: { id: attendee.id },
      data: {
        rsvp: dto.status,
        rsvpAt: new Date(),
      },
      include: {
        user: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });
  }

  /**
   * 9. Get attendees list
   */
  async getAttendees(id: string, actor: CurrentActor) {
    const canView = await this.accessService.canViewMeeting(id, actor);
    if (!canView) {
      throw new ForbiddenException('Bạn không có quyền xem thông tin cuộc họp này');
    }

    return this.prisma.meetingAttendee.findMany({
      where: { meetingId: id },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatar: true, role: true, departmentId: true },
        },
      },
      orderBy: { rsvp: 'asc' },
    });
  }

  /**
   * 10. Save / Upsert meeting minutes (Creator or Admin only)
   */
  async saveMinutes(id: string, dto: SaveMinutesDto, actor: CurrentActor) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        scopeType: true,
        projectId: true,
        departmentId: true,
        createdById: true,
        deletedAt: true,
      },
    });
    if (!meeting || meeting.deletedAt) {
      throw new NotFoundException('Cuộc họp không tồn tại');
    }

    if (!this.accessService.canManageMeeting(meeting, actor)) {
      throw new ForbiddenException('Chỉ người tạo cuộc họp hoặc Admin mới có quyền lưu biên bản');
    }

    const minute = await this.prisma.meetingMinute.upsert({
      where: { meetingId: id },
      create: {
        meetingId: id,
        content: dto.content,
      },
      update: {
        content: dto.content,
      },
    });

    // U4: Auto-sync / upsert Document for meeting minutes
    try {
      const scope =
        meeting.scopeType === 'PROJECT'
          ? DocumentScope.PROJECT
          : meeting.scopeType === 'DEPARTMENT'
            ? DocumentScope.DEPARTMENT
            : DocumentScope.PERSONAL;

      const existingDoc = await this.prisma.document.findFirst({
        where: { linkedMeetingId: id, deletedAt: null },
      });

      const tiptapJson = {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: dto.content }] }],
      };

      if (existingDoc) {
        await this.prisma.document.update({
          where: { id: existingDoc.id },
          data: {
            title: `Biên bản: ${meeting.title}`,
            contentText: dto.content,
            content: tiptapJson,
            updatedById: actor.id,
          },
        });
      } else {
        await this.prisma.document.create({
          data: {
            title: `Biên bản: ${meeting.title}`,
            content: tiptapJson,
            contentText: dto.content,
            scope,
            type: DocumentType.MEETING_MINUTES,
            ownerId: actor.id,
            createdById: actor.id,
            projectId: meeting.projectId,
            departmentId: meeting.departmentId,
            linkedMeetingId: id,
            tags: ['meeting', 'minutes'],
          },
        });
      }
    } catch {
      // Non-blocking auto-doc sync
    }

    return minute;
  }

  /**
   * 11. Get meeting minutes
   */
  async getMinutes(id: string, actor: CurrentActor) {
    const canView = await this.accessService.canViewMeeting(id, actor);
    if (!canView) {
      throw new ForbiddenException('Bạn không có quyền xem biên bản cuộc họp này');
    }

    return this.prisma.meetingMinute.findUnique({
      where: { meetingId: id },
    });
  }

  /**
   * 12. Get post-meeting attendance report (6 key metrics)
   * Reference: PLAN-2026-10-17-M5-MEETINGS-V2.md (Section 1.1.D & 5.4)
   */
  async getAttendanceReport(id: string, actor: CurrentActor) {
    const canView = await this.accessService.canViewMeeting(id, actor);
    if (!canView) {
      throw new ForbiddenException('Bạn không có quyền truy cập báo cáo cuộc họp này');
    }

    const meeting = await this.prisma.meeting.findUnique({
      where: { id },
      include: {
        attendees: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true, role: true, departmentId: true },
            },
          },
        },
        project: { select: { id: true, name: true } },
        department: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        minutes: true,
        linkedDocuments: {
          include: {
            attachments: true,
          },
        },
      },
    });

    if (!meeting || meeting.deletedAt) {
      throw new NotFoundException('Cuộc họp không tồn tại');
    }

    const attendees = meeting.attendees;
    const totalInvited = attendees.length;

    // 1. Present: has joinedAt or totalDurationSeconds > 0
    const presentList = attendees.filter((a) => a.joinedAt !== null || a.totalDurationSeconds > 0);
    const presentCount = presentList.length;

    // 2. Absent: RSVP was ACCEPTED but never joined and duration is 0
    const absentList = attendees.filter(
      (a) => a.rsvp === RSVP.ACCEPTED && a.joinedAt === null && a.totalDurationSeconds === 0,
    );
    const absentCount = absentList.length;

    // 3. Declined: RSVP was DECLINED
    const declinedList = attendees.filter((a) => a.rsvp === RSVP.DECLINED);
    const declinedCount = declinedList.length;

    // 4. Pending: RSVP is PENDING and never joined
    const pendingList = attendees.filter(
      (a) => a.rsvp === RSVP.PENDING && a.joinedAt === null && a.totalDurationSeconds === 0,
    );
    const pendingCount = pendingList.length;

    // 5. Total Duration & Average Duration
    const totalDurationSeconds = attendees.reduce((acc, a) => acc + (a.totalDurationSeconds || 0), 0);
    const avgDurationMinutes = presentCount > 0 ? Math.round(totalDurationSeconds / presentCount / 60) : 0;

    // Detailed attendee rows
    const details = attendees.map((a) => {
      const isPresent = a.joinedAt !== null || a.totalDurationSeconds > 0;
      let statusLabel = 'Chưa tham gia';
      if (isPresent) {
        statusLabel = 'Có mặt';
      } else if (a.rsvp === RSVP.DECLINED) {
        statusLabel = 'Từ chối';
      } else if (a.rsvp === RSVP.ACCEPTED) {
        statusLabel = 'Vắng mặt';
      } else {
        statusLabel = 'Chờ phản hồi';
      }

      return {
        userId: a.userId,
        name: a.user.name,
        email: a.user.email,
        avatar: a.user.avatar,
        role: a.user.role,
        rsvp: a.rsvp,
        rsvpAt: a.rsvpAt,
        joinedAt: a.joinedAt,
        leftAt: a.leftAt,
        durationMinutes: Math.round((a.totalDurationSeconds || 0) / 60),
        durationSeconds: a.totalDurationSeconds || 0,
        isPresent,
        statusLabel,
      };
    });

    return {
      meeting: {
        id: meeting.id,
        title: meeting.title,
        scopeType: meeting.scopeType,
        status: meeting.status,
        startTime: meeting.startTime,
        endTime: meeting.endTime,
        roomCode: meeting.roomCode,
        description: meeting.description,
        project: meeting.project,
        department: meeting.department,
        createdBy: meeting.createdBy,
        minutes: meeting.minutes,
        documents: meeting.linkedDocuments,
      },
      metrics: {
        totalInvited,
        presentCount,
        absentCount,
        declinedCount,
        pendingCount,
        totalDurationSeconds,
        avgDurationMinutes,
      },
      details,
    };
  }
}
