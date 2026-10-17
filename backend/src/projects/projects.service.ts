import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ProjectKind, Role } from '@prisma/client';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectAccessService, type CurrentActor } from './project-access.service.js';

export interface ProjectSummary {
  id: string;
  name: string;
  description?: string;
  kind: ProjectKind;
  color: string;
  workflowType?: string;
  status?: string;
  pmId?: string;
  pm?: { id: string; name: string; avatar: string | null; email: string };
  memberCount?: number;
  openAssignedTaskCount: number;
}

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  async create(dto: CreateProjectDto, actor: CurrentActor) {
    // RBAC (M3.5): PM, DEPT_HEAD, hoặc Admin có thể tạo team project
    if (
      actor.role !== Role.PM &&
      actor.role !== Role.DEPARTMENT_HEAD &&
      actor.role !== Role.ADMIN
    ) {
      throw new ForbiddenException(
        'Chỉ PM, Trưởng phòng hoặc Admin mới có quyền tạo dự án',
      );
    }

    // Resolve departmentId
    let departmentId = dto.departmentId ?? (actor as any).departmentId ?? null;
    if (!departmentId && typeof this.prisma.user?.findUnique === 'function') {
      const u = await this.prisma.user.findUnique({
        where: { id: actor.id },
        select: { departmentId: true },
      });
      departmentId = u?.departmentId ?? null;
    }

    // Determine PM ID and project creator role
    let pmId: string | null = null;
    if (actor.role === Role.PM) {
      pmId = actor.id;
    } else if (dto.pmId) {
      pmId = dto.pmId;
    }

    const membersToCreate: { userId: string; projectRole: string; joinedAt: Date }[] = [];
    const addedUserIds = new Set<string>();

    // 1. Add creator
    const creatorRole = actor.role === Role.DEPARTMENT_HEAD ? 'DEPT_HEAD' : 'PM';
    membersToCreate.push({
      userId: actor.id,
      projectRole: creatorRole,
      joinedAt: new Date(),
    });
    addedUserIds.add(actor.id);

    // 2. Add PM if different from creator
    if (pmId && !addedUserIds.has(pmId)) {
      membersToCreate.push({
        userId: pmId,
        projectRole: 'PM',
        joinedAt: new Date(),
      });
      addedUserIds.add(pmId);
    }

    // 3. Add initial members if provided
    if (dto.initialMemberIds && Array.isArray(dto.initialMemberIds)) {
      for (const mId of dto.initialMemberIds) {
        if (!addedUserIds.has(mId)) {
          membersToCreate.push({
            userId: mId,
            projectRole: 'MEMBER',
            joinedAt: new Date(),
          });
          addedUserIds.add(mId);
        }
      }
    }

    return this.prisma.$transaction(async (tx) => {
      return tx.project.create({
        data: {
          name: dto.name,
          description: dto.description,
          color: dto.color ?? '#3B82F6',
          kind: ProjectKind.TEAM,
          workflowType: dto.workflowType ?? 'KANBAN',
          pmId: pmId,
          departmentId: departmentId,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          createdById: actor.id,
          members: {
            create: membersToCreate.length === 1 ? membersToCreate[0] : membersToCreate,
          },
        },
        include: {
          pm: { select: { id: true, name: true, avatar: true, email: true } },
          members: { include: { user: true } },
        },
      });
    });
  }

  async addMember(projectId: string, dto: { userId: string; projectRole?: string }, actor: CurrentActor) {
    // RBAC (M3.5): PM của project, DEPT_HEAD (cùng phòng với PM), hoặc Admin
    const isPM = await this.projectAccessService.isProjectPM(projectId, actor.id);
    const isDeptHead = actor.role === Role.DEPARTMENT_HEAD;
    if (actor.role !== Role.ADMIN && !isPM && !isDeptHead) {
      throw new ForbiddenException(
        'Chỉ PM của dự án, Trưởng phòng hoặc Admin mới có quyền thêm thành viên',
      );
    }
    return this.prisma.projectMember.create({
      data: {
        projectId,
        userId: dto.userId,
        projectRole: dto.projectRole ?? 'MEMBER',
      },
    });
  }

  async removeMember(projectId: string, userId: string, actor: CurrentActor) {
    // RBAC (M3.5): PM, DEPT_HEAD, hoặc Admin
    const isPM = await this.projectAccessService.isProjectPM(projectId, actor.id);
    const isDeptHead = actor.role === Role.DEPARTMENT_HEAD;
    if (actor.role !== Role.ADMIN && !isPM && !isDeptHead) {
      throw new ForbiddenException(
        'Chỉ PM của dự án, Trưởng phòng hoặc Admin mới có quyền xóa thành viên',
      );
    }
    return this.prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });
  }

  async changeMemberRole(projectId: string, userId: string, dto: { projectRole: string }, actor: CurrentActor) {
    // RBAC (M3.5): PM, DEPT_HEAD, hoặc Admin
    const isPM = await this.projectAccessService.isProjectPM(projectId, actor.id);
    const isDeptHead = actor.role === Role.DEPARTMENT_HEAD;
    if (actor.role !== Role.ADMIN && !isPM && !isDeptHead) {
      throw new ForbiddenException(
        'Chỉ PM của dự án, Trưởng phòng hoặc Admin mới có quyền đổi role thành viên',
      );
    }
    return this.prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId } },
      data: { projectRole: dto.projectRole },
    });
  }

  async findMine(actor: CurrentActor): Promise<ProjectSummary[]> {
    let deptId = (actor as any).departmentId;
    if (!deptId && typeof this.prisma.user?.findUnique === 'function') {
      const u = await this.prisma.user.findUnique({
        where: { id: actor.id },
        select: { departmentId: true },
      });
      deptId = u?.departmentId ?? null;
    }

    const projects = await this.prisma.project.findMany({
      where:
        actor.role === Role.ADMIN
          ? {
              deletedAt: null,
              OR: [
                { kind: ProjectKind.TEAM },
                { kind: ProjectKind.PERSONAL, personalOwnerId: actor.id },
              ],
            }
          : actor.role === Role.DEPARTMENT_HEAD
          ? {
              deletedAt: null,
              OR: [
                { kind: ProjectKind.PERSONAL, personalOwnerId: actor.id },
                { kind: ProjectKind.TEAM, createdById: actor.id },
                { kind: ProjectKind.TEAM, pmId: actor.id },
                { kind: ProjectKind.TEAM, members: { some: { userId: actor.id } } },
                ...(deptId
                  ? [
                      { kind: ProjectKind.TEAM, departmentId: deptId },
                      { kind: ProjectKind.TEAM, createdBy: { departmentId: deptId } },
                      { kind: ProjectKind.TEAM, pm: { departmentId: deptId } },
                    ]
                  : []),
              ],
            }
          : {
              deletedAt: null,
              OR: [
                { kind: ProjectKind.PERSONAL, personalOwnerId: actor.id },
                {
                  kind: ProjectKind.TEAM,
                  members: { some: { userId: actor.id } },
                },
                { kind: ProjectKind.TEAM, pmId: actor.id },
              ],
            },
      select: {
        id: true,
        name: true,
        description: true,
        kind: true,
        color: true,
        workflowType: true,
        status: true,
        pmId: true,
        pm: {
          select: {
            id: true,
            name: true,
            avatar: true,
            email: true,
          },
        },
        _count: {
          select: {
            tasks: {
              where: {
                assigneeId: actor.id,
                deletedAt: null,
                status: { not: 'DONE' },
              },
            },
            members: true,
          },
        },
      },
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
    });

    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      description: project.description ?? undefined,
      kind: project.kind,
      color: project.color,
      workflowType: project.workflowType,
      status: project.status,
      pmId: project.pmId ?? undefined,
      pm: project.pm ?? undefined,
      memberCount: project._count.members,
      openAssignedTaskCount: project._count.tasks,
    }));
  }

  async findOne(id: string, actor?: CurrentActor) {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
      include: {
        pm: {
          select: { id: true, name: true, avatar: true, email: true },
        },
        createdBy: {
          select: { id: true, name: true, avatar: true, email: true },
        },
        department: {
          select: { id: true, name: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, avatar: true, email: true, role: true },
            },
          },
        },
        sprints: {
          where: { deletedAt: null },
          orderBy: { startDate: 'desc' },
          select: {
            id: true,
            name: true,
            status: true,
            startDate: true,
            endDate: true,
            durationDays: true,
            completedAt: true,
          },
        },
        tasks: {
          where: { deletedAt: null },
          select: { id: true, status: true, priority: true, storyPoints: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    if (actor) {
      await this.projectAccessService.requireReadableProject(id, actor);
    }

    const tasks = Array.isArray(project.tasks) ? project.tasks : [];
    const sprints = Array.isArray(project.sprints) ? project.sprints : [];

    const totalTasks = tasks.length;
    const doneTasks = tasks.filter((t) => t.status === 'DONE').length;
    const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const todoTasks = tasks.filter((t) => t.status === 'TODO').length;
    const blockedTasks = tasks.filter((t) => t.status === 'BLOCKED').length;
    const percent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    const activeSprint = sprints.find((s) => s.status === 'ACTIVE') || null;

    return {
      ...project,
      tasks: undefined, // Không trả về toàn bộ mảng tasks thô ở findOne để nhẹ payload
      activeSprint,
      progress: {
        totalTasks,
        doneTasks,
        inProgressTasks,
        todoTasks,
        blockedTasks,
        percent,
      },
    };
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, actor: CurrentActor) {
    // Ensure project exists
    await this.findOne(id);
    // RBAC (M3.5): PM của project, DEPT_HEAD, hoặc Admin
    const isPM = await this.projectAccessService.isProjectPM(id, actor.id);
    const isDeptHead = actor.role === Role.DEPARTMENT_HEAD;
    if (actor.role !== Role.ADMIN && !isPM && !isDeptHead) {
      throw new ForbiddenException(
        'Chỉ PM của dự án, Trưởng phòng hoặc Admin mới có quyền sửa',
      );
    }
    return this.prisma.project.update({
      where: { id },
      data: {
        ...updateProjectDto,
        startDate: updateProjectDto.startDate ? new Date(updateProjectDto.startDate) : undefined,
        endDate: updateProjectDto.endDate ? new Date(updateProjectDto.endDate) : undefined,
      },
    });
  }

  async remove(id: string, actor: CurrentActor) {
    // Ensure project exists
    await this.findOne(id);
    // RBAC (M3.5): PM của project, DEPT_HEAD, hoặc Admin
    const isPM = await this.projectAccessService.isProjectPM(id, actor.id);
    const isDeptHead = actor.role === Role.DEPARTMENT_HEAD;
    if (actor.role !== Role.ADMIN && !isPM && !isDeptHead) {
      throw new ForbiddenException(
        'Chỉ PM của dự án, Trưởng phòng hoặc Admin mới có quyền xóa',
      );
    }
    return this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
