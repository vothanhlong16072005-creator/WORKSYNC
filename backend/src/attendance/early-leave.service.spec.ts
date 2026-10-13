import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { EarlyLeaveService } from './early-leave.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function makePrisma(): PrismaService {
  return {
    earlyLeaveRequest: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  } as unknown as PrismaService;
}

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(0, 0, 0, 0);
const tomorrowStr = tomorrow.toISOString().split('T')[0];

const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
yesterday.setHours(0, 0, 0, 0);
const yesterdayStr = yesterday.toISOString().split('T')[0];

describe('EarlyLeaveService.createRequest', () => {
  it('creates request with valid input', async () => {
    const prisma = makePrisma();
    (prisma.earlyLeaveRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.earlyLeaveRequest.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'el-1',
      userId: 'u-1',
      date: tomorrow,
      expectedLeaveTime: new Date(`${tomorrowStr}T16:00:00+07:00`),
      reason: 'Việc gia đình',
      status: 'PENDING',
    });
    const service = new EarlyLeaveService(prisma);
    const result = await service.createRequest('u-1', {
      date: tomorrowStr,
      expectedLeaveTime: `${tomorrowStr}T16:00:00+07:00`,
      reason: 'Việc gia đình',
    });
    expect(result.id).toBe('el-1');
    expect(result.status).toBe('PENDING');
  });

  it('rejects request for past date', async () => {
    const prisma = makePrisma();
    const service = new EarlyLeaveService(prisma);
    await expect(
      service.createRequest('u-1', {
        date: yesterdayStr,
        expectedLeaveTime: `${yesterdayStr}T16:00:00+07:00`,
        reason: 'Test',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects if expectedLeaveTime >= 17:30', async () => {
    const prisma = makePrisma();
    const service = new EarlyLeaveService(prisma);
    await expect(
      service.createRequest('u-1', {
        date: tomorrowStr,
        expectedLeaveTime: `${tomorrowStr}T18:00:00+07:00`,
        reason: 'Test',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate request for same date', async () => {
    const prisma = makePrisma();
    (prisma.earlyLeaveRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'existing' });
    const service = new EarlyLeaveService(prisma);
    await expect(
      service.createRequest('u-1', {
        date: tomorrowStr,
        expectedLeaveTime: `${tomorrowStr}T16:00:00+07:00`,
        reason: 'Test',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('EarlyLeaveService.getMyRequests / getPendingRequests', () => {
  it('getMyRequests returns user requests', async () => {
    const prisma = makePrisma();
    (prisma.earlyLeaveRequest.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 'el-1' }]);
    const service = new EarlyLeaveService(prisma);
    const result = await service.getMyRequests('u-1');
    expect(result).toHaveLength(1);
  });

  it('getPendingRequests returns pending requests with user', async () => {
    const prisma = makePrisma();
    (prisma.earlyLeaveRequest.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: 'el-1' }]);
    const service = new EarlyLeaveService(prisma);
    const result = await service.getPendingRequests();
    expect(result).toHaveLength(1);
  });
});

describe('EarlyLeaveService.approve / reject', () => {
  it('approves pending request', async () => {
    const prisma = makePrisma();
    (prisma.earlyLeaveRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'el-1', status: 'PENDING' });
    (prisma.earlyLeaveRequest.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'el-1', status: 'APPROVED' });
    const service = new EarlyLeaveService(prisma);
    const result = await service.approve('el-1', 'admin-1');
    expect(result.status).toBe('APPROVED');
  });

  it('rejects with reason appends note to existing reason', async () => {
    const prisma = makePrisma();
    (prisma.earlyLeaveRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'el-1', status: 'PENDING', reason: 'Gia đình' });
    (prisma.earlyLeaveRequest.update as ReturnType<typeof vi.fn>).mockImplementation(({ data }) => {
      expect(data.reason).toContain('REJECTED');
      return Promise.resolve({ id: 'el-1', ...data });
    });
    const service = new EarlyLeaveService(prisma);
    const result = await service.reject('el-1', 'admin-1', { rejectionNote: 'Không hợp lý' });
    expect(result.reason).toContain('Không hợp lý');
  });

  it('throws when request not found', async () => {
    const prisma = makePrisma();
    (prisma.earlyLeaveRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const service = new EarlyLeaveService(prisma);
    await expect(service.approve('missing', 'admin-1')).rejects.toThrow();
  });

  it('throws when request already reviewed', async () => {
    const prisma = makePrisma();
    (prisma.earlyLeaveRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'el-1', status: 'APPROVED' });
    const service = new EarlyLeaveService(prisma);
    await expect(service.approve('el-1', 'admin-1')).rejects.toBeInstanceOf(BadRequestException);
  });
});
