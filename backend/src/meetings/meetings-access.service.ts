/**
 * Meetings Access Service — Scope-based RBAC & Privacy Protection
 * Reference: PLAN-2026-10-17-M5-MEETINGS-V2.md (Section 6)
 */
import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Meeting, MeetingScope, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { CurrentActor } from '../projects/project-access.service.js';

export interface MeetingWithRelations extends Meeting {
  attendees?: Array<{ userId: string }>;
  project?: {
    id: string;
    pmId: string | null;
    departmentId: string | null;
    members?: Array<{ userId: string }>;
  } | null;
  department?: {
    id: string;
    managerId: string | null;
  } | null;
}

@Injectable()
export class MeetingsAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if actor is allowed to create meeting for the given scope
   */
  async canCreateMeeting(
    actor: CurrentActor,
    scopeType: MeetingScope,
    projectId?: string,
    departmentId?: string,
  ): Promise<boolean> {
    if (actor.role === Role.ADMIN) return true;

    if (scopeType === MeetingScope.PROJECT) {
      if (!projectId) return false;
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        select: { pmId: true, departmentId: true },
      });
      if (!project) return false;

      // PM of project
      if (actor.role === Role.PM && project.pmId === actor.id) {
        return true;
      }

      // Department head of the department containing this project
      if (
        actor.role === Role.DEPARTMENT_HEAD &&
        actor.departmentId &&
        project.departmentId === actor.departmentId
      ) {
        return true;
      }

      return false;
    }

    if (scopeType === MeetingScope.DEPARTMENT) {
      if (!departmentId) return false;
      // Only DEPARTMENT_HEAD of this department can create department meeting
      if (
        actor.role === Role.DEPARTMENT_HEAD &&
        actor.departmentId &&
        actor.departmentId === departmentId
      ) {
        return true;
      }
      return false;
    }

    if (scopeType === MeetingScope.ONE_ON_ONE) {
      // Anyone can create 1-on-1 meetings
      return true;
    }

    return false;
  }

  /**
   * Strict privacy check: Can actor view / access this meeting?
   * If false, meeting is completely hidden (IDOR protection).
   */
  async canViewMeeting(meetingId: string, actor: CurrentActor): Promise<boolean> {
    if (actor.role === Role.ADMIN) return true;

    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
      include: {
        attendees: { select: { userId: true } },
        project: {
          select: {
            id: true,
            pmId: true,
            departmentId: true,
            members: { select: { userId: true } },
          },
        },
      },
    });

    if (!meeting || meeting.deletedAt) return false;

    // Creator always has access
    if (meeting.createdById === actor.id) return true;

    // Direct attendee has access
    if (meeting.attendees.some((a) => a.userId === actor.id)) return true;

    // PROJECT scope: project members, PM, or DEPT_HEAD of project department
    if (meeting.scopeType === MeetingScope.PROJECT && meeting.project) {
      const isMember = meeting.project.members.some((m) => m.userId === actor.id);
      const isPm = meeting.project.pmId === actor.id;
      const isDeptHead =
        actor.role === Role.DEPARTMENT_HEAD &&
        Boolean(actor.departmentId) &&
        meeting.project.departmentId === actor.departmentId;

      return isMember || isPm || isDeptHead;
    }

    // DEPARTMENT scope: same department members
    if (meeting.scopeType === MeetingScope.DEPARTMENT && meeting.departmentId) {
      return actor.departmentId === meeting.departmentId;
    }

    // ONE_ON_ONE: strictly creator or attendee
    if (meeting.scopeType === MeetingScope.ONE_ON_ONE) {
      return meeting.createdById === actor.id || meeting.attendees.some((a) => a.userId === actor.id);
    }

    return false;
  }

  /**
   * Can actor manage (update, delete, save minutes) this meeting?
   */
  canManageMeeting(meeting: { createdById: string }, actor: CurrentActor): boolean {
    if (actor.role === Role.ADMIN) return true;
    return meeting.createdById === actor.id;
  }

  /**
   * Resolves attendees automatically when creating meeting based on scope
   */
  async resolveAutoAttendees(
    scopeType: MeetingScope,
    actor: CurrentActor,
    projectId?: string,
    departmentId?: string,
    manualAttendeeIds: string[] = [],
  ): Promise<string[]> {
    const attendeeSet = new Set<string>();
    // Always include creator
    attendeeSet.add(actor.id);

    if (scopeType === MeetingScope.PROJECT && projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        include: {
          members: { select: { userId: true } },
        },
      });

      if (project) {
        project.members.forEach((m) => attendeeSet.add(m.userId));
        if (project.pmId) attendeeSet.add(project.pmId);

        // Auto-add DEPT_HEAD of project's department if exists
        if (project.departmentId) {
          const deptHead = await this.prisma.user.findFirst({
            where: {
              role: Role.DEPARTMENT_HEAD,
              departmentId: project.departmentId,
              deletedAt: null,
            },
            select: { id: true },
          });
          if (deptHead) attendeeSet.add(deptHead.id);
        }
      }
    } else if (scopeType === MeetingScope.DEPARTMENT && departmentId) {
      const deptUsers = await this.prisma.user.findMany({
        where: {
          departmentId,
          deletedAt: null,
          role: { not: Role.ADMIN },
        },
        select: { id: true },
      });
      deptUsers.forEach((u) => attendeeSet.add(u.id));
    } else if (scopeType === MeetingScope.ONE_ON_ONE) {
      manualAttendeeIds.forEach((id) => attendeeSet.add(id));
    }

    // Also include any extra manual attendees provided
    if (manualAttendeeIds.length > 0) {
      manualAttendeeIds.forEach((id) => attendeeSet.add(id));
    }

    return Array.from(attendeeSet);
  }
}
