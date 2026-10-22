import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { DailyReportsService } from './daily-reports.service.js';
import { DailyReportsDraftService } from './daily-reports.draft.service.js';
import { DailyReportsController } from './daily-reports.controller.js';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [DailyReportsController],
  providers: [DailyReportsService, DailyReportsDraftService],
  exports: [DailyReportsService, DailyReportsDraftService],
})
export class DailyReportsModule {}
