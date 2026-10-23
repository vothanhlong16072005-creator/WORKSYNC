import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  FileText,
  MessageSquare,
  Mic,
  MicOff,
  MonitorOff,
  MonitorUp,
  PhoneOff,
  Sparkles,
  Users,
  Video,
  VideoOff,
  Maximize2,
  Minimize2,
  PictureInPicture,
  Pin,
  Crown,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import { useActiveCallStore } from '../stores/active-call.store';
import { meetingApi } from '../api/meeting.api';
import type { Meeting, ChatMessage } from '../types/meeting.types';
import { useLiveTranscription } from '../hooks/useLiveTranscription';
import { useWebRTCPeer, type RemotePeer } from '../hooks/useWebRTCPeer';
import { InMeetingChat } from './InMeetingChat';
import { LiveCaptionOverlay } from './LiveCaptionOverlay';
import { MeetingAiDrawer } from './MeetingAiDrawer';
import { MinutesEditor } from './MinutesEditor';
import { MeetingParticipantsDrawer } from './MeetingParticipantsDrawer';
import { HostEndMeetingModal } from './HostEndMeetingModal';

export const PersistentCallManager: React.FC = () => {
  const { activeMeeting, clearActiveMeeting } = useActiveCallStore();
  const location = useLocation();
  const navigate = useNavigate();

  if (!activeMeeting) return null;

  // If user navigated to report page, meeting call should not float on top
  if (location.pathname.startsWith(`/meetings/${activeMeeting.id}/report`)) {
    return null;
  }

  const isFullRoomRoute = location.pathname === `/meetings/${activeMeeting.id}/room`;

  return (
    <ActiveCallSession
      meeting={activeMeeting}
      isFullView={isFullRoomRoute}
      onMinimize={() => navigate('/dashboard')}
      onMaximize={() => navigate(`/meetings/${activeMeeting.id}/room`)}
      onLeave={() => {
        clearActiveMeeting();
        navigate('/meetings');
      }}
      onMeetingEnded={() => {
        clearActiveMeeting();
        navigate(`/meetings/${activeMeeting.id}/report`);
      }}
    />
  );
};

interface ActiveCallSessionProps {
  meeting: Meeting;
  isFullView: boolean;
  onMinimize: () => void;
  onMaximize: () => void;
  onLeave: () => void;
  onMeetingEnded: () => void;
}

