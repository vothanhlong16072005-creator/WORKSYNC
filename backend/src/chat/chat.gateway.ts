import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';

interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  name?: string;
  departmentId?: string | null;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(ChatGateway.name);
  private readonly onlineUsers = new Map<string, Set<Socket>>();

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ||
        (client.handshake.query?.token as string | undefined) ||
        client.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');

      if (!token) {
        this.logger.debug(`[ChatSocket] ${client.id} disconnected: missing token`);
        client.disconnect();
        return;
      }

      const decoded = this.jwtService.verify<JwtPayload>(token, {
        secret: process.env.JWT_SECRET || 'super_secret_jwt_key_worksync',
      });

      if (!decoded?.sub) {
        client.disconnect();
        return;
      }

      const userId = decoded.sub;
      client.data.userId = userId;
      client.data.userName = decoded.name || 'Người dùng';

      if (!this.onlineUsers.has(userId)) {
        this.onlineUsers.set(userId, new Set());
      }
      this.onlineUsers.get(userId)!.add(client);

      // Join user's personal room for direct notification/updates
      client.join(`user:${userId}`);

      this.logger.debug(`[ChatSocket] User ${userId} connected socket ${client.id}`);
      this.server.emit('presence:update', { userId, status: 'ONLINE' });
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.debug(`[ChatSocket] ${client.id} auth error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = client.data?.userId as string | undefined;
    if (userId && this.onlineUsers.has(userId)) {
      const userSockets = this.onlineUsers.get(userId)!;
      userSockets.delete(client);
      if (userSockets.size === 0) {
        this.onlineUsers.delete(userId);
        this.server.emit('presence:update', { userId, status: 'OFFLINE' });
      }
      this.logger.debug(`[ChatSocket] User ${userId} disconnected socket ${client.id}`);
    }
  }

  isUserOnline(userId: string): boolean {
    const sockets = this.onlineUsers.get(userId);
    return !!sockets && sockets.size > 0;
  }

  getOnlineUserIds(): string[] {
    return Array.from(this.onlineUsers.keys());
  }

  @SubscribeMessage('join_conversation')
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (data?.conversationId) {
      client.join(`conv:${data.conversationId}`);
      this.logger.debug(`[ChatSocket] User ${client.data.userId} joined conv:${data.conversationId}`);
    }
  }

  @SubscribeMessage('leave_conversation')
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (data?.conversationId) {
      client.leave(`conv:${data.conversationId}`);
      this.logger.debug(`[ChatSocket] User ${client.data.userId} left conv:${data.conversationId}`);
    }
  }

  @SubscribeMessage('typing_start')
  handleTypingStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (data?.conversationId) {
      client.to(`conv:${data.conversationId}`).emit('user_typing', {
        userId: client.data.userId,
        userName: client.data.userName,
        conversationId: data.conversationId,
        isTyping: true,
      });
    }
  }

  @SubscribeMessage('typing_stop')
  handleTypingStop(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    if (data?.conversationId) {
      client.to(`conv:${data.conversationId}`).emit('user_typing', {
        userId: client.data.userId,
        userName: client.data.userName,
        conversationId: data.conversationId,
        isTyping: false,
      });
    }
  }

  emitNewMessage(conversationId: string, message: any, participantIds: string[]) {
    // 1. Broadcast message to all clients in conversation room
    this.server.to(`conv:${conversationId}`).emit('new_message', {
      conversationId,
      message,
    });

    // 2. Broadcast conversation update (last message, unread) to user rooms
    for (const userId of participantIds) {
      this.server.to(`user:${userId}`).emit('conversation_updated', {
        conversationId,
        lastMessage: {
          content: message.type === 'FILE' ? `[File] ${message.fileName || 'Tệp đính kèm'}` : message.content,
          senderId: message.senderId,
          createdAt: message.createdAt,
        },
      });
    }
  }

  emitReactionUpdated(conversationId: string, messageId: string, reactions: any[]) {
    this.server.to(`conv:${conversationId}`).emit('reaction_updated', {
      conversationId,
      messageId,
      reactions,
    });
  }

  emitMessageDeleted(conversationId: string, messageId: string) {
    this.server.to(`conv:${conversationId}`).emit('message_deleted', {
      conversationId,
      messageId,
    });
  }

  emitReadReceipt(conversationId: string, userId: string, lastReadAt: Date) {
    this.server.to(`conv:${conversationId}`).emit('read_receipt', {
      conversationId,
      userId,
      lastReadAt,
    });
  }
}
