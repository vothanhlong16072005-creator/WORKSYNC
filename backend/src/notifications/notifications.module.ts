import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from '../prisma/prisma.module.js';
import { NotificationsController } from './notifications.controller.js';
import { NotificationsService } from './notifications.service.js';
import { NotificationsGateway } from './notifications.gateway.js';
import { WebPushService } from './web-push.service.js';
import { PushSubscriptionService } from './push-subscription.service.js';
import { NotificationTriggersService } from './notification-triggers.service.js';
import { NotificationsCronService } from './notifications.cron.js';

@Module({
  imports: [
    PrismaModule,
    ScheduleModule.forRoot(),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super_secret_jwt_key_worksync',
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsGateway,
    WebPushService,
    PushSubscriptionService,
    NotificationTriggersService,
    NotificationsCronService,
  ],
  exports: [
    NotificationsService,
    NotificationTriggersService,
    WebPushService,
    NotificationsGateway,
  ],
})
export class NotificationsModule {}
