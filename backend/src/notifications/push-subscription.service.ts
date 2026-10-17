import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { SubscribePushDto } from './dto/subscribe-push.dto.js';

@Injectable()
export class PushSubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async subscribe(userId: string, dto: SubscribePushDto) {
    return this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent ?? null,
        isActive: true,
      },
      update: {
        userId,
        p256dh: dto.keys.p256dh,
        auth: dto.keys.auth,
        userAgent: dto.userAgent ?? null,
        isActive: true,
        updatedAt: new Date(),
      },
    });
  }

  async unsubscribe(userId: string, endpoint: string) {
    return this.prisma.pushSubscription.deleteMany({
      where: {
        userId,
        endpoint,
      },
    });
  }

  async getActiveSubscriptions(userId: string) {
    return this.prisma.pushSubscription.findMany({
      where: {
        userId,
        isActive: true,
      },
    });
  }
}
