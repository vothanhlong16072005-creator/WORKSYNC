import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationTriggersService } from './notification-triggers.service.js';

@Injectable()
export class NotificationsCronService {
  private readonly logger = new Logger(NotificationsCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly triggers: NotificationTriggersService,
  ) {}

  @Cron('*/5 * * * *')
  async checkMeetingReminders() {
    try {
      const now = new Date();
      const in60Min = new Date(now.getTime() + 60 * 60 * 1000);

      const meetings = await this.prisma.meeting.findMany({
        where: {
          status: 'SCHEDULED',
          rsvpReminderSentAt: null,
          startTime: {
            gte: now,
            lte: in60Min,
          },
          deletedAt: null,
        },
      });

      for (const meeting of meetings) {
        await this.triggers.meetingReminder1h(meeting.id);
        await this.prisma.meeting.update({
          where: { id: meeting.id },
          data: { rsvpReminderSentAt: new Date() },
        });
        this.logger.log(`Dispatched 1h reminder for meeting ${meeting.id} ("${meeting.title}")`);
      }
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(`Error in checkMeetingReminders: ${error.message}`);
    }
  }

  @Cron('*/15 * * * *')
  async checkTaskDeadlines() {
    try {
      const now = new Date();
      const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const tasks = await this.prisma.task.findMany({
        where: {
          status: { notIn: ['DONE'] },
          assigneeId: { not: null },
          dueDate: {
            gte: now,
            lte: in24h,
          },
          deletedAt: null,
        },
      });

      for (const task of tasks) {
        if (!task.dueDate || !task.assigneeId) continue;

        const hoursLeft = (task.dueDate.getTime() - now.getTime()) / (60 * 60 * 1000);

        if (hoursLeft <= 1 && !task.notified1h) {
          await this.triggers.taskDeadlineReminder(
            {
              id: task.id,
              title: task.title,
              projectId: task.projectId,
              assigneeId: task.assigneeId,
              hoursLeft,
            },
          );
          await this.prisma.task.update({
            where: { id: task.id },
            data: { notified1h: true, notified24h: true },
          });
        } else if (hoursLeft > 1 && hoursLeft <= 24 && !task.notified24h) {
          await this.triggers.taskDeadlineReminder(
            {
              id: task.id,
              title: task.title,
              projectId: task.projectId,
              assigneeId: task.assigneeId,
              hoursLeft,
            },
          );
          await this.prisma.task.update({
            where: { id: task.id },
            data: { notified24h: true },
          });
        }
      }
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.error(`Error in checkTaskDeadlines: ${error.message}`);
    }
  }
}
