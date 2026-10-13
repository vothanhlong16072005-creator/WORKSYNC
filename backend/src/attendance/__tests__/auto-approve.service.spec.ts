import { describe, expect, it, vi, beforeEach } from 'vitest';
import { AutoApproveService } from '../auto-approve.service.js';
import type { PrismaService } from '../../prisma/prisma.service.js';

describe('AutoApproveService', () => {
  let service: AutoApproveService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      systemConfig: {
        findFirst: vi.fn().mockResolvedValue({
          wfhAutoApproveTime: '09:30',
          timezone: 'Asia/Ho_Chi_Minh',
        }),
      },
      wfhRequest: {
        updateMany: vi.fn().mockResolvedValue({ count: 3 }),
      },
    };
    service = new AutoApproveService(mockPrisma as PrismaService);
  });

  it('correctly evaluates Asia/Ho_Chi_Minh timezone when server runs in UTC: 02:15 UTC is 09:15 VN (before 09:30)', async () => {
    // 02:15 UTC is 09:15 in Asia/Ho_Chi_Minh (UTC+7)
    const earlyUtc = new Date('2026-10-15T02:15:00.000Z');

    const result = await service.autoApprovePending(earlyUtc);

    expect(result).toEqual({ approved: 0 });
    expect(mockPrisma.wfhRequest.updateMany).not.toHaveBeenCalled();
  });

  it('approves pending requests when Asia/Ho_Chi_Minh time is past 09:30: 02:45 UTC is 09:45 VN', async () => {
    // 02:45 UTC is 09:45 in Asia/Ho_Chi_Minh (UTC+7)
    const pastCutoffUtc = new Date('2026-10-15T02:45:00.000Z');

    const result = await service.autoApprovePending(pastCutoffUtc);

    expect(result).toEqual({ approved: 3 });
    expect(mockPrisma.wfhRequest.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'PENDING',
        }),
        data: expect.objectContaining({
          status: 'AUTO_APPROVED',
        }),
      }),
    );
  });

  it('handles null system config safely', async () => {
    mockPrisma.systemConfig.findFirst.mockResolvedValue(null);

    const result = await service.autoApprovePending();
    expect(result).toEqual({ approved: 0 });
  });
});
