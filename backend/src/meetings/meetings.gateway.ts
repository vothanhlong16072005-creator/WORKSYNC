/**
 * Meetings Gateway — Socket.IO real-time signalling for WebRTC, attendance tracking & chat
 * Reference: PLAN-2026-10-17-M5-MEETINGS-V2.md (Section 4.2 & 7.1)
 */
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
import { PrismaService } from '../prisma/prisma.service.js';

interface ClientUserData {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role?: string;
}

interface RoomParticipant {
  socketId: string;
  userId: string;
  name: string;
  avatar?: string;
  joinedTimestamp: number;
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/meetings',
})
export class MeetingsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  // meetingId -> Map<socketId, RoomParticipant>
  private readonly roomParticipants = new Map<string, Map<string, RoomParticipant>>();

  constructor(private readonly prisma: PrismaService) {}

  handleConnection(client: Socket) {
    // Connection established
  }

  async handleDisconnect(client: Socket) {
    // Find all rooms this socket was in and trigger leave
    for (const [meetingId, participants] of this.roomParticipants.entries()) {
      const participant = participants.get(client.id);
      if (participant) {
        await this.recordParticipantLeave(meetingId, participant);
        participants.delete(client.id);
        if (participants.size === 0) {
          this.roomParticipants.delete(meetingId);
        }
        client.to(meetingId).emit('participant-left', {
          socketId: client.id,
          userId: participant.userId,
        });
      }
    }
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { meetingId: string; user: ClientUserData },
  ) {
    const { meetingId, user } = payload;
    if (!meetingId || !user?.id) {
      client.emit('error', { message: 'Dữ liệu tham gia phòng không hợp lệ' });
      return;
    }

    try {
      // Find or verify attendee
      let attendee = await this.prisma.meetingAttendee.findUnique({
        where: {
          meetingId_userId: {
            meetingId,
            userId: user.id,
          },
        },
      });

      // If not exists (e.g. Creator joining first or auto-added), create attendee
      if (!attendee) {
        attendee = await this.prisma.meetingAttendee.create({
          data: {
            meetingId,
            userId: user.id,
            joinedAt: new Date(),
          },
        });
      } else if (!attendee.joinedAt) {
        await this.prisma.meetingAttendee.update({
          where: { id: attendee.id },
          data: { joinedAt: new Date() },
        });
      }

      // Add socket to room
      client.join(meetingId);

      // Register in memory map
      if (!this.roomParticipants.has(meetingId)) {
        this.roomParticipants.set(meetingId, new Map());
      }
      const participants = this.roomParticipants.get(meetingId)!;
      const participantInfo: RoomParticipant = {
        socketId: client.id,
        userId: user.id,
        name: user.name,
        avatar: user.avatar,
        joinedTimestamp: Date.now(),
      };
      participants.set(client.id, participantInfo);

      // Return current participants to the newly joined peer so they can initiate calls
      const existingParticipants = Array.from(participants.values()).filter(
        (p) => p.socketId !== client.id,
      );

      client.emit('room-users', {
        participants: existingParticipants,
      });

      // Broadcast to other peers in room
      client.to(meetingId).emit('participant-joined', {
        socketId: client.id,
        userId: user.id,
        name: user.name,
        avatar: user.avatar,
      });
    } catch (err: any) {
      client.emit('error', { message: err?.message || 'Lỗi khi tham gia phòng' });
    }
  }

  @SubscribeMessage('leave-room')
  async handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { meetingId: string },
  ) {
    const { meetingId } = payload;
    const participants = this.roomParticipants.get(meetingId);
    if (participants && participants.has(client.id)) {
      const participant = participants.get(client.id)!;
      await this.recordParticipantLeave(meetingId, participant);
      participants.delete(client.id);

      client.to(meetingId).emit('participant-left', {
        socketId: client.id,
        userId: participant.userId,
      });
      client.leave(meetingId);
    }
  }

  @SubscribeMessage('offer')
  handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { targetSocketId: string; offer: any; fromUser: ClientUserData },
  ) {
    this.server.to(payload.targetSocketId).emit('offer', {
      offer: payload.offer,
      fromSocketId: client.id,
      fromUser: payload.fromUser,
    });
  }

  @SubscribeMessage('answer')
  handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { targetSocketId: string; answer: any },
  ) {
    this.server.to(payload.targetSocketId).emit('answer', {
      answer: payload.answer,
      fromSocketId: client.id,
    });
  }

  @SubscribeMessage('ice-candidate')
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { targetSocketId: string; candidate: any },
  ) {
    this.server.to(payload.targetSocketId).emit('ice-candidate', {
      candidate: payload.candidate,
      fromSocketId: client.id,
    });
  }

  @SubscribeMessage('chat-message')
  handleChatMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      meetingId: string;
      text: string;
      sender: ClientUserData;
    },
  ) {
    const messageData = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      meetingId: payload.meetingId,
      text: payload.text,
      sender: payload.sender,
      createdAt: new Date().toISOString(),
    };
    this.server.to(payload.meetingId).emit('chat-message', messageData);
  }

  @SubscribeMessage('media-state-changed')
  handleMediaState(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      meetingId: string;
      audioEnabled: boolean;
      videoEnabled: boolean;
      screenSharing: boolean;
    },
  ) {
    client.to(payload.meetingId).emit('user-media-state', {
      socketId: client.id,
      audioEnabled: payload.audioEnabled,
      videoEnabled: payload.videoEnabled,
      screenSharing: payload.screenSharing,
    });
  }

  /**
   * Helper to update leftAt and increment totalDurationSeconds in DB
   */
  private async recordParticipantLeave(meetingId: string, participant: RoomParticipant) {
    try {
      const attendee = await this.prisma.meetingAttendee.findUnique({
        where: {
          meetingId_userId: {
            meetingId,
            userId: participant.userId,
          },
        },
      });

      if (attendee) {
        const sessionSeconds = Math.max(
          0,
          Math.floor((Date.now() - participant.joinedTimestamp) / 1000),
        );
        await this.prisma.meetingAttendee.update({
          where: { id: attendee.id },
          data: {
            leftAt: new Date(),
            totalDurationSeconds: {
              increment: sessionSeconds,
            },
          },
        });
      }
    } catch {
      // Ignore DB error during leave
    }
  }
}
