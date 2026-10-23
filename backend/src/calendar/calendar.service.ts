import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Role, TaskStatus, Priority, MeetingScope, LeaveType, SprintStatus } from '@prisma/client';
import { CalendarQueryDto } from './dto/calendar-query.dto.js';
import { RescheduleDto } from './dto/reschedule.dto.js';
import {
  Conflict,
  ItemKind,
  TimelineItem,
  TimelineResponse,
  RescheduleResult,
  TaskTimelineItem,
  MeetingTimelineItem,
  SprintTimelineItem,
  LeaveTimelineItem,
  WfhTimelineItem,
  OvertimeTimelineItem,
} from './types/timeline.types.js';
import { canReschedule, AuthActor } from './calendar.permissions.js';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Main Timeline Aggregator: merges 6 sources with RBAC scope, filters and conflict detection.
   */
  async getTimeline(query: CalendarQueryDto, actor: AuthActor): Promise<TimelineResponse> {
    const fromDate = new Date(query.from);
    const toDate = new Date(query.to);

    if (fromDate > toDate) {
      throw new BadRequestException('Ngày bắt đầu (from) không được lớn hơn ngày kết thúc (to)');
    }

    // 1. RBAC Scope Validation
    const scope = query.scope || 'mine';
    if (scope === 'company' && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Chỉ Quản trị viên mới có quyền xem toàn công ty');
    }

    let deptId = actor.departmentId;
    if (scope === 'department' && !deptId) {
      // Look up user department in DB if not in token
      const user = await this.prisma.user.findUnique({
        where: { id: actor.id },
        select: { departmentId: true },
      });
      deptId = user?.departmentId || null;
      if (!deptId && actor.role !== Role.ADMIN) {
        throw new ForbiddenException('Bạn chưa được gán vào phòng ban nào');
      }
    }

    const requestedTypes: Set<ItemKind> = query.types && query.types.length > 0
      ? new Set(query.types)
      : new Set(['task', 'sprint', 'meeting', 'leave', 'wfh', 'overtime']);

    // Check project PM status for actor if projectId specified or collect managed projects
    const pmMemberships = await this.prisma.projectMember.findMany({
      where: { userId: actor.id, projectRole: 'PM' },
      select: { projectId: true },
    });
    const managedProjectIds = new Set(pmMemberships.map((m) => m.projectId));

    const items: TimelineItem[] = [];

    // ---------------------------------------------------------
    // 2. Fetch Tasks (kind: 'task')
    // ---------------------------------------------------------
    if (requestedTypes.has('task')) {
      const taskWhere: any = {
        deletedAt: null,
        dueDate: {
          gte: fromDate,
          lte: toDate,
        },
      };

      if (query.projectId) taskWhere.projectId = query.projectId;
      if (query.assigneeId) taskWhere.assigneeId = query.assigneeId;
      if (query.status && query.status.length > 0) {
        taskWhere.status = { in: query.status as TaskStatus[] };
      }
      if (query.priority && query.priority.length > 0) {
        taskWhere.priority = { in: query.priority as Priority[] };
      }
      if (query.query) {
        taskWhere.title = { contains: query.query, mode: 'insensitive' };
      }

      if (scope === 'mine') {
        taskWhere.OR = [
          { assigneeId: actor.id },
          { createdById: actor.id },
        ];
      } else if (scope === 'department' && deptId) {
        taskWhere.OR = [
          { assignee: { departmentId: deptId } },
          { createdBy: { departmentId: deptId } },
          { project: { departmentId: deptId } },
        ];
      }

      const tasks = await this.prisma.task.findMany({
        where: taskWhere,
        include: {
          project: { select: { id: true, name: true, pmId: true } },
          assignee: { select: { id: true, name: true, departmentId: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { dueDate: 'asc' },
      });

      const now = new Date();
      for (const t of tasks) {
        if (!t.dueDate) continue;
        const isProjectPm = managedProjectIds.has(t.projectId) || t.project.pmId === actor.id;
        const perm = canReschedule(
          'task',
          {
            createdById: t.createdById,
            creatorName: t.createdBy.name,
            assigneeId: t.assigneeId,
            projectId: t.projectId,
            isProjectPm,
          },
          actor,
        );

        const isOverdue = t.status !== TaskStatus.DONE && t.dueDate < now;

        const taskItem: TaskTimelineItem = {
          kind: 'task',
          id: t.id,
          title: t.title,
          description: t.description,
          startAt: t.dueDate.toISOString(),
          endAt: t.dueDate.toISOString(),
          projectId: t.projectId,
          projectName: t.project.name,
          status: t.status,
          priority: t.priority,
          assigneeId: t.assigneeId || '',
          assigneeName: t.assignee?.name || 'Chưa giao',
          creatorId: t.createdById,
          creatorName: t.createdBy.name,
          userId: t.assigneeId || t.createdById,
          canReschedule: perm.allowed,
          isOverdue,
        };
        items.push(taskItem);
      }
    }

    // ---------------------------------------------------------
    // 3. Fetch Sprints (kind: 'sprint')
    // ---------------------------------------------------------
    if (requestedTypes.has('sprint')) {
      const sprintWhere: any = {
        deletedAt: null,
        startDate: { lte: toDate },
        endDate: { gte: fromDate },
      };

      if (query.projectId) sprintWhere.projectId = query.projectId;
      if (query.query) {
        sprintWhere.name = { contains: query.query, mode: 'insensitive' };
      }

      if (scope === 'mine') {
        sprintWhere.project = {
          kind: 'TEAM',
          deletedAt: null,
          OR: [
            { pmId: actor.id },
            { createdById: actor.id },
            { members: { some: { userId: actor.id } } },
          ],
        };
      } else if (scope === 'department' && deptId) {
        sprintWhere.project = {
          kind: 'TEAM',
          deletedAt: null,
          departmentId: deptId,
        };
      } else {
        sprintWhere.project = {
          kind: 'TEAM',
          deletedAt: null,
        };
      }

      const sprints = await this.prisma.sprint.findMany({
        where: sprintWhere,
        include: {
          project: { select: { id: true, name: true, pmId: true } },
          createdBy: { select: { id: true, name: true } },
        },
        orderBy: { startDate: 'asc' },
      });

      for (const sp of sprints) {
        if (!sp.startDate || !sp.endDate) continue;
        const isProjectPm = managedProjectIds.has(sp.projectId) || sp.project.pmId === actor.id;
        const perm = canReschedule(
          'sprint',
          {
            createdById: sp.createdById || '',
            creatorName: sp.createdBy?.name || 'PM',
            projectId: sp.projectId,
            isProjectPm,
          },
          actor,
        );

        const sprintItem: SprintTimelineItem = {
          kind: 'sprint',
          id: sp.id,
          title: sp.name,
          goal: sp.goal,
          startAt: sp.startDate.toISOString(),
          endAt: sp.endDate.toISOString(),
          projectId: sp.projectId,
          projectName: sp.project.name,
          status: sp.status,
          creatorId: sp.createdById || '',
          creatorName: sp.createdBy?.name || 'PM',
          canReschedule: perm.allowed,
        };
        items.push(sprintItem);
      }
    }

    // ---------------------------------------------------------
    // 4. Fetch Meetings (kind: 'meeting')
    // ---------------------------------------------------------
    if (requestedTypes.has('meeting')) {
      const meetingWhere: any = {
        deletedAt: null,
        startTime: { lte: toDate },
        endTime: { gte: fromDate },
      };

      if (query.projectId) meetingWhere.projectId = query.projectId;
      if (query.query) {
        meetingWhere.title = { contains: query.query, mode: 'insensitive' };
      }

      if (scope === 'mine') {
        meetingWhere.OR = [
          { createdById: actor.id },
          { attendees: { some: { userId: actor.id } } },
        ];
      } else if (scope === 'department' && deptId) {
        meetingWhere.OR = [
          { departmentId: deptId },
          { createdBy: { departmentId: deptId } },
          { attendees: { some: { user: { departmentId: deptId } } } },
        ];
      }

      const meetings = await this.prisma.meeting.findMany({
        where: meetingWhere,
        include: {
          createdBy: { select: { id: true, name: true } },
          attendees: {
            include: { user: { select: { id: true, name: true } } },
          },
        },
        orderBy: { startTime: 'asc' },
      });

      for (const m of meetings) {
        const perm = canReschedule(
          'meeting',
          {
            createdById: m.createdById,
            creatorName: m.createdBy.name,
          },
          actor,
        );

        const meetingItem: MeetingTimelineItem = {
          kind: 'meeting',
          id: m.id,
          title: m.title,
          description: m.description,
          startAt: m.startTime.toISOString(),
          endAt: m.endTime.toISOString(),
          scope: m.scopeType,
          projectId: m.projectId,
          departmentId: m.departmentId,
          attendeeCount: m.attendees.length,
          roomCode: m.roomCode,
          status: m.status,
          creatorId: m.createdById,
          creatorName: m.createdBy.name,
          canReschedule: perm.allowed,
        };
        items.push(meetingItem);
      }
    }

    // ---------------------------------------------------------
    // 5. Fetch LeaveRequests (kind: 'leave')
    // ---------------------------------------------------------
    if (requestedTypes.has('leave')) {
      const leaveWhere: any = {
        status: 'APPROVED',
        startDate: { lte: toDate },
        endDate: { gte: fromDate },
      };

      if (query.assigneeId) leaveWhere.userId = query.assigneeId;

      if (scope === 'mine') {
        leaveWhere.userId = actor.id;
      } else if (scope === 'department' && deptId) {
        leaveWhere.user = { departmentId: deptId };
      }

      const leaves = await this.prisma.leaveRequest.findMany({
        where: leaveWhere,
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { startDate: 'asc' },
      });

      for (const l of leaves) {
        const leaveItem: LeaveTimelineItem = {
          kind: 'leave',
          id: l.id,
          title: `Nghỉ phép: ${l.user.name} (${l.leaveType})`,
          description: l.reason,
          startAt: l.startDate.toISOString(),
          endAt: l.endDate.toISOString(),
          userId: l.userId,
          userName: l.user.name,
          leaveType: l.leaveType,
          dayCount: l.dayCount,
          creatorId: l.userId,
          creatorName: l.user.name,
          canReschedule: false,
        };
        items.push(leaveItem);
      }
    }

    // ---------------------------------------------------------
    // 6. Fetch WfhRequests (kind: 'wfh')
    // ---------------------------------------------------------
    if (requestedTypes.has('wfh')) {
      const wfhWhere: any = {
        status: 'APPROVED',
        date: { gte: fromDate, lte: toDate },
      };

      if (query.assigneeId) wfhWhere.userId = query.assigneeId;

      if (scope === 'mine') {
        wfhWhere.userId = actor.id;
      } else if (scope === 'department' && deptId) {
        wfhWhere.user = { departmentId: deptId };
      }

      const wfhs = await this.prisma.wfhRequest.findMany({
        where: wfhWhere,
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { date: 'asc' },
      });

      for (const w of wfhs) {
        const dateIso = w.date.toISOString();
        const wfhItem: WfhTimelineItem = {
          kind: 'wfh',
          id: w.id,
          title: `WFH: ${w.user.name}`,
          description: w.reason,
          startAt: dateIso,
          endAt: dateIso,
          userId: w.userId,
          userName: w.user.name,
          reason: w.reason,
          creatorId: w.userId,
          creatorName: w.user.name,
          canReschedule: false,
        };
        items.push(wfhItem);
      }
    }

    // ---------------------------------------------------------
    // 7. Fetch OvertimeRequests (kind: 'overtime')
    // ---------------------------------------------------------
    if (requestedTypes.has('overtime')) {
      const otWhere: any = {
        status: 'APPROVED',
        date: { gte: fromDate, lte: toDate },
      };

      if (query.assigneeId) otWhere.userId = query.assigneeId;

      if (scope === 'mine') {
        otWhere.userId = actor.id;
      } else if (scope === 'department' && deptId) {
        otWhere.user = { departmentId: deptId };
      }

      const ots = await this.prisma.overtimeRequest.findMany({
        where: otWhere,
        include: {
          user: { select: { id: true, name: true } },
        },
        orderBy: { date: 'asc' },
      });

      for (const o of ots) {
        const otItem: OvertimeTimelineItem = {
          kind: 'overtime',
          id: o.id,
          title: `Tăng ca: ${o.user.name} (${o.registeredHours}h)`,
          description: o.reason,
          startAt: o.registeredStart.toISOString(),
          endAt: o.registeredEnd.toISOString(),
          userId: o.userId,
          userName: o.user.name,
          registeredHours: o.registeredHours,
          reason: o.reason,
          creatorId: o.userId,
          creatorName: o.user.name,
          canReschedule: false,
        };
        items.push(otItem);
      }
    }

    // Deduplicate items by kind + id
    const uniqueItemsMap = new Map<string, TimelineItem>();
    for (const it of items) {
      uniqueItemsMap.set(`${it.kind}-${it.id}`, it);
    }
    const deduplicatedItems = Array.from(uniqueItemsMap.values());

    // ---------------------------------------------------------
    // 8. Detect Conflicts
    // ---------------------------------------------------------
    const conflicts = await this.detectConflicts(deduplicatedItems);

    return {
      range: { from: query.from, to: query.to },
      scope: scope as any,
      items: deduplicatedItems,
      conflicts,
    };
  }

  /**
   * Conflict Detection Engine
   * 1. meeting_overlap: Same user in 2 overlapping meetings
   * 2. overdue_overload: Same user has >= 3 tasks overdue on the same day
   * 3. leave_during_meeting: User has approved leave and a meeting on the same day
   */
  async detectConflicts(items: TimelineItem[]): Promise<Conflict[]> {
    const conflicts: Conflict[] = [];

    // Filter meeting items
    const meetingItems = items.filter((i) => i.kind === 'meeting') as MeetingTimelineItem[];
    const leaveItems = items.filter((i) => i.kind === 'leave') as LeaveTimelineItem[];
    const taskItems = items.filter((i) => i.kind === 'task') as TaskTimelineItem[];

    // If there are meetings, fetch their attendee IDs
    if (meetingItems.length > 0) {
      const meetingIds = meetingItems.map((m) => m.id);
      const attendees = await this.prisma.meetingAttendee.findMany({
        where: { meetingId: { in: meetingIds } },
        include: { user: { select: { id: true, name: true } } },
      });

      // Map meetingId -> attendee list
      const meetingAttendeesMap = new Map<string, { id: string; name: string }[]>();
      for (const att of attendees) {
        const list = meetingAttendeesMap.get(att.meetingId) || [];
        list.push({ id: att.userId, name: att.user.name });
        meetingAttendeesMap.set(att.meetingId, list);
      }

      // Check 1: meeting_overlap
      const seenConflictKeys = new Set<string>();
      for (let i = 0; i < meetingItems.length; i++) {
        for (let j = i + 1; j < meetingItems.length; j++) {
          const m1 = meetingItems[i];
          const m2 = meetingItems[j];

          // Skip cancelled meetings
          if (m1.status === 'CANCELLED' || m2.status === 'CANCELLED') continue;

          // Skip duplicate meetings with identical titles (redundant data copies)
          if (m1.title.trim().toLowerCase() === m2.title.trim().toLowerCase()) continue;

          const start1 = new Date(m1.startAt).getTime();
          const end1 = new Date(m1.endAt).getTime();
          const start2 = new Date(m2.startAt).getTime();
          const end2 = new Date(m2.endAt).getTime();

          // Time overlap check: start1 < end2 && end1 > start2
          if (start1 < end2 && end1 > start2) {
            const atts1 = meetingAttendeesMap.get(m1.id) || [];
            const atts2 = meetingAttendeesMap.get(m2.id) || [];

            const commonAttendees = atts1.filter((a1) => atts2.some((a2) => a2.id === a1.id));
            for (const common of commonAttendees) {
              const pairKey = [m1.id, m2.id].sort().join('_');
              const key = `overlap_${common.id}_${pairKey}`;
              if (!seenConflictKeys.has(key)) {
                seenConflictKeys.add(key);
                conflicts.push({
                  userId: common.id,
                  userName: common.name,
                  type: 'meeting_overlap',
                  message: `${common.name} có 2 cuộc họp trùng giờ ("${m1.title}" và "${m2.title}")`,
                  involvedItemIds: [m1.id, m2.id],
                });
              }
            }
          }
        }
      }

      // Check 3: leave_during_meeting
      for (const l of leaveItems) {
        const leaveStart = new Date(l.startAt).getTime();
        const leaveEnd = new Date(l.endAt).getTime();

        for (const m of meetingItems) {
          const mStart = new Date(m.startAt).getTime();
          const mEnd = new Date(m.endAt).getTime();

          // Overlaps if meeting is within leave dates
          if (mStart <= leaveEnd && mEnd >= leaveStart) {
            const atts = meetingAttendeesMap.get(m.id) || [];
            const isAttendee = atts.some((a) => a.id === l.userId);
            if (isAttendee) {
              conflicts.push({
                userId: l.userId,
                userName: l.userName,
                type: 'leave_during_meeting',
                message: `${l.userName} đang nghỉ phép nhưng có lịch họp ("${m.title}")`,
                involvedItemIds: [l.id, m.id],
              });
            }
          }
        }
      }
    }

    // Check 2: overdue_overload (>= 3 overdue tasks on same user)
    const userOverdueTasks = new Map<string, { user: { id: string; name: string }; tasks: TaskTimelineItem[] }>();
    for (const t of taskItems) {
      if (t.isOverdue && t.assigneeId) {
        const entry = userOverdueTasks.get(t.assigneeId) || {
          user: { id: t.assigneeId, name: t.assigneeName },
          tasks: [],
        };
        entry.tasks.push(t);
        userOverdueTasks.set(t.assigneeId, entry);
      }
    }

    for (const [, entry] of userOverdueTasks) {
      if (entry.tasks.length >= 3) {
        conflicts.push({
          userId: entry.user.id,
          userName: entry.user.name,
          type: 'overdue_overload',
          message: `${entry.user.name} có ${entry.tasks.length} công việc quá hạn cần xử lý`,
          involvedItemIds: entry.tasks.map((t) => t.id),
        });
      }
    }

    return conflicts;
  }

  /**
   * Reschedule an item (Task, Meeting, Sprint) with strict permission checks.
   */
  async rescheduleItem(
    kind: ItemKind,
    id: string,
    dto: RescheduleDto,
    actor: AuthActor,
  ): Promise<RescheduleResult> {
    const newStart = new Date(dto.newStart);
    const newEnd = dto.newEnd ? new Date(dto.newEnd) : undefined;

    if (newEnd && newStart > newEnd) {
      throw new BadRequestException('Thời gian bắt đầu mới không được lớn hơn thời gian kết thúc');
    }

    // 1. Task Reschedule
    if (kind === 'task') {
      const task = await this.prisma.task.findUnique({
        where: { id },
        include: {
          project: { select: { pmId: true } },
          createdBy: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
        },
      });

      if (!task || task.deletedAt) {
        throw new NotFoundException('Không tìm thấy công việc cần đổi lịch');
      }

      // Check if actor is PM
      const isProjectPm =
        task.project.pmId === actor.id ||
        (await this.prisma.projectMember.findFirst({
          where: { projectId: task.projectId, userId: actor.id, projectRole: 'PM' },
        })) !== null;

      const perm = canReschedule(
        'task',
        {
          createdById: task.createdById,
          creatorName: task.createdBy.name,
          assigneeId: task.assigneeId,
          projectId: task.projectId,
          isProjectPm,
        },
        actor,
      );

      if (!perm.allowed) {
        throw new ForbiddenException(perm.reason);
      }

      const updated = await this.prisma.task.update({
        where: { id },
        data: { dueDate: newStart },
        include: {
          project: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          assignee: { select: { id: true, name: true } },
        },
      });

      return {
        success: true,
        message: 'Đổi lịch công việc thành công',
        item: {
          kind: 'task',
          id: updated.id,
          title: updated.title,
          description: updated.description,
          startAt: updated.dueDate!.toISOString(),
          endAt: updated.dueDate!.toISOString(),
          projectId: updated.projectId,
          projectName: updated.project.name,
          status: updated.status,
          priority: updated.priority,
          assigneeId: updated.assigneeId || '',
          assigneeName: updated.assignee?.name || '',
          creatorId: updated.createdById,
          creatorName: updated.createdBy.name,
          canReschedule: true,
        },
      };
    }

    // 2. Meeting Reschedule
    if (kind === 'meeting') {
      const meeting = await this.prisma.meeting.findUnique({
        where: { id },
        include: {
          createdBy: { select: { id: true, name: true } },
          attendees: true,
        },
      });

      if (!meeting || meeting.deletedAt) {
        throw new NotFoundException('Không tìm thấy cuộc họp cần đổi lịch');
      }

      const perm = canReschedule(
        'meeting',
        {
          createdById: meeting.createdById,
          creatorName: meeting.createdBy.name,
        },
        actor,
      );

      if (!perm.allowed) {
        throw new ForbiddenException(perm.reason);
      }

      // Calculate new end time based on previous duration if newEnd not given
      const durationMs = meeting.endTime.getTime() - meeting.startTime.getTime();
      const calculatedEnd = newEnd || new Date(newStart.getTime() + durationMs);

      const updated = await this.prisma.meeting.update({
        where: { id },
        data: {
          startTime: newStart,
          endTime: calculatedEnd,
        },
        include: {
          createdBy: { select: { id: true, name: true } },
          attendees: true,
        },
      });

      return {
        success: true,
        message: 'Đổi lịch cuộc họp thành công',
        item: {
          kind: 'meeting',
          id: updated.id,
          title: updated.title,
          description: updated.description,
          startAt: updated.startTime.toISOString(),
          endAt: updated.endTime.toISOString(),
          scope: updated.scopeType,
          projectId: updated.projectId,
          departmentId: updated.departmentId,
          attendeeCount: updated.attendees.length,
          status: updated.status,
          creatorId: updated.createdById,
          creatorName: updated.createdBy.name,
          canReschedule: true,
        },
      };
    }

    // 3. Sprint Reschedule
    if (kind === 'sprint') {
      const sprint = await this.prisma.sprint.findUnique({
        where: { id },
        include: {
          project: { select: { id: true, name: true, pmId: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      if (!sprint || sprint.deletedAt) {
        throw new NotFoundException('Không tìm thấy chu kỳ Sprint cần đổi lịch');
      }

      const isProjectPm =
        sprint.project.pmId === actor.id ||
        (await this.prisma.projectMember.findFirst({
          where: { projectId: sprint.projectId, userId: actor.id, projectRole: 'PM' },
        })) !== null;

      const perm = canReschedule(
        'sprint',
        {
          createdById: sprint.createdById || '',
          creatorName: sprint.createdBy?.name || 'PM',
          projectId: sprint.projectId,
          isProjectPm,
        },
        actor,
      );

      if (!perm.allowed) {
        throw new ForbiddenException(perm.reason);
      }

      const currentDuration =
        sprint.startDate && sprint.endDate
          ? sprint.endDate.getTime() - sprint.startDate.getTime()
          : 14 * 24 * 60 * 60 * 1000;
      const calculatedEnd = newEnd || new Date(newStart.getTime() + currentDuration);

      const updated = await this.prisma.sprint.update({
        where: { id },
        data: {
          startDate: newStart,
          endDate: calculatedEnd,
        },
        include: {
          project: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
        },
      });

      return {
        success: true,
        message: 'Đổi lịch Sprint thành công',
        item: {
          kind: 'sprint',
          id: updated.id,
          title: updated.name,
          goal: updated.goal,
          startAt: updated.startDate!.toISOString(),
          endAt: updated.endDate!.toISOString(),
          projectId: updated.projectId,
          projectName: updated.project.name,
          status: updated.status,
          creatorId: updated.createdById || '',
          creatorName: updated.createdBy?.name || 'PM',
          canReschedule: true,
        },
      };
    }

    // 4. Blocked kinds
    throw new ForbiddenException(
      'Không thể tự ý thay đổi lịch của loại sự kiện này. Vui lòng liên hệ người tạo hoặc bộ phận nhân sự.',
    );
  }

  /**
   * Export timeline items as standard RFC 5545 iCalendar (.ics) format
   */
  async exportIcs(query: CalendarQueryDto, actor: AuthActor): Promise<string> {
    const timeline = await this.getTimeline(query, actor);

    const formatIcsDate = (dateStr: string): string => {
      const d = new Date(dateStr);
      return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const escapeIcs = (str: string): string => {
      return (str || '')
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\n/g, '\\n');
    };

    let ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//WorkSync//Work Calendar Timeline//VI',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'X-WR-CALNAME:WorkSync Calendar',
      'X-WR-TIMEZONE:Asia/Ho_Chi_Minh',
    ];

    for (const item of timeline.items) {
      const startIcs = formatIcsDate(item.startAt);
      const endIcs = formatIcsDate(item.endAt);
      const summary = escapeIcs(`[${item.kind.toUpperCase()}] ${item.title}`);
      const desc = escapeIcs(item.description || item.title);

      ics.push(
        'BEGIN:VEVENT',
        `UID:${item.kind}-${item.id}@worksync.vn`,
        `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
        `DTSTART:${startIcs}`,
        `DTEND:${endIcs}`,
        `SUMMARY:${summary}`,
        `DESCRIPTION:${desc}`,
        `STATUS:CONFIRMED`,
        'END:VEVENT',
      );
    }

    ics.push('END:VCALENDAR');
    return ics.join('\r\n');
  }
}
