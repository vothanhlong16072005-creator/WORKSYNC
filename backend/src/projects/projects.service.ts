import { Injectable, NotFoundException } from '@nestjs/common';
import { ProjectKind, Role } from '@prisma/client';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CurrentActor } from './project-access.service.js';

export interface ProjectSummary {
  id: string;
  name: string;
  kind: ProjectKind;
  color: string;
  openAssignedTaskCount: number;
}

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  create(createProjectDto: CreateProjectDto) {
    return 'This action adds a new project';
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

  update(id: string, updateProjectDto: UpdateProjectDto) {
    return `This action updates a #${id} project`;
  }

  remove(id: string) {
    return `This action removes a #${id} project`;
  }
}
