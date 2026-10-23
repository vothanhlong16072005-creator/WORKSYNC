/**
 * useWebRTCPeer Hook — Module M5
 *
 * Quản lý peer-to-peer WebRTC (mesh) cho phòng họp.
 *
 * ⚠️ Ba bug gốc được sửa ở đây:
 *
 * 1. PHÂN LOẠI CAMERA vs SCREEN SHARE (trước đây hoán đổi):
 *    `MediaStream.id` do `Object.defineProperty` gán đè KHÔNG phải là msid thật
 *    trong SDP (Chrome vẫn ghi UUID nội bộ) → prefix `worksync-cam/screen`
 *    không bao giờ match ở phía remote → camera bị gán nhầm thành screen
 *    và ngược lại → màn hình share không mở rộng, camera biến mất.
 *
 *    Cách sửa: sau khi `setLocalDescription`, parse `a=msid:` trong SDP cục bộ
 *    để lấy msid THẬT của từng track, rồi gửi qua Socket.IO. Phía remote
 *    so `event.streams[0].id` (hoặc msid từ remote SDP) với danh sách này
 *    → phân loại chính xác, không đoán.
 *
 * 2. RACE CONDITION MEDIA (late joiner không thấy camera):
 *    `getUserMedia()` là async, có thể resolve SAU khi `room-users` tới →
 *    RTCPeerConnection được tạo khi chưa có track → không gửi được camera.
 *    Cách sửa: `syncTracksToPeers()` gắn track vào các PC đã tồn tại và
 *    renegotiate khi media tới sau.
 *
 * 3. GLARE (xung đột offer):
 *    Chỉ bên "deterministic initiator" (self.id < remoteUserId) được gửi offer
 *    khi renegotiate → không có 2 offer cùng lúc.
 */
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

/** Loại media của một track remote */
export type RemoteTrackKind = 'cam' | 'screen';

/** Danh sách msid stream id do 1 peer gửi lên (dùng để phân loại track) */
export interface RemoteStreamKinds {
  camStreamIds: string[];
  screenStreamIds: string[];
}

interface PendingRemoteTrack {
  track: MediaStreamTrack;
  stream: MediaStream;
  /** Loại được suy luận khi chưa có tín hiệu rõ ràng từ peer */
  inferredKind: RemoteTrackKind;
}

/** Đánh dấu loại track mà không cần ép kiểu `any` lên MediaStreamTrack */
const trackKindRegistry = new WeakMap<MediaStreamTrack, RemoteTrackKind>();

/**
 * Parse msid stream id thật của một track từ SDP cục bộ.
 * SDP có dạng: `a=msid:<streamId> <trackId>` — trackId là id của track GỬI ĐI.
 */
function extractMsidStreamId(sdp: string, trackId: string): string | null {
  const pattern = /a=msid:(\S+)\s+(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(sdp)) !== null) {
    if (match[2] === trackId) return match[1];
  }
  return null;
}

/**
 * Parse remote SDP để lấy map `mid -> msid stream id`.
 * Dùng làm fallback khi `event.streams[0].id` không khớp (trình duyệt khác).
 */
