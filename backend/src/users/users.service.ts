import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { Prisma, ProjectKind, User } from '@prisma/client';

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

  async updateProfile(userId: string, data: { name?: string; avatar?: string | null }): Promise<User> {
    return this.prisma.user.update({
      where: { id: userId },
      data,
    });
  }
}
