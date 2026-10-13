import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { BreakType } from '@prisma/client';

const MAX_BREAK_MINUTES = 4 * 60; // 4 hours

@Injectable()
export class BreakService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Start a manual break (ra ngoài giữa giờ)
   * - Only one open break at a time
   */
  async startBreak(userId: string, reason: string | undefined, now = new Date()) {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // Check for existing open break
    const open = await this.prisma.breakLog.findFirst({
      where: { userId, date: today, endTime: null },
    });
    if (open) {
      throw new BadRequestException('Bạn đang trong giờ nghỉ. Hãy kết thúc trước khi bắt đầu mới / You have an open break. Please end it first');
    }

    return this.prisma.breakLog.create({
      data: {
        userId,
        date: today,
        startTime: now,
        reason: reason ?? null,
        type: BreakType.MANUAL,
      },
    });
  }

  /**
   * End an open break
   */
  async endBreak(userId: string, now = new Date()) {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    const open = await this.prisma.breakLog.findFirst({
      where: { userId, date: today, endTime: null },
    });
    if (!open) {
      throw new NotFoundException('No open break found for today');
    }

    const durationMs = now.getTime() - new Date(open.startTime).getTime();
    const durationMinutes = Math.floor(durationMs / 60000);

    if (durationMinutes > MAX_BREAK_MINUTES) {
      throw new BadRequestException(`Break duration exceeds maximum (${MAX_BREAK_MINUTES / 60}h)`);
    }

    return this.prisma.breakLog.update({
      where: { id: open.id },
      data: {
        endTime: now,
        duration: durationMinutes,
      },
    });
  }

  /**
   * Get all breaks for today
   */
  async getTodayBreaks(userId: string, now = new Date()) {
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    return this.prisma.breakLog.findMany({
      where: { userId, date: today },
      orderBy: { startTime: 'asc' },
    });
  }

  /**
   * Auto-close any open breaks at end of day (cron job, 17:30)
   */
  async autoCloseOpenBreaks(userId: string, closeTime: Date) {
    const today = new Date(closeTime);
    today.setHours(0, 0, 0, 0);

    const openBreaks = await this.prisma.breakLog.findMany({
      where: { userId, date: today, endTime: null },
    });

    const results = [];
    for (const open of openBreaks) {
      const duration = Math.floor((closeTime.getTime() - new Date(open.startTime).getTime()) / 60000);
      const updated = await this.prisma.breakLog.update({
        where: { id: open.id },
        data: { endTime: closeTime, duration },
      });
      results.push(updated);
    }
    return results;
  }
}
