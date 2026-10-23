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
 *    so `event.streams[0].id` với danh sách này → phân loại chính xác,
 *    không đoán bằng heuristic.
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
  const micNamedStreamRef = useRef<MediaStream | null>(null);
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

  /**
   * Tạo named stream ổn định (dùng chung cho mọi PC) để msid nhất quán.
   * `Object.defineProperty` chỉ là fallback — msid thật được lấy từ SDP.
   */
  const ensureNamedStream = useCallback(
    (
      cached: MediaStream | null,
      setCached: (stream: MediaStream | null) => void,
      prefix: string,
      tracks: MediaStreamTrack[],
    ): MediaStream => {
      if (cached) {
        const sameTracks =
          cached.getTracks().length === tracks.length &&
          tracks.every((t) => cached.getTracks().includes(t));
        if (sameTracks) return cached;
      }

      const stream = new MediaStream(tracks);
      try {
        Object.defineProperty(stream, 'id', {
          value: `${prefix}-${self.id}`,
          configurable: true,
          enumerable: true,
        });
      } catch {
        // Fallback: trình duyệt chặn defineProperty → dùng msid từ SDP
      }
      setCached(stream);
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
    // ⚠️ Fingerprint chỉ chặn emit TRÙNG LẶT trong cùng một phiên kết nối.
    // Khi tạo PC mới (reconnect / renegotiate), msid có thể đổi → cần emit lại.
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

      const kinds = remoteKindsRef.current.get(remoteSocketId);
      // ⚠️ Mapping rỗng (chưa nhận được track-ids từ peer) KHÔNG được coi là
      // "đã biết" — nếu vậy track sẽ bị đẩy vào stillPending vĩnh viễn và
      // không bao giờ được gán vào camStream → tile hiện avatar thay vì camera.
      const hasUsableMapping = Boolean(
        kinds && (kinds.camStreamIds.length > 0 || kinds.screenStreamIds.length > 0),
      );

      const stillPending = new Map<string, PendingRemoteTrack>();
      let camEntry: PendingRemoteTrack | null = null;
      let screenEntry: PendingRemoteTrack | null = null;

      for (const [trackId, entry] of pending.entries()) {
        const explicit = classifyByKnownKinds(remoteSocketId, entry.stream.id);
        if (explicit === 'screen') {
          screenEntry = entry;
        } else if (explicit === 'cam') {
          camEntry = entry;
        } else if (!hasUsableMapping) {
          // Chưa có tín hiệu rõ ràng nào → dùng loại suy luận (fallback heuristic)
          if (entry.inferredKind === 'screen') screenEntry = entry;
          else camEntry = entry;
        } else {
          // Đã có mapping nhưng stream id này không khớp → chờ mapping đúng
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
      const previous = remoteKindsRef.current.get(remoteSocketId);

      // ⚠️ KHÔNG ghi đè mapping đã biết bằng mapping RỖNG.
      // `participant-joined` có thể tới SAU `meeting:track-ids` và mang
      // `camStreamIds: []` (lúc peer vừa vào chưa negotiate xong) → nếu ghi đè
      // thì phân loại camera/screen bị mất → camera hiện avatar.
      const incomingHasData =
        kinds.camStreamIds.length > 0 || kinds.screenStreamIds.length > 0;
      const previousHasData =
        previous && (previous.camStreamIds.length > 0 || previous.screenStreamIds.length > 0);

      if (previousHasData && !incomingHasData) return;

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
          const named = ensureNamedStream(
            camNamedStreamRef.current,
            (s) => {
              camNamedStreamRef.current = s;
            },
            CAM_STREAM_PREFIX,
            [camTrack],
          );
          trackKindRegistry.set(camTrack, 'cam');
          pc.addTrack(camTrack, named);
          added.add(camTrack.id);
          changed = true;
        }

        if (micTrack && !added.has(micTrack.id)) {
          const named = ensureNamedStream(
            micNamedStreamRef.current,
            (s) => {
              micNamedStreamRef.current = s;
            },
            CAM_STREAM_PREFIX,
            [micTrack],
          );
          trackKindRegistry.set(micTrack, 'cam');
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
          const named = ensureNamedStream(
            screenNamedStreamRef.current,
            (s) => {
              screenNamedStreamRef.current = s;
            },
            SCREEN_STREAM_PREFIX,
            [screenTrack],
          );
          trackKindRegistry.set(screenTrack, 'screen');
          pc.addTrack(screenTrack, named);
          added.add(screenTrack.id);
          changed = true;
        }
      }

      addedTrackIdsRef.current.set(remoteSocketId, added);
      return changed;
    },
    [ensureNamedStream],
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

      // ⭐ PC mới → msid sẽ khác → phải cho phép emit lại `meeting:track-ids`
      // để peer đồng bộ mapping camera/screen.
      lastEmittedKindsRef.current = '';

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
              // ⭐ Nhận được track video ⇒ peer ĐANG bật camera.
              // Không để mặc định `false` vì `RemoteVideoTile` dùng cờ này để
              // quyết định hiển thị khung video hay avatar + "Camera đang tắt".
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
   *
   * ⚠️ VẾT NGUY HIỂM: chỉ bên initiator gửi offer khi renegotiate là ĐÚNG để
   * tránh glare, nhưng nếu bên KHÔNG phải initiator là người vừa có camera
   * (media của họ đến muộn), thì bên initiator sẽ không bao giờ biết để gửi
   * offer → track mới không bao giờ được negotiate → camera của người đó
   * KHÔNG xuất hiện ở phía bên kia.
   *
   * Cách sửa: bên không phải initiator gửi tín hiệu `meeting:renegotiate-request`
   * → bên kia (initiator) nhận và chủ động gửi offer. Tín hiệu này chỉ mang
   * ý nghĩa "bạn cần gửi offer", không mang nội dung SDP → không thể gây glare.
   */
  const syncTracksToPeers = useCallback(async () => {
    let anyChanged = false;

    for (const [remoteSocketId, pc] of pcsRef.current.entries()) {
      if (pc.connectionState === 'closed') continue;

      const changed = addLocalTracksToPeer(pc, remoteSocketId);
      if (!changed) continue;
      anyChanged = true;

      const remoteUserId = pcCacheRef.current.get(remoteSocketId);
      if (!remoteUserId) continue;

      const meta = peersRef.current.get(remoteSocketId);

      if (shouldInitiate(remoteUserId)) {
        // Tôi là initiator → tôi gửi offer (đã có sẵn cơ chế rollback ở handleOffer)
        await makeOfferTo(remoteSocketId, {
          userId: remoteUserId,
          name: meta?.name ?? 'Đồng nghiệp',
          avatar: meta?.avatar,
          audioEnabled: meta?.audioEnabled,
          videoEnabled: meta?.videoEnabled,
          screenSharing: meta?.isScreenSharing ?? false,
        });
      } else {
        // Tôi không phải initiator → nhờ bên kia (initiator) gửi offer
        socket?.emit('meeting:renegotiate-request', {
          meetingId,
          targetSocketId: remoteSocketId,
          reason: 'media-ready',
        });
      }
    }

    if (anyChanged) {
      emitTrackIds();
    }
  }, [addLocalTracksToPeer, emitTrackIds, makeOfferTo, meetingId, shouldInitiate, socket]);

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
          // ⚠️ KHÔNG xóa `screenStream` khi cờ `isScreenSharing` về false.
          // Cờ này là metadata qua socket, có thể tới trễ/sai thứ tự → xóa stream
          // thật đã nhận được sẽ làm màn hình share biến mất ở phía người xem.
          // Stream thật tự được dọn qua `track.onended` khi peer ngừng share.
          next.set(remoteSocketId, {
            ...existing,
            ...states,
            isScreenSharing:
              states.isScreenSharing !== undefined
                ? states.isScreenSharing || Boolean(existing.screenStream)
                : existing.isScreenSharing,
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
          const named = ensureNamedStream(
            screenNamedStreamRef.current,
            (s) => {
              screenNamedStreamRef.current = s;
            },
            SCREEN_STREAM_PREFIX,
            [screenTrack],
          );
          pc.addTrack(screenTrack, named);
          added.add(screenTrack.id);
          addedTrackIdsRef.current.set(remoteSocketId, added);
        }

        // Renegotiate — chỉ initiator gửi offer để tránh glare.
        // Nếu tôi KHÔNG phải initiator → nhờ bên kia gửi offer, nếu không
        // màn hình share sẽ không bao giờ được negotiate → người xem không thấy.
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
        } else if (remoteUserId) {
          socket?.emit('meeting:renegotiate-request', {
            meetingId,
            targetSocketId: remoteSocketId,
            reason: 'screen-share',
          });
        }
      }

      emitTrackIds();
      socket?.emit('screen-track-ready', { meetingId, hasScreenTrack: true });
    },
    [emitTrackIds, ensureNamedStream, makeOfferTo, meetingId, shouldInitiate, socket],
  );

  /** Khi dừng share màn hình: gỡ track + renegotiate */
  const detachScreenShare = useCallback(async () => {
    localScreenStreamRef.current = null;
    screenNamedStreamRef.current = null;

    for (const [remoteSocketId, pc] of pcsRef.current.entries()) {
      const added = addedTrackIdsRef.current.get(remoteSocketId);
      const senders = pc.getSenders().filter((s) => {
        if (!s.track) return false;
        return trackKindRegistry.get(s.track) === 'screen';
      });
      for (const sender of senders) {
        const trackId = sender.track?.id;
        pc.removeTrack(sender);
        if (trackId && added) added.delete(trackId);
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
      } else if (remoteUserId) {
        // Không phải initiator → nhờ bên kia gửi offer để gỡ track screen
        socket?.emit('meeting:renegotiate-request', {
          meetingId,
          targetSocketId: remoteSocketId,
          reason: 'screen-share-stopped',
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
    micNamedStreamRef.current = null;
    screenNamedStreamRef.current = null;
    lastEmittedKindsRef.current = '';
    setPeersBoth(new Map());
  }, [setPeersBoth]);

  // Media tới sau khi PC đã tạo → gắn track + renegotiate (fix late joiner)
  //
  // ⚠️ Phải watch CẢ `localCamStream` VÀ `localScreenStream`:
  // - Camera có thể đến trước mic (hoặc ngược lại) → nếu chỉ watch cam thì
  //   lần sync đầu chưa có mic, mic tới sau sẽ không được addTrack.
  // - Screen share có thể bật trước khi camera stream sẵn sàng.
  useEffect(() => {
    if (!localCamStream && !localScreenStream) return;
    void syncTracksToPeers();
  }, [localCamStream, localScreenStream, syncTracksToPeers]);

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