function extractRemoteMsidMap(sdp: string): Map<string, string> {
  const result = new Map<string, string>();
  const sections = sdp.split(/m=/).slice(1);
  for (const section of sections) {
    const typeMatch = /^(\w+)/.exec(section);
    if (!typeMatch || typeMatch[1] !== 'video') continue;
    const midMatch = /a=mid:(\S+)/.exec(section);
    const msidMatch = /a=msid:(\S+)/.exec(section);
    if (midMatch && msidMatch) {
      result.set(midMatch[1], msidMatch[1]);
    }
  }
  return result;
}

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

  /** socketId -> set các track id đã add vào PC (tránh add trùng) */
  const addedTrackIdsRef = useRef<Map<string, Set<string>>>(new Map());
  /** socketId -> msid stream ids do peer đó gửi */
  const remoteKindsRef = useRef<Map<string, RemoteStreamKinds>>(new Map());
  /** socketId -> track remote chưa phân loại được (chờ tín hiệu từ peer) */
  const pendingTracksRef = useRef<Map<string, Map<string, PendingRemoteTrack>>>(new Map());
  /** Named stream dùng chung cho mọi PC → msid nhất quán giữa các peer */
  const camNamedStreamRef = useRef<MediaStream | null>(null);
  const screenNamedStreamRef = useRef<MediaStream | null>(null);
  /** Chống gửi trùng track-ids khi nội dung không đổi */
  const lastEmittedKindsRef = useRef<string>('');

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

  /** Deterministic initiator: Peer có id nhỏ hơn sẽ chủ động tạo offer */
  const shouldInitiate = useCallback(
    (remoteUserId: string): boolean => {
      if (!remoteUserId || remoteUserId === self.id) return false;
      return self.id < remoteUserId;
    },
    [self.id],
  );

  /** Tạo named stream ổn định (dùng chung cho mọi PC) để msid nhất quán */
  const getNamedStream = useCallback(
    (
      kind: RemoteTrackKind,
      videoTrack: MediaStreamTrack,
      audioTrack?: MediaStreamTrack,
    ): MediaStream => {
      const isCam = kind === 'cam';
      const cached = isCam ? camNamedStreamRef.current : screenNamedStreamRef.current;

      if (cached && cached.getVideoTracks()[0] === videoTrack) {
        return cached;
      }

      const tracks = audioTrack ? [videoTrack, audioTrack] : [videoTrack];
      const stream = new MediaStream(tracks);
      const prefix = isCam ? CAM_STREAM_PREFIX : SCREEN_STREAM_PREFIX;
      try {
        Object.defineProperty(stream, 'id', {
          value: `${prefix}-${self.id}`,
          configurable: true,
          enumerable: true,
        });
      } catch {
        // Fallback: trình duyệt chặn defineProperty → dùng msid từ SDP
      }
      trackKindRegistry.set(videoTrack, kind);

      if (isCam) {
        camNamedStreamRef.current = stream;
      } else {
        screenNamedStreamRef.current = stream;
      }
      return stream;
    },
    [self.id],
  );

  /**
   * Gửi msid THẬT của track camera/screen lên server để peer phân loại chính xác.
   * Được gọi sau mỗi lần setLocalDescription.
   */
  const emitTrackIds = useCallback(() => {
    const camTrack = localCamStreamRef.current?.getVideoTracks()[0];
    const screenTrack = localScreenStreamRef.current?.getVideoTracks()[0];
    if (!camTrack && !screenTrack) return;

    const camStreamIds: string[] = [];
    const screenStreamIds: string[] = [];

    for (const pc of pcsRef.current.values()) {
      const sdp = pc.localDescription?.sdp;
      if (!sdp) continue;

      if (camTrack) {
        const id = extractMsidStreamId(sdp, camTrack.id);
        if (id && !camStreamIds.includes(id)) camStreamIds.push(id);
      }
      if (screenTrack) {
        const id = extractMsidStreamId(sdp, screenTrack.id);
        if (id && !screenStreamIds.includes(id)) screenStreamIds.push(id);
      }
      if (camStreamIds.length > 0 || screenStreamIds.length > 0) break;
    }

    if (camStreamIds.length === 0 && screenStreamIds.length === 0) return;

    const payload = { meetingId, camStreamIds, screenStreamIds };
    const fingerprint = JSON.stringify(payload);
    if (fingerprint === lastEmittedKindsRef.current) return;
    lastEmittedKindsRef.current = fingerprint;

    socket?.emit('meeting:track-ids', payload);
  }, [meetingId, socket]);

  /**
   * Phân loại một stream remote dựa trên msid đã biết.
   * Trả về null nếu chưa đủ thông tin.
   */
  const classifyByKnownKinds = useCallback(
    (remoteSocketId: string, streamId: string): RemoteTrackKind | null => {
      const kinds = remoteKindsRef.current.get(remoteSocketId);
      if (!kinds) return null;
      if (kinds.screenStreamIds.includes(streamId)) return 'screen';
      if (kinds.camStreamIds.includes(streamId)) return 'cam';
      return null;
    },
    [],
  );

  /**
   * Áp dụng các track đã nhận (đã phân loại hoặc còn pending) vào state `peers`.
   * Được gọi lại mỗi khi có track mới hoặc có tín hiệu phân loại mới từ peer.
   */
  const applyRemoteTracks = useCallback(
    (remoteSocketId: string) => {
      const pending = pendingTracksRef.current.get(remoteSocketId);
      if (!pending || pending.size === 0) return;

      const hasExplicitKinds = remoteKindsRef.current.has(remoteSocketId);
      const stillPending = new Map<string, PendingRemoteTrack>();
      let camEntry: PendingRemoteTrack | null = null;
      let screenEntry: PendingRemoteTrack | null = null;

      for (const [trackId, entry] of pending.entries()) {
        const explicit = classifyByKnownKinds(remoteSocketId, entry.stream.id);
        if (explicit === 'screen') {
          screenEntry = entry;
        } else if (explicit === 'cam') {
          camEntry = entry;
        } else if (!hasExplicitKinds) {
          // Chưa có tín hiệu nào → dùng loại suy luận
          if (entry.inferredKind === 'screen') screenEntry = entry;
          else camEntry = entry;
        } else {
          stillPending.set(trackId, entry);
        }
      }

      pendingTracksRef.current.set(remoteSocketId, stillPending);

      setPeersBoth((prev) => {
        const next = new Map(prev);
        const existing = next.get(remoteSocketId);
        if (!existing) return prev;

        const camStream =
          camEntry && camEntry.track.readyState !== 'ended' ? camEntry.stream : null;
        const screenStream =
          screenEntry && screenEntry.track.readyState !== 'ended' ? screenEntry.stream : null;

        next.set(remoteSocketId, {
          ...existing,
          camStream,
          screenStream,
          isScreenSharing: Boolean(screenStream) || existing.isScreenSharing,
        });
        return next;
      });
    },
    [classifyByKnownKinds, setPeersBoth],
  );

  /** Nhận msid từ peer và phân loại lại các track đang chờ */
  const setRemoteStreamKinds = useCallback(
    (remoteSocketId: string, kinds: RemoteStreamKinds) => {
      remoteKindsRef.current.set(remoteSocketId, kinds);
      applyRemoteTracks(remoteSocketId);
    },
    [applyRemoteTracks],
  );

  /**
   * Gắn local track (camera + mic + screen) vào một PC nếu chưa có.
   * Trả về true nếu có thay đổi (cần renegotiate).
   */
  const addLocalTracksToPeer = useCallback(
    (pc: RTCPeerConnection, remoteSocketId: string): boolean => {
      const added = addedTrackIdsRef.current.get(remoteSocketId) ?? new Set<string>();
      let changed = false;

      const activeCam = localCamStreamRef.current;
      if (activeCam) {
        const camTrack = activeCam.getVideoTracks()[0];
        const micTrack = activeCam.getAudioTracks()[0];

        if (camTrack && !added.has(camTrack.id)) {
          const named = getNamedStream('cam', camTrack, micTrack);
          pc.addTrack(camTrack, named);
          added.add(camTrack.id);
          changed = true;
        }
        if (micTrack && !added.has(micTrack.id)) {
          const named = getNamedStream('cam', activeCam.getVideoTracks()[0] ?? micTrack, micTrack);
          pc.addTrack(micTrack, named);
          added.add(micTrack.id);
          changed = true;
        }
      }

      const activeScreen = localScreenStreamRef.current;
      if (activeScreen) {
        const screenTrack = activeScreen.getVideoTracks()[0];
        if (screenTrack && !added.has(screenTrack.id)) {
          screenTrack.contentHint = 'detail';
          const named = getNamedStream('screen', screenTrack);
          pc.addTrack(screenTrack, named);
          added.add(screenTrack.id);
          changed = true;
        }
      }

      addedTrackIdsRef.current.set(remoteSocketId, added);
      return changed;
    },
    [getNamedStream],
  );

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

      // 3. Gắn local tracks (camera & mic & screen) — luôn làm cho cả 2 chiều
      addLocalTracksToPeer(pc, remoteSocketId);

      // 4. ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('ice-candidate', {
            targetSocketId: remoteSocketId,
            candidate: event.candidate.toJSON(),
          });
        }
      };

      // 5. Nhận remote tracks — phân loại bằng msid thật
      pc.ontrack = (event) => {
        const track = event.track;
        const stream = event.streams[0] ?? new MediaStream([track]);

        // Fallback: msid từ remote SDP (mỗi m-line có 1 mid)
        let resolvedStreamId = stream.id || '';
        if (!resolvedStreamId) {
          const remoteSdp = pc.remoteDescription?.sdp;
          const mid = event.transceiver?.mid;
          if (remoteSdp && mid) {
            resolvedStreamId = extractRemoteMsidMap(remoteSdp).get(mid) ?? '';
          }
        }

        // Suy luận khi chưa có tín hiệu rõ ràng từ peer
        const existingPeer = peersRef.current.get(remoteSocketId);
        const hasExistingCam = Boolean(
          existingPeer?.camStream &&
            existingPeer.camStream.getVideoTracks().length > 0 &&
            !existingPeer.camStream.getVideoTracks().includes(track),
        );
        const inferredKind: RemoteTrackKind =
          track.kind === 'video' &&
          (track.contentHint === 'detail' ||
            /screen|window|display|monitor|desktop/i.test(track.label) ||
            hasExistingCam ||
            (Boolean(meta?.screenSharing) && !existingPeer?.screenStream))
            ? 'screen'
            : 'cam';

        const pending = pendingTracksRef.current.get(remoteSocketId) ?? new Map();
        pending.set(track.id, { track, stream, inferredKind });
        pendingTracksRef.current.set(remoteSocketId, pending);

        track.onended = () => {
          setPeersBoth((prev) => {
            const next = new Map(prev);
            const existing = next.get(remoteSocketId);
            if (existing) {
              const isScreen = existing.screenStream === stream;
              next.set(remoteSocketId, {
                ...existing,
                [isScreen ? 'screenStream' : 'camStream']: null,
                isScreenSharing: isScreen ? false : existing.isScreenSharing,
              });
            }
            return next;
          });
        };

        applyRemoteTracks(remoteSocketId);

        // Đăng ký peer object nếu chưa có (để UI render tile ngay)
        setPeersBoth((prev) => {
          const next = new Map(prev);
          if (!next.has(remoteSocketId)) {
            next.set(remoteSocketId, {
              socketId: remoteSocketId,
              userId: pcCacheRef.current.get(remoteSocketId) ?? meta.userId,
              name: meta.name || 'Đồng nghiệp',
              avatar: meta.avatar,
              camStream: null,
              screenStream: null,
              audioEnabled: meta.audioEnabled ?? true,
              videoEnabled: meta.videoEnabled ?? true,
              isScreenSharing: meta.screenSharing ?? false,
              connectionState: pc.connectionState,
            });
          } else {
            const existing = next.get(remoteSocketId)!;
            next.set(remoteSocketId, { ...existing, connectionState: pc.connectionState });
          }
          return next;
        });
      };

      // 6. Connection state changes
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

      // 7. Đăng ký peer object ban đầu nếu chưa có
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
    [addLocalTracksToPeer, applyRemoteTracks, self.id, setPeersBoth, socket],
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
        // SDP đã có msid thật → gửi lên để peer phân loại track chính xác
        emitTrackIds();
      } catch (err) {
        console.error('[WebRTC] createOffer failed', err);
      }
    },
    [emitTrackIds, ensurePeer, self, socket],
  );

  /**
   * Gắn track vào các PC đã tồn tại khi media tới SAU (fix race late joiner).
   * Chỉ initiator được gửi offer → tránh glare.
   */
  const syncTracksToPeers = useCallback(async () => {
    let anyChanged = false;

    for (const [remoteSocketId, pc] of pcsRef.current.entries()) {
      if (pc.connectionState === 'closed') continue;

      const changed = addLocalTracksToPeer(pc, remoteSocketId);
      if (!changed) continue;
      anyChanged = true;

      const remoteUserId = pcCacheRef.current.get(remoteSocketId);
      if (remoteUserId && shouldInitiate(remoteUserId)) {
        const meta = peersRef.current.get(remoteSocketId);
        await makeOfferTo(remoteSocketId, {
          userId: remoteUserId,
          name: meta?.name ?? 'Đồng nghiệp',
          avatar: meta?.avatar,
          audioEnabled: meta?.audioEnabled,
          videoEnabled: meta?.videoEnabled,
          screenSharing: meta?.isScreenSharing ?? false,
        });
      }
    }

    if (anyChanged) {
      emitTrackIds();
    }
  }, [addLocalTracksToPeer, emitTrackIds, makeOfferTo, shouldInitiate]);

  const removePeer = useCallback(
    (remoteSocketId: string) => {
      const pc = pcsRef.current.get(remoteSocketId);
      pc?.close();
      pcsRef.current.delete(remoteSocketId);
      pcCacheRef.current.delete(remoteSocketId);
      addedTrackIdsRef.current.delete(remoteSocketId);
      remoteKindsRef.current.delete(remoteSocketId);
      pendingTracksRef.current.delete(remoteSocketId);
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
      trackKindRegistry.set(screenTrack, 'screen');

      for (const [remoteSocketId, pc] of pcsRef.current.entries()) {
        const added = addedTrackIdsRef.current.get(remoteSocketId) ?? new Set<string>();
        if (!added.has(screenTrack.id)) {
          const named = getNamedStream('screen', screenTrack);
          pc.addTrack(screenTrack, named);
          added.add(screenTrack.id);
          addedTrackIdsRef.current.set(remoteSocketId, added);
        }

        // Renegotiate — chỉ initiator gửi offer để tránh glare
        const remoteUserId = pcCacheRef.current.get(remoteSocketId);
        const meta = peersRef.current.get(remoteSocketId);
        if (remoteUserId && shouldInitiate(remoteUserId)) {
          await makeOfferTo(remoteSocketId, {
            userId: remoteUserId,
            name: meta?.name ?? 'Đồng nghiệp',
            avatar: meta?.avatar,
            audioEnabled: meta?.audioEnabled,
            videoEnabled: meta?.videoEnabled,
            screenSharing: true,
          });
        }
      }

      emitTrackIds();
      socket?.emit('screen-track-ready', { meetingId, hasScreenTrack: true });
    },
    [emitTrackIds, getNamedStream, makeOfferTo, meetingId, self.id, shouldInitiate, socket],
  );

  /** Khi dừng share màn hình: gỡ track + renegotiate */
  const detachScreenShare = useCallback(async () => {
    localScreenStreamRef.current = null;
    screenNamedStreamRef.current = null;

    for (const [remoteSocketId, pc] of pcsRef.current.entries()) {
      const senders = pc.getSenders().filter((s) => {
        if (!s.track) return false;
        const kind = trackKindRegistry.get(s.track);
        return kind === 'screen';
      });
      for (const sender of senders) {
        pc.removeTrack(sender);
        const added = addedTrackIdsRef.current.get(remoteSocketId);
        if (added && s_trackId(sender)) added.delete(s_trackId(sender)!);
      }

      const remoteUserId = pcCacheRef.current.get(remoteSocketId);
      const meta = peersRef.current.get(remoteSocketId);
      if (remoteUserId && shouldInitiate(remoteUserId)) {
        await makeOfferTo(remoteSocketId, {
          userId: remoteUserId,
          name: meta?.name ?? 'Đồng nghiệp',
          avatar: meta?.avatar,
          audioEnabled: meta?.audioEnabled,
          videoEnabled: meta?.videoEnabled,
          screenSharing: false,
        });
      }
    }

    lastEmittedKindsRef.current = '';
    emitTrackIds();
    socket?.emit('screen-track-ready', { meetingId, hasScreenTrack: false });
  }, [emitTrackIds, makeOfferTo, meetingId, shouldInitiate, socket]);

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
    addedTrackIdsRef.current.clear();
    remoteKindsRef.current.clear();
    pendingTracksRef.current.clear();
    camNamedStreamRef.current = null;
    screenNamedStreamRef.current = null;
    lastEmittedKindsRef.current = '';
    setPeersBoth(new Map());
  }, [setPeersBoth]);

  // Media tới sau khi PC đã tạo → gắn track + renegotiate (fix late joiner)
  useEffect(() => {
    if (!localCamStream) return;
    void syncTracksToPeers();
  }, [localCamStream, syncTracksToPeers]);

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
    setRemoteStreamKinds,
    emitTrackIds,
  };
}

/** Lấy track id của một sender (helper an toàn, không dùng `any`) */
function s_trackId(sender: RTCRtpSender): string | null {
  return sender.track?.id ?? null;
}
