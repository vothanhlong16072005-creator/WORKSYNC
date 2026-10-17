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
import { PrismaService } from '../prisma/prisma.service.js';

interface CollaboratorInfo {
  userId: string;
  name: string;
  avatar?: string | null;
  socketId: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/documents',
})
export class DocumentsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(DocumentsGateway.name);
  // documentId -> Map<socketId, CollaboratorInfo>
  private readonly documentCollaborators = new Map<string, Map<string, CollaboratorInfo>>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        (client.handshake.auth?.token as string | undefined) ||
        (client.handshake.query?.token as string | undefined) ||
        client.handshake.headers.authorization?.replace(/^Bearer\s+/, '');

      if (token) {
        const decoded = this.jwtService.decode(token) as { sub?: string; name?: string } | null;
        if (decoded?.sub) {
          const user = await this.prisma.user.findUnique({
            where: { id: decoded.sub },
            select: { id: true, name: true, avatar: true },
          });
          if (user) {
            client.data.user = user;
          }
        }
      }
    } catch (err) {
      this.logger.debug(`Handshake token decode failed: ${(err as Error).message}`);
    }
  }

  handleDisconnect(client: Socket) {
    // Remove from all rooms and broadcast updated presence
    for (const [docId, collaborators] of this.documentCollaborators.entries()) {
      if (collaborators.has(client.id)) {
        collaborators.delete(client.id);
        this.broadcastCollaborators(docId);
        if (collaborators.size === 0) {
          this.documentCollaborators.delete(docId);
        }
      }
    }
  }

  @SubscribeMessage('join_document')
  handleJoinDocument(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { documentId: string },
  ) {
    const { documentId } = data;
    if (!documentId) return;

    const roomName = `doc_${documentId}`;
    client.join(roomName);

    const user = client.data.user || {
      id: `anon_${client.id.substring(0, 5)}`,
      name: 'Khách',
      avatar: null,
    };

    if (!this.documentCollaborators.has(documentId)) {
      this.documentCollaborators.set(documentId, new Map());
    }

    const docMap = this.documentCollaborators.get(documentId)!;
    docMap.set(client.id, {
      userId: user.id,
      name: user.name,
      avatar: user.avatar,
      socketId: client.id,
    });

    this.broadcastCollaborators(documentId);
  }

  @SubscribeMessage('leave_document')
  handleLeaveDocument(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { documentId: string },
  ) {
    const { documentId } = data;
    if (!documentId) return;

    client.leave(`doc_${documentId}`);

    const docMap = this.documentCollaborators.get(documentId);
    if (docMap && docMap.has(client.id)) {
      docMap.delete(client.id);
      this.broadcastCollaborators(documentId);
      if (docMap.size === 0) {
        this.documentCollaborators.delete(documentId);
      }
    }
  }

  @SubscribeMessage('document_change')
  handleDocumentChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { documentId: string; content: unknown; version?: number },
  ) {
    const { documentId, content, version } = data;
    if (!documentId) return;

    // Broadcast to other collaborators in the same document room
    client.to(`doc_${documentId}`).emit('collaborator_update', {
      senderSocketId: client.id,
      senderUser: client.data.user,
      content,
      version,
      timestamp: Date.now(),
    });
  }

  @SubscribeMessage('cursor_move')
  handleCursorMove(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { documentId: string; cursor: unknown },
  ) {
    const { documentId, cursor } = data;
    if (!documentId) return;

    client.to(`doc_${documentId}`).emit('collaborator_cursor', {
      senderSocketId: client.id,
      senderUser: client.data.user,
      cursor,
    });
  }

  private broadcastCollaborators(documentId: string) {
    const docMap = this.documentCollaborators.get(documentId);
    const list: CollaboratorInfo[] = docMap ? Array.from(docMap.values()) : [];
    this.server.to(`doc_${documentId}`).emit('active_collaborators', list);
  }
}
