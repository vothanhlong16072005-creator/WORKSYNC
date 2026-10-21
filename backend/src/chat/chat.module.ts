import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module.js';
import { NotificationsModule } from '../notifications/notifications.module.js';
import { ChatController } from './chat.controller.js';
import { ChatFilesController } from './chat-files.controller.js';
import { ChatService } from './chat.service.js';
import { ChatGateway } from './chat.gateway.js';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'super_secret_jwt_key_worksync',
    }),
  ],
  controllers: [ChatController, ChatFilesController],
  providers: [ChatService, ChatGateway],
  exports: [ChatService, ChatGateway],
})
export class ChatModule {}
