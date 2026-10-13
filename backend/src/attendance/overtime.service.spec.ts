import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { OvertimeService } from './overtime.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function makePrisma(): PrismaService {
  return {
    overtimeRequest: {
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
const dateStr = tomorrow.toISOString().split('T')[0];

describe('OvertimeService.createRequest', () => {
  it('creates OT request with auto-calculated hours (18:00-21:00 = 3h)', async () => {
    const prisma = makePrisma();
    (prisma.overtimeRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.overtimeRequest.create as ReturnType<typeof vi.fn>).mockImplementation(({ data }) => {
      expect(data.registeredHours).toBe(3.0);
      return Promise.resolve({ id: 'ot-1', ...data });
    });
    const service = new OvertimeService(prisma);
    const result = await service.createRequest('u-1', {
      date: dateStr,
      registeredStart: `${dateStr}T18:00:00+07:00`,
      registeredEnd: `${dateStr}T21:00:00+07:00`,
      reason: 'Dự án gấp',
    });
    expect(result.registeredHours).toBe(3.0);
  });

  it('rejects if endTime <= startTime', async () => {
    const prisma = makePrisma();
    const service = new OvertimeService(prisma);
    await expect(
      service.createRequest('u-1', {
        date: dateStr,
        registeredStart: `${dateStr}T21:00:00.000Z`,
        registeredEnd: `${dateStr}T18:00:00.000Z`,
        reason: 'Test',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects if startTime < 17:30 (work end)', async () => {
    const prisma = makePrisma();
    const service = new OvertimeService(prisma);
    // Use 15:00 in Vietnam timezone (UTC+7) = 08:00 UTC, which is < 17:30 local
    await expect(
      service.createRequest('u-1', {
        date: dateStr,
        registeredStart: `${dateStr}T15:00:00+07:00`,
        registeredEnd: `${dateStr}T18:00:00+07:00`,
        reason: 'Test',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects if hours > 12 (overtime cap)', async () => {
    const prisma = makePrisma();
    const service = new OvertimeService(prisma);
    // 18:00 next day = 24h - too long
    await expect(
      service.createRequest('u-1', {
        date: dateStr,
        registeredStart: `${dateStr}T18:00:00+07:00`,
        registeredEnd: `${dateStr}T06:30:00+07:00`,
        reason: 'Test',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects duplicate request for same date', async () => {
    const prisma = makePrisma();
    (prisma.overtimeRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 'existing' });
    const service = new OvertimeService(prisma);
    await expect(
      service.createRequest('u-1', {
        date: dateStr,
        registeredStart: `${dateStr}T18:00:00+07:00`,
        registeredEnd: `${dateStr}T21:00:00+07:00`,
        reason: 'Test',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('OvertimeService.updateActualHours (CRITICAL HRM logic)', () => {
  it('returns null when no approved OT request exists', async () => {
    const prisma = makePrisma();
    (prisma.overtimeRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const service = new OvertimeService(prisma);
    const result = await service.updateActualHours('u-1', tomorrow, new Date());
    expect(result).toBeNull();
  });

  it('calculates actualHours = min(registered, checkOut - 17:30) - 1.5h case', async () => {
    const prisma = makePrisma();
    const approved = { id: 'ot-1', registeredHours: 3.0, status: 'APPROVED' };
    (prisma.overtimeRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(approved);
    (prisma.overtimeRequest.update as ReturnType<typeof vi.fn>).mockImplementation(({ data }) => {
      expect(data.actualHours).toBe(1.5);
      return Promise.resolve({ id: 'ot-1', actualHours: 1.5 });
    });
    const service = new OvertimeService(prisma);
    const checkOut = new Date(tomorrow);
    checkOut.setHours(19, 0, 0, 0);
    await service.updateActualHours('u-1', tomorrow, checkOut);
  });

  it('caps at registeredHours when actual exceeds registered (3h actual)', async () => {
    const prisma = makePrisma();
    const approved = { id: 'ot-1', registeredHours: 3.0, status: 'APPROVED' };
    (prisma.overtimeRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(approved);
    (prisma.overtimeRequest.update as ReturnType<typeof vi.fn>).mockImplementation(({ data }) => {
      expect(data.actualHours).toBe(3.0);
      return Promise.resolve({ id: 'ot-1', actualHours: 3.0 });
    });
    const service = new OvertimeService(prisma);
    const checkOut = new Date(tomorrow);
    checkOut.setHours(21, 0, 0, 0);
    await service.updateActualHours('u-1', tomorrow, checkOut);
  });
});
