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
  audioEnabled: boolean;
  videoEnabled: boolean;
  screenSharing: boolean;
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

  // meetingId -> Array of chat messages for late joiners (Question 4)
  private readonly roomChatHistory = new Map<
    string,
    Array<{ id: string; meetingId: string; text: string; sender: ClientUserData; createdAt: string }>
  >();

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

      // Evict any existing socket for the same userId (prevent duplicate camera tiles on F5 or reconnect)
      for (const [existingSocketId, p] of participants.entries()) {
        if (p.userId === user.id && existingSocketId !== client.id) {
          participants.delete(existingSocketId);
          client.to(meetingId).emit('participant-left', {
            socketId: existingSocketId,
            userId: p.userId,
          });
        }
      }

      const participantInfo: RoomParticipant = {
        socketId: client.id,
        userId: user.id,
        name: user.name,
        avatar: user.avatar,
        joinedTimestamp: Date.now(),
        audioEnabled: true,
        videoEnabled: true,
        screenSharing: false,
      };
      participants.set(client.id, participantInfo);

      // Return current participants to the newly joined peer (excluding self) with media states
      const existingParticipants = Array.from(participants.values()).filter(
        (p) => p.socketId !== client.id && p.userId !== user.id,
      );

      client.emit('room-users', {
        participants: existingParticipants.map((p) => ({
          socketId: p.socketId,
          userId: p.userId,
          name: p.name,
          avatar: p.avatar,
          audioEnabled: p.audioEnabled ?? true,
          videoEnabled: p.videoEnabled ?? true,
          screenSharing: p.screenSharing ?? false,
        })),
        self: {
          audioEnabled: participantInfo.audioEnabled,
          videoEnabled: participantInfo.videoEnabled,
          screenSharing: participantInfo.screenSharing,
        },
      });

      // Synchronize live transcription state and past transcript chunks (Constraint 4)
      const minute = await this.prisma.meetingMinute.findUnique({
        where: { meetingId },
        select: { isTranscribing: true },
      });
      const recentChunks = await this.prisma.meetingTranscriptChunk.findMany({
        where: { meetingId },
        orderBy: { timestamp: 'asc' },
        take: 300,
      });

      client.emit('meeting:sync-state', {
        isTranscribing: minute?.isTranscribing ?? false,
        transcripts: recentChunks.map((c) => ({
          id: c.id,
          speakerId: c.speakerId,
          speakerName: c.speakerName,
          speakerRole: c.speakerRole,
          text: c.text,
          timestamp: c.timestamp.toISOString(),
        })),
      });

      // Send chat history to late joiners (Question 4)
      const chatHistory = this.roomChatHistory.get(meetingId) || [];
      client.emit('chat-history', { messages: chatHistory });

      // Broadcast to other peers in room with initial media state
      client.to(meetingId).emit('participant-joined', {
        socketId: client.id,
        userId: user.id,
        name: user.name,
        avatar: user.avatar,
        audioEnabled: participantInfo.audioEnabled,
        videoEnabled: participantInfo.videoEnabled,
        screenSharing: participantInfo.screenSharing,
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
      attachment?: {
        name: string;
        url: string;
        size?: number;
        type?: string;
      };
    },
  ) {
    const messageData = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      meetingId: payload.meetingId,
      text: payload.text,
      sender: payload.sender,
      attachment: payload.attachment,
      createdAt: new Date().toISOString(),
    };

    if (!this.roomChatHistory.has(payload.meetingId)) {
      this.roomChatHistory.set(payload.meetingId, []);
    }
    const history = this.roomChatHistory.get(payload.meetingId)!;
    history.push(messageData);
    if (history.length > 200) history.shift();

    this.server.to(payload.meetingId).emit('chat-message', messageData);
  }

  @SubscribeMessage('request-chat-history')
  handleRequestChatHistory(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { meetingId: string },
  ) {
    const history = this.roomChatHistory.get(payload.meetingId) || [];
    client.emit('chat-history', { messages: history });
  }

  getMeetingChatHistory(meetingId: string) {
    return this.roomChatHistory.get(meetingId) || [];
  }

  /**
   * Question 6: Cho phép người chủ trì kết thúc cuộc họp ngay lập tức cho tất cả người tham gia
   */
  @SubscribeMessage('meeting:end-for-all')
  async handleEndMeetingForAll(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { meetingId: string; userId: string },
  ) {
    const { meetingId, userId } = payload;
    if (!meetingId) return;

    try {
      const meeting = await this.prisma.meeting.findUnique({
        where: { id: meetingId },
        include: {
          attendees: { include: { user: true } },
        },
      });

      if (!meeting) return;

      const canEnd =
        meeting.createdById === userId ||
        meeting.attendees.some(
          (a) =>
            a.userId === userId &&
            (a.user.role === 'ADMIN' || a.user.role === 'PM' || a.user.role === 'DEPARTMENT_HEAD'),
        );

      if (!canEnd) {
        client.emit('error', {
          message: 'Chỉ người chủ trì hoặc quản lý mới có quyền kết thúc cuộc họp cho tất cả.',
        });
        return;
      }

      // 1. Cập nhật trạng thái cuộc họp thành COMPLETED
      await this.prisma.meeting.update({
        where: { id: meetingId },
        data: {
          status: 'COMPLETED',
          endTime: new Date(),
        },
      });

      // 2. Ghi nhận thời gian rời cho tất cả người đang trong phòng
      const participants = this.roomParticipants.get(meetingId);
      if (participants) {
        for (const p of participants.values()) {
          await this.recordParticipantLeave(meetingId, p);
          client.to(meetingId).emit('participant-left', {
            socketId: p.socketId,
            userId: p.userId,
          });
        }
        this.roomParticipants.delete(meetingId);
      }

      // 3. Bắn sự kiện meeting:ended tới toàn bộ phòng
      this.server.to(meetingId).emit('meeting:ended', {
        meetingId,
        endedBy: userId,
        message: 'Người chủ trì đã kết thúc cuộc họp.',
      });
    } catch (err: any) {
      client.emit('error', { message: err?.message || 'Lỗi khi kết thúc cuộc họp' });
    }
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
    const participants = this.roomParticipants.get(payload.meetingId);
    const participant = participants?.get(client.id);
    if (participant) {
      participant.audioEnabled = payload.audioEnabled;
      participant.videoEnabled = payload.videoEnabled;
      participant.screenSharing = payload.screenSharing;
    }

    client.to(payload.meetingId).emit('user-media-state', {
      socketId: client.id,
      userId: participant?.userId,
      audioEnabled: payload.audioEnabled,
      videoEnabled: payload.videoEnabled,
      screenSharing: payload.screenSharing,
    });
  }

  @SubscribeMessage('screen-track-ready')
  handleScreenTrackReady(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { meetingId: string; hasScreenTrack: boolean },
  ) {
    const participants = this.roomParticipants.get(payload.meetingId);
    const participant = participants?.get(client.id);
    if (participant) {
      participant.screenSharing = payload.hasScreenTrack;
    }
    client.to(payload.meetingId).emit('user-media-state', {
      socketId: client.id,
      userId: participant?.userId,
      audioEnabled: participant?.audioEnabled ?? true,
      videoEnabled: participant?.videoEnabled ?? true,
      screenSharing: payload.hasScreenTrack,
    });
  }

  // ============================================================
  // ⭐ M5.1 — Live Transcript Streaming Handlers
  // ============================================================

  @SubscribeMessage('meeting:start-transcription')
  async handleStartTranscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { meetingId: string; user?: ClientUserData },
  ) {
    const { meetingId, user } = payload;
    if (!meetingId) return;

    await this.prisma.meetingMinute.upsert({
      where: { meetingId },
      create: {
        meetingId,
        content: '',
        isTranscribing: true,
      },
      update: {
        isTranscribing: true,
      },
    });

    this.server.to(meetingId).emit('meeting:transcription-status', {
      isTranscribing: true,
      startedBy: user?.name || 'Người chủ trì',
    });
  }

  @SubscribeMessage('meeting:stop-transcription')
  async handleStopTranscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { meetingId: string },
  ) {
    const { meetingId } = payload;
    if (!meetingId) return;

    await this.prisma.meetingMinute.updateMany({
      where: { meetingId },
      data: { isTranscribing: false },
    });

    this.server.to(meetingId).emit('meeting:transcription-status', {
      isTranscribing: false,
    });
  }

  /**
   * Technical Constraint 1: Thread-safe chunk persistence into MeetingTranscriptChunk
   * to avoid race conditions when multiple speakers talk simultaneously.
   */
  @SubscribeMessage('meeting:transcript-chunk')
  async handleTranscriptChunk(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    payload: {
      meetingId: string;
      speaker: ClientUserData;
      text: string;
      timestamp?: string;
    },
  ) {
    const { meetingId, speaker, text } = payload;
    const trimmed = text?.trim();
    if (!meetingId || !trimmed || !speaker?.name) return;

    const chunkTimestamp = payload.timestamp ? new Date(payload.timestamp) : new Date();

    // 1. Thread-safe single insert to avoid race condition
    const chunk = await this.prisma.meetingTranscriptChunk.create({
      data: {
        meetingId,
        speakerId: speaker.id || 'anonymous',
        speakerName: speaker.name,
        speakerRole: speaker.role || 'MEMBER',
        text: trimmed,
        timestamp: chunkTimestamp,
      },
    });

    // 2. Broadcast live caption & feed chunk to all users in the room
    this.server.to(meetingId).emit('meeting:live-caption', {
      id: chunk.id,
      speakerId: chunk.speakerId,
      speakerName: chunk.speakerName,
      speakerRole: chunk.speakerRole,
      text: chunk.text,
      timestamp: chunk.timestamp.toISOString(),
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
