import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Video,
  CheckCircle2,
  Clock,
  AlertCircle,
  ExternalLink,
  ShieldAlert,
  Loader2,
  RotateCcw,
  Users,
  Calendar,
} from 'lucide-react';
import { meetingApi } from '../api/meeting.api';
import type { Meeting } from '../types/meeting.types';
import { useAuthStore } from '@/stores/auth.store';

export const PreMeetingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Device states
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [micEnabled, setMicEnabled] = useState(true);
  const [videoStream, setVideoStream] = useState<MediaStream | null>(null);
  const [audioStream, setAudioStream] = useState<MediaStream | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Time & countdown state
  const [secondsUntilOpen, setSecondsUntilOpen] = useState<number>(0);
  const [isMeetingOver, setIsMeetingOver] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // 1. Fetch meeting info
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    meetingApi
      .getById(id)
      .then((data) => {
        setMeeting(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(
          err.response?.data?.message || 'Không thể tải thông tin cuộc họp hoặc bạn không có quyền truy cập',
        );
        setLoading(false);
      });
  }, [id]);

  // 2. Check RSVP status: Block if user DECLINED
  const myAttendee = meeting?.attendees?.find((a) => a.userId === user?.id);
  const isDeclined = myAttendee?.rsvp === 'DECLINED';

  // 3. Time calculation for 15-minute start window
  useEffect(() => {
    if (!meeting) return;

    const checkTime = () => {
      const now = new Date().getTime();
      const startTime = new Date(meeting.startTime).getTime();
      const endTime = new Date(meeting.endTime).getTime();

      // 15 minutes before startTime
      const fifteenMinBefore = startTime - 15 * 60 * 1000;

      if (now > endTime) {
        setIsMeetingOver(true);
        setSecondsUntilOpen(0);
      } else if (now < fifteenMinBefore) {
        setIsMeetingOver(false);
        setSecondsUntilOpen(Math.floor((fifteenMinBefore - now) / 1000));
      } else {
        // Within 15 minutes window or already started
        setIsMeetingOver(false);
        setSecondsUntilOpen(0);
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [meeting]);

  // 4. Request camera & mic permissions
  const initDevices = async () => {
    setPermissionDenied(false);

    try {
      // Audio stream & VU meter
      const aStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(aStream);

      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 32;
      const source = audioCtx.createMediaStreamSource(aStream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkAudio = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(100, Math.round((avg / 128) * 100)));
        animationFrameRef.current = requestAnimationFrame(checkAudio);
      };
      checkAudio();
    } catch (err) {
      console.warn('Microphone access denied or error:', err);
      setPermissionDenied(true);
    }

    try {
      // Video stream
      const vStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
      });
      setVideoStream(vStream);
      if (videoRef.current) {
        videoRef.current.srcObject = vStream;
      }
    } catch (err) {
      console.warn('Camera access denied or error:', err);
      setPermissionDenied(true);
    }
  };

  useEffect(() => {
    initDevices();

    return () => {
      // Clean up media streams and audio context on unmount
      if (videoStream) {
        videoStream.getTracks().forEach((t) => t.stop());
      }
      if (audioStream) {
        audioStream.getTracks().forEach((t) => t.stop());
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Update track enabled state
  useEffect(() => {
    if (videoStream) {
      videoStream.getVideoTracks().forEach((t) => {
        t.enabled = cameraEnabled;
      });
    }
  }, [cameraEnabled, videoStream]);

  useEffect(() => {
    if (audioStream) {
      audioStream.getAudioTracks().forEach((t) => {
        t.enabled = micEnabled;
      });
    }
  }, [micEnabled, audioStream]);

  const togglePip = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (err) {
      console.warn('PIP failed:', err);
    }
  };

  const handleEnterMeeting = () => {
    navigate(`/meetings/${id}/room`);
  };

  // 3-step checklist
  const hasMic = !!audioStream && audioStream.getAudioTracks().length > 0;
  const hasCam = !!videoStream && videoStream.getVideoTracks().length > 0;
  const hasPermission = !permissionDenied && (hasMic || hasCam);
  const checklistPassed = hasMic && hasCam && hasPermission;
  const isButtonEnabled = checklistPassed && secondsUntilOpen === 0 && !isMeetingOver && !isDeclined;

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-300">Đang chuẩn bị phòng chờ...</p>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="w-full min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="max-w-md w-full bg-slate-800 border-2 border-rose-500 p-6 shadow-xl text-center">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-3" />
          <h2 className="text-lg font-black uppercase text-white mb-2">Không thể truy cập</h2>
          <p className="text-xs text-slate-300 mb-6">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/meetings')}
            className="w-full py-2.5 bg-white text-slate-900 font-black text-xs uppercase tracking-wider hover:bg-slate-200 transition-colors"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Top Navbar */}
      <header className="h-16 px-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/70 backdrop-blur">
        <button
          type="button"
          onClick={() => navigate('/meetings')}
          className="flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-black uppercase tracking-widest text-slate-200">
            Phòng chuẩn bị cuộc họp
          </span>
        </div>

        <div className="text-xs font-bold text-slate-400">
          Mã phòng: <span className="text-white font-mono">{meeting.roomCode}</span>
        </div>
      </header>

      {/* Declined Alert Banner */}
      {isDeclined && (
        <div className="bg-rose-950/90 border-b-2 border-rose-600 px-6 py-4 text-center">
          <div className="max-w-2xl mx-auto flex items-center justify-center gap-3 text-rose-200">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span className="text-xs font-bold">
              Bạn đã từ chối tham gia cuộc họp này (RSVP: DECLINED). Bạn không thể tham gia phòng họp trực tuyến trừ khi thay đổi trạng thái xác nhận.
            </span>
          </div>
        </div>
      )}

      {/* Main Split Layout */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8 items-center justify-center">
        {/* Left Column: Camera Preview & Audio Meter */}
        <div className="w-full lg:w-3/5 flex flex-col gap-4">
          <div className="relative w-full aspect-video bg-slate-900 rounded-2xl border-2 border-slate-800 overflow-hidden shadow-2xl flex items-center justify-center">
            {cameraEnabled && hasCam ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-500">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                  <CameraOff className="w-8 h-8 text-slate-400" />
                </div>
                <span className="text-xs font-bold text-slate-400">Camera đang tắt</span>
              </div>
            )}

            {/* Video Overlay Controls */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCameraEnabled(!cameraEnabled)}
                  className={`p-3 rounded-xl border font-bold text-xs flex items-center gap-2 transition-all shadow-lg ${
                    cameraEnabled
                      ? 'bg-slate-900/80 border-slate-700 text-white hover:bg-slate-800'
                      : 'bg-rose-600 border-rose-500 text-white hover:bg-rose-700'
                  }`}
                  title={cameraEnabled ? 'Tắt camera' : 'Bật camera'}
                >
                  {cameraEnabled ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => setMicEnabled(!micEnabled)}
                  className={`p-3 rounded-xl border font-bold text-xs flex items-center gap-2 transition-all shadow-lg ${
                    micEnabled
                      ? 'bg-slate-900/80 border-slate-700 text-white hover:bg-slate-800'
                      : 'bg-rose-600 border-rose-500 text-white hover:bg-rose-700'
                  }`}
                  title={micEnabled ? 'Tắt micro' : 'Bật micro'}
                >
                  {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
              </div>

              {/* PIP Toggle */}
              {hasCam && (
                <button
                  type="button"
                  onClick={togglePip}
                  className="px-3 py-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-700 text-xs font-bold rounded-xl text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors shadow-lg"
                  title="Xem ở chế độ thu nhỏ (Picture-in-Picture)"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Thu nhỏ (PIP)</span>
                </button>
              )}
            </div>
          </div>

          {/* Microphone VU Meter */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-400 shrink-0">
              <Mic className="w-4 h-4 text-blue-400" />
              <span>Cường độ âm thanh:</span>
            </div>

            <div className="flex-1 h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
              <div
                className={`h-full rounded-full transition-all duration-75 ${
                  audioLevel > 70
                    ? 'bg-rose-500'
                    : audioLevel > 30
                    ? 'bg-emerald-400'
                    : 'bg-blue-500'
                }`}
                style={{ width: `${micEnabled ? audioLevel : 0}%` }}
              />
            </div>

            <span className="text-xs font-mono font-bold text-slate-400 w-10 text-right">
              {micEnabled ? `${audioLevel}%` : 'Tắt'}
            </span>
          </div>

          {/* Permission Guide if Denied */}
          {permissionDenied && (
            <div className="bg-rose-950/60 border border-rose-600/50 rounded-xl p-4 flex items-start justify-between gap-3 text-rose-200">
              <div>
                <h5 className="text-xs font-bold text-rose-300">Không thể truy cập Microphone hoặc Camera</h5>
                <p className="text-[11px] text-rose-300/80 mt-0.5">
                  Vui lòng nhấn biểu tượng cài đặt/ổ khóa trên thanh địa chỉ trình duyệt, chọn "Cho phép" Camera và Microphone, sau đó nhấn nút Thử lại.
                </p>
              </div>
              <button
                type="button"
                onClick={initDevices}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Thử lại</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Meeting Info & Checklist */}
        <div className="w-full lg:w-2/5 flex flex-col gap-5">
          {/* Meeting Details Card */}
          <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-md">
                {meeting.scopeType}
              </span>
              <h2 className="text-lg md:text-xl font-black text-white mt-2 leading-tight">
                {meeting.title}
              </h2>
              {meeting.description && (
                <p className="text-xs text-slate-400 mt-1 line-clamp-2">{meeting.description}</p>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span>
                  {new Date(meeting.startTime).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  -{' '}
                  {new Date(meeting.endTime).toLocaleTimeString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}{' '}
                  ({new Date(meeting.startTime).toLocaleDateString('vi-VN')})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500" />
                <span>{meeting.attendees?.length || 0} người được mời tham gia</span>
              </div>
            </div>

            {/* Checklist Section */}
            <div className="pt-3 border-t border-slate-800 space-y-2.5">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                Kiểm tra thiết bị (3 bước bắt buộc)
              </span>

              <div className="space-y-2">
                {/* 1. Mic */}
                <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <Mic className="w-4 h-4 text-slate-400" />
                    <span>Microphone hoạt động</span>
                  </div>
                  {hasMic ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-4 h-4" /> Sẵn sàng
                    </span>
                  ) : (
                    <span className="text-rose-400 font-bold">Chưa kết nối</span>
                  )}
                </div>

                {/* 2. Cam */}
                <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <Camera className="w-4 h-4 text-slate-400" />
                    <span>Camera hoạt động</span>
                  </div>
                  {hasCam ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-4 h-4" /> Sẵn sàng
                    </span>
                  ) : (
                    <span className="text-rose-400 font-bold">Chưa kết nối</span>
                  )}
                </div>

                {/* 3. Permission */}
                <div className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-slate-400" />
                    <span>Quyền truy cập trình duyệt</span>
                  </div>
                  {hasPermission ? (
                    <span className="flex items-center gap-1 text-emerald-400 font-bold">
                      <CheckCircle2 className="w-4 h-4" /> Đã cấp
                    </span>
                  ) : (
                    <span className="text-rose-400 font-bold">Chưa cấp quyền</span>
                  )}
                </div>
              </div>
            </div>

            {/* Countdown / Status Notice */}
            {secondsUntilOpen > 0 ? (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-center space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-amber-400 text-xs font-bold">
                  <Clock className="w-4 h-4" />
                  <span>Phòng họp sẽ mở trước 15 phút</span>
                </div>
                <div className="text-2xl font-black font-mono text-amber-300">
                  {formatCountdown(secondsUntilOpen)}
                </div>
              </div>
            ) : isMeetingOver ? (
              <div className="p-3 bg-slate-800 border border-slate-700 rounded-xl text-center space-y-2">
                <p className="text-xs text-slate-400">Cuộc họp này đã kết thúc thời gian biểu.</p>
                <button
                  type="button"
                  onClick={() => navigate(`/meetings/${id}/report`)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors w-full"
                >
                  Xem biên bản & Báo cáo cuộc họp
                </button>
              </div>
            ) : null}

            {/* Enter Meeting Button */}
            {!isMeetingOver && (
              <button
                type="button"
                onClick={handleEnterMeeting}
                disabled={!isButtonEnabled}
                className={`w-full py-3.5 rounded-xl text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${
                  isButtonEnabled
                    ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-600/30 cursor-pointer active:scale-[0.98]'
                    : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
                }`}
              >
                <Video className="w-5 h-5" />
                <span>Vào cuộc họp</span>
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
