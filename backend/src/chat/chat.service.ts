import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ChatGateway } from './chat.gateway.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { NotificationType, ConversationType, ChatMessageType, ProjectKind } from '@prisma/client';
import {
  SendMessageDto,
  CreateGroupConversationDto,
  UpdateConversationSettingsDto,
  ChatMessagesQueryDto,
  ConversationsQueryDto,
  ChatActor,
} from './types/chat.types.js';
import { SendCultureWishDto } from './dto/send-culture-wish.dto.js';
import * as fs from 'fs';
import * as path from 'path';

export interface ExpressUploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer?: Buffer;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly uploadDir = path.resolve(process.cwd(), 'uploads', 'chat');

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatGateway: ChatGateway,
    private readonly notificationsService: NotificationsService,
  ) {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Tự động đồng bộ các nhóm chat dự án cho user
   * Đảm bảo mọi dự án TEAM mà user tham gia đều có nhóm chat tương ứng
   */
  async syncUserProjectConversations(userId: string): Promise<void> {
    if (typeof this.prisma.project?.findMany !== 'function') return;

    try {
      const userProjects = await this.prisma.project.findMany({
        where: {
          deletedAt: null,
          kind: ProjectKind.TEAM,
          OR: [
            { createdById: userId },
            { pmId: userId },
            { members: { some: { userId } } },
          ],
        },
        include: {
          members: { select: { userId: true } },
        },
      });

      if (!userProjects || userProjects.length === 0) return;

      const projectIds = userProjects.map((p) => p.id);
      const existingConvs = await this.prisma.conversation.findMany({
        where: {
          type: ConversationType.PROJECT,
          projectId: { in: projectIds },
          deletedAt: null,
        },
        include: {
          members: { select: { userId: true } },
        },
      });

      const existingConvMap = new Map(existingConvs.map((c) => [c.projectId!, c]));

      for (const project of userProjects) {
        const allMemberIds = Array.from(
          new Set([
            ...project.members.map((m) => m.userId),
            project.createdById,
            ...(project.pmId ? [project.pmId] : []),
          ]),
        ).filter((id): id is string => Boolean(id));

        const existing = existingConvMap.get(project.id);
        if (!existing) {
          if (typeof this.prisma.conversation?.create === 'function') {
            await this.prisma.conversation.create({
              data: {
                type: ConversationType.PROJECT,
                name: `Dự án: ${project.name}`,
                projectId: project.id,
                createdById: project.createdById || userId,
                members: {
                  create: allMemberIds.map((mId) => ({
                    userId: mId,
                    unreadCount: 0,
                  })),
                },
                messages: {
                  create: {
                    senderId: project.createdById || userId,
                    type: ChatMessageType.SYSTEM,
                    content: `Nhóm trò chuyện cho dự án "${project.name}" đã được khởi tạo.`,
                  },
                },
              },
            });
          }
        } else {
          const existingMemberIds = new Set(existing.members.map((m) => m.userId));
          const missingMemberIds = allMemberIds.filter((id) => !existingMemberIds.has(id));
          if (missingMemberIds.length > 0 && typeof this.prisma.conversationMember?.createMany === 'function') {
            await this.prisma.conversationMember.createMany({
              data: missingMemberIds.map((mId) => ({
                conversationId: existing.id,
                userId: mId,
                unreadCount: 0,
              })),
              skipDuplicates: true,
            });
          }
        }
      }
    } catch (err) {
      this.logger.error(`Error syncing project conversations for user ${userId}:`, err);
    }
  }

  /**
   * Lấy danh sách cuộc trò chuyện của người dùng kèm thông tin đối phương và trạng thái unread
   */
  async getUserConversations(userId: string, query: ConversationsQueryDto) {
    // Tự động đồng bộ các nhóm chat của các dự án mà user đang tham gia
    await this.syncUserProjectConversations(userId);

    const memberships = await this.prisma.conversationMember.findMany({
      where: {
        userId,
        leftAt: null,
        conversation: {
          deletedAt: null,
          ...(query.type === 'DIRECT'
            ? { type: ConversationType.DIRECT }
            : query.type === 'GROUP'
            ? { type: { in: [ConversationType.PROJECT, ConversationType.DEPARTMENT] } }
            : {}),
        },
      },
      include: {
        conversation: {
          include: {
            members: {
              where: { leftAt: null },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                    role: true,
                    position: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const result = memberships.map((membership) => {
      const conv = membership.conversation;
      let displayName = conv.name;
      let displayAvatar = conv.avatarUrl;
      let otherUser: { id: string; name: string; avatar: string | null; role: string; position: string | null } | null = null;
      let isOnline = false;

      if (conv.type === ConversationType.DIRECT) {
        const otherMember = conv.members.find((m) => m.userId !== userId);
        if (otherMember) {
          otherUser = otherMember.user;
          displayName = otherMember.user.name;
          displayAvatar = otherMember.user.avatar;
          isOnline = this.chatGateway.isUserOnline(otherMember.userId);
        } else {
          displayName = 'Người dùng ẩn danh';
        }
      }

      return {
        id: conv.id,
        type: conv.type,
        name: displayName,
        avatarUrl: displayAvatar,
        projectId: conv.projectId,
        departmentId: conv.departmentId,
        createdById: conv.createdById,
        lastMessageText: conv.lastMessageText,
        lastMessageAt: conv.lastMessageAt,
        lastSenderId: conv.lastSenderId,
        lastSenderName: conv.lastSenderName,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        unreadCount: membership.unreadCount,
        lastReadAt: membership.lastReadAt,
        isPinned: membership.isPinned,
        isMuted: membership.isMuted,
        participantCount: conv.members.length,
        participantIds: conv.members.map((m) => m.userId),
        otherUser,
        isOnline,
      };
    });

    // Lọc theo search nếu có
    let filtered = result;
    if (query.search?.trim()) {
      const keyword = query.search.trim().toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name?.toLowerCase().includes(keyword) ||
          c.lastMessageText?.toLowerCase().includes(keyword),
      );
    }

    // Sắp xếp: Ghim lên đầu -> Tin nhắn mới nhất -> Ngày tạo
    filtered.sort((a, b) => {
      if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
      const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : new Date(a.createdAt).getTime();
      const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

    return filtered;
  }

  /**
   * Tạo hoặc lấy cuộc trò chuyện trực tiếp 1-1
   */
  async getOrCreateDirectConversation(userId: string, targetUserId: string) {
    if (userId === targetUserId) {
      throw new BadRequestException('Không thể tạo cuộc trò chuyện với chính mình');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, avatar: true, role: true, position: true },
    });
    if (!targetUser) {
      throw new NotFoundException('Người dùng đích không tồn tại');
    }

    // Tìm xem đã có Direct Conversation giữa 2 user này chưa
    const existing = await this.prisma.conversation.findFirst({
      where: {
        type: ConversationType.DIRECT,
        deletedAt: null,
        AND: [
          { members: { some: { userId } } },
          { members: { some: { userId: targetUserId } } },
        ],
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatar: true, role: true, position: true } },
          },
        },
      },
    });

    if (existing) {
      return this.formatConversation(existing, userId);
    }

    // Tạo mới Direct Conversation
    const created = await this.prisma.conversation.create({
      data: {
        type: ConversationType.DIRECT,
        createdById: userId,
        members: {
          create: [
            { userId, unreadCount: 0 },
            { userId: targetUserId, unreadCount: 0 },
          ],
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatar: true, role: true, position: true } },
          },
        },
      },
    });

    return this.formatConversation(created, userId);
  }

  /**
   * Tạo hoặc lấy phòng chat nhóm theo Dự án
   */
  async getOrCreateProjectConversation(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: { select: { userId: true } },
      },
    });
    if (!project || project.deletedAt) {
      throw new NotFoundException('Dự án không tồn tại');
    }

    let conv = await this.prisma.conversation.findFirst({
      where: {
        type: ConversationType.PROJECT,
        projectId,
        deletedAt: null,
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatar: true, role: true, position: true } },
          },
        },
      },
    });

    const projectMemberIds = Array.from(new Set([
      ...project.members.map((m) => m.userId),
      project.createdById,
      ...(project.pmId ? [project.pmId] : []),
    ]));

    if (!conv) {
      conv = await this.prisma.conversation.create({
        data: {
          type: ConversationType.PROJECT,
          name: `Dự án: ${project.name}`,
          projectId,
          createdById: userId,
          members: {
            create: projectMemberIds.map((mId) => ({
              userId: mId,
              unreadCount: 0,
            })),
          },
          messages: {
            create: {
              senderId: userId,
              type: ChatMessageType.SYSTEM,
              content: `Nhóm trò chuyện cho dự án "${project.name}" đã được khởi tạo.`,
            },
          },
        },
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, avatar: true, role: true, position: true } },
            },
          },
        },
      });
    } else {
      // Đảm bảo các thành viên mới của dự án được thêm vào conversation
      const currentMemberIds = new Set(conv.members.map((m) => m.userId));
      const missingIds = projectMemberIds.filter((id) => !currentMemberIds.has(id));
      if (missingIds.length > 0) {
        await this.prisma.conversationMember.createMany({
          data: missingIds.map((mId) => ({
            conversationId: conv!.id,
            userId: mId,
            unreadCount: 0,
          })),
          skipDuplicates: true,
        });

        conv = await this.prisma.conversation.findUniqueOrThrow({
          where: { id: conv.id },
          include: {
            members: {
              include: {
                user: { select: { id: true, name: true, avatar: true, role: true, position: true } },
              },
            },
          },
        });
      }
    }

    return this.formatConversation(conv, userId);
  }

  /**
   * Tạo hoặc lấy phòng chat nhóm theo Phòng ban
   */
  async getOrCreateDepartmentConversation(departmentId: string, userId: string) {
    const department = await this.prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        users: { select: { id: true } },
      },
    });
    if (!department || department.deletedAt) {
      throw new NotFoundException('Phòng ban không tồn tại');
    }

    let conv = await this.prisma.conversation.findFirst({
      where: {
        type: ConversationType.DEPARTMENT,
        departmentId,
        deletedAt: null,
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatar: true, role: true, position: true } },
          },
        },
      },
    });

    const deptMemberIds = department.users.map((u) => u.id);

    if (!conv) {
      conv = await this.prisma.conversation.create({
        data: {
          type: ConversationType.DEPARTMENT,
          name: `Phòng ban: ${department.name}`,
          departmentId,
          createdById: userId,
          members: {
            create: deptMemberIds.map((mId) => ({
              userId: mId,
              unreadCount: 0,
            })),
          },
          messages: {
            create: {
              senderId: userId,
              type: ChatMessageType.SYSTEM,
              content: `Nhóm trò chuyện phòng ban "${department.name}" đã được khởi tạo.`,
            },
          },
        },
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, avatar: true, role: true, position: true } },
            },
          },
        },
      });
    }

    return this.formatConversation(conv, userId);
  }

  /**
   * Tạo nhóm trò chuyện tùy chỉnh
   */
  async createGroupConversation(userId: string, dto: CreateGroupConversationDto) {
    const allMemberIds = Array.from(new Set([userId, ...dto.memberIds]));

    const conv = await this.prisma.conversation.create({
      data: {
        type: ConversationType.PROJECT,
        name: dto.name,
        createdById: userId,
        members: {
          create: allMemberIds.map((mId) => ({
            userId: mId,
            unreadCount: 0,
          })),
        },
        messages: {
          create: {
            senderId: userId,
            type: ChatMessageType.SYSTEM,
            content: `Nhóm trò chuyện "${dto.name}" đã được tạo.`,
          },
        },
      },
      include: {
        members: {
          include: {
            user: { select: { id: true, name: true, avatar: true, role: true, position: true } },
          },
        },
      },
    });

    return this.formatConversation(conv, userId);
  }

  /**
   * Lấy chi tiết cuộc trò chuyện và kiểm tra quyền truy cập (IDOR Guard)
   */
  async getConversationById(conversationId: string, userId: string) {
    const conv = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: {
          where: { leftAt: null },
          include: {
            user: { select: { id: true, name: true, avatar: true, role: true, position: true } },
          },
        },
      },
    });

    if (!conv || conv.deletedAt) {
      throw new NotFoundException('Cuộc trò chuyện không tồn tại');
    }

    const isMember = conv.members.some((m) => m.userId === userId);
    if (!isMember) {
      throw new ForbiddenException('Bạn không có quyền truy cập cuộc trò chuyện này');
    }

    return this.formatConversation(conv, userId);
  }

  /**
   * Lấy danh sách tin nhắn theo cursor pagination
   */
  async getMessages(conversationId: string, userId: string, query: ChatMessagesQueryDto) {
    // Check membership
    await this.ensureMembership(conversationId, userId);

    const limit = query.limit || 50;

    const messages = await this.prisma.chatMessage.findMany({
      where: {
        conversationId,
        deletedAt: null,
      },
      take: limit + 1,
      ...(query.cursor
        ? {
            cursor: { id: query.cursor },
            skip: 1,
          }
        : {}),
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true, role: true },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            type: true,
            fileName: true,
            sender: { select: { id: true, name: true } },
          },
        },
        reactions: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? items[items.length - 1].id : null;

    // Format reactions theo dạng nhóm emoji: { [emoji]: string[] userIds }
    const formattedItems = items.reverse().map((msg) => {
      const reactionsGrouped: Record<string, string[]> = {};
      for (const r of msg.reactions) {
        if (!reactionsGrouped[r.emoji]) reactionsGrouped[r.emoji] = [];
        reactionsGrouped[r.emoji].push(r.userId);
      }
      return {
        ...msg,
        reactionsGrouped,
      };
    });

    return {
      messages: formattedItems,
      nextCursor,
      hasMore,
    };
  }

  /**
   * Gửi tin nhắn mới
   */
  async sendMessage(conversationId: string, sender: ChatActor, dto: SendMessageDto) {
    const member = await this.ensureMembership(conversationId, sender.id);

    const message = await this.prisma.chatMessage.create({
      data: {
        conversationId,
        senderId: sender.id,
        type: dto.type || ChatMessageType.TEXT,
        content: dto.content,
        replyToId: dto.replyToId || null,
        fileUrl: dto.fileUrl || null,
        fileName: dto.fileName || null,
        fileSize: dto.fileSize || null,
        fileMime: dto.fileMime || null,
      },
      include: {
        sender: {
          select: { id: true, name: true, avatar: true, role: true },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            type: true,
            fileName: true,
            sender: { select: { id: true, name: true } },
          },
        },
        reactions: {
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    const previewText =
      dto.type === ChatMessageType.FILE
        ? `[Tệp] ${dto.fileName || 'Tệp đính kèm'}`
        : dto.content;

    // Resolve sender's display name defensively
    let senderName = sender.name;
    if (!senderName) {
      const userRecord = await this.prisma.user.findUnique({
        where: { id: sender.id },
        select: { name: true },
      });
      senderName = userRecord?.name || 'Đồng nghiệp';
    }

    // Cập nhật Conversation
    await this.prisma.conversation.update({
      where: { id: conversationId },
      data: {
        lastMessageText: previewText,
        lastMessageAt: message.createdAt,
        lastSenderId: sender.id,
        lastSenderName: senderName,
      },
    });

    // Tăng unreadCount cho các thành viên khác
    await this.prisma.conversationMember.updateMany({
      where: {
        conversationId,
        userId: { not: sender.id },
      },
      data: {
        unreadCount: { increment: 1 },
      },
    });

    // Lấy tất cả thành viên để emit socket và trigger notification
    const members = await this.prisma.conversationMember.findMany({
      where: { conversationId, leftAt: null },
      select: { userId: true, isMuted: true },
    });

    const participantIds = members.map((m) => m.userId);

    // Phát sự kiện realtime qua Socket.IO
    this.chatGateway.emitNewMessage(
      conversationId,
      { ...message, reactionsGrouped: {} },
      participantIds,
    );

    // Gửi in-app/push notification cho các thành viên offline hoặc chưa mute
    for (const m of members) {
      if (m.userId === sender.id || m.isMuted) continue;

      const isOnline = this.chatGateway.isUserOnline(m.userId);
      if (!isOnline) {
        try {
          await this.notificationsService.create({
            userId: m.userId,
            type: NotificationType.CHAT,
            category: 'chat.message',
            title: `Tin nhắn từ ${senderName}`,
            body: previewText.length > 80 ? `${previewText.slice(0, 77)}...` : previewText,
            data: {
              conversationId,
              messageId: message.id,
              url: `/chat/${conversationId}`,
            },
            actorId: sender.id,
          });
        } catch (err: unknown) {
          const error = err as Error;
          this.logger.warn(`Failed to send chat notification to ${m.userId}: ${error.message}`);
        }
      }
    }

    return { ...message, reactionsGrouped: {} };
  }

  /**
   * Lưu tệp tin đính kèm
   */
  async uploadFile(userId: string, file: ExpressUploadedFile) {
    const safeFilename = `${Date.now()}-${userId.slice(0, 6)}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const targetPath = path.join(this.uploadDir, safeFilename);

    if (file.buffer) {
      fs.writeFileSync(targetPath, file.buffer);
    }

    return {
      fileUrl: `/api/chat/files/${safeFilename}`,
      fileName: file.originalname,
      fileSize: file.size,
      fileMime: file.mimetype,
    };
  }

  /**
   * Đánh dấu đã đọc toàn bộ tin nhắn trong cuộc trò chuyện
   */
  async markAsRead(conversationId: string, userId: string) {
    const now = new Date();
    await this.prisma.conversationMember.updateMany({
      where: { conversationId, userId },
      data: {
        unreadCount: 0,
        lastReadAt: now,
      },
    });

    this.chatGateway.emitReadReceipt(conversationId, userId, now);
    return { success: true };
  }

  /**
   * Ghim / Bỏ ghim cuộc trò chuyện
   */
  async togglePin(conversationId: string, userId: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });
    if (!member) throw new NotFoundException('Không tìm thấy thành viên');

    const updated = await this.prisma.conversationMember.update({
      where: { id: member.id },
      data: { isPinned: !member.isPinned },
    });

    return { isPinned: updated.isPinned };
  }

  /**
   * Bật / Tắt thông báo cuộc trò chuyện
   */
  async toggleMute(conversationId: string, userId: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });
    if (!member) throw new NotFoundException('Không tìm thấy thành viên');

    const updated = await this.prisma.conversationMember.update({
      where: { id: member.id },
      data: { isMuted: !member.isMuted },
    });

    return { isMuted: updated.isMuted };
  }

  /**
   * Thả cảm xúc emoji cho tin nhắn
   */
  async toggleReaction(messageId: string, userId: string, emoji: string) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });
    if (!message || message.deletedAt) {
      throw new NotFoundException('Tin nhắn không tồn tại');
    }

    await this.ensureMembership(message.conversationId, userId);

    const existing = await this.prisma.chatMessageReaction.findUnique({
      where: {
        messageId_userId_emoji: {
          messageId,
          userId,
          emoji,
        },
      },
    });

    if (existing) {
      await this.prisma.chatMessageReaction.delete({
        where: { id: existing.id },
      });
    } else {
      await this.prisma.chatMessageReaction.create({
        data: {
          messageId,
          userId,
          emoji,
        },
      });
    }

    // Lấy lại danh sách reactions mới
    const reactions = await this.prisma.chatMessageReaction.findMany({
      where: { messageId },
      include: {
        user: { select: { id: true, name: true } },
      },
    });

    const reactionsGrouped: Record<string, string[]> = {};
    for (const r of reactions) {
      if (!reactionsGrouped[r.emoji]) reactionsGrouped[r.emoji] = [];
      reactionsGrouped[r.emoji].push(r.userId);
    }

    this.chatGateway.emitReactionUpdated(message.conversationId, messageId, reactions);

    return { reactions, reactionsGrouped };
  }

  /**
   * Xóa tin nhắn (chỉ người gửi hoặc Admin mới có quyền)
   */
  async deleteMessage(messageId: string, actor: ChatActor) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id: messageId },
    });
    if (!message || message.deletedAt) {
      throw new NotFoundException('Tin nhắn không tồn tại');
    }

    if (message.senderId !== actor.id && actor.role !== 'ADMIN') {
      throw new ForbiddenException('Bạn không có quyền xóa tin nhắn này');
    }

    await this.prisma.chatMessage.update({
      where: { id: messageId },
      data: { deletedAt: new Date() },
    });

    this.chatGateway.emitMessageDeleted(message.conversationId, messageId);

    return { success: true };
  }

  /**
   * Đường dẫn file đính kèm
   */
  getFilePath(filename: string): string {
    const safeFilename = path.basename(filename);
    const targetPath = path.join(this.uploadDir, safeFilename);
    if (!fs.existsSync(targetPath)) {
      throw new NotFoundException('Tệp tin không tồn tại');
    }
    return targetPath;
  }

  // Helper
  private async ensureMembership(conversationId: string, userId: string) {
    const member = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: { conversationId, userId },
      },
    });
    if (!member || member.leftAt) {
      throw new ForbiddenException('Bạn không phải là thành viên của cuộc trò chuyện này');
    }
    return member;
  }

  private formatConversation(conv: any, currentUserId: string) {
    let displayName = conv.name;
    let displayAvatar = conv.avatarUrl;
    let otherUser = null;
    let isOnline = false;

    if (conv.type === ConversationType.DIRECT) {
      const otherMember = conv.members.find((m: any) => m.userId !== currentUserId);
      if (otherMember) {
        otherUser = otherMember.user;
        displayName = otherMember.user.name;
        displayAvatar = otherMember.user.avatar;
        isOnline = this.chatGateway.isUserOnline(otherMember.userId);
      }
    }

    const currentMember = conv.members.find((m: any) => m.userId === currentUserId);

    return {
      id: conv.id,
      type: conv.type,
      name: displayName,
      avatarUrl: displayAvatar,
      projectId: conv.projectId,
      departmentId: conv.departmentId,
      createdById: conv.createdById,
      lastMessageText: conv.lastMessageText,
      lastMessageAt: conv.lastMessageAt,
      lastSenderId: conv.lastSenderId,
      lastSenderName: conv.lastSenderName,
      createdAt: conv.createdAt,
      updatedAt: conv.updatedAt,
      unreadCount: currentMember?.unreadCount || 0,
      lastReadAt: currentMember?.lastReadAt || null,
      isPinned: currentMember?.isPinned || false,
      isMuted: currentMember?.isMuted || false,
      participantCount: conv.members.length,
      members: conv.members.map((m: any) => ({
        userId: m.userId,
        name: m.user?.name,
        avatar: m.user?.avatar,
        role: m.user?.role,
        position: m.user?.position,
        isOnline: this.chatGateway.isUserOnline(m.userId),
      })),
      otherUser,
      isOnline,
    };
  }

  /**
   * Tự động gửi tin nhắn mẫu chúc mừng Sinh nhật / Kỷ niệm cống hiến qua Direct Conversation 1-1
   */
  async sendCultureWish(sender: ChatActor, dto: SendCultureWishDto) {
    if (sender.id === dto.targetUserId) {
      throw new BadRequestException('Không thể gửi thiệp chúc mừng cho chính mình');
    }

    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.targetUserId, deletedAt: null },
      select: { id: true, name: true },
    });
    if (!targetUser) {
      throw new NotFoundException('Nhân sự nhận lời chúc không tồn tại');
    }

    // 1. Lấy hoặc tạo cuộc trò chuyện 1-1
    const conv = await this.getOrCreateDirectConversation(sender.id, dto.targetUserId);

    // 2. Soạn nội dung chúc mừng trang trọng, chuẩn mực văn hóa doanh nghiệp
    let messageContent = dto.customMessage;
    if (!messageContent) {
      const isBirthday = dto.eventType === 'BIRTHDAY';
      if (isBirthday) {
        messageContent = `🎉🎂 [CHÚC MỪNG SINH NHẬT] 🎂🎉\nThân gửi ${targetUser.name},\nNhân dịp sinh nhật của bạn, chúc bạn tuổi mới luôn tràn đầy niềm vui, dồi dào sức khỏe, hạnh phúc và gặt hái thật nhiều thành công mới cùng đại gia đình WorkSync & FPT Complex! 🎈✨`;
      } else {
        messageContent = `🏆🌟 [CHÚC MỪNG KỶ NIỆM CỐNG HIẾN] 🌟🏆\nThân gửi ${targetUser.name},\nChúc mừng bạn với cột mốc ${dto.eventTitle}! Cảm ơn những cống hiến, tâm huyết và sự đồng hành tuyệt vời của bạn cùng tổ chức trong suốt thời gian qua. Chúc bạn luôn giữ vững ngọn lửa nhiệt huyết và cùng nhau chinh phục nhiều đỉnh cao mới! 💼🎯🔥`;
      }
    }

    // 3. Gửi tin nhắn qua hệ thống Chat (tự động phát qua Socket.IO và đẩy push notification)
    const message = await this.sendMessage(conv.id, sender, {
      content: messageContent,
      type: ChatMessageType.TEXT,
    });

    return {
      success: true,
      conversationId: conv.id,
      message,
    };
  }
}
