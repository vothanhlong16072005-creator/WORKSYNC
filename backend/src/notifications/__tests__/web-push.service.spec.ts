import { describe, expect, it, vi, beforeEach } from 'vitest';
import { WebPushService } from '../web-push.service.js';
import webpush from 'web-push';

vi.mock('web-push', () => ({
  default: {
    setVapidDetails: vi.fn(),
    sendNotification: vi.fn(),
  },
}));

describe('WebPushService', () => {
  let service: WebPushService;
  let mockPrisma: any;

  beforeEach(() => {
    process.env.VAPID_PUBLIC_KEY = 'test-public-key';
    process.env.VAPID_PRIVATE_KEY = 'test-private-key';
    process.env.VAPID_EMAIL = 'admin@worksync.com';

    mockPrisma = {
      pushSubscription: {
        findMany: vi.fn(),
        update: vi.fn(),
      },
    };

    service = new WebPushService(mockPrisma as any);
  });

  it('should not send notification if user has no subscriptions', async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([]);

    await service.sendToUser('user-1', { title: 'Test' });

    expect(webpush.sendNotification).not.toHaveBeenCalled();
  });

  it('should send notification and update lastUsedAt for active subscriptions', async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([
      {
        id: 'sub-1',
        endpoint: 'https://push.example.com/1',
        p256dh: 'p256-key',
        auth: 'auth-key',
      },
    ]);
    (webpush.sendNotification as any).mockResolvedValue({});

    await service.sendToUser('user-1', {
      title: 'Hello',
      body: 'World',
    });

    expect(webpush.sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: 'https://push.example.com/1',
      }),
      expect.any(String),
    );
    expect(mockPrisma.pushSubscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-1' },
      data: { lastUsedAt: expect.any(Date) },
    });
  });

  it('should mark subscription inactive if push service returns 410 Gone', async () => {
    mockPrisma.pushSubscription.findMany.mockResolvedValue([
      {
        id: 'sub-expired',
        endpoint: 'https://push.example.com/expired',
        p256dh: 'p256-key',
        auth: 'auth-key',
      },
    ]);
    (webpush.sendNotification as any).mockRejectedValue({
      statusCode: 410,
      message: 'Subscription has expired',
    });

    await service.sendToUser('user-1', { title: 'Test' });

    expect(mockPrisma.pushSubscription.update).toHaveBeenCalledWith({
      where: { id: 'sub-expired' },
      data: { isActive: false },
    });
  });
});
