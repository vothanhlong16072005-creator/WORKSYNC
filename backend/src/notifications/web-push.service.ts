import { Injectable, Logger } from '@nestjs/common';
import webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service.js';

export interface WebPushPayload {
  title: string;
  body?: string | null;
  icon?: string | null;
  badge?: string | null;
  data?: Record<string, unknown> | null;
}

@Injectable()
export class WebPushService {
  private readonly logger = new Logger(WebPushService.name);
  private isConfigured = false;

  constructor(private readonly prisma: PrismaService) {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const email = process.env.VAPID_EMAIL || 'admin@worksync.com';

    if (publicKey && privateKey) {
      try {
        webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
        this.isConfigured = true;
        this.logger.log('Web Push initialized with VAPID details');
      } catch (err) {
        this.logger.error('Failed to configure VAPID details', err);
      }
    } else {
      this.logger.warn('VAPID keys not configured; Web Push notifications will be skipped');
    }
  }

  async sendToUser(userId: string, payload: WebPushPayload): Promise<void> {
    if (!this.isConfigured) return;

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId, isActive: true },
    });

    if (subscriptions.length === 0) return;

    const jsonPayload = JSON.stringify({
      title: payload.title,
      body: payload.body ?? undefined,
      icon: payload.icon ?? '/favicon.svg',
      badge: payload.badge ?? '/favicon.svg',
      data: payload.data ?? {},
    });

    const sendPromises = subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            },
          },
          jsonPayload,
        );

        await this.prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { lastUsedAt: new Date() },
        });
      } catch (err: unknown) {
        const error = err as { statusCode?: number; message?: string };
        this.logger.warn(`Push delivery failed for subscription ${sub.id}: ${error?.message}`);
        // If HTTP 410 Gone or 404 Not Found, mark subscription as inactive
        if (error?.statusCode === 410 || error?.statusCode === 404) {
          await this.prisma.pushSubscription.update({
            where: { id: sub.id },
            data: { isActive: false },
          });
        }
      }
    });

    await Promise.allSettled(sendPromises);
  }
}
