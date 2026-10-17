import { Injectable } from '@nestjs/common';
import { Document, DocumentScope, DocumentType, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

export interface CurrentActor {
  id: string;
  role: Role;
  departmentId?: string | null;
}

@Injectable()
export class DocumentsAccessService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Check if actor can create a document with the given scope and relations
   */
  async canCreateDocument(
    actor: CurrentActor,
    scope: DocumentScope,
    type: DocumentType,
    projectId?: string | null,
    departmentId?: string | null,
    linkedTaskId?: string | null,
  ): Promise<boolean> {
    if (actor.role === Role.ADMIN) {
      return true;
    }

    // U2: Task submission can be created by assignee of that task
    if (type === DocumentType.TASK_SUBMISSION && linkedTaskId) {
      const task = await this.prisma.task.findUnique({
        where: { id: linkedTaskId },
        select: { id: true, assigneeId: true, deletedAt: true },
      });
      if (!task || task.deletedAt) return false;
      return task.assigneeId === actor.id || actor.role === Role.PM || actor.role === Role.DEPARTMENT_HEAD;
    }

    switch (scope) {
      case DocumentScope.COMPANY:
        // Only Admin can create company-wide documents (Admin was handled in early return)
        return false;

      case DocumentScope.DEPARTMENT:
        // Only DEPT_HEAD can create department documents
        if (actor.role === Role.DEPARTMENT_HEAD) {
          if (!departmentId) return true;
          return actor.departmentId === departmentId;
        }
        return false;

      case DocumentScope.PROJECT: {
        if (!projectId) return false;
        return this.canManageProjectDocuments(actor, projectId);
      }

      case DocumentScope.PERSONAL:
        return true;

      default:
        return false;
    }
  }

  /**
   * Check if actor can view a document
   */
  async canViewDocument(document: Document, actor: CurrentActor): Promise<boolean> {
    if (actor.role === Role.ADMIN) return true;
    if (document.deletedAt) return false;

    // Owner always has access
    if (document.ownerId === actor.id || document.createdById === actor.id) {
      return true;
    }

    // Check direct explicit permissions
    const permission = await this.prisma.documentPermission.findUnique({
      where: {
        documentId_userId: {
          documentId: document.id,
          userId: actor.id,
        },
      },
    });
    if (permission) return true;

    // U5: Company documents are readable by everyone
    if (document.scope === DocumentScope.COMPANY) {
      return true;
    }

    // U1 / U2: Linked to a task
    if (document.linkedTaskId) {
      const task = await this.prisma.task.findUnique({
        where: { id: document.linkedTaskId },
        include: {
          project: {
            include: {
              members: { where: { userId: actor.id } },
            },
          },
        },
      });

      if (task) {
        if (task.assigneeId === actor.id || task.createdById === actor.id) return true;
        if (actor.role === Role.HR) return true;
        if (task.project) {
          if (task.project.pmId === actor.id) return true;
          if (actor.role === Role.DEPARTMENT_HEAD && actor.departmentId && task.project.departmentId === actor.departmentId) {
            return true;
          }
          if (task.project.members.length > 0) return true;
        }
      }
    }

    // U4: Linked to a meeting
    if (document.linkedMeetingId) {
      const isAttendee = await this.prisma.meetingAttendee.findUnique({
        where: {
          meetingId_userId: {
            meetingId: document.linkedMeetingId,
            userId: actor.id,
          },
        },
      });
      if (isAttendee) return true;

      const meeting = await this.prisma.meeting.findUnique({
        where: { id: document.linkedMeetingId },
        select: { createdById: true },
      });
      if (meeting?.createdById === actor.id) return true;
    }

    // Scope-based checking
    switch (document.scope) {
      case DocumentScope.DEPARTMENT: {
        if (actor.role === Role.HR) return true;
        if (!document.departmentId) return false;
        return actor.departmentId === document.departmentId;
      }

      case DocumentScope.PROJECT: {
        if (!document.projectId) return false;
        return this.isProjectMemberOrManager(actor, document.projectId);
      }

      case DocumentScope.PERSONAL:
        return false;

      default:
        return false;
    }
  }

  /**
   * Check if actor can update or edit a document
   */
  async canEditDocument(document: Document, actor: CurrentActor): Promise<boolean> {
    if (actor.role === Role.ADMIN) return true;
    if (document.deletedAt) return false;

    // Owner can edit
    if (document.ownerId === actor.id || document.createdById === actor.id) {
      return true;
    }

    // Check direct permission with canEdit: true
    const permission = await this.prisma.documentPermission.findUnique({
      where: {
        documentId_userId: {
          documentId: document.id,
          userId: actor.id,
        },
      },
    });
    if (permission?.canEdit) return true;

    // Scope based edit permission
    switch (document.scope) {
      case DocumentScope.COMPANY:
        return false;

      case DocumentScope.DEPARTMENT:
        return (
          actor.role === Role.DEPARTMENT_HEAD &&
          actor.departmentId !== null &&
          document.departmentId === actor.departmentId
        );

      case DocumentScope.PROJECT:
        if (!document.projectId) return false;
        return this.canManageProjectDocuments(actor, document.projectId);

      case DocumentScope.PERSONAL:
        return false;

      default:
        return false;
    }
  }

  /**
   * Check if actor can delete a document (Admin, Owner, or Project/Dept Manager)
   */
  async canDeleteDocument(document: Document, actor: CurrentActor): Promise<boolean> {
    if (actor.role === Role.ADMIN) return true;
    if (document.ownerId === actor.id || document.createdById === actor.id) return true;

    switch (document.scope) {
      case DocumentScope.COMPANY:
        return false;
      case DocumentScope.DEPARTMENT:
        return (
          actor.role === Role.DEPARTMENT_HEAD &&
          actor.departmentId !== null &&
          document.departmentId === actor.departmentId
        );
      case DocumentScope.PROJECT:
        if (!document.projectId) return false;
        return this.canManageProjectDocuments(actor, document.projectId);
      default:
        return false;
    }
  }

  /**
   * Check if actor can manage project documents (PM of project, DEPT_HEAD of project dept)
   */
  private async canManageProjectDocuments(actor: CurrentActor, projectId: string): Promise<boolean> {
    if (actor.role === Role.ADMIN) return true;

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, pmId: true, departmentId: true, createdById: true },
    });
    if (!project) return false;

    if (project.pmId === actor.id || project.createdById === actor.id) return true;
    if (
      actor.role === Role.DEPARTMENT_HEAD &&
      actor.departmentId &&
      project.departmentId === actor.departmentId
    ) {
      return true;
    }

    return false;
  }

  /**
   * Check if actor is member, PM, or head of project
   */
  private async isProjectMemberOrManager(actor: CurrentActor, projectId: string): Promise<boolean> {
    if (actor.role === Role.ADMIN || actor.role === Role.HR) return true;

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: { where: { userId: actor.id } },
      },
    });
    if (!project) return false;

    if (project.pmId === actor.id || project.createdById === actor.id) return true;
    if (
      actor.role === Role.DEPARTMENT_HEAD &&
      actor.departmentId &&
      project.departmentId === actor.departmentId
    ) {
      return true;
    }

    return project.members.length > 0;
  }
}
