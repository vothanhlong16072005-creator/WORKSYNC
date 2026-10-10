import { describe, expect, it, vi } from 'vitest';
import { UsersService } from './users.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { Prisma, User } from '@prisma/client';

const user: User = {
  id: 'user-1',
  email: 'member@worksync.test',
  passwordHash: 'hash',
  name: 'Member One',
  avatar: null,
  role: 'EMPLOYEE',
  status: 'ACTIVE',
  position: null,
  language: 'VI',
  departmentId: null,
  createdAt: new Date('2026-10-10T00:00:00.000Z'),
  updatedAt: new Date('2026-10-10T00:00:00.000Z'),
  deletedAt: null,
};

describe('UsersService.createWithPersonalProject', () => {
  it('creates one private project in the same transaction as a new user', async () => {
    const transaction = {
      user: { create: vi.fn().mockResolvedValue(user) },
      project: { create: vi.fn().mockResolvedValue({ id: 'personal-user-1' }) },
    };
    const prisma = {
      $transaction: vi.fn(async (callback: (client: typeof transaction) => Promise<User>) => callback(transaction)),
    } as unknown as PrismaService;
    const service = new UsersService(prisma);
    const input: Prisma.UserCreateInput = {
      email: user.email,
      name: user.name,
      passwordHash: user.passwordHash,
    };

    const created = await service.createWithPersonalProject(input);

    expect(created).toEqual(user);
    expect(transaction.project.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Việc cá nhân',
        createdById: user.id,
        personalOwnerId: user.id,
        kind: 'PERSONAL',
      }),
    });
  });
});
