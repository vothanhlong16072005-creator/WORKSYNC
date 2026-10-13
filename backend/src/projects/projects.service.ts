import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ProjectKind, Role } from '@prisma/client';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProjectAccessService, type CurrentActor } from './project-access.service.js';

export interface ProjectSummary {
  id: string;
  name: string;
  kind: ProjectKind;
  color: string;
  openAssignedTaskCount: number;
}

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectAccessService: ProjectAccessService,
  ) {}

  async create(dto: CreateProjectDto, actor: CurrentActor) {
    // RBAC: only PM or Admin can create team project
    if (actor.role !== Role.PM && actor.role !== Role.ADMIN) {
      throw new ForbiddenException('Chỉ PM hoặc Admin mới có quyền tạo dự án');
    }

    return this.prisma.$transaction(async (tx) => {
      return tx.project.create({
        data: {
          name: dto.name,
          description: dto.description,
          color: dto.color ?? '#3B82F6',
          kind: ProjectKind.TEAM,
          startDate: dto.startDate ? new Date(dto.startDate) : null,
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          createdById: actor.id,
          members: {
            create: {
              userId: actor.id,
              projectRole: 'PM',
              joinedAt: new Date(),
            },
          },
        },
        include: { members: { include: { user: true } } },
      });
    });
  }

  async addMember(projectId: string, dto: { userId: string; projectRole?: string }, actor: CurrentActor) {
    const isPM = await this.projectAccessService.isProjectPM(projectId, actor.id);
    if (actor.role !== Role.ADMIN && !isPM) {
      throw new ForbiddenException('Chỉ PM của dự án hoặc Admin mới có quyền thêm thành viên');
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
    const isPM = await this.projectAccessService.isProjectPM(projectId, actor.id);
    if (actor.role !== Role.ADMIN && !isPM) {
      throw new ForbiddenException('Chỉ PM của dự án hoặc Admin mới có quyền xóa thành viên');
    }
    return this.prisma.projectMember.delete({
      where: { projectId_userId: { projectId, userId } },
    });
  }

  async changeMemberRole(projectId: string, userId: string, dto: { projectRole: string }, actor: CurrentActor) {
    const isPM = await this.projectAccessService.isProjectPM(projectId, actor.id);
    if (actor.role !== Role.ADMIN && !isPM) {
      throw new ForbiddenException('Chỉ PM của dự án hoặc Admin mới có quyền đổi role thành viên');
    }
    return this.prisma.projectMember.update({
      where: { projectId_userId: { projectId, userId } },
      data: { projectRole: dto.projectRole },
    });
  }

  async findMine(actor: CurrentActor): Promise<ProjectSummary[]> {
    const projects = await this.prisma.project.findMany({
      where: actor.role === Role.ADMIN
        ? {
            deletedAt: null,
            OR: [
              { kind: ProjectKind.TEAM },
              { kind: ProjectKind.PERSONAL, personalOwnerId: actor.id },
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
            ],
          },
      select: {
        id: true,
        name: true,
        kind: true,
        color: true,
        _count: {
          select: {
            tasks: {
              where: {
                assigneeId: actor.id,
                deletedAt: null,
                status: { not: 'DONE' },
              },
            },
          },
        },
      },
      orderBy: [{ kind: 'asc' }, { name: 'asc' }],
    });

    return projects.map((project) => ({
      id: project.id,
      name: project.name,
      kind: project.kind,
      color: project.color,
      openAssignedTaskCount: project._count.tasks,
    }));
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findFirst({
      where: { id, deletedAt: null },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return project;
  }

  async update(id: string, updateProjectDto: UpdateProjectDto, actor: CurrentActor) {
    // Ensure project exists
    await this.findOne(id);
    // RBAC: only PM of project or Admin
    const isPM = await this.projectAccessService.isProjectPM(id, actor.id);
    if (actor.role !== Role.ADMIN && !isPM) {
      throw new ForbiddenException('Chỉ PM của dự án hoặc Admin mới có quyền sửa');
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
    // RBAC: only PM of project or Admin
    const isPM = await this.projectAccessService.isProjectPM(id, actor.id);
    if (actor.role !== Role.ADMIN && !isPM) {
      throw new ForbiddenException('Chỉ PM của dự án hoặc Admin mới có quyền xóa');
    }
    return this.prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
