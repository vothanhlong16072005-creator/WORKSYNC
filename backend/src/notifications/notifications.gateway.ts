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
  departmentId?: string | null;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private readonly onlineUsers = new Map<string, Set<Socket>>();

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ||
        (client.handshake.query?.token as string | undefined) ||
        client.handshake.headers.authorization?.replace(/^Bearer\s+/i, '');

      if (!token) {
        this.logger.debug(`Socket ${client.id} disconnected: missing token`);
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

      if (!this.onlineUsers.has(userId)) {
        this.onlineUsers.set(userId, new Set());
      }
      this.onlineUsers.get(userId)!.add(client);

      this.logger.debug(`User ${userId} connected socket ${client.id} (total: ${this.onlineUsers.get(userId)!.size})`);
    } catch (err: unknown) {
      const error = err as Error;
      this.logger.debug(`Socket ${client.id} auth error: ${error.message}`);
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
      }
      this.logger.debug(`Socket ${client.id} disconnected for user ${userId}`);
    }
  }

  isUserOnline(userId: string): boolean {
    const sockets = this.onlineUsers.get(userId);
    return !!sockets && sockets.size > 0;
  }

  emitNewNotification(notification: { userId: string; [key: string]: unknown }) {
    const sockets = this.onlineUsers.get(notification.userId);
    if (sockets && sockets.size > 0) {
      for (const socket of sockets) {
        socket.emit('notification:new', notification);
      }
    }
  }

  emitUnreadCount(userId: string, count: number) {
    const sockets = this.onlineUsers.get(userId);
    if (sockets && sockets.size > 0) {
      for (const socket of sockets) {
        socket.emit('notification:unread-count', { unreadCount: count });
      }
    }
  }

  @SubscribeMessage('notification:read')
  handleNotificationRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { id: string },
  ) {
    const userId = client.data?.userId as string | undefined;
    if (userId && this.onlineUsers.has(userId)) {
      const sockets = this.onlineUsers.get(userId)!;
      for (const socket of sockets) {
        if (socket.id !== client.id) {
          socket.emit('notification:read-sync', data);
        }
      }
    }
  }
}
