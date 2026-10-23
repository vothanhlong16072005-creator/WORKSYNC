import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChatService } from '../chat.service.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('ChatService.sendCultureWish', () => {
  let service: ChatService;
  let mockPrisma: any;
  let mockGateway: any;
  let mockNotifications: any;

  beforeEach(() => {
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
      },
      conversation: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      conversationMember: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      chatMessage: {
        create: vi.fn(),
      },
    };

    mockGateway = {
      isUserOnline: vi.fn().mockReturnValue(true),
      emitToConversation: vi.fn(),
    };

    mockNotifications = {
      createNotification: vi.fn(),
    };

    service = new ChatService(mockPrisma, mockGateway as any, mockNotifications as any);
  });

  it('rejects sending wish to oneself', async () => {
    await expect(
      service.sendCultureWish(
        { id: 'u-1', name: 'User 1' },
        { targetUserId: 'u-1', eventType: 'BIRTHDAY', eventTitle: 'Sinh nhật tuần này' },
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('throws NotFoundException if target user does not exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.sendCultureWish(
        { id: 'u-1', name: 'User 1' },
        { targetUserId: 'u-nonexistent', eventType: 'BIRTHDAY', eventTitle: 'Sinh nhật tuần này' },
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('finds existing conversation and sends birthday template message', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'u-2',
      name: 'Nguyen Van Target',
    });

    vi.spyOn(service, 'getOrCreateDirectConversation').mockResolvedValue({
      id: 'conv-direct-1',
    } as any);

    vi.spyOn(service, 'sendMessage').mockResolvedValue({
      id: 'msg-1',
      content: 'Chuc mung sinh nhat',
    } as any);

    const result = await service.sendCultureWish(
      { id: 'u-1', name: 'User 1' },
      { targetUserId: 'u-2', eventType: 'BIRTHDAY', eventTitle: 'Sinh nhật tuần này' },
    );

    expect(result.success).toBe(true);
    expect(result.conversationId).toBe('conv-direct-1');
    expect(service.sendMessage).toHaveBeenCalledWith(
      'conv-direct-1',
      { id: 'u-1', name: 'User 1' },
      expect.objectContaining({
        content: expect.stringContaining('[CHÚC MỪNG SINH NHẬT]'),
        type: 'TEXT',
      }),
    );
  });
});
