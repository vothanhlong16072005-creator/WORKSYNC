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
        project: {
          select: {
            id: true,
            kind: true,
            personalOwnerId: true,
            members: {
              where: { userId: actor.id },
              select: { projectRole: true },
            },
          },
        },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (actor.role === Role.ADMIN) {
      return { taskId: task.id, projectId: task.projectId };
    }

    if (task.project.kind === ProjectKind.PERSONAL) {
      if (task.project.personalOwnerId !== actor.id) {
        throw new ForbiddenException('You do not have access to this project');
      }
      return { taskId: task.id, projectId: task.projectId };
    }

    const membership = task.project.members[0];
    if (!membership) {
      throw new ForbiddenException('You do not have access to this project');
    }

    const isAssignee = task.assigneeId === actor.id;
    const isPM = membership.projectRole === 'PM';

    if (!isAssignee && !isPM) {
      throw new ForbiddenException('You do not have permission to move this task');
    }

    return { taskId: task.id, projectId: task.projectId };
  }
}

