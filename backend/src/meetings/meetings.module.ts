/**
 * Meetings Module — Module M5
 * Reference: PLAN-2026-10-17-M5-MEETINGS-V2.md
 * ⭐ M5.1: Added MeetingAiService
 */
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { MeetingsAccessService } from './meetings-access.service.js';
import { MeetingsController } from './meetings.controller.js';
import { MeetingsGateway } from './meetings.gateway.js';
import { MeetingsService } from './meetings.service.js';
import { MeetingAiService } from './meeting-ai.service.js';

import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [MeetingsController],
  providers: [MeetingsService, MeetingsAccessService, MeetingsGateway, MeetingAiService],
  exports: [MeetingsService, MeetingsAccessService, MeetingAiService],
})
export class MeetingsModule {}
