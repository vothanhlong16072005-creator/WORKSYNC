import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RequestStatus, Prisma, PrismaClient } from '@prisma/client';

export type PrismaOrTransactionClient =
  | PrismaService
  | PrismaClient
  | Prisma.TransactionClient;

export interface LeaveBalanceResult {
  total: number;
  used: number;
  remaining: number;
}

@Injectable()
export class LeaveBalanceService {
  public static readonly DEFAULT_ANNUAL_LEAVE = 12;

  constructor(private readonly prisma: PrismaService) {}

  async getBalance(
    userId: string,
    year = new Date().getFullYear(),
    client: PrismaOrTransactionClient = this.prisma,
  ): Promise<LeaveBalanceResult> {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    const used = await client.leaveRequest.aggregate({
      where: {
        userId,
        leaveType: 'ANNUAL',
        status: { in: [RequestStatus.APPROVED, RequestStatus.PENDING, RequestStatus.AUTO_APPROVED] },
        startDate: { gte: yearStart, lt: yearEnd },
      },
      _sum: { dayCount: true },
    });

    const usedDays = used._sum?.dayCount ?? 0;
    const total = LeaveBalanceService.DEFAULT_ANNUAL_LEAVE;
    const remaining = Math.max(0, total - usedDays);

    return {
      total,
      used: usedDays,
      remaining,
    };
  }

  async validateBalance(
    userId: string,
    dayCount: number,
    year = new Date().getFullYear(),
    client: PrismaOrTransactionClient = this.prisma,
  ): Promise<void> {
    if (dayCount <= 0) {
      throw new BadRequestException({
        code: 'INVALID_DAY_COUNT',
        message: 'Số ngày nghỉ phải lớn hơn 0 / Day count must be greater than 0',
      });
    }

    const balance = await this.getBalance(userId, year, client);
    if (balance.remaining < dayCount) {
      throw new BadRequestException({
        code: 'INSUFFICIENT_BALANCE',
        message: `Không đủ ngày phép. Còn lại: ${balance.remaining}, yêu cầu: ${dayCount} / Insufficient leave balance: ${balance.remaining} remaining vs ${dayCount} requested`,
      });
    }
  }
}
