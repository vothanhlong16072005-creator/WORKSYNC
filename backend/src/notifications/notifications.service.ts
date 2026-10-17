import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsGateway } from './notifications.gateway.js';
import { WebPushService } from './web-push.service.js';
import type { CreateNotificationDto } from './dto/create-notification.dto.js';
import type { ListNotificationsDto } from './dto/list-notifications.dto.js';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationsGateway,
    private readonly webPush: WebPushService,
  ) {}

  async create(dto: CreateNotificationDto) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: dto.userId,
        type: dto.type,
        category: dto.category,
        title: dto.title,
        body: dto.body ?? null,
        data: (dto.data as Prisma.InputJsonValue) ?? Prisma.JsonNull,
        icon: dto.icon ?? null,
        actorId: dto.actorId ?? null,
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    // 1. Emit real-time notification to online sockets
    this.gateway.emitNewNotification(notification);

    // 2. Update real-time unread count
    const unreadCount = await this.prisma.notification.count({
      where: {
        userId: dto.userId,
        isRead: false,
        deletedAt: null,
      },
    });
    this.gateway.emitUnreadCount(dto.userId, unreadCount);

    // 3. Send Web Push
    try {
      await this.webPush.sendToUser(dto.userId, {
        title: notification.title,
        body: notification.body,
        icon: notification.icon ?? '/favicon.svg',
        data: (notification.data as Record<string, unknown>) ?? {},
      });
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.warn(`Web push dispatch failed: ${error.message}`);
    }

    return notification;
  }

  async findAll(userId: string, query: ListNotificationsDto) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {
      userId,
      deletedAt: null,
    };

    if (query.isRead !== undefined) {
      where.isRead = query.isRead;
    }

    if (query.type) {
      where.type = query.type;
    }

    if (query.category) {
      where.category = query.category;
    }

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              avatar: true,
              role: true,
            },
          },
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async getUnreadCount(userId: string) {
    const unreadCount = await this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
        deletedAt: null,
      },
    });

    return { unreadCount };
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.deletedAt) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('You do not have permission to modify this notification');
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            avatar: true,
            role: true,
          },
        },
      },
    });

    const unreadCount = await this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
        deletedAt: null,
      },
    });
    this.gateway.emitUnreadCount(userId, unreadCount);

    return updated;
  }

  async markAllAsRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
        deletedAt: null,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    this.gateway.emitUnreadCount(userId, 0);

    return { success: true };
  }

  async deleteAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: true,
        deletedAt: null,
      },
      data: {
        deletedAt: new Date(),
      },
    });

    return { success: true };
  }

  async delete(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.deletedAt) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException('You do not have permission to delete this notification');
    }

    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { deletedAt: new Date() },
    });

    const unreadCount = await this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
        deletedAt: null,
      },
    });
    this.gateway.emitUnreadCount(userId, unreadCount);

    return { success: true };
  }
}