const ActiveCallSession: React.FC<ActiveCallSessionProps> = ({
  meeting,
  isFullView,
  onMinimize,
  onMaximize,
  onLeave,
  onMeetingEnded,
}) => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);
  const socketRef = useRef<Socket | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const presenterVideoRef = useRef<HTMLVideoElement>(null);
  const miniVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Media toggles
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [localScreenStream, setLocalScreenStream] = useState<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const toggleScreenShareRef = useRef<() => Promise<void>>(async () => {});

  // Spotlighting & Pinning
  const [spotlightUserId, setSpotlightUserId] = useState<string | null>(null);

  // Side drawers & Chat state
  const [isChatOpen, setIsChatOpen] = useState(false);
  const isChatOpenRef = useRef(isChatOpen);
  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
  }, [isChatOpen]);

  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatUnread, setChatUnread] = useState(0);

  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isMinutesOpen, setIsMinutesOpen] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);

  // WebRTC Peer Hook
  const {
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
  } = useWebRTCPeer({
    socket,
    meetingId: meeting.id,
    self: {
      id: user?.id ?? 'anon',
      name: user?.name ?? 'Ẩn danh',
      avatar: user?.avatar,
    },
    localCamStream: localStream,
    localScreenStream: localScreenStream,
  });

  /** userId của những người ĐÃ rời phòng (để tách khỏi nhóm "Chưa tham gia") */
  const [leftUserIds, setLeftUserIds] = useState<string[]>([]);
  /** Attendee mới nhất từ server (refresh khi mở drawer) */
  const [liveAttendees, setLiveAttendees] = useState<Meeting['attendees']>(meeting.attendees ?? []);
  /** Mirror của `peers` để đọc trong các socket handler không re-subscribe */
  const peersRef = useRef<Map<string, RemotePeer>>(new Map());

  useEffect(() => {
    peersRef.current = peers;
  }, [peers]);

  // ICE Candidates Buffer
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());

  const flushPendingCandidates = useCallback(async (remoteSocketId: string, pc: RTCPeerConnection) => {
    const list = pendingCandidatesRef.current.get(remoteSocketId);
    if (!list?.length) return;
    for (const c of list) {
      await pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
    }
    pendingCandidatesRef.current.delete(remoteSocketId);
  }, []);

  // Live Transcription & AI Assistant
  const {
    isTranscribing,
    transcripts,
    currentCaption,
    startTranscription,
    stopTranscription,
  } = useLiveTranscription({
    meetingId: meeting.id,
    socket,
    currentUser: user
      ? { id: user.id, name: user.name, role: user.role, avatar: user.avatar }
      : null,
    audioEnabled,
  });

  const canManageMeeting =
    user?.id === meeting.createdById ||
    user?.role === 'ADMIN' ||
    user?.role === 'PM' ||
    user?.role === 'DEPARTMENT_HEAD';

  // Duration timer
  const [durationSeconds, setDurationSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setDurationSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (secs: number) => {
    const hrs = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 3-Tầng Cleanup: React unmount, beforeunload, visibilitychange (FIX BUG-6)
  const stopAllMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setLocalStream(null);
    setIsScreenSharing(false);
  }, []);

  const handleLeaveCall = useCallback(() => {
    const s = socketRef.current;
    if (s?.connected) {
      s.emit('leave-room', { meetingId: meeting.id });
      s.disconnect();
    }
    socketRef.current = null;
    teardownAll();
    stopAllMedia();
    onLeave();
  }, [meeting.id, onLeave, stopAllMedia, teardownAll]);

  const handleEndForAll = useCallback(() => {
    const s = socketRef.current;
    if (s?.connected && user?.id) {
      s.emit('meeting:end-for-all', { meetingId: meeting.id, userId: user.id });
    }
    teardownAll();
    stopAllMedia();
    setIsEndModalOpen(false);
    onMeetingEnded();
  }, [meeting.id, onMeetingEnded, stopAllMedia, teardownAll, user?.id]);

  // Media Lifecycle Init & Cleanup
  useEffect(() => {
    let mounted = true;

    const initMedia = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: { echoCancellation: true, noiseSuppression: true },
        });
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        localStreamRef.current = stream;
        setLocalStream(stream);

        // ⭐ Đồng bộ trạng thái toggle với thực tế media.
        // Nếu camera thực sự không có track (chỉ có mic), phải tắt cờ `videoEnabled`
        // để icon camera hiển thị đúng — trước đây cờ vẫn `true` (mặc định) khiến
        // UI hiện icon "camera bật" nhưng tile lại báo "Camera đang tắt" (mâu thuẫn).
        const hasVideoTrack = stream.getVideoTracks().length > 0;
        setVideoEnabled(hasVideoTrack);
        socketRef.current?.emit('media-state-changed', {
          meetingId: meeting.id,
          audioEnabled: stream.getAudioTracks().length > 0,
          videoEnabled: hasVideoTrack,
          screenSharing: false,
        });
      } catch (err) {
        console.warn('[Media] getUserMedia failed, continuing in view-only mode', err);
        // Không có camera/mic → cập nhật cờ cho khớp thực tế
        setAudioEnabled(false);
        setVideoEnabled(false);
        socketRef.current?.emit('media-state-changed', {
          meetingId: meeting.id,
          audioEnabled: false,
          videoEnabled: false,
          screenSharing: false,
        });
        toast.warning(t('meeting_room.camera_denied', 'Không thể truy cập camera hoặc mic. Đang ở chế độ xem.'));
      }
    };

    void initMedia();

    const handleBeforeUnload = () => {
      stopAllMedia();
      if (socketRef.current?.connected) {
        socketRef.current.emit('leave-room', { meetingId: meeting.id });
        socketRef.current.disconnect();
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && !socketRef.current?.connected) {
        handleBeforeUnload();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mounted = false;
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopAllMedia();
      teardownAll();
    };
  }, [meeting.id, stopAllMedia, teardownAll, t]);

  // Socket Connection Setup
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_URL
      ? import.meta.env.VITE_API_URL.replace('/api', '')
      : 'http://localhost:4000';

    const s = io(`${socketUrl}/meetings`, {
      transports: ['websocket', 'polling'],
    });

    setSocket(s);
    socketRef.current = s;

    s.on('connect', () => {
      s.emit('join-room', {
        meetingId: meeting.id,
        user: {
          id: user?.id,
          name: user?.name,
          avatar: user?.avatar,
          role: user?.role,
        },
      });
      s.emit('request-chat-history', { meetingId: meeting.id });
    });

    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, [meeting.id, user]);

  // WebRTC Signaling & Socket Event Handlers (FIX BUG-1, BUG-2)
  useEffect(() => {
    if (!socket) return;

    // 1. room-users
    const handleRoomUsers = ({
      participants,
      self,
    }: {
      participants: Array<{
        socketId: string;
        userId: string;
        name: string;
        avatar?: string;
        audioEnabled: boolean;
        videoEnabled: boolean;
        screenSharing: boolean;
        camStreamIds?: string[];
        screenStreamIds?: string[];
      }>;
      self?: { audioEnabled: boolean; videoEnabled: boolean; screenSharing: boolean };
    }) => {
      if (self) {
        // ⚠️ KHÔNG ghi đè trạng thái local bằng giá trị từ server.
        // Server mặc định `audioEnabled: true, videoEnabled: true` khi vào phòng,
        // còn client có thể đã tắt camera trước đó (hoặc camera thực sự không có
        // track) → ghi đè làm icon camera bật trong khi tile báo "Camera đang tắt".
        // Chỉ áp dụng `self` khi client CHƯA có media nào (lần đầu vào phòng).
        if (!localStreamRef.current) {
          setAudioEnabled(self.audioEnabled);
          setVideoEnabled(self.videoEnabled);
        }
      }

      for (const p of participants) {
        if (p.userId === user?.id) continue;

        // Nạp msid thật của peer để phân loại camera/screen chính xác
        setRemoteStreamKinds(p.socketId, {
          camStreamIds: p.camStreamIds ?? [],
          screenStreamIds: p.screenStreamIds ?? [],
        });

        if (shouldInitiate(p.userId)) {
          void makeOfferTo(p.socketId, {
            userId: p.userId,
            name: p.name,
            avatar: p.avatar,
            audioEnabled: p.audioEnabled,
            videoEnabled: p.videoEnabled,
            screenSharing: p.screenSharing,
          });
        } else {
          ensurePeer(p.socketId, {
            userId: p.userId,
            name: p.name,
            avatar: p.avatar,
            audioEnabled: p.audioEnabled,
            videoEnabled: p.videoEnabled,
            screenSharing: p.screenSharing,
          });
        }
      }
    };
    socket.on('room-users', handleRoomUsers);

    // 1b. track-ids — msid thật từ peer (camera vs screen share)
    const handleTrackIds = (data: {
      socketId: string;
      userId?: string;
      camStreamIds?: string[];
      screenStreamIds?: string[];
    }) => {
      if (!data?.socketId) return;
      setRemoteStreamKinds(data.socketId, {
        camStreamIds: data.camStreamIds ?? [],
        screenStreamIds: data.screenStreamIds ?? [],
      });
    };
    socket.on('meeting:track-ids', handleTrackIds);

    // 2. participant-joined
    const handleParticipantJoined = (p: {
      socketId: string;
      userId: string;
      name: string;
      avatar?: string;
      audioEnabled: boolean;
      videoEnabled: boolean;
      screenSharing: boolean;
      camStreamIds?: string[];
      screenStreamIds?: string[];
    }) => {
      if (p.userId === user?.id) return;
      toast.info(t('meeting_room.peer_joined', '{{name}} đã tham gia', { name: p.name }));

      // Người này quay lại phòng → bỏ khỏi danh sách "đã rời"
      setLeftUserIds((prev) => prev.filter((id) => id !== p.userId));

      // ⭐ Nạp msid track của peer → phân loại camera/screen chính xác ngay
      setRemoteStreamKinds(p.socketId, {
        camStreamIds: p.camStreamIds ?? [],
        screenStreamIds: p.screenStreamIds ?? [],
      });

      if (shouldInitiate(p.userId)) {
        void makeOfferTo(p.socketId, {
          userId: p.userId,
          name: p.name,
          avatar: p.avatar,
          audioEnabled: p.audioEnabled,
          videoEnabled: p.videoEnabled,
          screenSharing: p.screenSharing,
        });
      } else {
        ensurePeer(p.socketId, {
          userId: p.userId,
          name: p.name,
          avatar: p.avatar,
          audioEnabled: p.audioEnabled,
          videoEnabled: p.videoEnabled,
          screenSharing: p.screenSharing,
        });
      }
    };
    socket.on('participant-joined', handleParticipantJoined);

    // 3. offer
    const handleOffer = async ({
      offer,
      fromSocketId,
      fromUser,
    }: {
      offer: RTCSessionDescriptionInit;
      fromSocketId: string;
      fromUser?: { id: string; name: string; avatar?: string };
    }) => {
      if (fromSocketId === socket.id) return;

      // Lấy meta hiện có (nếu đã biết) để truyền đủ screenSharing/audio/video
      const knownPeer = peersRef.current.get(fromSocketId);

      const pc = ensurePeer(fromSocketId, {
        userId: fromUser?.id || 'unknown',
        name: fromUser?.name || 'Đồng nghiệp',
        avatar: fromUser?.avatar,
        audioEnabled: knownPeer?.audioEnabled,
        videoEnabled: knownPeer?.videoEnabled,
        screenSharing: knownPeer?.isScreenSharing,
      });

      const offerCollision =
        pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer';
      if (offerCollision) {
        await pc.setLocalDescription({ type: 'rollback' }).catch(() => {});
      }

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      await flushPendingCandidates(fromSocketId, pc);

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('answer', {
        targetSocketId: fromSocketId,
        answer: pc.localDescription,
      });

      // SDP local đã có msid thật → gửi lên để peer phân loại track
      emitTrackIds();
    };
    socket.on('offer', handleOffer);

    // 4. answer
    const handleAnswer = async ({
      answer,
      fromSocketId,
    }: {
      answer: RTCSessionDescriptionInit;
      fromSocketId: string;
    }) => {
      const pc = pcsRef.current.get(fromSocketId);
      if (!pc) return;
      if (pc.signalingState !== 'have-local-offer') {
        console.warn('[WebRTC] unexpected answer state', pc.signalingState);
        return;
      }
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      await flushPendingCandidates(fromSocketId, pc);
    };
    socket.on('answer', handleAnswer);

    // 5. ice-candidate
    const handleIceCandidate = async ({
      candidate,
      fromSocketId,
    }: {
      candidate: RTCIceCandidateInit;
      fromSocketId: string;
    }) => {
      const pc = pcsRef.current.get(fromSocketId);
      if (!pc || !candidate) return;

      if (pc.remoteDescription) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
      } else {
        const list = pendingCandidatesRef.current.get(fromSocketId) ?? [];
        list.push(candidate);
        pendingCandidatesRef.current.set(fromSocketId, list);
      }
    };
    socket.on('ice-candidate', handleIceCandidate);

    // 5b. renegotiate-request
    //
    // Bên kia vừa có media mới (camera/screen) nhưng không phải initiator nên
    // không thể tự gửi offer. Yêu cầu này bảo tôi (initiator) gửi offer mới
    // để track mới được negotiate → camera của họ mới xuất hiện được ở phía tôi.
    const handleRenegotiateRequest = async ({
      fromSocketId,
    }: {
      fromSocketId: string;
      meetingId?: string;
      reason?: string;
    }) => {
      if (!fromSocketId || fromSocketId === socket.id) return;

      const remoteUserId = peersRef.current.get(fromSocketId)?.userId;
      const known = peersRef.current.get(fromSocketId);

      // Chỉ initiator mới gửi offer → tránh glare
      if (!remoteUserId || !shouldInitiate(remoteUserId)) return;

      await makeOfferTo(fromSocketId, {
        userId: remoteUserId,
        name: known?.name ?? 'Đồng nghiệp',
        avatar: known?.avatar,
        audioEnabled: known?.audioEnabled,
        videoEnabled: known?.videoEnabled,
        screenSharing: known?.isScreenSharing ?? false,
      });
    };
    socket.on('meeting:renegotiate-request', handleRenegotiateRequest);

    // 6. user-media-state
    const handleUserMediaState = ({
      socketId,
      audioEnabled: audio,
      videoEnabled: video,
      screenSharing,
    }: {
      socketId: string;
      audioEnabled: boolean;
      videoEnabled: boolean;
      screenSharing: boolean;
    }) => {
      updatePeerMediaState(socketId, {
        audioEnabled: audio,
        videoEnabled: video,
        isScreenSharing: screenSharing,
      });
    };
    socket.on('user-media-state', handleUserMediaState);

    // 7. participant-left
    const handleParticipantLeft = ({
      socketId,
      userId,
    }: {
      socketId: string;
      userId?: string;
    }) => {
      const p = peersRef.current.get(socketId);
      const leftUserId = userId ?? p?.userId;
      if (p) {
        toast.info(t('meeting_room.peer_left', '{{name}} đã rời cuộc họp', { name: p.name }));
      }
      // Ghi nhận user đã rời → hiển thị nhóm "Đã rời cuộc họp" thay vì "Chưa tham gia"
      if (leftUserId) {
        setLeftUserIds((prev) => (prev.includes(leftUserId) ? prev : [...prev, leftUserId]));
      }
      removePeer(socketId);
    };
    socket.on('participant-left', handleParticipantLeft);

    // 8. chat-history (FIX BUG-2)
    const handleChatHistory = ({ messages: msgs }: { messages: ChatMessage[] }) => {
      if (Array.isArray(msgs)) {
        setChatHistory(msgs);
      }
    };
    socket.on('chat-history', handleChatHistory);

    // 9. chat-message tracker & unread counter (FIX BUG-5)
    const handleChatMessage = (msg: ChatMessage) => {
      if (msg && msg.id) {
        setChatHistory((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }
      if (!isChatOpenRef.current) {
        setChatUnread((prev) => prev + 1);
      }
    };
    socket.on('chat-message', handleChatMessage);

    // 10. meeting:ended
    const handleMeetingEnded = ({ message }: { message: string }) => {
      toast.info(message || t('meeting_room.ended_by_host', 'Người chủ trì đã kết thúc cuộc họp.'));
      socket.disconnect();
      socketRef.current = null;
      teardownAll();
      stopAllMedia();
      onMeetingEnded();
    };
    socket.on('meeting:ended', handleMeetingEnded);

    return () => {
      socket.off('room-users', handleRoomUsers);
      socket.off('meeting:track-ids', handleTrackIds);
      socket.off('participant-joined', handleParticipantJoined);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('meeting:renegotiate-request', handleRenegotiateRequest);
      socket.off('user-media-state', handleUserMediaState);
      socket.off('participant-left', handleParticipantLeft);
      socket.off('chat-history', handleChatHistory);
      socket.off('chat-message', handleChatMessage);
      socket.off('meeting:ended', handleMeetingEnded);
    };
  }, [
    socket,
    user?.id,
    shouldInitiate,
    makeOfferTo,
    ensurePeer,
    removePeer,
    updatePeerMediaState,
    setRemoteStreamKinds,
    emitTrackIds,
    teardownAll,
    stopAllMedia,
    onMeetingEnded,
    t,
    flushPendingCandidates,
    pcsRef,
  ]);

  // Refresh danh sách attendee từ server khi mở drawer (để cập nhật RSVP/người tham gia)
  useEffect(() => {
    if (!isParticipantsOpen) return;
    let cancelled = false;
    void meetingApi
      .getAttendees(meeting.id)
      .then((list) => {
        if (!cancelled && Array.isArray(list)) {
          setLiveAttendees(list as unknown as Meeting['attendees']);
        }
      })
      .catch(() => {
        // Giữ nguyên snapshot cũ nếu request thất bại
      });
    return () => {
      cancelled = true;
    };
  }, [isParticipantsOpen, meeting.id]);

  // Audio Toggle
  const toggleAudio = () => {
    const nextState = !audioEnabled;
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = nextState));
      setAudioEnabled(nextState);
    }
    socketRef.current?.emit('media-state-changed', {
      meetingId: meeting.id,
      audioEnabled: nextState,
      videoEnabled,
      screenSharing: isScreenSharing,
    });
  };

  // Video Toggle
  const toggleVideo = () => {
    // ⚠️ Chỉ cho phép bật/tắt khi thực sự có camera track.
    // Nếu không có track (camera bị từ chối / thiết bị bị chiếm), báo lỗi rõ ràng
    // thay vì lật cờ `videoEnabled` → UI hiện icon "camera bật" nhưng không có video.
    const camTracks = localStreamRef.current?.getVideoTracks() ?? [];
    if (camTracks.length === 0) {
      toast.warning(
        t(
          'meeting_room.camera_unavailable',
          'Không tìm thấy camera. Vui lòng kiểm tra thiết bị hoặc quyền truy cập camera của trình duyệt.',
        ),
      );
      setVideoEnabled(false);
      return;
    }

    const nextState = !videoEnabled;
    camTracks.forEach((track) => {
      track.enabled = nextState;
    });
    setVideoEnabled(nextState);
    socketRef.current?.emit('media-state-changed', {
      meetingId: meeting.id,
      audioEnabled,
      videoEnabled: nextState,
      screenSharing: isScreenSharing,
    });
  };

  // Screen Share Toggle with Dual-Track (FIX BUG-3 & BUG-4)
  const toggleScreenShare = useCallback(async () => {
    if (isScreenSharing) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setLocalScreenStream(null);
      setIsScreenSharing(false);
      await detachScreenShare();
      socketRef.current?.emit('media-state-changed', {
        meetingId: meeting.id,
        audioEnabled,
        videoEnabled,
        screenSharing: false,
      });
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30, max: 60 } },
        audio: false,
      });
      const screenTrack = screenStream.getVideoTracks()[0];
      if (!screenTrack) return;

      screenStreamRef.current = screenStream;
      setLocalScreenStream(screenStream);
      setIsScreenSharing(true);

      screenTrack.onended = () => {
        void toggleScreenShareRef.current();
      };

      await attachScreenShare(screenStream);

      socketRef.current?.emit('media-state-changed', {
        meetingId: meeting.id,
        audioEnabled,
        videoEnabled,
        screenSharing: true,
      });
    } catch (err) {
      if ((err as DOMException)?.name === 'NotAllowedError') {
        toast.info(t('meeting_room.share_cancelled', 'Đã hủy chia sẻ màn hình'));
      }
    }
  }, [attachScreenShare, audioEnabled, detachScreenShare, isScreenSharing, meeting.id, t, videoEnabled]);

  useEffect(() => {
    toggleScreenShareRef.current = toggleScreenShare;
  }, [toggleScreenShare]);

  const togglePictureInPicture = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (localVideoRef.current) {
        await localVideoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('PIP failed:', err);
      toast.info('Trình duyệt không hỗ trợ hoặc video chưa sẵn sàng cho Picture-in-Picture.');
    }
  };

  const handleEndCallClick = () => {
    if (canManageMeeting) {
      setIsEndModalOpen(true);
    } else {
      handleLeaveCall();
    }
  };

  // Deduplicated Peers List
  //
  // ⚠️ Loại bỏ peer trùng `userId`: khi mở 2 tab trên cùng 1 máy, cả 2 socket
  // đều đại diện cho cùng 1 tài khoản → không có ý nghĩa hiển thị 2 tile.
  // Giữ lại socket đầu tiên (đã có media từ trước) để camera không nhảy.
  const peerList = Array.from(peers.values()).filter(
    (p, index, arr) =>
      p.userId &&
      p.userId !== user?.id &&
      arr.findIndex((other) => other.userId === p.userId) === index,
  );
  const totalInRoom = peerList.length + 1;

  // Stream Resolution: Presenter vs Camera (FIX BUG-3 & BUG-4)
  //
  // ⚠️ Điều kiện phải là "có screenStream" — KHÔNG yêu cầu `isScreenSharing`.
  // `isScreenSharing` là cờ metadata đến qua socket event, có thể tới trễ hoặc
  // không tới (peer cũ chưa hỗ trợ event) → điều kiện cũ khiến màn hình share
  // không bao giờ mở rộng toàn màn hình.
  const remotePresenter = peerList.find((p) => p.screenStream);
  const localIsPresenting = isScreenSharing && Boolean(screenStreamRef.current || localScreenStream);
  const isPresentingMode = localIsPresenting || Boolean(remotePresenter);

  const presenterStream = localIsPresenting
    ? (localScreenStream ?? screenStreamRef.current)
    : remotePresenter?.screenStream ?? null;

  const presenterName = localIsPresenting
    ? `${user?.name || 'Tôi'} (${t('meeting_room.you', 'Bạn')})`
    : remotePresenter?.name ?? '';

  // Callback ref for local video (ensures immediate binding when mounted in grid or spotlight thumbnail)
  const setLocalVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      localVideoRef.current = node;
      if (node && localStream) {
        if (node.srcObject !== localStream) {
          node.srcObject = localStream;
        }
        node.play().catch(() => {});
      }
    },
    [localStream],
  );

  // Callback ref for presenter video (ensures immediate binding on restore from minimize or mode switch)
  const setPresenterVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      presenterVideoRef.current = node;
      if (node && presenterStream) {
        if (node.srcObject !== presenterStream) {
          node.srcObject = presenterStream;
        }
        node.play().catch(() => {});
      }
    },
    [presenterStream],
  );

  // Mini Widget Stream & Video
  const miniDisplayStream = presenterStream ?? localStream;
  const miniShowVideo =
    Boolean(miniDisplayStream) &&
    (videoEnabled || isScreenSharing || Boolean(remotePresenter?.screenStream));

  const setMiniVideoRef = useCallback(
    (node: HTMLVideoElement | null) => {
      miniVideoRef.current = node;
      if (node && miniDisplayStream) {
        if (node.srcObject !== miniDisplayStream) {
          node.srcObject = miniDisplayStream;
        }
        node.play().catch(() => {});
      }
    },
    [miniDisplayStream],
  );

  // Reactive synchronizers for elements already mounted in DOM
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      if (localVideoRef.current.srcObject !== localStream) {
        localVideoRef.current.srcObject = localStream;
      }
      localVideoRef.current.play().catch(() => {});
    }
  }, [localStream, videoEnabled, isFullView]);

  useEffect(() => {
    if (presenterVideoRef.current && presenterStream) {
      if (presenterVideoRef.current.srcObject !== presenterStream) {
        presenterVideoRef.current.srcObject = presenterStream;
      }
      presenterVideoRef.current.play().catch(() => {});
    }
  }, [presenterStream, isFullView]);

  useEffect(() => {
    if (miniVideoRef.current && miniDisplayStream) {
      if (miniVideoRef.current.srcObject !== miniDisplayStream) {
        miniVideoRef.current.srcObject = miniDisplayStream;
      }
      miniVideoRef.current.play().catch(() => {});
    }
  }, [miniDisplayStream, isFullView]);

  // ============================================================
  // 1. FLOATING MINI WIDGET VIEW (When navigating on other pages)
  // ============================================================
  if (!isFullView) {
    return (
      <div className="fixed bottom-5 right-5 z-50 w-84 bg-white border border-slate-200/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150 text-slate-800">
        {/* Header */}
        <div className="px-3.5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-xs font-bold text-slate-800 truncate">{meeting.title}</span>
          </div>
          <button
            onClick={onMaximize}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors cursor-pointer"
            title={t('meeting_room.expand', 'Phóng to cuộc họp')}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Video or Avatar Display */}
        <div className="relative w-full h-44 bg-slate-900 flex items-center justify-center overflow-hidden">
          {miniShowVideo && miniDisplayStream ? (
            <video
              ref={setMiniVideoRef}
              autoPlay
              muted={!remotePresenter}
              playsInline
              className="w-full h-full object-contain bg-slate-900"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-4">
              <div className="w-14 h-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-lg font-bold shadow-xs">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <span className="text-xs font-semibold text-white mt-2">{user?.name}</span>
              <span className="text-[10px] text-slate-400 mt-0.5">
                {t('meeting_room.camera_off', 'Camera đang tắt')}
              </span>
            </div>
          )}

          {/* Badge "Đang chia sẻ" */}
          {presenterStream && (
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-blue-600/90 text-[10px] text-white font-bold flex items-center gap-1 backdrop-blur-xs">
              <MonitorUp className="w-2.5 h-2.5" />
              {t('meeting_room.presenting_short', 'Đang trình bày')}
            </div>
          )}

          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-[10px] text-white backdrop-blur-xs font-mono">
            {formatDuration(durationSeconds)}
          </div>
        </div>

        {/* Mini Controls */}
        <div className="p-2.5 bg-white flex items-center justify-center gap-2 border-t border-slate-100">
          <button
            onClick={toggleAudio}
            className={`p-2 rounded-full transition-all cursor-pointer ${
              audioEnabled
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                : 'bg-rose-500 text-white shadow-xs'
            }`}
            title={audioEnabled ? t('meeting_room.turn_off_mic', 'Tắt mic') : t('meeting_room.turn_on_mic', 'Bật mic')}
          >
            {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleVideo}
            className={`p-2 rounded-full transition-all cursor-pointer ${
              videoEnabled
                ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                : 'bg-rose-500 text-white shadow-xs'
            }`}
            title={videoEnabled ? t('meeting_room.turn_off_cam', 'Tắt camera') : t('meeting_room.turn_on_cam', 'Bật camera')}
          >
            {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </button>
          <button
            onClick={onMaximize}
            className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xs cursor-pointer"
            title={t('meeting_room.expand', 'Phóng to')}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleEndCallClick}
            className="p-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-xs cursor-pointer"
            title={t('meeting_room.leave_call', 'Rời cuộc họp')}
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>

        {/* Host End Meeting Confirmation Modal for Mini Mode */}
        <HostEndMeetingModal
          isOpen={isEndModalOpen}
          onClose={() => setIsEndModalOpen(false)}
          onLeaveOnly={() => {
            setIsEndModalOpen(false);
            handleLeaveCall();
          }}
          onEndForAll={handleEndForAll}
        />
      </div>
    );
  }

  // ============================================================
  // 2. FULL MEETING ROOM VIEW — Light Clean UI
  // ============================================================
  return (
    <div className="fixed inset-0 z-40 bg-slate-100 text-slate-900 flex flex-col overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-slate-200 bg-white shadow-2xs z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-sm font-bold text-slate-900 tracking-tight">{meeting.title}</h1>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-mono">
            {meeting.roomCode}
          </span>
          {isTranscribing && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-200 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-600" />
              {t('meeting_room.recording_active', 'Đang ghi biên bản AI')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
            {formatDuration(durationSeconds)}
          </div>
          <button
            onClick={() => {
              setIsParticipantsOpen(!isParticipantsOpen);
              if (isChatOpen) setIsChatOpen(false);
            }}
            className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            title={t('meeting_room.participants', 'Người tham gia')}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="font-semibold">{totalInRoom}</span>
          </button>
        </div>
      </div>

      {/* Main Body: Video Grid / Theater Area (FIX BUG-1, BUG-2, BUG-3) */}
      <div
        className={`flex-1 flex overflow-hidden relative ${
          isPresentingMode ? 'p-2 sm:p-3 bg-slate-950 gap-3' : 'p-4 gap-4 bg-slate-50'
        }`}
      >
        {/* Video Content Container */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* A) SCREEN SHARE THEATER MODE (Full Screen Presentation Layout) */}
          {isPresentingMode && presenterStream ? (
            <div className="flex-1 flex flex-col lg:flex-row gap-3 h-full w-full overflow-hidden">
              {/* Main Presenter Spotlight Tile */}
              <div className="flex-1 h-full w-full min-h-0 bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl flex items-center justify-center relative">
                <video
                  ref={setPresenterVideoRef}
                  autoPlay
                  muted={localIsPresenting}
                  playsInline
                  className="w-full h-full object-contain bg-black"
                />
                <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-semibold text-white border border-slate-700/60 shadow-lg">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span>
                    {localIsPresenting
                      ? t('meeting_room.you_presenting', 'Bạn đang trình bày')
                      : t('meeting_room.peer_presenting', '{{name}} đang trình bày', {
                          name: presenterName,
                        })}
                  </span>
                </div>
              </div>

              {/* Side Camera Thumbnails Strip (Dual-Track Camera Tiles) */}
              <div className="w-full lg:w-60 flex lg:flex-col gap-2.5 overflow-y-auto shrink-0 pb-1">
                {/* Local Camera Tile (Thumbnail) */}
                <div className="relative w-44 lg:w-full aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-sm flex items-center justify-center shrink-0">
                  <video
                    ref={setLocalVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`w-full h-full object-contain bg-slate-950 ${
                      videoEnabled ? 'block' : 'hidden'
                    }`}
                  />
                  {!videoEnabled && (
                    <div className="flex flex-col items-center justify-center p-2 text-center">
                      <div className="w-8 h-8 rounded-full bg-slate-800 text-blue-400 border border-slate-700 flex items-center justify-center text-xs font-bold">
                        {user?.name?.charAt(0) || 'U'}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-300 mt-1 truncate max-w-[120px]">
                        {user?.name} ({t('meeting_room.you', 'Bạn')})
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-1.5 left-1.5 bg-black/70 backdrop-blur-xs px-2 py-0.5 rounded text-[10px] text-white font-medium border border-white/10">
                    {user?.name?.split(' ')[0]} ({t('meeting_room.you', 'Bạn')})
                  </div>
                </div>

                {/* Remote Peers Camera Thumbnails */}
                {peerList.map((p) => (
                  <div
                    key={p.socketId}
                    className="relative w-44 lg:w-full aspect-video bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-sm flex items-center justify-center shrink-0"
                  >
                    <RemoteVideoTile
                      peer={p}
                      stream={p.camStream}
                      isHost={meeting.createdById === p.userId}
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* B) NORMAL GRID MODE (No screen share) */
            <div
              className={`flex-1 grid gap-4 items-center justify-center overflow-y-auto ${
                totalInRoom === 1
                  ? 'grid-cols-1 max-w-4xl mx-auto w-full'
                  : totalInRoom === 2
                  ? 'grid-cols-1 md:grid-cols-2'
                  : totalInRoom <= 4
                  ? 'grid-cols-2'
                  : 'grid-cols-2 lg:grid-cols-3'
              }`}
            >
              {/* Local User Tile */}
              <div className="relative w-full aspect-video max-h-[480px] bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm flex items-center justify-center group">
                <video
                  ref={setLocalVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-contain bg-slate-900 ${
                    videoEnabled ? 'block' : 'hidden'
                  }`}
                />
                {!videoEnabled && (
                  <div className="flex flex-col items-center justify-center p-4">
                    <div className="w-20 h-20 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-2xl font-bold ring-4 ring-blue-50 shadow-xs">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                    <span className="text-sm font-bold text-slate-800 mt-3">{user?.name}</span>
                    <span className="text-xs text-slate-400 mt-0.5">
                      {t('meeting_room.camera_off', 'Camera đang tắt')}
                    </span>
                  </div>
                )}

                <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-800 border border-slate-200 shadow-xs">
                  <span>
                    {user?.name || 'Tôi'} ({t('meeting_room.you', 'Bạn')})
                  </span>
                  {!audioEnabled && <MicOff className="w-3.5 h-3.5 text-rose-500" />}
                </div>

                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                  <button
                    onClick={togglePictureInPicture}
                    className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-slate-700 border border-slate-200 backdrop-blur-xs transition-colors shadow-xs cursor-pointer"
                    title={t('meeting_room.pip', 'Cửa sổ nổi PiP')}
                  >
                    <PictureInPicture className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Remote Peers Tiles */}
              {peerList.map((p) => (
                <RemoteVideoTile
                  key={p.socketId}
                  peer={p}
                  stream={p.camStream}
                  isHost={meeting.createdById === p.userId}
                  onPin={() => setSpotlightUserId(spotlightUserId === p.userId ? null : p.userId)}
                  isPinned={spotlightUserId === p.userId}
                />
              ))}
            </div>
          )}
        </div>

        {/* Side Panel 1: Participants Drawer */}
        {isParticipantsOpen && (
          <MeetingParticipantsDrawer
            isOpen={isParticipantsOpen}
            onClose={() => setIsParticipantsOpen(false)}
            meeting={{ ...meeting, attendees: liveAttendees }}
            currentUserId={user?.id || ''}
            currentUserName={user?.name || 'Tôi'}
            currentUserAvatar={user?.avatar}
            isMyMicOn={audioEnabled}
            isMyCamOn={videoEnabled}
            leftUserIds={leftUserIds}
            activePeers={peerList.map((p) => ({
              socketId: p.socketId,
              userId: p.userId,
              name: p.name,
              avatar: p.avatar,
              isMicOn: p.audioEnabled,
              isCamOn: p.videoEnabled,
            }))}
          />
        )}

        {/* Side Panel 2: Chat Drawer (FIX BUG-2) */}
        {isChatOpen && (
          <InMeetingChat
            meetingId={meeting.id}
            socket={socket}
            currentUser={{
              id: user?.id || 'anon',
              name: user?.name || 'Ẩn danh',
              avatar: user?.avatar,
            }}
            isOpen={isChatOpen}
            onClose={() => setIsChatOpen(false)}
            initialMessages={chatHistory}
            unreadCount={chatUnread}
            onRead={() => setChatUnread(0)}
          />
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="h-20 px-6 flex items-center justify-between border-t border-slate-200 bg-white/95 backdrop-blur-md z-10 shadow-2xs">
        {/* Left: Info */}
        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
          <span className="font-bold text-slate-800">{meeting.title}</span>
          <span>•</span>
          <span className="font-mono text-slate-500">{meeting.roomCode}</span>
        </div>

        {/* Center: Controls */}
        <div className="flex items-center gap-2.5 mx-auto">
          {/* 1. Mic */}
          <button
            onClick={toggleAudio}
            className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold transition-all shadow-xs cursor-pointer ${
              audioEnabled
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
            title={audioEnabled ? t('meeting_room.turn_off_mic', 'Tắt mic') : t('meeting_room.turn_on_mic', 'Bật mic')}
          >
            {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* 2. Camera */}
          <button
            onClick={toggleVideo}
            className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold transition-all shadow-xs cursor-pointer ${
              videoEnabled
                ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                : 'bg-rose-600 hover:bg-rose-700 text-white'
            }`}
            title={videoEnabled ? t('meeting_room.turn_off_cam', 'Tắt camera') : t('meeting_room.turn_on_cam', 'Bật camera')}
          >
            {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* 3. Screen Share */}
          <button
            onClick={toggleScreenShare}
            className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold transition-all shadow-xs cursor-pointer ${
              isScreenSharing
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
            title={
              isScreenSharing
                ? t('meeting_room.stop_share', 'Dừng chia sẻ')
                : t('meeting_room.share_screen', 'Chia sẻ màn hình')
            }
          >
            {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
          </button>

          {/* 4. Minimize */}
          <button
            onClick={onMinimize}
            className="w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center justify-center transition-all shadow-xs cursor-pointer"
            title={t('meeting_room.minimize', 'Thu nhỏ cuộc họp (vừa họp vừa làm việc)')}
          >
            <Minimize2 className="w-5 h-5" />
          </button>

          {/* 5. AI Assistant */}
          <button
            onClick={() => setIsAiDrawerOpen(!isAiDrawerOpen)}
            className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold transition-all shadow-xs cursor-pointer ${
              isAiDrawerOpen
                ? 'bg-amber-500 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-amber-600 border border-slate-200'
            }`}
            title={t('meeting_room.ai_assistant', 'Trợ lý AI WorkSync')}
          >
            <Sparkles className="w-5 h-5" />
          </button>

          {/* 6. Live Transcription Toggle */}
          {canManageMeeting && (
            <button
              onClick={isTranscribing ? stopTranscription : startTranscription}
              className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold transition-all shadow-xs cursor-pointer ${
                isTranscribing
                  ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                  : 'bg-slate-100 hover:bg-slate-200 text-rose-600 border border-slate-200'
              }`}
              title={
                isTranscribing
                  ? t('meeting_room.stop_recording', 'Dừng ghi biên bản AI')
                  : t('meeting_room.start_recording', 'Ghi biên bản AI')
              }
            >
              <span className={`w-3 h-3 rounded-full ${isTranscribing ? 'bg-white' : 'bg-rose-600'}`} />
            </button>
          )}

          {/* 7. Participants Drawer */}
          <button
            onClick={() => {
              setIsParticipantsOpen(!isParticipantsOpen);
              if (isChatOpen) setIsChatOpen(false);
            }}
            className={`relative w-11 h-11 rounded-full flex items-center justify-center font-semibold transition-all shadow-xs cursor-pointer ${
              isParticipantsOpen
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
            title={t('meeting_room.participants', 'Người tham gia')}
          >
            <Users className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-200 border border-slate-300 text-[10px] font-bold text-slate-700 flex items-center justify-center">
              {totalInRoom}
            </span>
          </button>

          {/* 8. Chat Drawer with unread badge */}
          <button
            onClick={() => {
              setIsChatOpen(!isChatOpen);
              if (isParticipantsOpen) setIsParticipantsOpen(false);
              setChatUnread(0);
            }}
            className={`relative w-11 h-11 rounded-full flex items-center justify-center font-semibold transition-all shadow-xs cursor-pointer ${
              isChatOpen
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
            title={t('meeting_room.chat', 'Trò chuyện')}
          >
            <MessageSquare className="w-5 h-5" />
            {chatUnread > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 h-4 min-w-[16px] rounded-full bg-rose-600 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {chatUnread}
              </span>
            )}
          </button>

          {/* 9. Minutes Editor */}
          <button
            onClick={() => setIsMinutesOpen(true)}
            className="w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center justify-center transition-all shadow-xs cursor-pointer"
            title={t('meeting_room.minutes', 'Biên bản cuộc họp')}
          >
            <FileText className="w-5 h-5" />
          </button>

          {/* 10. End Call */}
          <button
            onClick={handleEndCallClick}
            className="h-11 px-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-all shadow-xs flex items-center gap-2 ml-1 cursor-pointer"
            title={t('meeting_room.leave_call', 'Rời cuộc họp')}
          >
            <PhoneOff className="w-5 h-5" />
            <span className="text-xs font-bold hidden md:inline">
              {t('meeting_room.leave_call', 'Rời cuộc họp')}
            </span>
          </button>
        </div>

        {/* Right side placeholder */}
        <div className="hidden sm:block w-32" />
      </div>

      {/* Live Captions Subtitle Overlay */}
      <LiveCaptionOverlay caption={currentCaption} isTranscribing={isTranscribing} />

      {/* AI Drawer */}
      <MeetingAiDrawer
        meeting={meeting}
        isOpen={isAiDrawerOpen}
        onClose={() => setIsAiDrawerOpen(false)}
        isTranscribing={isTranscribing}
        transcripts={transcripts}
        canManage={canManageMeeting}
      />

      {/* Minutes Modal */}
      {isMinutesOpen && (
        <MinutesEditor
          meeting={meeting}
          isOpen={isMinutesOpen}
          onClose={() => setIsMinutesOpen(false)}
          canEdit={user?.id === meeting.createdById || user?.role === 'ADMIN'}
        />
      )}

      {/* Host End Meeting Confirmation Modal */}
      <HostEndMeetingModal
        isOpen={isEndModalOpen}
        onClose={() => setIsEndModalOpen(false)}
        onLeaveOnly={() => {
          setIsEndModalOpen(false);
          handleLeaveCall();
        }}
        onEndForAll={handleEndForAll}
      />
    </div>
  );
};

// Remote peer tile with full aspect-video and object-contain
const RemoteVideoTile: React.FC<{
  peer: RemotePeer;
  stream: MediaStream | null;
  isHost?: boolean;
  onPin?: () => void;
  isPinned?: boolean;
}> = ({ peer, stream, isHost, onPin, isPinned }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { t } = useTranslation();

  /**
   * Quyết định hiển thị video hay avatar.
   *
   * ⚠️ Bug cũ: `Boolean(stream && peer.videoEnabled)` → khi cờ metadata
   * `videoEnabled` chưa được đồng bộ (mặc định/gửi sai) nhưng camera ĐÃ có
   * stream thật, tile vẫn hiện avatar + "Camera đang tắt" → người dùng tưởng
   * camera tắt trong khi thực tế đang bật.
   *
   * Cách sửa: ưu tiên sự thật từ media — nếu có stream thì hiện video.
   * (Khi peer thực sự tắt camera, trình duyệt vẫn giữ track nhưng đặt
   * `enabled = false`, nên video sẽ hiện khung đen — vẫn tốt hơn việc báo
   * sai "Camera đang tắt" khi camera đang bật.)
   */
  const isVideoShowing = Boolean(stream);

  const setVideoNode = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node;
      if (node && stream) {
        if (node.srcObject !== stream) {
          node.srcObject = stream;
        }
        node.play().catch(() => {});
      }
    },
    [stream],
  );

  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  useEffect(() => {
    if (!stream) return;
    const handleTrackUpdate = () => {
      if (videoRef.current && stream) {
        if (videoRef.current.srcObject !== stream) {
          videoRef.current.srcObject = stream;
        }
        videoRef.current.play().catch(() => {});
      }
    };
    stream.addEventListener('addtrack', handleTrackUpdate);
    stream.addEventListener('removetrack', handleTrackUpdate);
    return () => {
      stream.removeEventListener('addtrack', handleTrackUpdate);
      stream.removeEventListener('removetrack', handleTrackUpdate);
    };
  }, [stream]);

  return (
    <div
      className={`relative w-full aspect-video max-h-[480px] bg-white rounded-2xl overflow-hidden border ${
        peer.isScreenSharing
          ? 'border-blue-500 ring-2 ring-blue-500/30'
          : isPinned
          ? 'border-amber-500 ring-2 ring-amber-500/30'
          : 'border-slate-200'
      } shadow-sm flex items-center justify-center group`}
    >
      <video
        ref={setVideoNode}
        autoPlay
        playsInline
        className={`w-full h-full object-contain bg-slate-900 ${
          isVideoShowing ? 'block' : 'hidden'
        }`}
      />
      {!isVideoShowing && (
        <div className="flex flex-col items-center justify-center p-4">
          <div className="w-20 h-20 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-2xl font-bold uppercase shadow-xs">
            {peer.avatar ? (
              <img src={peer.avatar} alt={peer.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              peer.name?.charAt(0) || 'U'
            )}
          </div>
          <span className="text-sm font-bold text-slate-800 mt-3">{peer.name}</span>
          <span className="text-xs text-slate-400 mt-0.5">{t('meeting_room.camera_off', 'Camera đang tắt')}</span>
        </div>
      )}

      {/* Bottom Name & State Badge */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-800 border border-slate-200 shadow-xs">
        <span>{peer.name}</span>
        {isHost && (
          <span className="text-[10px] text-amber-700 font-bold flex items-center gap-0.5">
            <Crown className="w-2.5 h-2.5" />
            {t('meeting_room.host', 'Chủ trì')}
          </span>
        )}
        {peer.isScreenSharing && (
          <span className="text-[10px] text-blue-600 font-bold">
            • {t('meeting_room.presenting', 'Đang chia sẻ')}
          </span>
        )}
        {!peer.audioEnabled && <MicOff className="w-3.5 h-3.5 text-rose-500" />}
        {peer.videoEnabled === false && (
          <span className="text-[10px] text-slate-500 font-medium flex items-center gap-0.5">
            <VideoOff className="w-3 h-3" />
            {t('meeting_room.camera_off', 'Camera tắt')}
          </span>
        )}
      </div>

      {/* Top Hover Controls */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
        {onPin && (
          <button
            onClick={onPin}
            className={`p-1.5 rounded-lg border backdrop-blur-xs transition-colors shadow-xs cursor-pointer ${
              isPinned
                ? 'bg-amber-500 text-white border-amber-600'
                : 'bg-white/80 hover:bg-white text-slate-700 border-slate-200'
            }`}
            title={isPinned ? 'Bỏ ghim' : 'Ghim nổi bật'}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
