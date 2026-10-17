import { Module } from '@nestjs/common';
import { QuickTaskController } from './quick-tasks.controller.js';
import { QuickTaskService } from './quick-tasks.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { UsersModule } from '../users/users.module.js';

import { NotificationsModule } from '../notifications/notifications.module.js';

@Module({
  imports: [PrismaModule, UsersModule, NotificationsModule],
  controllers: [QuickTaskController],
  providers: [QuickTaskService],
  exports: [QuickTaskService],
})
export class QuickTaskModule {}
