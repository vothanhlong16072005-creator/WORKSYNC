import React, { useEffect, useRef, useState } from 'react';
import {
  FileText,
  MessageSquare,
  Mic,
  MicOff,
  MonitorOff,
  MonitorUp,
  PhoneOff,
  Users,
  Video,
  VideoOff,
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';
import type { Meeting } from '../types/meeting.types';
import { InMeetingChat } from './InMeetingChat';
import { MinutesEditor } from './MinutesEditor';

interface PeerConnection {
  socketId: string;
  userId: string;
  name: string;
  avatar?: string;
  peer: RTCPeerConnection;
  stream?: MediaStream;
}

interface VideoCallRoomProps {
  meeting: Meeting;
  onLeave: () => void;
}

export const VideoCallRoom: React.FC<VideoCallRoomProps> = ({ meeting, onLeave }) => {
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

  // Side drawers
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMinutesOpen, setIsMinutesOpen] = useState(false);

  // Duration timer
  const [durationSeconds, setDurationSeconds] = useState(0);

  // Update peers state and ref in sync
  const updatePeers = (updater: (prev: Map<string, PeerConnection>) => Map<string, PeerConnection>) => {
    setPeers((prev) => {
      const next = updater(new Map(prev));
      peersRef.current = next;
      return next;
    });
  };

  // Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setDurationSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format seconds to mm:ss or hh:mm:ss
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
        console.warn('Không thể truy cập camera hoặc mic, tiếp tục chế độ xem:', err);
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
      s.on('room-users', ({ participants }: { participants: Array<{ socketId: string; userId: string; name: string; avatar?: string }> }) => {
        participants.forEach((p) => {
          createPeerConnection(p.socketId, p.userId, p.name, p.avatar, true, s, activeLocalStream);
        });
      });

      // When a new participant joins, await their offer
      s.on('participant-joined', (p: { socketId: string; userId: string; name: string; avatar?: string }) => {
        toast.info(`${p.name} đã tham gia cuộc họp`);
        createPeerConnection(p.socketId, p.userId, p.name, p.avatar, false, s, activeLocalStream);
      });

      // WebRTC Offer
      s.on('offer', async ({ offer, fromSocketId, fromUser }: any) => {
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
    };

    initMediaAndSocket();

    return () => {
      // Cleanup
      if (activeLocalStream) {
        activeLocalStream.getTracks().forEach((t) => t.stop());
      }
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      peersRef.current.forEach((p) => p.peer.close());
    };
  }, [meeting.id, user]);

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
      const remoteStream = event.streams[0];
      updatePeers((map) => {
        const existing = map.get(targetSocketId);
        if (existing) {
          existing.stream = remoteStream;
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
    if (localStream) {
      localStream.getAudioTracks().forEach((t) => (t.enabled = !audioEnabled));
      setAudioEnabled(!audioEnabled);
    }
  };

  // Toggle Camera
  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((t) => (t.enabled = !videoEnabled));
      setVideoEnabled(!videoEnabled);
    }
  };

  // Toggle Screen Share
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
    } else {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        screenStreamRef.current = screenStream;
        const screenTrack = screenStream.getVideoTracks()[0];

        screenTrack.onended = () => {
          toggleScreenShare();
        };

        peersRef.current.forEach(({ peer }) => {
          const sender = peer.getSenders().find((s) => s.track?.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;
        setIsScreenSharing(true);
      } catch (err) {
        console.warn('Hủy chia sẻ màn hình', err);
      }
    }
  };

  // Leave room
  const handleLeave = () => {
    if (socket) {
      socket.emit('leave-room', { meetingId: meeting.id });
      socket.disconnect();
    }
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    onLeave();
  };

  const peerList = Array.from(peers.values());
  const totalInRoom = peerList.length + 1; // plus self

  // Grid layout class based on participant count
  const getGridClass = () => {
    if (totalInRoom === 1) return 'grid-cols-1';
    if (totalInRoom === 2) return 'grid-cols-1 md:grid-cols-2';
    if (totalInRoom <= 4) return 'grid-cols-2';
    return 'grid-cols-2 md:grid-cols-3';
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 text-white flex flex-col overflow-hidden select-none">
      {/* Top Header Bar */}
      <div className="h-14 px-6 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="text-sm font-bold text-white tracking-tight">{meeting.title}</h1>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
            {meeting.roomCode}
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-xs font-mono font-medium text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-lg">
            {formatDuration(durationSeconds)}
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Users className="w-4 h-4" />
            <span>{totalInRoom}</span>
          </div>
        </div>
      </div>

      {/* Main Body: Video Grid + Side Panels */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video Grid */}
        <div className={`flex-1 p-4 grid ${getGridClass()} gap-4 items-center justify-center overflow-y-auto`}>
          {/* Local User Tile */}
          <div className="relative w-full h-full min-h-[220px] max-h-[460px] bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-lg flex items-center justify-center">
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${videoEnabled || isScreenSharing ? 'block' : 'hidden'}`}
            />
            {!(videoEnabled || isScreenSharing) && (
              <div className="flex flex-col items-center gap-2">
                <div className="w-16 h-16 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xl font-bold uppercase ring-4 ring-primary/10">
                  {user?.name?.charAt(0) || 'Tôi'}
                </div>
                <span className="text-xs font-medium text-slate-400">Camera đang tắt</span>
              </div>
            )}
            <div className="absolute bottom-3 left-3 flex items-center gap-2 bg-slate-950/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-medium text-white border border-slate-800">
              <span>{user?.name || 'Tôi'} (Bạn)</span>
              {!audioEnabled && <MicOff className="w-3 h-3 text-rose-400" />}
            </div>
          </div>

          {/* Remote Peers Tiles */}
          {peerList.map((p) => (
            <RemoteVideoTile key={p.socketId} peer={p} />
          ))}
        </div>

        {/* Side Panel: Chat */}
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

      {/* Bottom Control Bar */}
      <div className="h-20 px-6 flex items-center justify-between border-t border-slate-800/80 bg-slate-900/80 backdrop-blur-md z-10">
        {/* Left: Info */}
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <span>Worksync Video Room</span>
        </div>

        {/* Center: Controls */}
        <div className="flex items-center gap-3 mx-auto">
          {/* Mic */}
          <button
            onClick={toggleAudio}
            className={`p-3.5 rounded-2xl font-semibold transition-all ${
              audioEnabled
                ? 'bg-slate-800 hover:bg-slate-700 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-900/40 ring-2 ring-rose-500/20'
            }`}
            title={audioEnabled ? 'Tắt mic' : 'Bật mic'}
          >
            {audioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
          </button>

          {/* Camera */}
          <button
            onClick={toggleVideo}
            className={`p-3.5 rounded-2xl font-semibold transition-all ${
              videoEnabled
                ? 'bg-slate-800 hover:bg-slate-700 text-white'
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-900/40 ring-2 ring-rose-500/20'
            }`}
            title={videoEnabled ? 'Tắt camera' : 'Bật camera'}
          >
            {videoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
          </button>

          {/* Screen Share */}
          <button
            onClick={toggleScreenShare}
            className={`p-3.5 rounded-2xl font-semibold transition-all ${
              isScreenSharing
                ? 'bg-blue-600 hover:bg-blue-700 text-white ring-2 ring-blue-500/20'
                : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
            title={isScreenSharing ? 'Dừng chia sẻ' : 'Chia sẻ màn hình'}
          >
            {isScreenSharing ? <MonitorOff className="w-5 h-5" /> : <MonitorUp className="w-5 h-5" />}
          </button>

          {/* Chat Toggle */}
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`p-3.5 rounded-2xl font-semibold transition-all ${
              isChatOpen ? 'bg-primary text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'
            }`}
            title="Trò chuyện"
          >
            <MessageSquare className="w-5 h-5" />
          </button>

          {/* Minutes Toggle */}
          <button
            onClick={() => setIsMinutesOpen(true)}
            className="p-3.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white transition-all"
            title="Biên bản cuộc họp"
          >
            <FileText className="w-5 h-5" />
          </button>

          {/* End Call / Leave */}
          <button
            onClick={handleLeave}
            className="p-3.5 px-5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-all shadow-lg shadow-rose-900/50 flex items-center gap-2"
            title="Rời phòng họp"
          >
            <PhoneOff className="w-5 h-5" />
            <span className="text-xs font-bold">Rời cuộc họp</span>
          </button>
        </div>

        {/* Right empty placeholder for balance */}
        <div className="hidden sm:block w-24" />
      </div>

      {/* Minutes Modal */}
      {isMinutesOpen && (
        <MinutesEditor
          meeting={meeting}
          isOpen={isMinutesOpen}
          onClose={() => setIsMinutesOpen(false)}
          canEdit={user?.id === meeting.createdById || user?.role === 'ADMIN'}
        />
      )}
    </div>
  );
};

// Sub-component for remote peer tile
const RemoteVideoTile: React.FC<{ peer: PeerConnection }> = ({ peer }) => {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current && peer.stream) {
      videoRef.current.srcObject = peer.stream;
    }
  }, [peer.stream]);

  return (
    <div className="relative w-full h-full min-h-[220px] max-h-[460px] bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-lg flex items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className={`w-full h-full object-cover ${peer.stream ? 'block' : 'hidden'}`}
      />
      {!peer.stream && (
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
      <div className="absolute bottom-3 left-3 bg-slate-950/70 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-medium text-white border border-slate-800">
        {peer.name}
      </div>
    </div>
  );
};
