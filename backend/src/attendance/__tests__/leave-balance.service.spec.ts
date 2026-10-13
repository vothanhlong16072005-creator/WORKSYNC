import { describe, expect, it, vi, beforeEach } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { LeaveBalanceService } from '../leave-balance.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

describe('LeaveBalanceService', () => {
  let service: LeaveBalanceService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      leaveRequest: {
        aggregate: vi.fn(),
      },
    };
    service = new LeaveBalanceService(mockPrisma as PrismaService);
  });

  it('queries APPROVED, PENDING, and AUTO_APPROVED requests to prevent overbooking', async () => {
    mockPrisma.leaveRequest.aggregate.mockResolvedValue({
      _sum: { dayCount: 3 },
    });

    await service.getBalance('user-1');

    expect(mockPrisma.leaveRequest.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-1',
          leaveType: 'ANNUAL',
          status: { in: ['APPROVED', 'PENDING', 'AUTO_APPROVED'] },
        }),
      }),
    );
  });

  it('returns default 12 days when no leaves exist', async () => {
    mockPrisma.leaveRequest.aggregate.mockResolvedValue({
      _sum: { dayCount: null },
    });

    const balance = await service.getBalance('user-1');
    expect(balance).toEqual({
      total: 12,
      used: 0,
      remaining: 12,
    });
  });

  it('calculates remaining days accurately when some leaves are pending or approved', async () => {
    mockPrisma.leaveRequest.aggregate.mockResolvedValue({
      _sum: { dayCount: 4.5 },
    });

    const balance = await service.getBalance('user-1');
    expect(balance).toEqual({
      total: 12,
      used: 4.5,
      remaining: 7.5,
    });
  });

  it('handles fractional balance like remaining 0.5 days properly', async () => {
    mockPrisma.leaveRequest.aggregate.mockResolvedValue({
      _sum: { dayCount: 11.5 },
    });

    const balance = await service.getBalance('user-1');
    expect(balance.remaining).toBe(0.5);

    // Requesting 0.5 day should succeed
    await expect(service.validateBalance('user-1', 0.5)).resolves.not.toThrow();

    // Requesting 1 day should fail
    await expect(service.validateBalance('user-1', 1)).rejects.toThrow(BadRequestException);
  });

  it('clamps remaining to 0 if used exceeds total', async () => {
    mockPrisma.leaveRequest.aggregate.mockResolvedValue({
      _sum: { dayCount: 14 },
    });

    const balance = await service.getBalance('user-1');
    expect(balance.remaining).toBe(0);
  });

  it('throws BadRequestException if requested dayCount is <= 0', async () => {
    await expect(service.validateBalance('user-1', 0)).rejects.toThrow(BadRequestException);
    await expect(service.validateBalance('user-1', -1)).rejects.toThrow(BadRequestException);
  });
});
