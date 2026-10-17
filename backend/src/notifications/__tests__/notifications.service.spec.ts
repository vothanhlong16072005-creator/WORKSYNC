import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { NotificationsService } from '../notifications.service.js';
import { NotificationType } from '@prisma/client';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockPrisma: any;
  let mockGateway: any;
  let mockWebPush: any;

  beforeEach(() => {
    mockPrisma = {
      notification: {
        create: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
      },
    };

    mockGateway = {
      emitNewNotification: vi.fn(),
      emitUnreadCount: vi.fn(),
      isUserOnline: vi.fn().mockReturnValue(true),
    };

    mockWebPush = {
      sendToUser: vi.fn().mockResolvedValue(undefined),
    };

    service = new NotificationsService(
      mockPrisma as any,
      mockGateway as any,
      mockWebPush as any,
    );
  });

  describe('create', () => {
    it('should create notification, emit socket, and send web push', async () => {
      const mockCreated = {
        id: 'notif-1',
        userId: 'user-1',
        type: NotificationType.MEETING,
        category: 'meeting.created',
        title: 'Meeting test',
        body: 'Details',
        data: { url: '/meetings/1' },
        actor: { id: 'pm-1', name: 'PM' },
      };

      mockPrisma.notification.create.mockResolvedValue(mockCreated);
      mockPrisma.notification.count.mockResolvedValue(3);

      const result = await service.create({
        userId: 'user-1',
        type: NotificationType.MEETING,
        category: 'meeting.created',
        title: 'Meeting test',
        body: 'Details',
        data: { url: '/meetings/1' },
        actorId: 'pm-1',
      });

      expect(mockPrisma.notification.create).toHaveBeenCalled();
      expect(mockGateway.emitNewNotification).toHaveBeenCalledWith(mockCreated);
      expect(mockGateway.emitUnreadCount).toHaveBeenCalledWith('user-1', 3);
      expect(mockWebPush.sendToUser).toHaveBeenCalled();
      expect(result).toEqual(mockCreated);
    });
  });

  describe('findAll', () => {
    it('should paginate and filter notifications', async () => {
      mockPrisma.notification.findMany.mockResolvedValue([
        { id: 'notif-1', title: 'N1' },
      ]);
      mockPrisma.notification.count.mockResolvedValue(1);

      const result = await service.findAll('user-1', {
        page: 1,
        limit: 20,
        isRead: false,
        type: NotificationType.TASK,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count for user', async () => {
      mockPrisma.notification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('user-1');
      expect(result.unreadCount).toBe(5);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read and emit count', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        userId: 'user-1',
        deletedAt: null,
      });
      mockPrisma.notification.update.mockResolvedValue({
        id: 'notif-1',
        isRead: true,
      });
      mockPrisma.notification.count.mockResolvedValue(2);

      const result = await service.markAsRead('user-1', 'notif-1');
      expect(result.isRead).toBe(true);
      expect(mockGateway.emitUnreadCount).toHaveBeenCalledWith('user-1', 2);
    });

    it('should throw ForbiddenException if user is not owner (IDOR protection)', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        userId: 'other-user',
        deletedAt: null,
      });

      await expect(service.markAsRead('user-1', 'notif-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException if notification does not exist', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue(null);

      await expect(service.markAsRead('user-1', 'notif-999')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read and reset count to 0', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 4 });

      const result = await service.markAllAsRead('user-1');
      expect(result.success).toBe(true);
      expect(mockGateway.emitUnreadCount).toHaveBeenCalledWith('user-1', 0);
    });
  });

  describe('deleteAllRead', () => {
    it('should soft delete all read notifications', async () => {
      mockPrisma.notification.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.deleteAllRead('user-1');
      expect(result.success).toBe(true);
      expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          isRead: true,
          deletedAt: null,
        },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
        }),
      });
    });
  });

  describe('delete', () => {
    it('should soft delete single notification and emit updated count', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        userId: 'user-1',
        deletedAt: null,
      });
      mockPrisma.notification.update.mockResolvedValue({ id: 'notif-1' });
      mockPrisma.notification.count.mockResolvedValue(1);

      const result = await service.delete('user-1', 'notif-1');
      expect(result.success).toBe(true);
      expect(mockGateway.emitUnreadCount).toHaveBeenCalledWith('user-1', 1);
    });

    it('should throw ForbiddenException on delete if not owner', async () => {
      mockPrisma.notification.findUnique.mockResolvedValue({
        id: 'notif-1',
        userId: 'other-user',
        deletedAt: null,
      });

      await expect(service.delete('user-1', 'notif-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
