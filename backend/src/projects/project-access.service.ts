import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ProjectKind, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';

export interface CurrentActor {
  id: string;
  role: Role;
  departmentId?: string | null;
}

export interface ProjectAccess {
  projectId: string;
  kind: ProjectKind;
  projectRole?: string;
}

@Injectable()
export class ProjectAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async requireReadableProject(projectId: string, actor: CurrentActor): Promise<ProjectAccess> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        kind: true,
        personalOwnerId: true,
        createdById: true,
        pmId: true,
        departmentId: true,
        members: {
          where: { userId: actor.id },
          select: { projectRole: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (actor.role === Role.ADMIN) {
      return { projectId: project.id, kind: project.kind };
    }

    if (project.kind === ProjectKind.PERSONAL) {
      if (project.personalOwnerId !== actor.id) {
        throw new ForbiddenException('You do not have access to this project');
      }

      return { projectId: project.id, kind: project.kind };
    }

    const membership = project.members[0];
    if (membership) {
      return {
        projectId: project.id,
        kind: project.kind,
        projectRole: membership.projectRole,
      };
    }

    // RBAC (M3.5): DEPT_HEAD có quyền xem các dự án do mình tạo hoặc thuộc phòng mình quản lý
    if (actor.role === Role.DEPARTMENT_HEAD) {
      if (project.createdById === actor.id || project.pmId === actor.id) {
        return {
          projectId: project.id,
          kind: project.kind,
          projectRole: 'DEPT_HEAD',
        };
      }
      if (actor.departmentId && project.departmentId === actor.departmentId) {
        return {
          projectId: project.id,
          kind: project.kind,
          projectRole: 'DEPT_HEAD',
        };
      }
    }

    throw new ForbiddenException('You do not have access to this project');
  }

  async isProjectPM(projectId: string, userId: string): Promise<boolean> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { pmId: true },
    });
    if (project?.pmId === userId) return true;
    const member = await this.prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId } },
      select: { projectRole: true },
    });
    return member?.projectRole === 'PM';
  }

  async requireTaskMovePermission(taskId: string, actor: CurrentActor): Promise<{ taskId: string; projectId: string }> {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, deletedAt: null },
      select: {
        id: true,
        projectId: true,
        assigneeId: true,
        createdById: true,
        project: {
          select: {
            id: true,
            name: true,
            kind: true,
            personalOwnerId: true,
            pmId: true,
            departmentId: true,
            createdById: true,
            members: {
              where: { userId: actor.id },
              select: { projectRole: true },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Công việc không tồn tại hoặc đã bị xóa');
    }

    if (actor.role === Role.ADMIN) {
      return { taskId: task.id, projectId: task.projectId };
    }

    if (task.project.kind === ProjectKind.PERSONAL) {
      if (task.project.personalOwnerId !== actor.id) {
        throw new ForbiddenException('Bạn không có quyền thao tác trên dự án cá nhân của người khác');
      }
      return { taskId: task.id, projectId: task.projectId };
    }

    const membership = task.project.members[0];
    const isAssignee = task.assigneeId === actor.id;
    const isCreator = task.createdById === actor.id;
    const isProjectPM = task.project.pmId === actor.id || membership?.projectRole === 'PM';
    const isDeptHead = actor.role === Role.DEPARTMENT_HEAD && (
      task.project.createdById === actor.id ||
      task.project.pmId === actor.id ||
      (!!actor.departmentId && task.project.departmentId === actor.departmentId)
    );

    // Only allow task move if actor is Assignee, Creator, PM, or Department Head
    if (isAssignee || isCreator || isProjectPM || isDeptHead) {
      return { taskId: task.id, projectId: task.projectId };
    }

    throw new ForbiddenException('Bạn không có quyền di chuyển công việc này. Chỉ người được giao việc, người tạo hoặc Quản lý dự án (PM) mới có quyền thay đổi trạng thái.');
  }
}

