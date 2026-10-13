import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { RequestStatus } from '@prisma/client';

@Injectable()
export class AutoApproveService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Automatically approve pending WFH requests if the cutoff time has passed in the configured timezone.
   */
  async autoApprovePending(now: Date = new Date()): Promise<{ approved: number }> {
    const config = await this.prisma.systemConfig.findFirst();
    if (!config || !config.wfhAutoApproveTime) {
      return { approved: 0 };
    }

    const timezone = config.timezone || 'Asia/Ho_Chi_Minh';

    // Parse target cutoff HH:MM
    const [hoursStr, minutesStr] = config.wfhAutoApproveTime.split(':');
    const targetHours = parseInt(hoursStr, 10) || 9;
    const targetMinutes = parseInt(minutesStr, 10) || 30;
    const targetTotalMinutes = targetHours * 60 + targetMinutes;

    // Get current HH:MM in configured timezone
    let currentHour = now.getHours();
    let currentMin = now.getMinutes();

    try {
      const timeFmt = new Intl.DateTimeFormat('en-GB', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      const [hStr, mStr] = timeFmt.format(now).split(':');
      currentHour = parseInt(hStr, 10);
      currentMin = parseInt(mStr, 10);
    } catch {
      // Fallback if timezone invalid
    }

    const currentTotalMinutes = currentHour * 60 + currentMin;

    if (currentTotalMinutes < targetTotalMinutes) {
      return { approved: 0 };
    }

    // Get date string (YYYY-MM-DD) in configured timezone
    let todayStr: string;
    try {
      const dateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: timezone });
      todayStr = dateFmt.format(now);
    } catch {
      todayStr = now.toISOString().split('T')[0];
    }
    const todayEnd = new Date(`${todayStr}T23:59:59.999Z`);

    const result = await this.prisma.wfhRequest.updateMany({
      where: {
        status: RequestStatus.PENDING,
        date: { lte: todayEnd },
      },
      data: {
        status: RequestStatus.AUTO_APPROVED,
        reviewedAt: new Date(),
      },
    });

    return { approved: result.count };
  }
}
