import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWebRTCPeer } from '../useWebRTCPeer';

describe('useWebRTCPeer', () => {
  let mockSocket: any;
  let mockTrack: any;
  let mockStream: any;
  let mockPcInstances: any[];

  beforeEach(() => {
    mockPcInstances = [];
    mockSocket = {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    };

    mockTrack = {
      id: 'test-track-1',
      kind: 'video',
      readyState: 'live',
      stop: vi.fn(),
    };

    mockStream = {
      id: 'stream-1',
      getVideoTracks: vi.fn(() => [mockTrack]),
      getAudioTracks: vi.fn(() => []),
      getTracks: vi.fn(() => [mockTrack]),
    };

    // Global mock for RTCPeerConnection
    class MockRTCPeerConnection {
      connectionState = 'new';
      addTrack = vi.fn();
      removeTrack = vi.fn();
      getSenders = vi.fn(() => []);
      createOffer = vi.fn().mockResolvedValue({ type: 'offer', sdp: 'mock-sdp' });
      setLocalDescription = vi.fn().mockResolvedValue(undefined);
      setRemoteDescription = vi.fn().mockResolvedValue(undefined);
      close = vi.fn().mockImplementation(() => {
        this.connectionState = 'closed';
      });
      onicecandidate = null;
      ontrack = null;
      onconnectionstatechange = null;
      onremovetrack = null;

      constructor() {
        mockPcInstances.push(this);
      }
    }

    (globalThis as any).RTCPeerConnection = MockRTCPeerConnection;

    class MockMediaStream {
      id = `stream-${Math.random()}`;
      tracks: any[];
      constructor(tracks: any[] = []) {
        this.tracks = tracks;
      }
      getVideoTracks = vi.fn(() => this.tracks);
      getAudioTracks = vi.fn(() => []);
      getTracks = vi.fn(() => this.tracks);
    }

    (globalThis as any).MediaStream = MockMediaStream;
  });

  const baseOptions = {
    socket: null,
    meetingId: 'meet-1',
    self: { id: 'user-a', name: 'User A' },
    localCamStream: null,
    localScreenStream: null,
  };

  it('should reuse existing RTCPeerConnection for the same socketId (idempotent)', () => {
    const { result } = renderHook(() => useWebRTCPeer(baseOptions));

    let pc1: any;
    let pc2: any;
    act(() => {
      pc1 = result.current.ensurePeer('sock-1', {
        userId: 'user-b',
        name: 'User B',
      });
      pc2 = result.current.ensurePeer('sock-1', {
        userId: 'user-b',
        name: 'User B',
      });
    });

    expect(pc1).toBe(pc2);
    expect(mockPcInstances.length).toBe(1);
  });

  it('should deterministically initiate when self.id < remoteUserId', () => {
    const { result } = renderHook(() =>
      useWebRTCPeer({
        ...baseOptions,
        self: { id: 'aaa', name: 'A' },
      }),
    );

    expect(result.current.shouldInitiate('zzz')).toBe(true);
    expect(result.current.shouldInitiate('aaa')).toBe(false);
  });

  it('should NOT initiate when self.id > remoteUserId', () => {
    const { result } = renderHook(() =>
      useWebRTCPeer({
        ...baseOptions,
        self: { id: 'zzz', name: 'Z' },
      }),
    );

    expect(result.current.shouldInitiate('aaa')).toBe(false);
    expect(result.current.shouldInitiate('')).toBe(false);
  });

  it('should close and remove peer when removePeer is called', () => {
    const { result } = renderHook(() => useWebRTCPeer(baseOptions));

    let pc: any;
    act(() => {
      pc = result.current.ensurePeer('sock-1', {
        userId: 'user-b',
        name: 'User B',
      });
    });

    act(() => {
      result.current.removePeer('sock-1');
    });

    expect(pc.close).toHaveBeenCalled();
    expect(result.current.peers.has('sock-1')).toBe(false);
  });

  it('should update peer media state correctly', () => {
    const { result } = renderHook(() => useWebRTCPeer(baseOptions));

    act(() => {
      result.current.ensurePeer('sock-1', {
        userId: 'user-b',
        name: 'User B',
      });
    });

    act(() => {
      result.current.updatePeerMediaState('sock-1', {
        audioEnabled: false,
        videoEnabled: false,
        isScreenSharing: true,
      });
    });

    const peer = result.current.peers.get('sock-1');
    expect(peer?.audioEnabled).toBe(false);
    expect(peer?.videoEnabled).toBe(false);
    expect(peer?.isScreenSharing).toBe(true);
  });

  it('should attach screen share without replacing camera track and renegotiate', async () => {
    const { result } = renderHook(() =>
      useWebRTCPeer({
        ...baseOptions,
        socket: mockSocket,
      }),
    );

    let pc: any;
    act(() => {
      pc = result.current.ensurePeer('sock-1', {
        userId: 'user-b',
        name: 'User B',
      });
    });

    await act(async () => {
      await result.current.attachScreenShare(mockStream);
    });

    expect(pc.addTrack).toHaveBeenCalledWith(mockTrack, expect.any(Object));
    expect(pc.removeTrack).not.toHaveBeenCalled();
    expect(mockSocket.emit).toHaveBeenCalledWith('screen-track-ready', {
      meetingId: 'meet-1',
      hasScreenTrack: true,
    });
  });

  it('should close all peer connections on teardownAll', () => {
    const { result } = renderHook(() => useWebRTCPeer(baseOptions));

    let pc1: any;
    let pc2: any;
    act(() => {
      pc1 = result.current.ensurePeer('sock-1', { userId: 'u1', name: 'U1' });
      pc2 = result.current.ensurePeer('sock-2', { userId: 'u2', name: 'U2' });
    });

    act(() => {
      result.current.teardownAll();
    });

    expect(pc1.close).toHaveBeenCalled();
    expect(pc2.close).toHaveBeenCalled();
    expect(result.current.peers.size).toBe(0);
  });
});
