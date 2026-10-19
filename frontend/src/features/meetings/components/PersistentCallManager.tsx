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
import type { Meeting } from '../types/meeting.types';
import { useLiveTranscription } from '../hooks/useLiveTranscription';
import { InMeetingChat } from './InMeetingChat';
import { LiveCaptionOverlay } from './LiveCaptionOverlay';
import { MeetingAiDrawer } from './MeetingAiDrawer';
import { MinutesEditor } from './MinutesEditor';
import { MeetingParticipantsDrawer } from './MeetingParticipantsDrawer';
import { HostEndMeetingModal } from './HostEndMeetingModal';

interface PeerConnection {
  socketId: string;
  userId: string;
  name: string;
  avatar?: string;
  peer: RTCPeerConnection;
  stream?: MediaStream;
  isMicOn?: boolean;
  isCamOn?: boolean;
  isScreenSharing?: boolean;
}

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

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const localScreenVideoRef = useRef<HTMLVideoElement>(null);
  const miniVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map());
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());

  // Media toggles
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Spotlighting & Pinning
  const [spotlightUserId, setSpotlightUserId] = useState<string | null>(null);

  // Side drawers
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);
  const [isMinutesOpen, setIsMinutesOpen] = useState(false);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [isEndModalOpen, setIsEndModalOpen] = useState(false);

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

  const updatePeers = useCallback(
    (updater: (prev: Map<string, PeerConnection>) => Map<string, PeerConnection>) => {
      setPeers((prev) => {
        const next = updater(new Map(prev));
        peersRef.current = next;
        return next;
      });
    },
    [],
  );

  // Timer
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

  // Synchronize screen share video element
  useEffect(() => {
    if (localScreenVideoRef.current && isScreenSharing && screenStreamRef.current) {
      localScreenVideoRef.current.srcObject = screenStreamRef.current;
      localScreenVideoRef.current.play().catch(() => {});
    }
  }, [isScreenSharing]);

  // Sync video stream to video refs (both full room and mini widget)
  useEffect(() => {
    const stream = screenStreamRef.current || localStream;
    if (stream) {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        localVideoRef.current.play().catch(() => {});
      }
      if (miniVideoRef.current) {
        miniVideoRef.current.srcObject = stream;
        miniVideoRef.current.play().catch(() => {});
      }
    }
  }, [localStream, isScreenSharing, isFullView]);

  // Connect WebRTC and Socket
  useEffect(() => {
    let activeLocalStream: MediaStream | null = null;

    const initMediaAndSocket = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        activeLocalStream = stream;
        setLocalStream(stream);
      } catch (err) {
        console.warn('Không thể truy cập camera hoặc mic, tiếp tục chế độ chỉ xem:', err);
      }

      const socketUrl = import.meta.env.VITE_API_URL
        ? import.meta.env.VITE_API_URL.replace('/api', '')
        : 'http://localhost:4000';

      const s = io(`${socketUrl}/meetings`, {
        transports: ['websocket', 'polling'],
      });

      setSocket(s);

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
      });

      s.on(
        'room-users',
        ({
          participants,
        }: {
          participants: Array<{ socketId: string; userId: string; name: string; avatar?: string }>;
        }) => {
          participants
            .filter((p) => p.userId !== user?.id)
            .forEach((p) => {
              createPeerConnection(p.socketId, p.userId, p.name, p.avatar, true, s, activeLocalStream);
            });
        },
      );

      s.on(
        'participant-joined',
        (p: { socketId: string; userId: string; name: string; avatar?: string }) => {
          if (p.userId === user?.id) return;
          toast.info(`${p.name} ${t('meeting_room.joined', 'đã tham gia cuộc họp')}`);
          createPeerConnection(p.socketId, p.userId, p.name, p.avatar, false, s, activeLocalStream);
        },
      );

      s.on('offer', async ({ offer, fromSocketId, fromUser }: any) => {
        if (fromUser?.id === user?.id) return;
        let pc = peersRef.current.get(fromSocketId)?.peer;
        if (!pc) {
          pc = createPeerConnection(
            fromSocketId,
            fromUser?.id || '',
            fromUser?.name || 'Đồng nghiệp',
            fromUser?.avatar,
            false,
            s,
            activeLocalStream,
          );
        }
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        s.emit('answer', { targetSocketId: fromSocketId, answer });
      });

      s.on('answer', async ({ answer, fromSocketId }: any) => {
        const pc = peersRef.current.get(fromSocketId)?.peer;
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      });

      s.on('ice-candidate', async ({ candidate, fromSocketId }: any) => {
        const pc = peersRef.current.get(fromSocketId)?.peer;
        if (pc && candidate) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } catch (e) {
            console.error('Error adding ice candidate', e);
          }
        }
      });

      s.on(
        'user-media-state',
        ({
          socketId,
          audioEnabled,
          videoEnabled,
          screenSharing,
        }: {
          socketId: string;
          audioEnabled: boolean;
          videoEnabled: boolean;
          screenSharing: boolean;
        }) => {
          updatePeers((map) => {
            const p = map.get(socketId);
            if (p) {
              map.set(socketId, {
                ...p,
                isMicOn: audioEnabled,
                isCamOn: videoEnabled,
                isScreenSharing: screenSharing,
              });
            }
            return map;
          });
        },
      );

      s.on('participant-left', ({ socketId }: { socketId: string }) => {
        const p = peersRef.current.get(socketId);
        if (p) {
          toast.info(`${p.name} ${t('meeting_room.left', 'đã rời cuộc họp')}`);
          p.peer.close();
          updatePeers((map) => {
            map.delete(socketId);
            return map;
          });
        }
      });

      s.on('meeting:ended', ({ message }: { message: string }) => {
        toast.info(message || t('meeting_room.meeting_ended_by_host', 'Người chủ trì đã kết thúc cuộc họp.'));
        if (activeLocalStream) {
          activeLocalStream.getTracks().forEach((t) => t.stop());
        }
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach((t) => t.stop());
        }
        s.disconnect();
        onMeetingEnded();
      });
    };

    initMediaAndSocket();

    return () => {
      if (activeLocalStream) {
        activeLocalStream.getTracks().forEach((t) => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      peersRef.current.forEach((p) => p.peer.close());
    };
  }, [meeting.id, user, updatePeers, onMeetingEnded, t]);

  const createPeerConnection = (
    targetSocketId: string,
    userId: string,
    name: string,
    avatar: string | undefined,
    isInitiator: boolean,
    s: Socket,
    stream: MediaStream | null,
  ): RTCPeerConnection => {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    if (stream) {
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        s.emit('ice-candidate', {
          targetSocketId,
          candidate: event.candidate,
        });
      }
    };

    pc.ontrack = (event) => {
      const remoteStream =
        event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
      updatePeers((map) => {
        const existing = map.get(targetSocketId);
        if (existing) {
          map.set(targetSocketId, { ...existing, stream: remoteStream });
        }
        return map;
      });
    };

    const peerObj: PeerConnection = {
      socketId: targetSocketId,
      userId,
      name,
      avatar,
      peer: pc,
      isMicOn: true,
      isCamOn: true,
      isScreenSharing: false,
    };

    updatePeers((map) => {
      map.set(targetSocketId, peerObj);
      return map;
    });

    if (isInitiator) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          s.emit('offer', {
            targetSocketId,
            offer: pc.localDescription,
            fromUser: {
              id: user?.id,
              name: user?.name,
              avatar: user?.avatar,
            },
          });
        })
        .catch((err) => console.error('Error creating offer', err));
    }

    return pc;
  };

  const toggleAudio = () => {
    const nextState = !audioEnabled;
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = nextState));
      setAudioEnabled(nextState);
    }
    if (socket) {
      socket.emit('media-state-changed', {
        meetingId: meeting.id,
        audioEnabled: nextState,
        videoEnabled,
        screenSharing: isScreenSharing,
      });
    }
  };

  const toggleVideo = () => {
    const nextState = !videoEnabled;
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => (t.enabled = nextState));
      setVideoEnabled(nextState);
    }
    if (socket) {
      socket.emit('media-state-changed', {
        meetingId: meeting.id,
        audioEnabled,
        videoEnabled: nextState,
        screenSharing: isScreenSharing,
      });
    }
  };

  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        peersRef.current.forEach(({ peer }) => {
          const sender = peer.getSenders().find((s) => s.track?.kind === 'video');
          if (sender && videoTrack) sender.replaceTrack(videoTrack);
        });
      }
      setIsScreenSharing(false);
      if (socket) {
        socket.emit('media-state-changed', {
          meetingId: meeting.id,
          audioEnabled,
          videoEnabled,
          screenSharing: false,
        });
      }
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: false,
        });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        if (localScreenVideoRef.current) {
          localScreenVideoRef.current.srcObject = screenStream;
          localScreenVideoRef.current.play().catch(() => {});
        }

        peersRef.current.forEach(async ({ peer, socketId }) => {
          const sender = peer.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) {
            await sender.replaceTrack(screenTrack);
          } else {
            peer.addTrack(screenTrack, screenStream);
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);
            socket?.emit('offer', {
              targetSocketId: socketId,
              offer: peer.localDescription,
              fromUser: {
                id: user?.id,
                name: user?.name,
                avatar: user?.avatar,
              },
            });
          }
        });

        setIsScreenSharing(true);

        if (socket) {
          socket.emit('media-state-changed', {
            meetingId: meeting.id,
            audioEnabled,
            videoEnabled,
            screenSharing: true,
          });
        }
      } catch (err) {
        console.warn('Hủy chia sẻ màn hình', err);
      }
    }
  };

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

  const handleLeaveCall = () => {
    if (socket) {
      socket.emit('leave-room', { meetingId: meeting.id });
      socket.disconnect();
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);
    onLeave();
  };

  const handleEndForAll = () => {
    if (socket && user?.id) {
      socket.emit('meeting:end-for-all', {
        meetingId: meeting.id,
        userId: user.id,
      });
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);
    setIsEndModalOpen(false);
    onMeetingEnded();
  };

  const handleEndCallClick = () => {
    if (canManageMeeting) {
      setIsEndModalOpen(true);
    } else {
      handleLeaveCall();
    }
  };

  // Peers list deduplication
  const uniqueRemotePeers = Array.from(peers.values()).filter(
    (p) => p.userId && p.userId !== user?.id,
  );
  const peerListMap = new Map<string, PeerConnection>();
  for (const p of uniqueRemotePeers) {
    peerListMap.set(p.userId, p);
  }
  const peerList = Array.from(peerListMap.values());
  const totalInRoom = peerList.length + 1;

  // Presenter check for spotlight
  const remotePresenter = peerList.find((p) => p.isScreenSharing);
  const isPresentingMode = isScreenSharing || Boolean(remotePresenter);

  // Active presenter stream for mini floating widget
  const activePresenterStream = remotePresenter?.stream || (isScreenSharing ? screenStreamRef.current : localStream);

  // ============================================================
  // 1. FLOATING MINI WIDGET VIEW (When navigating on other pages)
  // ============================================================
  if (!isFullView) {
    const isLocalCamActive = videoEnabled || isScreenSharing;
    const isPresenterVideoActive = remotePresenter ? remotePresenter.isCamOn !== false : isLocalCamActive;

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
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200 transition-colors"
            title={t('meeting_room.expand', 'Phóng to cuộc họp')}
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Video or Avatar Display */}
        <div className="relative w-full h-44 bg-slate-900 flex items-center justify-center overflow-hidden">
          {isPresenterVideoActive && activePresenterStream ? (
            <video
              ref={miniVideoRef}
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
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-[10px] text-white backdrop-blur-xs font-mono">
            {formatDuration(durationSeconds)}
          </div>
        </div>

        {/* Mini Controls */}
        <div className="p-2.5 bg-white flex items-center justify-center gap-2 border-t border-slate-100">
          <button
            onClick={toggleAudio}
            className={`p-2 rounded-full transition-all ${
              audioEnabled ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200' : 'bg-rose-500 text-white shadow-xs'
            }`}
            title={audioEnabled ? t('meeting_room.turn_off_mic', 'Tắt mic') : t('meeting_room.turn_on_mic', 'Bật mic')}
          >
            {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleVideo}
            className={`p-2 rounded-full transition-all ${
              videoEnabled ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200' : 'bg-rose-500 text-white shadow-xs'
            }`}
            title={videoEnabled ? t('meeting_room.turn_off_cam', 'Tắt camera') : t('meeting_room.turn_on_cam', 'Bật camera')}
          >
            {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </button>
          <button
            onClick={onMaximize}
            className="p-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            title={t('meeting_room.expand', 'Phóng to')}
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleEndCallClick}
            className="p-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
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
  // 2. FULL MEETING ROOM VIEW — Bright Light Theme (Point 6)
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
            className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2.5 py-1 rounded-lg transition-colors"
            title={t('meeting_room.participants', 'Người tham gia')}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="font-semibold">{totalInRoom}</span>
          </button>
        </div>
      </div>

      {/* Main Body: Video Grid Area */}
      <div className="flex-1 flex overflow-hidden relative p-4 gap-4">
        {/* Video Content Container */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* A) SCREEN SHARE SPOTLIGHT MODE (Point 5) */}
          {isPresentingMode ? (
            <div className="flex-1 flex flex-col lg:flex-row gap-4 h-full overflow-hidden">
              {/* Main Presenter Spotlight Tile */}
              <div className="flex-1 h-full min-h-[380px] bg-slate-950 rounded-2xl overflow-hidden border-2 border-blue-500 shadow-md flex items-center justify-center relative">
                {isScreenSharing ? (
                  <video
                    ref={localScreenVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-contain bg-slate-950"
                  />
                ) : remotePresenter ? (
                  <PresenterStreamTile peer={remotePresenter} />
                ) : null}

                <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-semibold text-white">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span>
                    {isScreenSharing
                      ? `${user?.name} (${t('meeting_room.you', 'Bạn')}) - ${t('meeting_room.presenting', 'Đang chia sẻ màn hình')}`
                      : `${remotePresenter?.name} - ${t('meeting_room.presenting', 'Đang chia sẻ màn hình')}`}
                  </span>
                </div>
              </div>

              {/* Side Camera Thumbnails Strip */}
              <div className="w-full lg:w-56 flex lg:flex-col gap-3 overflow-y-auto shrink-0">
                {/* Local Camera Tile (Thumbnail) */}
                <div className="relative w-44 lg:w-full aspect-video bg-white rounded-xl overflow-hidden border border-slate-200 shadow-xs flex items-center justify-center shrink-0">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`w-full h-full object-contain bg-slate-900 ${
                      videoEnabled && !isScreenSharing ? 'block' : 'hidden'
                    }`}
                  />
                  {(!videoEnabled || isScreenSharing) && (
                    <div className="flex flex-col items-center justify-center p-2 text-center">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                        {user?.name?.charAt(0) || 'U'}
                      </div>
                      <span className="text-[10px] font-semibold text-slate-700 mt-1 truncate max-w-[100px]">
                        {user?.name} ({t('meeting_room.you', 'Bạn')})
                      </span>
                    </div>
                  )}
                  <div className="absolute bottom-1.5 left-1.5 bg-black/60 px-1.5 py-0.5 rounded text-[10px] text-white">
                    {user?.name?.split(' ')[0]}
                  </div>
                </div>

                {/* Remote Peers Thumbnails */}
                {peerList
                  .filter((p) => !p.isScreenSharing)
                  .map((p) => (
                    <div
                      key={p.socketId}
                      className="relative w-44 lg:w-full aspect-video bg-white rounded-xl overflow-hidden border border-slate-200 shadow-xs flex items-center justify-center shrink-0"
                    >
                      <RemoteVideoTile peer={p} isHost={meeting.createdById === p.userId} />
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
                  ref={localVideoRef}
                  autoPlay
                  muted
                  playsInline
                  className={`w-full h-full object-contain bg-slate-900 ${videoEnabled ? 'block' : 'hidden'}`}
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
                  <span>{user?.name || 'Tôi'} ({t('meeting_room.you', 'Bạn')})</span>
                  {!audioEnabled && <MicOff className="w-3.5 h-3.5 text-rose-500" />}
                </div>

                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                  <button
                    onClick={togglePictureInPicture}
                    className="p-1.5 rounded-lg bg-white/80 hover:bg-white text-slate-700 border border-slate-200 backdrop-blur-xs transition-colors shadow-xs"
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
            meeting={meeting}
            currentUserId={user?.id || ''}
            currentUserName={user?.name || 'Tôi'}
            currentUserAvatar={user?.avatar}
            isMyMicOn={audioEnabled}
            isMyCamOn={videoEnabled}
            activePeers={peerList.map((p) => ({
              socketId: p.socketId,
              userId: p.userId,
              name: p.name,
              avatar: p.avatar,
              isMicOn: p.isMicOn,
              isCamOn: p.isCamOn,
            }))}
          />
        )}

        {/* Side Panel 2: Chat */}
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
          />
        )}
      </div>

      {/* Bottom Control Bar — Frosted White Light Theme (Point 6) */}
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
            className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold transition-all shadow-xs ${
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
            className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold transition-all shadow-xs ${
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
            className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold transition-all shadow-xs ${
              isScreenSharing
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
            title={isScreenSharing ? t('meeting_room.stop_share', 'Dừng chia sẻ') : t('meeting_room.share_screen', 'Chia sẻ màn hình')}
          >
            {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
          </button>

          {/* 4. Thu nhỏ (Minimize to Dashboard / Other pages) — Point 4 */}
          <button
            onClick={onMinimize}
            className="w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center justify-center transition-all shadow-xs"
            title={t('meeting_room.minimize', 'Thu nhỏ cuộc họp (vừa họp vừa làm việc)')}
          >
            <Minimize2 className="w-5 h-5" />
          </button>

          {/* 5. AI Assistant */}
          <button
            onClick={() => setIsAiDrawerOpen(!isAiDrawerOpen)}
            className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold transition-all shadow-xs ${
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
              className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold transition-all shadow-xs ${
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
            className={`relative w-11 h-11 rounded-full flex items-center justify-center font-semibold transition-all shadow-xs ${
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

          {/* 8. Chat Drawer */}
          <button
            onClick={() => {
              setIsChatOpen(!isChatOpen);
              if (isParticipantsOpen) setIsParticipantsOpen(false);
            }}
            className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold transition-all shadow-xs ${
              isChatOpen
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
            }`}
            title={t('meeting_room.chat', 'Trò chuyện')}
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          {/* 9. Minutes Editor */}
          <button
            onClick={() => setIsMinutesOpen(true)}
            className="w-11 h-11 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 flex items-center justify-center transition-all shadow-xs"
            title={t('meeting_room.minutes', 'Biên bản cuộc họp')}
          >
            <FileText className="w-5 h-5" />
          </button>

          {/* 10. End Call */}
          <button
            onClick={handleEndCallClick}
            className="h-11 px-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-all shadow-xs flex items-center gap-2 ml-1"
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
  peer: PeerConnection;
  isHost?: boolean;
  onPin?: () => void;
  isPinned?: boolean;
}> = ({ peer, isHost, onPin, isPinned }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { t } = useTranslation();

  useEffect(() => {
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream;
      videoRef.current.play().catch(() => {});
    }
  }, [peer.stream]);

  useEffect(() => {
    if (!peer.stream) return;
    const handleTrackUpdate = () => {
      if (videoRef.current && peer.stream) {
        videoRef.current.srcObject = peer.stream;
        videoRef.current.play().catch(() => {});
      }
    };
    peer.stream.addEventListener('addtrack', handleTrackUpdate);
    peer.stream.addEventListener('removetrack', handleTrackUpdate);
    return () => {
      peer.stream?.removeEventListener('addtrack', handleTrackUpdate);
      peer.stream?.removeEventListener('removetrack', handleTrackUpdate);
    };
  }, [peer.stream]);

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
        ref={videoRef}
        autoPlay
        playsInline
        className={`w-full h-full object-contain bg-slate-900 ${
          peer.stream && peer.isCamOn !== false ? 'block' : 'hidden'
        }`}
      />
      {!(peer.stream && peer.isCamOn !== false) && (
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
        {peer.isMicOn === false && <MicOff className="w-3.5 h-3.5 text-rose-500" />}
      </div>

      {/* Top Hover Controls */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
        {onPin && (
          <button
            onClick={onPin}
            className={`p-1.5 rounded-lg border backdrop-blur-xs transition-colors shadow-xs ${
              isPinned ? 'bg-amber-500 text-white border-amber-600' : 'bg-white/80 hover:bg-white text-slate-700 border-slate-200'
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

// Presenter stream tile
const PresenterStreamTile: React.FC<{ peer: PeerConnection }> = ({ peer }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream;
      videoRef.current.play().catch(() => {});
    }
  }, [peer.stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="w-full h-full object-contain bg-slate-950"
    />
  );
};
