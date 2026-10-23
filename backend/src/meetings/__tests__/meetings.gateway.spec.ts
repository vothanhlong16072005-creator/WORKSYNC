import { describe, expect, it, vi, beforeEach } from 'vitest';

/**
 * Test cho `MeetingsGateway` — tập trung vào:
 * 1. Multi-tab / cùng 1 máy: KHÔNG evict socket cũ cùng userId (camera của tab
 *    cũ không bị mất khi mở tab thứ 2).
 * 2. Relay `meeting:renegotiate-request` để bên initiator gửi offer khi bên kia
 *    vừa có media mới (camera/screen) nhưng không phải initiator.
 */

const createSocket = (id: string) => ({
  id,
  join: vi.fn(),
  leave: vi.fn(),
  emit: vi.fn(),
  to: vi.fn(),
  disconnect: vi.fn(),
});

describe('MeetingsGateway — multi-tab & renegotiate relay', () => {
  let gateway: any;
  let serverEmit: ReturnType<typeof vi.fn>;
  let prismaMock: any;

  beforeEach(async () => {
    serverEmit = vi.fn();
    prismaMock = {
      meetingAttendee: {
        findUnique: vi.fn().mockResolvedValue({ id: 'att-1', joinedAt: new Date() }),
        create: vi.fn(),
        update: vi.fn(),
      },
      meetingMinute: {
        findUnique: vi.fn().mockResolvedValue({ isTranscribing: false }),
      },
      meetingTranscriptChunk: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    const { MeetingsGateway } = await import('../meetings.gateway.js');
    gateway = new MeetingsGateway(prismaMock);
    const roomEmit = vi.fn();
    serverEmit = vi.fn().mockReturnValue({ emit: roomEmit });
    gateway.server = { to: serverEmit };
    gateway.__roomEmit = roomEmit;
  });

  it('keeps the previous socket for the same userId (multi-tab on one machine)', async () => {
    const socketA = createSocket('sock-A');
    socketA.to = vi.fn().mockReturnValue({ emit: vi.fn() });

    await gateway.handleJoinRoom(socketA, {
      meetingId: 'meet-1',
      user: { id: 'user-1', name: 'User 1' },
    });

    // Tab thứ 2 cùng user
    const socketB = createSocket('sock-B');
    socketB.to = vi.fn().mockReturnValue({ emit: vi.fn() });

    await gateway.handleJoinRoom(socketB, {
      meetingId: 'meet-1',
      user: { id: 'user-1', name: 'User 1' },
    });

    const participants = gateway.roomParticipants.get('meet-1');
    // CẢ 2 socket cùng userId phải còn lại (trước đây socket cũ bị evict)
    expect(participants.has('sock-A')).toBe(true);
    expect(participants.has('sock-B')).toBe(true);
  });

  it('does not emit participant-left when a second tab joins with the same userId', async () => {
    const socketA = createSocket('sock-A');
    const roomEmit = vi.fn();
    socketA.to = vi.fn().mockReturnValue({ emit: roomEmit });

    await gateway.handleJoinRoom(socketA, {
      meetingId: 'meet-1',
      user: { id: 'user-1', name: 'User 1' },
    });

    roomEmit.mockClear();

    const socketB = createSocket('sock-B');
    socketB.to = vi.fn().mockReturnValue({ emit: vi.fn() });

    await gateway.handleJoinRoom(socketB, {
      meetingId: 'meet-1',
      user: { id: 'user-1', name: 'User 1' },
    });

    // Không được đẩy tab cũ ra khỏi phòng
    const leftCalls = roomEmit.mock.calls.filter(
      (c) => c[0] === 'participant-left',
    );
    expect(leftCalls).toHaveLength(0);
  });

  it('relays meeting:renegotiate-request to the target socket', () => {
    const client = createSocket('sock-A');
    const roomEmit = vi.fn();
    const toMock = vi.fn().mockReturnValue({ emit: roomEmit });
    gateway.server = { to: toMock };

    gateway.handleRenegotiateRequest(client, {
      meetingId: 'meet-1',
      targetSocketId: 'sock-B',
      reason: 'media-ready',
    });

    expect(toMock).toHaveBeenCalledWith('sock-B');
    expect(roomEmit).toHaveBeenCalledWith('meeting:renegotiate-request', {
      fromSocketId: 'sock-A',
      meetingId: 'meet-1',
      reason: 'media-ready',
    });
  });

  it('ignores renegotiate-request without a target socket', () => {
    const client = createSocket('sock-A');

    gateway.handleRenegotiateRequest(client, { meetingId: 'meet-1' });

    expect(serverEmit).not.toHaveBeenCalled();
  });
});
