import { describe, expect, it, vi } from 'vitest';
import { ExportService } from './export.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function createPrismaMock(records: unknown[]): PrismaService {
  return {
    attendanceRecord: {
      findMany: vi.fn().mockResolvedValue(records),
    },
  } as unknown as PrismaService;
}

describe('ExportService', () => {
  describe('generateExcel', () => {
    it('returns a non-empty Buffer for empty records', async () => {
      const prisma = createPrismaMock([]);
      const service = new ExportService(prisma);

      const buffer = await service.generateExcel({});
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('queries attendance records with filter', async () => {
      const prisma = createPrismaMock([]);
      const service = new ExportService(prisma);

      await service.generateExcel({
        userId: 'u-1',
        fromDate: '2026-10-01',
        toDate: '2026-10-14',
      });

      expect(prisma.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'u-1',
            date: expect.objectContaining({
              gte: new Date('2026-10-01T00:00:00.000Z'),
              lte: new Date('2026-10-14T23:59:59.999Z'),
            }),
          }),
        }),
      );
    });

    it('includes user info when includeUserInfo is true', async () => {
      const records = [
        {
          id: 'r-1',
          userId: 'u-1',
          date: new Date('2026-10-14T00:00:00.000Z'),
          checkInTime: new Date('2026-10-14T01:30:00.000Z'),
          checkOutTime: new Date('2026-10-14T10:00:00.000Z'),
          status: 'ON_TIME',
          checkInMethod: 'GPS',
          checkInIp: '1.2.3.4',
          note: null,
          user: { name: 'Alice', email: 'alice@fpt.com' },
        },
      ];
      const prisma = createPrismaMock(records);
      const service = new ExportService(prisma);

      const buffer = await service.generateExcel({ includeUserInfo: true });
      expect(buffer.length).toBeGreaterThan(0);
      expect(prisma.attendanceRecord.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({ user: expect.any(Object) }),
        }),
      );
    });
  });

  describe('generatePDF', () => {
    it('returns a non-empty PDF Buffer', async () => {
      const prisma = createPrismaMock([]);
      const service = new ExportService(prisma);

      const buffer = await service.generatePDF({});
      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      // PDF magic bytes
      const header = buffer.slice(0, 4).toString('ascii');
      expect(header).toBe('%PDF');
    });

    it('includes custom company name in header', async () => {
      const prisma = createPrismaMock([]);
      const service = new ExportService(prisma);

      const buffer = await service.generatePDF({}, 'FPT Software');
      const text = buffer.toString('latin1');
      expect(text).toContain('FPT Software');
    });

    it('uses different table columns when includeUserInfo is true', async () => {
      const records = [
        {
          id: 'r-1',
          userId: 'u-1',
          date: new Date('2026-10-14T00:00:00.000Z'),
          checkInTime: new Date('2026-10-14T01:30:00.000Z'),
          checkOutTime: new Date('2026-10-14T10:00:00.000Z'),
          status: 'ON_TIME',
          checkInMethod: 'GPS',
          checkInIp: null,
          note: null,
          user: { name: 'Bob', email: 'bob@fpt.com' },
        },
      ];
      const prisma = createPrismaMock(records);
      const service = new ExportService(prisma);

      const buffer = await service.generatePDF({ includeUserInfo: true });
      expect(buffer.length).toBeGreaterThan(0);
    });
  });
});
