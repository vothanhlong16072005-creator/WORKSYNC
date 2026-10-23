import { useCallback, useEffect, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import type { RemotePeer } from '../types/meeting.types';

export type { RemotePeer };

export interface UseWebRTCPeerOptions {
  socket: Socket | null;
  meetingId: string;
  self: { id: string; name: string; avatar?: string };
  localCamStream: MediaStream | null;
  localScreenStream: MediaStream | null;
}

export const CAM_STREAM_PREFIX = 'worksync-cam';
export const SCREEN_STREAM_PREFIX = 'worksync-screen';

export function useWebRTCPeer({
  socket,
  meetingId,
  self,
  localCamStream,
  localScreenStream,
}: UseWebRTCPeerOptions) {
  const [peers, setPeers] = useState<Map<string, RemotePeer>>(new Map());
  const peersRef = useRef<Map<string, RemotePeer>>(new Map());
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pcCacheRef = useRef<Map<string, string>>(new Map()); // socketId -> userId

  const localCamStreamRef = useRef<MediaStream | null>(localCamStream);
  const localScreenStreamRef = useRef<MediaStream | null>(localScreenStream);

  useEffect(() => {
    localCamStreamRef.current = localCamStream;
  }, [localCamStream]);

  useEffect(() => {
    localScreenStreamRef.current = localScreenStream;
  }, [localScreenStream]);

  const setPeersBoth = useCallback((next: Map<string, RemotePeer> | ((prev: Map<string, RemotePeer>) => Map<string, RemotePeer>)) => {
    if (typeof next === 'function') {
      setPeers((prev) => {
        const evaluated = next(prev);
        peersRef.current = evaluated;
        return evaluated;
      });
    } else {
      peersRef.current = next;
      setPeers(next);
    }
  }, []);

  /** Nguồn sự thật duy nhất cho RTCPeerConnection */
  const ensurePeer = useCallback(
    (
      remoteSocketId: string,
      meta: {
        userId: string;
        name: string;
        avatar?: string;
        audioEnabled?: boolean;
        videoEnabled?: boolean;
        screenSharing?: boolean;
      },
    ): RTCPeerConnection => {
      pcCacheRef.current.set(remoteSocketId, meta.userId);

      // 1. Reuse nếu đã có và chưa close
      const existingPc = pcsRef.current.get(remoteSocketId);
      if (existingPc && existingPc.connectionState !== 'closed') {
        return existingPc;
      }

      // 2. Tạo mới
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });
      pcsRef.current.set(remoteSocketId, pc);

      // 3. Gắn local tracks camera & mic từ ref (luôn là track mới nhất kể cả late joiner)
      const activeCam = localCamStreamRef.current;
      if (activeCam) {
        const camTrack = activeCam.getVideoTracks()[0];
        const micTrack = activeCam.getAudioTracks()[0];
        if (camTrack) {
          (camTrack as any).__worksyncKind = CAM_STREAM_PREFIX;
          const camStream = new MediaStream([camTrack]);
          try {
            Object.defineProperty(camStream, 'id', { value: `${CAM_STREAM_PREFIX}-${self.id}` });
          } catch {
            // Fallback if property define fails
          }
          pc.addTrack(camTrack, camStream);
        }
        if (micTrack) {
          pc.addTrack(micTrack, activeCam);
        }
      }

      // 4. Screen share nếu đang active — addTrack riêng cho late joiner
      const activeScreen = localScreenStreamRef.current;
      if (activeScreen) {
        const screenTrack = activeScreen.getVideoTracks()[0];
        if (screenTrack) {
          screenTrack.contentHint = 'detail';
          (screenTrack as any).__worksyncKind = SCREEN_STREAM_PREFIX;
          const screenStream = new MediaStream([screenTrack]);
          try {
            Object.defineProperty(screenStream, 'id', {
              value: `${SCREEN_STREAM_PREFIX}-${self.id}`,
            });
          } catch {
            // Fallback
          }
          pc.addTrack(screenTrack, screenStream);
        }
      }

      // 5. ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice-candidate', {
            targetSocketId: remoteSocketId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      // 6. Nhận remote tracks — phân biệt camera vs screen share chuẩn W3C
      pc.ontrack = (event) => {
        const track = event.track;
        const stream = event.streams[0] ?? new MediaStream([track]);
        const streamId = stream.id || '';

        const existingPeer = peersRef.current.get(remoteSocketId);
        const hasExistingCam = Boolean(
          existingPeer?.camStream &&
            existingPeer.camStream.getVideoTracks().length > 0 &&
            !existingPeer.camStream.getVideoTracks().includes(track),
        );

        const isScreen =
          track.kind === 'video' &&
          (track.contentHint === 'detail' ||
            streamId.startsWith(SCREEN_STREAM_PREFIX) ||
            /screen|window|display|monitor|desktop/i.test(track.label) ||
            hasExistingCam ||
            (Boolean(meta?.screenSharing) && !existingPeer?.screenStream));

        track.onended = () => {
          setPeersBoth((prev) => {
            const next = new Map(prev);
            const existing = next.get(remoteSocketId);
            if (existing) {
              next.set(remoteSocketId, {
                ...existing,
                [isScreen ? 'screenStream' : 'camStream']: null,
                isScreenSharing: isScreen ? false : existing.isScreenSharing,
              });
            }
            return next;
          });
        };

        setPeersBoth((prev) => {
          const next = new Map(prev);
          const existing = next.get(remoteSocketId);
          const target = isScreen ? 'screenStream' : 'camStream';

          if (!existing) {
            next.set(remoteSocketId, {
              socketId: remoteSocketId,
              userId: pcCacheRef.current.get(remoteSocketId) ?? meta.userId,
              name: meta.name || 'Đồng nghiệp',
              avatar: meta.avatar,
              camStream: isScreen ? null : stream,
              screenStream: isScreen ? stream : null,
              audioEnabled: meta.audioEnabled ?? true,
              videoEnabled: meta.videoEnabled ?? true,
              isScreenSharing: isScreen || (meta.screenSharing ?? false),
              connectionState: pc.connectionState,
            });
          } else {
            const updated: RemotePeer = {
              ...existing,
              [target]: track.readyState === 'ended' ? null : stream,
              connectionState: pc.connectionState,
              isScreenSharing: isScreen
                ? track.readyState !== 'ended'
                : (meta.screenSharing ?? existing.isScreenSharing),
            };
            next.set(remoteSocketId, updated);
          }
          return next;
        });
      };

      // 7. Connection state changes
      pc.onconnectionstatechange = () => {
        setPeersBoth((prev) => {
          const next = new Map(prev);
          const existing = next.get(remoteSocketId);
          if (existing) {
            next.set(remoteSocketId, { ...existing, connectionState: pc.connectionState });
          }
          return next;
        });
      };

      // 9. Đăng ký peer object ban đầu nếu chưa có
      setPeersBoth((prev) => {
        const next = new Map(prev);
        if (!next.has(remoteSocketId)) {
          next.set(remoteSocketId, {
            socketId: remoteSocketId,
            userId: meta.userId,
            name: meta.name || 'Đồng nghiệp',
            avatar: meta.avatar,
            camStream: null,
            screenStream: null,
            audioEnabled: meta.audioEnabled ?? true,
            videoEnabled: meta.videoEnabled ?? true,
            isScreenSharing: meta.screenSharing ?? false,
            connectionState: pc.connectionState,
          });
        }
        return next;
      });

      return pc;
    },
    [self.id, socket, setPeersBoth],
  );

  /** Deterministic initiator: Peer có id nhỏ hơn sẽ chủ động tạo offer */
  const shouldInitiate = useCallback(
    (remoteUserId: string): boolean => {
      if (!remoteUserId || remoteUserId === self.id) return false;
      return self.id < remoteUserId;
    },
    [self.id],
  );

  const makeOfferTo = useCallback(
    async (
      remoteSocketId: string,
      meta: {
        userId: string;
        name: string;
        avatar?: string;
        audioEnabled?: boolean;
        videoEnabled?: boolean;
        screenSharing?: boolean;
      },
    ) => {
      const pc = ensurePeer(remoteSocketId, meta);
      try {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(offer);
        socket?.emit('offer', {
          targetSocketId: remoteSocketId,
          offer: pc.localDescription,
          fromUser: { id: self.id, name: self.name, avatar: self.avatar },
        });
      } catch (err) {
        console.error('[WebRTC] createOffer failed', err);
      }
    },
    [ensurePeer, self, socket],
  );

  const removePeer = useCallback(
    (remoteSocketId: string) => {
      const pc = pcsRef.current.get(remoteSocketId);
      pc?.close();
      pcsRef.current.delete(remoteSocketId);
      pcCacheRef.current.delete(remoteSocketId);
      setPeersBoth((prev) => {
        const next = new Map(prev);
        next.delete(remoteSocketId);
        return next;
      });
    },
    [setPeersBoth],
  );

  /** Cập nhật trạng thái media của một peer từ sự kiện socket */
  const updatePeerMediaState = useCallback(
    (
      remoteSocketId: string,
      states: Partial<{ audioEnabled: boolean; videoEnabled: boolean; isScreenSharing: boolean }>,
    ) => {
      setPeersBoth((prev) => {
        const next = new Map(prev);
        const existing = next.get(remoteSocketId);
        if (existing) {
          next.set(remoteSocketId, {
            ...existing,
            ...states,
            screenStream: states.isScreenSharing === false ? null : existing.screenStream,
          });
        }
        return next;
      });
    },
    [setPeersBoth],
  );

  /** Khi bắt đầu share màn hình: addTrack mới + renegotiate với tất cả peers */
  const attachScreenShare = useCallback(
    async (screenStream: MediaStream) => {
      localScreenStreamRef.current = screenStream;
      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack) return;

      screenTrack.contentHint = 'detail';
      (screenTrack as any).__worksyncKind = SCREEN_STREAM_PREFIX;

      for (const [remoteSocketId, pc] of pcsRef.current.entries()) {
        const namedScreenStream = new MediaStream([screenTrack]);
        try {
          Object.defineProperty(namedScreenStream, 'id', {
            value: `${SCREEN_STREAM_PREFIX}-${self.id}`,
          });
        } catch {
          // Fallback
        }
        pc.addTrack(screenTrack, namedScreenStream);

        // Renegotiate
        const meta = peersRef.current.get(remoteSocketId);
        await makeOfferTo(remoteSocketId, {
          userId: meta?.userId ?? 'unknown',
          name: meta?.name ?? 'Đồng nghiệp',
          avatar: meta?.avatar,
          audioEnabled: meta?.audioEnabled,
          videoEnabled: meta?.videoEnabled,
          screenSharing: true,
        });
      }

      socket?.emit('screen-track-ready', { meetingId, hasScreenTrack: true });
    },
    [makeOfferTo, self.id, socket, meetingId],
  );

  /** Khi dừng share màn hình: gỡ track + renegotiate */
  const detachScreenShare = useCallback(async () => {
    localScreenStreamRef.current = null;
    for (const [remoteSocketId, pc] of pcsRef.current.entries()) {
      const senders = pc.getSenders().filter(
        (s) => s.track && (s.track as any).__worksyncKind === SCREEN_STREAM_PREFIX,
      );
      for (const sender of senders) {
        pc.removeTrack(sender);
      }
      const meta = peersRef.current.get(remoteSocketId);
      await makeOfferTo(remoteSocketId, {
        userId: meta?.userId ?? 'unknown',
        name: meta?.name ?? 'Đồng nghiệp',
        avatar: meta?.avatar,
        audioEnabled: meta?.audioEnabled,
        videoEnabled: meta?.videoEnabled,
        screenSharing: false,
      });
    }
    socket?.emit('screen-track-ready', { meetingId, hasScreenTrack: false });
  }, [makeOfferTo, socket, meetingId]);

  /** Dọn dẹp đóng tất cả PeerConnections */
  const teardownAll = useCallback(() => {
    pcsRef.current.forEach((pc) => {
      try {
        pc.close();
      } catch {
        // Ignore close error
      }
    });
    pcsRef.current.clear();
    pcCacheRef.current.clear();
    setPeersBoth(new Map());
  }, [setPeersBoth]);

  return {
    peers,
    ensurePeer,
    shouldInitiate,
    makeOfferTo,
    removePeer,
    updatePeerMediaState,
    attachScreenShare,
    detachScreenShare,
    teardownAll,
    pcsRef,
  };
}
