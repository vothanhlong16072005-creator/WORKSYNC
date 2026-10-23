import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma, ProjectKind, Role, User } from '@prisma/client';

export interface DepartmentUserSummary {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  position: string | null;
  role: Role;
  departmentId: string | null;
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async create(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.user.create({
      data,
    });
  }

  async createWithPersonalProject(data: Prisma.UserCreateInput): Promise<User> {
    return this.prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({ data });

      await transaction.project.create({
        data: {
          name: 'Việc cá nhân',
          kind: ProjectKind.PERSONAL,
          createdById: user.id,
          personalOwnerId: user.id,
          color: '#4D7FC2',
        },
      });

      return user;
    });
  }

  async updateProfile(
    userId: string,
    data: { name?: string; avatar?: string | null; position?: string | null; language?: any },
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }

  /**
   * M3.5: Lấy danh sách user theo phòng ban (dùng cho DEPT_HEAD chọn người nhận Quick Task).
   * - Admin/HR: tất cả users active
   * - DEPT_HEAD: chỉ users cùng department
   * - PM: members của projects mình PM
   */
  async findByDepartmentOrMine(actor: {
    id: string;
    role: Role;
    departmentId: string | null;
  }): Promise<DepartmentUserSummary[]> {
    let where: Prisma.UserWhereInput = { status: 'ACTIVE', deletedAt: null };

    if (actor.role === Role.DEPARTMENT_HEAD) {
      let deptId = actor.departmentId;
      if (!deptId && typeof this.prisma.user.findUnique === 'function') {
        const u = await this.prisma.user.findUnique({
          where: { id: actor.id },
          select: { departmentId: true },
        });
        deptId = u?.departmentId ?? null;
      }
      if (!deptId) return [];
      where = { ...where, departmentId: deptId };
    } else if (actor.role === Role.PM) {
      const projects = await this.prisma.project.findMany({
        where: { pmId: actor.id, deletedAt: null },
        select: { members: { select: { userId: true } } },
      });
      const memberIds = new Set<string>();
      projects.forEach((p) => p.members.forEach((m) => memberIds.add(m.userId)));
      memberIds.add(actor.id);
      where = { ...where, id: { in: Array.from(memberIds) } };
    }
    // Admin/HR: không filter thêm

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        position: true,
        role: true,
        departmentId: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async findAllActive(): Promise<DepartmentUserSummary[]> {
    return this.prisma.user.findMany({
      where: { status: 'ACTIVE', deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        position: true,
        role: true,
        departmentId: true,
      },
      orderBy: { name: 'asc' },
    });
  }
}
