import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConversationType, ChatMessageType } from '@prisma/client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatService } from '../chat.service.js';
import type { ChatActor } from '../types/chat.types.js';

describe('ChatService', () => {
  let service: ChatService;
  let prismaMock: any;
  let chatGatewayMock: any;
  let notificationsServiceMock: any;

  const userA: ChatActor = {
    id: 'u-1',
    name: 'Nguyễn Văn A',
    email: 'a@example.com',
    role: 'EMPLOYEE',
    avatar: 'https://example.com/avatar-a.png',
  };

  const userB: ChatActor = {
    id: 'u-2',
    name: 'Trần Thị B',
    email: 'b@example.com',
    role: 'PM',
    avatar: 'https://example.com/avatar-b.png',
  };

  beforeEach(() => {
    prismaMock = {
      user: {
        findUnique: vi.fn(),
      },
      conversation: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      conversationMember: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
      },
      chatMessage: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      chatMessageReaction: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      project: {
        findUnique: vi.fn(),
      },
      department: {
        findUnique: vi.fn(),
      },
    };

    chatGatewayMock = {
      isUserOnline: vi.fn().mockReturnValue(true),
      emitNewMessage: vi.fn(),
      emitReactionUpdated: vi.fn(),
      emitMessageDeleted: vi.fn(),
      emitReadReceipt: vi.fn(),
    };

    notificationsServiceMock = {
      create: vi.fn().mockResolvedValue({ id: 'notif-1' }),
    };

    service = new ChatService(prismaMock, chatGatewayMock, notificationsServiceMock);
  });

  // =========================================================
  // 1. Direct Conversations
  // =========================================================
  describe('Direct Conversation', () => {
    it('1. Cannot create direct conversation with oneself', async () => {
      await expect(service.getOrCreateDirectConversation('u-1', 'u-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('2. Throws NotFoundException if target user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      await expect(service.getOrCreateDirectConversation('u-1', 'u-missing')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('3. Returns existing direct conversation if found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(userB);
      prismaMock.conversation.findFirst.mockResolvedValue({
        id: 'conv-123',
        type: ConversationType.DIRECT,
        members: [
          { userId: 'u-1', unreadCount: 0, user: userA },
          { userId: 'u-2', unreadCount: 2, user: userB },
        ],
      });

      const conv = await service.getOrCreateDirectConversation('u-1', 'u-2');
      expect(conv.id).toBe('conv-123');
      expect(conv.name).toBe('Trần Thị B');
      expect(conv.otherUser?.name).toBe('Trần Thị B');
    });

    it('4. Creates new direct conversation when not existing', async () => {
      prismaMock.user.findUnique.mockResolvedValue(userB);
      prismaMock.conversation.findFirst.mockResolvedValue(null);
      prismaMock.conversation.create.mockResolvedValue({
        id: 'conv-new',
        type: ConversationType.DIRECT,
        createdById: 'u-1',
        members: [
          { userId: 'u-1', unreadCount: 0, user: userA },
          { userId: 'u-2', unreadCount: 0, user: userB },
        ],
      });

      const conv = await service.getOrCreateDirectConversation('u-1', 'u-2');
      expect(conv.id).toBe('conv-new');
      expect(prismaMock.conversation.create).toHaveBeenCalled();
    });
  });

  // =========================================================
  // 2. Project & Department Group Conversations
  // =========================================================
  describe('Project & Department Conversations', () => {
    it('5. Throws NotFoundException if project does not exist', async () => {
      prismaMock.project.findUnique.mockResolvedValue(null);
      await expect(service.getOrCreateProjectConversation('p-none', 'u-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('6. Creates project conversation with members and welcome message', async () => {
      prismaMock.project.findUnique.mockResolvedValue({
        id: 'p-1',
        name: 'WorkSync Core',
        createdById: 'u-1',
        pmId: 'u-2',
        members: [{ userId: 'u-3' }],
      });
      prismaMock.conversation.findFirst.mockResolvedValue(null);
      prismaMock.conversation.create.mockResolvedValue({
        id: 'conv-proj',
        type: ConversationType.PROJECT,
        name: 'Dự án: WorkSync Core',
        projectId: 'p-1',
        members: [
          { userId: 'u-1', user: userA },
          { userId: 'u-2', user: userB },
        ],
      });

      const conv = await service.getOrCreateProjectConversation('p-1', 'u-1');
      expect(conv.id).toBe('conv-proj');
      expect(prismaMock.conversation.create).toHaveBeenCalled();
    });

    it('7. Creates department conversation for all department users', async () => {
      prismaMock.department.findUnique.mockResolvedValue({
        id: 'dept-eng',
        name: 'Kỹ Thuật Công Nghệ',
        users: [{ id: 'u-1' }, { id: 'u-2' }],
      });
      prismaMock.conversation.findFirst.mockResolvedValue(null);
      prismaMock.conversation.create.mockResolvedValue({
        id: 'conv-dept',
        type: ConversationType.DEPARTMENT,
        name: 'Phòng ban: Kỹ Thuật Công Nghệ',
        members: [
          { userId: 'u-1', user: userA },
          { userId: 'u-2', user: userB },
        ],
      });

      const conv = await service.getOrCreateDepartmentConversation('dept-eng', 'u-1');
      expect(conv.id).toBe('conv-dept');
      expect(prismaMock.conversation.create).toHaveBeenCalled();
    });
  });

  // =========================================================
  // 3. User Conversations List & IDOR Protection
  // =========================================================
  describe('Conversation List & IDOR', () => {
    it('8. Retrieves user conversations with sorting and unreadCount', async () => {
      prismaMock.conversationMember.findMany.mockResolvedValue([
        {
          unreadCount: 3,
          isPinned: true,
          conversation: {
            id: 'c-1',
            type: ConversationType.DIRECT,
            lastMessageText: 'Chào bạn',
            lastMessageAt: new Date(),
            members: [
              { userId: 'u-1', user: userA },
              { userId: 'u-2', user: userB },
            ],
          },
        },
      ]);

      const list = await service.getUserConversations('u-1', { type: 'ALL' });
      expect(list).toHaveLength(1);
      expect(list[0].unreadCount).toBe(3);
      expect(list[0].isPinned).toBe(true);
      expect(list[0].otherUser?.name).toBe('Trần Thị B');
    });

    it('9. Throws ForbiddenException if non-member accesses conversation', async () => {
      prismaMock.conversation.findUnique.mockResolvedValue({
        id: 'c-secret',
        deletedAt: null,
        members: [{ userId: 'u-2' }],
      });

      await expect(service.getConversationById('c-secret', 'u-1')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // =========================================================
  // 4. Messages & Realtime Emits
  // =========================================================
  describe('Messages & Realtime Delivery', () => {
    it('10. Throws ForbiddenException when non-member tries to get messages', async () => {
      prismaMock.conversationMember.findUnique.mockResolvedValue(null);
      await expect(
        service.getMessages('c-1', 'u-intruder', { limit: 50 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('11. Sends message, updates conversation, increments unread, and emits socket event', async () => {
      prismaMock.conversationMember.findUnique.mockResolvedValue({
        conversationId: 'c-1',
        userId: 'u-1',
      });
      const createdAt = new Date();
      prismaMock.chatMessage.create.mockResolvedValue({
        id: 'msg-1',
        conversationId: 'c-1',
        senderId: 'u-1',
        content: 'Báo cáo tiến độ hôm nay',
        type: ChatMessageType.TEXT,
        createdAt,
        sender: userA,
        reactions: [],
      });
      prismaMock.conversation.update.mockResolvedValue({});
      prismaMock.conversationMember.updateMany.mockResolvedValue({});
      prismaMock.conversationMember.findMany.mockResolvedValue([
        { userId: 'u-1', isMuted: false },
        { userId: 'u-2', isMuted: false },
      ]);
      chatGatewayMock.isUserOnline.mockReturnValue(false); // u-2 is offline

      const result = await service.sendMessage('c-1', userA, {
        content: 'Báo cáo tiến độ hôm nay',
        type: ChatMessageType.TEXT,
      });

      expect(result.id).toBe('msg-1');
      expect(prismaMock.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'c-1' },
          data: expect.objectContaining({
            lastMessageText: 'Báo cáo tiến độ hôm nay',
          }),
        }),
      );
      expect(prismaMock.conversationMember.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { unreadCount: { increment: 1 } },
        }),
      );
      expect(chatGatewayMock.emitNewMessage).toHaveBeenCalledWith(
        'c-1',
        expect.objectContaining({ id: 'msg-1' }),
        ['u-1', 'u-2'],
      );
      // u-2 offline => receives notification
      expect(notificationsServiceMock.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u-2',
          title: 'Tin nhắn từ Nguyễn Văn A',
        }),
      );
    });

    it('12. Marks conversation as read and emits read receipt', async () => {
      prismaMock.conversationMember.updateMany.mockResolvedValue({ count: 1 });

      const res = await service.markAsRead('c-1', 'u-1');
      expect(res.success).toBe(true);
      expect(prismaMock.conversationMember.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { conversationId: 'c-1', userId: 'u-1' },
          data: expect.objectContaining({ unreadCount: 0 }),
        }),
      );
      expect(chatGatewayMock.emitReadReceipt).toHaveBeenCalledWith('c-1', 'u-1', expect.any(Date));
    });

    it('13. Toggles pin status on conversation', async () => {
      prismaMock.conversationMember.findUnique.mockResolvedValue({
        id: 'cm-1',
        isPinned: false,
      });
      prismaMock.conversationMember.update.mockResolvedValue({ isPinned: true });

      const res = await service.togglePin('c-1', 'u-1');
      expect(res.isPinned).toBe(true);
    });

    it('14. Toggles mute status on conversation', async () => {
      prismaMock.conversationMember.findUnique.mockResolvedValue({
        id: 'cm-1',
        isMuted: false,
      });
      prismaMock.conversationMember.update.mockResolvedValue({ isMuted: true });

      const res = await service.toggleMute('c-1', 'u-1');
      expect(res.isMuted).toBe(true);
    });

    it('15. Toggles reaction on message (add if missing, remove if present)', async () => {
      prismaMock.chatMessage.findUnique.mockResolvedValue({
        id: 'msg-1',
        conversationId: 'c-1',
        deletedAt: null,
      });
      prismaMock.conversationMember.findUnique.mockResolvedValue({
        conversationId: 'c-1',
        userId: 'u-1',
      });
      prismaMock.chatMessageReaction.findUnique.mockResolvedValue(null);
      prismaMock.chatMessageReaction.create.mockResolvedValue({
        id: 'rx-1',
        emoji: '👍',
        userId: 'u-1',
      });
      prismaMock.chatMessageReaction.findMany.mockResolvedValue([
        { id: 'rx-1', emoji: '👍', userId: 'u-1', user: userA },
      ]);

      const res = await service.toggleReaction('msg-1', 'u-1', '👍');
      expect(res.reactionsGrouped['👍']).toContain('u-1');
      expect(chatGatewayMock.emitReactionUpdated).toHaveBeenCalledWith(
        'c-1',
        'msg-1',
        expect.any(Array),
      );
    });

    it('16. Soft-deletes message when sender requests, throws Forbidden for other user', async () => {
      prismaMock.chatMessage.findUnique.mockResolvedValue({
        id: 'msg-1',
        conversationId: 'c-1',
        senderId: 'u-2',
        deletedAt: null,
      });

      // User A (not sender, role EMPLOYEE) -> forbidden
      await expect(service.deleteMessage('msg-1', userA)).rejects.toThrow(ForbiddenException);

      // User B (sender) -> success
      prismaMock.chatMessage.update.mockResolvedValue({});
      const res = await service.deleteMessage('msg-1', userB);
      expect(res.success).toBe(true);
      expect(chatGatewayMock.emitMessageDeleted).toHaveBeenCalledWith('c-1', 'msg-1');
    });
  });
});
