import React, { useEffect, useRef, useState, useCallback } from 'react';
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
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
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

interface VideoCallRoomProps {
  meeting: Meeting;
  onLeave: () => void;
}

export const VideoCallRoom: React.FC<VideoCallRoomProps> = ({ meeting, onLeave }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [socket, setSocket] = useState<Socket | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  const [peers, setPeers] = useState<Map<string, PeerConnection>>(new Map());
  const peersRef = useRef<Map<string, PeerConnection>>(new Map());

  // Media toggles
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef<MediaStream | null>(null);

  // Layout & Window State
  const [isMinimized, setIsMinimized] = useState(false);
  const [spotlightUserId, setSpotlightUserId] = useState<string | null>(null);

  // Side drawers (Chat, Participants, Minutes, AI)
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

  // Update peers state and ref in sync
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

  // 1. Get user media & connect Socket.IO
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
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.warn('Không thể truy cập camera hoặc mic, tiếp tục chế độ chỉ nghe/xem:', err);
      }

      // Connect Socket.IO
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

      // Handle other users in room
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

      // When a new participant joins, await their offer
      s.on(
        'participant-joined',
        (p: { socketId: string; userId: string; name: string; avatar?: string }) => {
          if (p.userId === user?.id) return;
          toast.info(`${p.name} đã tham gia cuộc họp`);
          createPeerConnection(p.socketId, p.userId, p.name, p.avatar, false, s, activeLocalStream);
        },
      );

      // WebRTC Offer
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

      // WebRTC Answer
      s.on('answer', async ({ answer, fromSocketId }: any) => {
        const pc = peersRef.current.get(fromSocketId)?.peer;
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
      });

      // ICE Candidate
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

      // Remote user media state (mic/cam/screen sharing)
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

      // Participant left
      s.on('participant-left', ({ socketId }: { socketId: string }) => {
        const p = peersRef.current.get(socketId);
        if (p) {
          toast.info(`${p.name} đã rời cuộc họp`);
          p.peer.close();
          updatePeers((map) => {
            map.delete(socketId);
            return map;
          });
        }
      });

      // ⭐ Host ended meeting for everyone (Requirement 6)
      s.on('meeting:ended', ({ message }: { message: string }) => {
        toast.info(message || t('meeting_room.meeting_ended_by_host', 'Người chủ trì đã kết thúc cuộc họp.'));
        if (activeLocalStream) {
          activeLocalStream.getTracks().forEach((t) => t.stop());
        }
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach((t) => t.stop());
        }
        s.disconnect();
        navigate(`/meetings/${meeting.id}/report`);
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
  }, [meeting.id, user, navigate, t, updatePeers]);

  // Helper to create RTCPeerConnection
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

  // Toggle Mic
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

  // Toggle Camera
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

  // Toggle Screen Share with full WebRTC renegotiation support (Requirement 2b)
  const toggleScreenShare = async () => {
    if (isScreenSharing) {
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
        screenStreamRef.current = null;
      }
      // Revert video track to camera
      if (localStream) {
        const videoTrack = localStream.getVideoTracks()[0];
        peersRef.current.forEach(({ peer }) => {
          const sender = peer.getSenders().find((s) => s.track?.kind === 'video');
          if (sender && videoTrack) sender.replaceTrack(videoTrack);
        });
        if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
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

        // For each peer: replaceTrack or addTrack + renegotiate if no video sender exists
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

        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
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

  // Native Picture-in-Picture trigger (Requirement 2a)
  const togglePictureInPicture = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (localVideoRef.current) {
        await localVideoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('Picture-in-picture failed:', err);
      toast.info('Trình duyệt không hỗ trợ hoặc video chưa sẵn sàng cho Picture-in-Picture.');
    }
  };

  // Leave room directly (non-host or host choosing "leave only")
  const handleLeave = () => {
    if (socket) {
      socket.emit('leave-room', { meetingId: meeting.id });
      socket.disconnect();
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    onLeave();
  };

  // Host triggers End Meeting For Everyone (Requirement 6)
  const handleEndForAll = () => {
    if (socket && user?.id) {
      socket.emit('meeting:end-for-all', {
        meetingId: meeting.id,
        userId: user.id,
      });
    }
    setIsEndModalOpen(false);
  };

  // Handle clicking End Call button
  const handleEndCallClick = () => {
    if (canManageMeeting) {
      setIsEndModalOpen(true);
    } else {
      handleLeave();
    }
  };

  // Deduplicate remote peers: filter out self and keep only one latest peer connection per remote userId
  const uniqueRemotePeers = Array.from(peers.values()).filter(
    (p) => p.userId && p.userId !== user?.id,
  );
  const peerListMap = new Map<string, PeerConnection>();
  for (const p of uniqueRemotePeers) {
    peerListMap.set(p.userId, p);
  }
  const peerList = Array.from(peerListMap.values());
  const totalInRoom = peerList.length + 1; // plus self

  // Active presenter check (for automatic spotlighting)
  const remotePresenter = peerList.find((p) => p.isScreenSharing);
  const activeSpotlight = spotlightUserId
    ? spotlightUserId === user?.id
      ? 'local'
      : peerList.find((p) => p.userId === spotlightUserId)
    : isScreenSharing
    ? 'local'
    : remotePresenter
    ? remotePresenter
    : null;

  // Grid layout class based on participant count when not spotlighted
  const getGridClass = () => {
    if (activeSpotlight) return 'grid-cols-1';
    if (totalInRoom === 1) return 'grid-cols-1';
    if (totalInRoom === 2) return 'grid-cols-1 md:grid-cols-2';
    if (totalInRoom <= 4) return 'grid-cols-2';
    return 'grid-cols-2 md:grid-cols-3';
  };

  // ============================================================
  // MINIMIZED FLOATING WINDOW VIEW (Requirement 2a - In-app Meet Bar)
  // ============================================================
  if (isMinimized) {
    return (
      <div className="fixed bottom-5 right-5 z-50 w-80 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-3.5 py-2.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between text-white">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="text-xs font-semibold truncate">{meeting.title}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={() => setIsMinimized(false)}
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
              title={t('meeting_room.expand', 'Phóng to cuộc họp')}
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Video preview in mini widget */}
        <div className="relative w-full h-44 bg-slate-950 flex items-center justify-center">
          <video
            ref={localVideoRef}
            autoPlay
            muted
            playsInline
            className={`w-full h-full object-cover ${videoEnabled || isScreenSharing ? 'block' : 'hidden'}`}
          />
          {!(videoEnabled || isScreenSharing) && (
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-blue-600/30 text-blue-300 flex items-center justify-center text-sm font-bold">
                {user?.name?.charAt(0) || 'U'}
              </div>
              <span className="text-[10px] text-slate-400">{t('meeting_room.camera_off', 'Camera tắt')}</span>
            </div>
          )}
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/60 text-[10px] text-white backdrop-blur-xs font-mono">
            {formatDuration(durationSeconds)}
          </div>
        </div>

        {/* Mini Controls */}
        <div className="p-2.5 bg-slate-900 flex items-center justify-center gap-2 border-t border-slate-800">
          <button
            onClick={toggleAudio}
            className={`p-2 rounded-full transition-all ${
              audioEnabled ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-600 text-white'
            }`}
          >
            {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
          <button
            onClick={toggleVideo}
            className={`p-2 rounded-full transition-all ${
              videoEnabled ? 'bg-slate-800 text-white hover:bg-slate-700' : 'bg-rose-600 text-white'
            }`}
          >
            {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </button>
          <button
            onClick={handleEndCallClick}
            className="p-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // FULL GOOGLE MEET STYLE UI
  // ============================================================
  return (
    <div className="relative w-full h-screen bg-slate-950 text-white flex flex-col overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-sm font-bold text-white tracking-tight">{meeting.title}</h1>
          </div>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {meeting.roomCode}
          </span>
          {isTranscribing && (
            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {t('meeting_room.recording_active', 'Đang ghi biên bản AI')}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-xs font-mono font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-lg">
            {formatDuration(durationSeconds)}
          </div>
          <button
            onClick={() => {
              setIsParticipantsOpen(!isParticipantsOpen);
              if (isChatOpen) setIsChatOpen(false);
            }}
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded-lg transition-colors"
            title={t('meeting_room.participants', 'Người tham gia')}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{totalInRoom}</span>
          </button>
        </div>
      </div>

      {/* Main Body: Video Grid + Side Panels */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video Grid Area */}
        <div className={`flex-1 p-4 grid ${getGridClass()} gap-4 items-center justify-center overflow-y-auto`}>
          {/* Local User Tile */}
          <div
            className={`relative w-full h-full min-h-[220px] max-h-[500px] bg-slate-900 rounded-2xl overflow-hidden border ${
              isScreenSharing ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-slate-800'
            } shadow-lg flex items-center justify-center group`}
          >
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full ${
                isScreenSharing ? 'object-contain bg-black' : 'object-cover'
              } ${videoEnabled || isScreenSharing ? 'block' : 'hidden'}`}
            />
            {!(videoEnabled || isScreenSharing) && (
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center text-xl font-bold uppercase ring-4 ring-blue-500/10">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <span className="text-xs font-medium text-slate-400">
                  {t('meeting_room.camera_off', 'Camera đang tắt')}
                </span>
              </div>
            )}

            {/* Tile Tag / Overlays */}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-slate-950/75 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-medium text-white border border-slate-800">
              <span>{user?.name || 'Tôi'} ({t('meeting_room.you', 'Bạn')})</span>
              {isScreenSharing && (
                <span className="text-[10px] text-blue-400 font-bold">
                  • {t('meeting_room.presenting', 'Đang chia sẻ')}
                </span>
              )}
              {!audioEnabled && <MicOff className="w-3 h-3 text-rose-400" />}
            </div>

            {/* Hover Quick Actions */}
            <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
              <button
                onClick={togglePictureInPicture}
                className="p-1.5 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition-colors"
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

      {/* Bottom Control Bar — Google Meet Aesthetic (Frosted Glass, Circular Buttons) */}
      <div className="h-20 px-6 flex items-center justify-between border-t border-slate-800/80 bg-slate-900/90 backdrop-blur-md z-10">
        {/* Left: Meeting Info / Room Code */}
        <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400">
          <span className="font-semibold text-slate-300">{meeting.title}</span>
          <span>•</span>
          <span className="font-mono text-slate-400">{meeting.roomCode}</span>
        </div>

        {/* Center: Circular Control Buttons */}
        <div className="flex items-center gap-2.5 mx-auto">
          {/* 1. Mic */}
          <button
            onClick={toggleAudio}
            className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold transition-all ${
              audioEnabled
                ? 'bg-slate-800 hover:bg-slate-700 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-900/40 ring-2 ring-rose-500/20'
            }`}
            title={audioEnabled ? t('meeting_room.turn_off_mic', 'Tắt mic') : t('meeting_room.turn_on_mic', 'Bật mic')}
          >
            {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* 2. Camera */}
          <button
            onClick={toggleVideo}
            className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold transition-all ${
              videoEnabled
                ? 'bg-slate-800 hover:bg-slate-700 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-900/40 ring-2 ring-rose-500/20'
            }`}
            title={videoEnabled ? t('meeting_room.turn_off_cam', 'Tắt camera') : t('meeting_room.turn_on_cam', 'Bật camera')}
          >
            {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* 3. Screen Share */}
          <button
            onClick={toggleScreenShare}
            className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold transition-all ${
              isScreenSharing
                ? 'bg-blue-600 hover:bg-blue-700 text-white ring-2 ring-blue-500/30'
                : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
            title={isScreenSharing ? t('meeting_room.stop_share', 'Dừng chia sẻ') : t('meeting_room.share_screen', 'Chia sẻ màn hình')}
          >
            {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
          </button>

          {/* 4. Native PiP / In-App Minimize Toggle (Requirement 2a) */}
          <button
            onClick={() => setIsMinimized(true)}
            className="w-11 h-11 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all"
            title={t('meeting_room.minimize', 'Thu nhỏ cuộc họp (vừa họp vừa làm việc)')}
          >
            <Minimize2 className="w-5 h-5" />
          </button>

          {/* 5. AI Assistant & Live Transcript */}
          <button
            onClick={() => setIsAiDrawerOpen(!isAiDrawerOpen)}
            className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold transition-all ${
              isAiDrawerOpen
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 ring-2 ring-amber-400/40'
                : 'bg-slate-800 hover:bg-slate-700 text-amber-400'
            }`}
            title={t('meeting_room.ai_assistant', 'Trợ lý AI WorkSync')}
          >
            <Sparkles className="w-5 h-5" />
          </button>

          {/* 6. Live Transcription Toggle (Host / PM / Admin) */}
          {canManageMeeting && (
            <button
              onClick={isTranscribing ? stopTranscription : startTranscription}
              className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold transition-all ${
                isTranscribing
                  ? 'bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/50 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-rose-400'
              }`}
              title={
                isTranscribing
                  ? t('meeting_room.stop_recording', 'Dừng ghi biên bản AI')
                  : t('meeting_room.start_recording', 'Ghi biên bản AI')
              }
            >
              <span className={`w-3 h-3 rounded-full ${isTranscribing ? 'bg-white' : 'bg-red-500'}`} />
            </button>
          )}

          {/* 7. Participants Drawer */}
          <button
            onClick={() => {
              setIsParticipantsOpen(!isParticipantsOpen);
              if (isChatOpen) setIsChatOpen(false);
            }}
            className={`relative w-11 h-11 rounded-full flex items-center justify-center font-semibold transition-all ${
              isParticipantsOpen
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
            title={t('meeting_room.participants', 'Người tham gia')}
          >
            <Users className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-slate-700 border border-slate-600 text-[10px] font-bold flex items-center justify-center">
              {totalInRoom}
            </span>
          </button>

          {/* 8. Chat Drawer */}
          <button
            onClick={() => {
              setIsChatOpen(!isChatOpen);
              if (isParticipantsOpen) setIsParticipantsOpen(false);
            }}
            className={`w-11 h-11 rounded-full flex items-center justify-center font-semibold transition-all ${
              isChatOpen ? 'bg-blue-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
            title={t('meeting_room.chat', 'Trò chuyện')}
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          {/* 9. Minutes Editor */}
          <button
            onClick={() => setIsMinutesOpen(true)}
            className="w-11 h-11 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center transition-all"
            title={t('meeting_room.minutes', 'Biên bản cuộc họp')}
          >
            <FileText className="w-5 h-5" />
          </button>

          {/* 10. End Call / Leave Button (Requirement 6) */}
          <button
            onClick={handleEndCallClick}
            className="h-11 px-5 rounded-full bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-all shadow-lg shadow-rose-900/50 flex items-center gap-2 ml-1"
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

      {/* AI Intelligence & Live Transcript Drawer */}
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

      {/* Host End Meeting Confirmation Modal (Requirement 6) */}
      <HostEndMeetingModal
        isOpen={isEndModalOpen}
        onClose={() => setIsEndModalOpen(false)}
        onLeaveOnly={() => {
          setIsEndModalOpen(false);
          handleLeave();
        }}
        onEndForAll={handleEndForAll}
      />
    </div>
  );
};

// Sub-component for remote peer tile
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

  // Handle stream track additions (screen share switch)
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
      className={`relative w-full h-full min-h-[220px] max-h-[500px] bg-slate-900 rounded-2xl overflow-hidden border ${
        peer.isScreenSharing
          ? 'border-blue-500 ring-2 ring-blue-500/30'
          : isPinned
          ? 'border-amber-500 ring-2 ring-amber-500/30'
          : 'border-slate-800'
      } shadow-lg flex items-center justify-center group`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`w-full h-full ${
          peer.isScreenSharing ? 'object-contain bg-black' : 'object-cover'
        } ${peer.stream && peer.isCamOn !== false ? 'block' : 'hidden'}`}
      />
      {!(peer.stream && peer.isCamOn !== false) && (
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-xl font-bold uppercase ring-4 ring-slate-800/40">
            {peer.avatar ? (
              <img src={peer.avatar} alt={peer.name} className="w-full h-full rounded-full object-cover" />
            ) : (
              peer.name?.charAt(0) || 'U'
            )}
          </div>
          <span className="text-xs font-medium text-slate-400">{peer.name}</span>
        </div>
      )}

      {/* Bottom Name & State Badge */}
      <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-slate-950/75 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-medium text-white border border-slate-800">
        <span>{peer.name}</span>
        {isHost && (
          <span className="text-[10px] text-amber-300 font-semibold flex items-center gap-0.5">
            <Crown className="w-2.5 h-2.5" />
            {t('meeting_room.host', 'Chủ trì')}
          </span>
        )}
        {peer.isScreenSharing && (
          <span className="text-[10px] text-blue-400 font-bold">
            • {t('meeting_room.presenting', 'Đang chia sẻ')}
          </span>
        )}
        {peer.isMicOn === false && <MicOff className="w-3 h-3 text-rose-400" />}
      </div>

      {/* Top Hover Controls */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
        {onPin && (
          <button
            onClick={onPin}
            className={`p-1.5 rounded-lg backdrop-blur-xs transition-colors ${
              isPinned ? 'bg-amber-500 text-slate-950' : 'bg-black/60 hover:bg-black/80 text-white'
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
