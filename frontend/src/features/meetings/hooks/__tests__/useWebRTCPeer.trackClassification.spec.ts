import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWebRTCPeer } from '../useWebRTCPeer';

describe('useWebRTCPeer — track classification (Phase 2 fixes)', () => {
  let mockSocket: ReturnType<typeof vi.fn> & { emit: ReturnType<typeof vi.fn> };
  let mockPcInstances: MockPC[];
  let camTrack: MockTrack;
  let screenTrack: MockTrack;
  let camStream: MockStream;
  let screenStream: MockStream;

  interface MockTrack {
    id: string;
    kind: string;
    readyState: string;
    contentHint: string;
    label: string;
    stop: ReturnType<typeof vi.fn>;
    onended: (() => void) | null;
  }

  interface MockStream {
    id: string;
    getVideoTracks: () => MockTrack[];
    getAudioTracks: () => MockTrack[];
    getTracks: () => MockTrack[];
  }

  interface MockPC {
    connectionState: string;
    signalingState: string;
    localDescription: { type: string; sdp: string } | null;
    remoteDescription: { type: string; sdp: string } | null;
    addTrack: ReturnType<typeof vi.fn>;
    removeTrack: ReturnType<typeof vi.fn>;
    getSenders: () => Array<{ track: MockTrack | null }>;
    createOffer: ReturnType<typeof vi.fn>;
    createAnswer: ReturnType<typeof vi.fn>;
    setLocalDescription: ReturnType<typeof vi.fn>;
    setRemoteDescription: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    onicecandidate: unknown;
    ontrack: unknown;
    onconnectionstatechange: unknown;
    transceivers: unknown[];
  }

  beforeEach(() => {
    mockPcInstances = [];
    mockSocket = {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as ReturnType<typeof vi.fn> & { emit: ReturnType<typeof vi.fn> };

    camTrack = {
      id: 'cam-track-1',
      kind: 'video',
      readyState: 'live',
      contentHint: '',
      label: 'camera',
      stop: vi.fn(),
      onended: null,
    };
    screenTrack = {
      id: 'screen-track-1',
      kind: 'video',
      readyState: 'live',
      contentHint: '',
      label: 'screen',
      stop: vi.fn(),
      onended: null,
    };

    camStream = {
      id: 'cam-stream-1',
      getVideoTracks: () => [camTrack],
      getAudioTracks: () => [],
      getTracks: () => [camTrack],
    };
    screenStream = {
      id: 'screen-stream-1',
      getVideoTracks: () => [screenTrack],
      getAudioTracks: () => [],
      getTracks: () => [screenTrack],
    };

    class MockRTCPeerConnection implements MockPC {
      connectionState = 'new';
      signalingState = 'stable';
      localDescription: MockPC['localDescription'] = null;
      remoteDescription: MockPC['remoteDescription'] = null;
      addTrack = vi.fn();
      removeTrack = vi.fn();
      getSenders = vi.fn(() => []);
      createOffer = vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' });
      createAnswer = vi.fn().mockResolvedValue({ type: 'answer', sdp: 'mock-sdp' });
      setLocalDescription = vi.fn().mockImplementation(async (desc: { sdp: string }) => {
        this.localDescription = desc;
      });
      setRemoteDescription = vi.fn().mockImplementation(async (desc: { sdp: string }) => {
        this.remoteDescription = desc;
      });
      close = vi.fn().mockImplementation(() => {
        this.connectionState = 'closed';
      });
      onicecandidate = null;
      ontrack = null;
      onconnectionstatechange = null;
      transceivers = [];
      constructor() {
        mockPcInstances.push(this);
      }
    }

    (globalThis as unknown as { RTCPeerConnection: unknown }).RTCPeerConnection =
      MockRTCPeerConnection;

    class MockMediaStream {
      id = `ms-${Math.random()}`;
      private tracks: MockTrack[];
      constructor(tracks: MockTrack[] = []) {
        this.tracks = tracks;
      }
      getVideoTracks = () => this.tracks.filter((t) => t.kind === 'video');
      getAudioTracks = () => this.tracks.filter((t) => t.kind === 'audio');
      getTracks = () => this.tracks;
    }
    (globalThis as unknown as { MediaStream: unknown }).MediaStream = MockMediaStream;
  });

  // ⚠️ Phải là factory: `mockSocket` được gán trong beforeEach, nếu capture trực tiếp
  // ở thời điểm module load thì socket sẽ là undefined.
  const makeOptions = (overrides: Partial<typeof baseOptionsShape> = {}) => ({
    socket: mockSocket,
    meetingId: 'meet-1',
    self: { id: 'user-a', name: 'User A' },
    localCamStream: null,
    localScreenStream: null,
    ...overrides,
  });

  const baseOptionsShape = {
    socket: null as unknown,
    meetingId: 'meet-1',
    self: { id: 'user-a', name: 'User A' },
    localCamStream: null as MediaStream | null,
    localScreenStream: null as MediaStream | null,
  };

  it('should NOT classify a remote stream as screen when msid mapping says it is camera', () => {
    const { result } = renderHook(() => useWebRTCPeer(makeOptions()));

    act(() => {
      result.current.ensurePeer('sock-1', { userId: 'user-b', name: 'User B' });
    });

    const pc = mockPcInstances[0]!;
    const remoteCamStream = {
      id: 'msid-cam',
      getVideoTracks: () => [camTrack],
      getAudioTracks: () => [],
      getTracks: () => [camTrack],
    } as unknown as MediaStream;

    // Peer báo: đây là CAMERA (không phải screen)
    act(() => {
      result.current.setRemoteStreamKinds('sock-1', {
        camStreamIds: ['msid-cam'],
        screenStreamIds: [],
      });
    });

    // Mô phỏng ontrack với stream id đã biết là camera
    act(() => {
      const ontrack = pc.ontrack as (event: unknown) => void;
      ontrack({
        track: camTrack,
        streams: [remoteCamStream],
        transceiver: { mid: '1' },
      });
    });

    const peer = result.current.peers.get('sock-1');
    expect(peer?.camStream).toBe(remoteCamStream);
    expect(peer?.screenStream).toBeNull();
    expect(peer?.isScreenSharing).toBe(false);
  });

  it('should classify a remote stream as screen when msid mapping says it is screen', () => {
    const { result } = renderHook(() => useWebRTCPeer(makeOptions()));

    act(() => {
      result.current.ensurePeer('sock-1', { userId: 'user-b', name: 'User B' });
    });

    const pc = mockPcInstances[0]!;
    const remoteScreenStream = {
      id: 'msid-screen',
      getVideoTracks: () => [screenTrack],
      getAudioTracks: () => [],
      getTracks: () => [screenTrack],
    } as unknown as MediaStream;

    act(() => {
      result.current.setRemoteStreamKinds('sock-1', {
        camStreamIds: [],
        screenStreamIds: ['msid-screen'],
      });
    });

    act(() => {
      const ontrack = pc.ontrack as (event: unknown) => void;
      ontrack({
        track: screenTrack,
        streams: [remoteScreenStream],
        transceiver: { mid: '2' },
      });
    });

    const peer = result.current.peers.get('sock-1');
    expect(peer?.screenStream).toBe(remoteScreenStream);
    expect(peer?.camStream).toBeNull();
    expect(peer?.isScreenSharing).toBe(true);
  });

  it('should add local camera track to existing peer connections when media arrives late (late joiner fix)', async () => {
    const { result, rerender } = renderHook(
      (props: { localCamStream: MediaStream | null }) => useWebRTCPeer(makeOptions(props)),
      { initialProps: { localCamStream: null } },
    );

    act(() => {
      result.current.ensurePeer('sock-1', { userId: 'user-b', name: 'User B' });
    });

    const pc = mockPcInstances[0]!;
    expect(pc.addTrack).not.toHaveBeenCalled();

    // Media tới sau (giải quyết race getUserMedia vs socket connect)
    await act(async () => {
      rerender({ localCamStream: camStream as unknown as MediaStream });
    });

    expect(pc.addTrack).toHaveBeenCalledWith(camTrack, expect.any(Object));
  });

  it('should REQUEST renegotiation when media arrives late and we are NOT the initiator', async () => {
    // self.id = 'zzz' > remote 'user-b' → tôi KHÔNG phải initiator
    const { result, rerender } = renderHook(
      (props: { localCamStream: MediaStream | null }) =>
        useWebRTCPeer(
          makeOptions({ ...props, self: { id: 'zzz', name: 'Z' } }),
        ),
      { initialProps: { localCamStream: null } },
    );

    act(() => {
      result.current.ensurePeer('sock-1', { userId: 'user-b', name: 'User B' });
    });

    await act(async () => {
      rerender({ localCamStream: camStream as unknown as MediaStream });
    });

    // Không được tự gửi offer (tránh glare) → phải nhờ bên kia
    expect(mockSocket.emit).toHaveBeenCalledWith(
      'meeting:renegotiate-request',
      expect.objectContaining({
        meetingId: 'meet-1',
        targetSocketId: 'sock-1',
        reason: 'media-ready',
      }),
    );
    expect(mockSocket.emit).not.toHaveBeenCalledWith(
      'offer',
      expect.anything(),
    );
  });

  it('should send offer directly when media arrives late and we ARE the initiator', async () => {
    // self.id = 'aaa' < remote 'user-b' → tôi LÀ initiator
    const { result, rerender } = renderHook(
      (props: { localCamStream: MediaStream | null }) =>
        useWebRTCPeer(
          makeOptions({ ...props, self: { id: 'aaa', name: 'A' } }),
        ),
      { initialProps: { localCamStream: null } },
    );

    act(() => {
      result.current.ensurePeer('sock-1', { userId: 'user-b', name: 'User B' });
    });

    mockSocket.emit.mockClear();

    await act(async () => {
      rerender({ localCamStream: camStream as unknown as MediaStream });
    });

    expect(mockSocket.emit).toHaveBeenCalledWith(
      'offer',
      expect.objectContaining({ targetSocketId: 'sock-1' }),
    );
    expect(mockSocket.emit).not.toHaveBeenCalledWith(
      'meeting:renegotiate-request',
      expect.anything(),
    );
  });

  it('should assign camStream even when peer mapping is empty (no track-ids received)', () => {
    const { result } = renderHook(() => useWebRTCPeer(makeOptions()));

    act(() => {
      result.current.ensurePeer('sock-1', { userId: 'user-b', name: 'User B' });
    });

    const pc = mockPcInstances[0]!;
    const remoteCamStream = {
      id: 'msid-unknown',
      getVideoTracks: () => [camTrack],
      getAudioTracks: () => [],
      getTracks: () => [camTrack],
    } as unknown as MediaStream;

    // Mapping RỖNG (peer chưa gửi track-ids) → phải dùng fallback, không kẹt pending
    act(() => {
      result.current.setRemoteStreamKinds('sock-1', {
        camStreamIds: [],
        screenStreamIds: [],
      });
    });

    act(() => {
      const ontrack = pc.ontrack as (event: unknown) => void;
      ontrack({
        track: camTrack,
        streams: [remoteCamStream],
        transceiver: { mid: '1' },
      });
    });

    const peer = result.current.peers.get('sock-1');
    // Không được null (trước đây track bị kẹt vĩnh viễn trong stillPending)
    expect(peer?.camStream).toBe(remoteCamStream);
  });

  it('should NOT delete screenStream when isScreenSharing flag flips to false', () => {
    const { result } = renderHook(() => useWebRTCPeer(makeOptions()));

    act(() => {
      result.current.ensurePeer('sock-1', { userId: 'user-b', name: 'User B' });
    });

    const pc = mockPcInstances[0]!;
    const remoteScreenStream = {
      id: 'msid-screen',
      getVideoTracks: () => [screenTrack],
      getAudioTracks: () => [],
      getTracks: () => [screenTrack],
    } as unknown as MediaStream;

    act(() => {
      result.current.setRemoteStreamKinds('sock-1', {
        camStreamIds: [],
        screenStreamIds: ['msid-screen'],
      });
    });

    act(() => {
      const ontrack = pc.ontrack as (event: unknown) => void;
      ontrack({ track: screenTrack, streams: [remoteScreenStream], transceiver: { mid: '2' } });
    });

    act(() => {
      result.current.updatePeerMediaState('sock-1', { isScreenSharing: false });
    });

    const peer = result.current.peers.get('sock-1');
    expect(peer?.screenStream).toBe(remoteScreenStream);
  });

  it('should not create a duplicate peer connection when ensurePeer is called twice', () => {
    const { result } = renderHook(() => useWebRTCPeer(makeOptions()));

    act(() => {
      result.current.ensurePeer('sock-1', { userId: 'user-b', name: 'User B' });
      result.current.ensurePeer('sock-1', { userId: 'user-b', name: 'User B' });
    });

    expect(mockPcInstances.length).toBe(1);
  });

  it('should emit track-ids with real msid parsed from local SDP', async () => {
    const { result } = renderHook(() =>
      useWebRTCPeer(makeOptions({ localCamStream: camStream as unknown as MediaStream })),
    );

    act(() => {
      result.current.ensurePeer('sock-1', { userId: 'user-b', name: 'User B' });
    });

    // SDP cục bộ có msid thật
    const pc = mockPcInstances[0]!;
    await act(async () => {
      pc.setLocalDescription({
        type: 'offer',
        sdp: 'v=0\r\na=msid:real-cam-msid cam-track-1\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\na=mid:1\r\n',
      });
    });

    act(() => {
      result.current.emitTrackIds();
    });

    expect(mockSocket.emit).toHaveBeenCalledWith('meeting:track-ids', {
      meetingId: 'meet-1',
      camStreamIds: ['real-cam-msid'],
      screenStreamIds: [],
    });
  });
});
