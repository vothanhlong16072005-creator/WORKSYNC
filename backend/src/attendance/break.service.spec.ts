import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BreakService } from './break.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function makePrisma(): PrismaService {
  return {
    breakLog: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  } as unknown as PrismaService;
}

const today = new Date();
today.setHours(0, 0, 0, 0);
const now = new Date();
const past = new Date(now.getTime() - 30 * 60000); // 30 min ago

describe('BreakService.startBreak', () => {
  it('creates a new break when no open break exists', async () => {
    const prisma = makePrisma();
    (prisma.breakLog.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.breakLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'br-1', type: 'MANUAL' });
    const service = new BreakService(prisma);
    const result = await service.startBreak('u-1', 'Đi mua đồ', now);
    expect(result.id).toBe('br-1');
  });

  it('rejects if an open break already exists', async () => {
    const prisma = makePrisma();
    (prisma.breakLog.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'br-open' });
    const service = new BreakService(prisma);
    await expect(service.startBreak('u-1', 'Test', now)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('BreakService.endBreak', () => {
  it('ends open break and calculates duration (30 min)', async () => {
    const prisma = makePrisma();
    (prisma.breakLog.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'br-1',
      startTime: past,
      endTime: null,
    });
    (prisma.breakLog.update as ReturnType<typeof vi.fn>).mockImplementation(({ data }) => {
      expect(data.duration).toBe(30);
      return Promise.resolve({ id: 'br-1', ...data });
    });
    const service = new BreakService(prisma);
    const result = await service.endBreak('u-1', now);
    expect(result.duration).toBe(30);
  });

  it('throws NotFound when no open break', async () => {
    const prisma = makePrisma();
    (prisma.breakLog.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const service = new BreakService(prisma);
    await expect(service.endBreak('u-1', now)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects if duration > 4 hours', async () => {
    const prisma = makePrisma();
    const fiveHoursAgo = new Date(now.getTime() - 5 * 60 * 60000);
    (prisma.breakLog.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 'br-1',
      startTime: fiveHoursAgo,
      endTime: null,
    });
    const service = new BreakService(prisma);
    await expect(service.endBreak('u-1', now)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('BreakService.getTodayBreaks', () => {
  it('returns today breaks ordered by startTime', async () => {
    const prisma = makePrisma();
    (prisma.breakLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: 'br-1', startTime: past },
      { id: 'br-2', startTime: now },
    ]);
    const service = new BreakService(prisma);
    const result = await service.getTodayBreaks('u-1', now);
    expect(result).toHaveLength(2);
  });
});

describe('BreakService.autoCloseOpenBreaks', () => {
  it('closes all open breaks at given time', async () => {
    const prisma = makePrisma();
    const openBreaks = [
      { id: 'br-1', startTime: past },
      { id: 'br-2', startTime: now },
    ];
    (prisma.breakLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(openBreaks);
    (prisma.breakLog.update as ReturnType<typeof vi.fn>).mockImplementation(({ where, data }) => {
      return Promise.resolve({ ...where, ...data });
    });
    const service = new BreakService(prisma);
    const results = await service.autoCloseOpenBreaks('u-1', now);
    expect(results).toHaveLength(2);
  });

  it('returns empty array when no open breaks', async () => {
    const prisma = makePrisma();
    (prisma.breakLog.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    const service = new BreakService(prisma);
    const results = await service.autoCloseOpenBreaks('u-1', now);
    expect(results).toHaveLength(0);
  });
});
