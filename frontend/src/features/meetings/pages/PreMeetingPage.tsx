import React, { useEffect, useState, useRef, useCallback } from 'react';
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
  ShieldAlert,
  Loader2,
  RotateCcw,
  Users,
  Calendar,
  PictureInPicture,
  Sparkles,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { meetingApi } from '../api/meeting.api';
import type { Meeting } from '../types/meeting.types';
import { useAuthStore } from '@/stores/auth.store';

interface ChecklistItemRowProps {
  label: string;
  icon: React.ReactNode;
  passed: boolean;
  passedText?: string;
  pendingText?: string;
}

const ChecklistItemRow: React.FC<ChecklistItemRowProps> = ({
  label,
  icon,
  passed,
  passedText,
  pendingText,
}) => (
  <div className="flex items-center justify-between text-xs p-3 rounded-xl bg-white/70 border border-slate-200/80 backdrop-blur-xs transition-all">
    <div className="flex items-center gap-2.5 text-slate-700 font-semibold">
      <div className="text-slate-400">{icon}</div>
      <span>{label}</span>
    </div>
    {passed ? (
      <span className="flex items-center gap-1.5 text-emerald-600 font-bold px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200">
        <CheckCircle2 className="w-3.5 h-3.5" />
        {passedText || 'Đã đạt'}
      </span>
    ) : (
      <span className="flex items-center gap-1.5 text-rose-500 font-bold px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200">
        <AlertCircle className="w-3.5 h-3.5" />
        {pendingText || 'Chưa đạt'}
      </span>
    )}
  </div>
);

interface AudioLevelMeterProps {
  level: number;
  enabled: boolean;
  label?: string;
}

const AudioLevelMeter: React.FC<AudioLevelMeterProps> = ({ level, enabled, label }) => {
  const displayLevel = enabled ? Math.min(100, Math.max(0, level)) : 0;
  const barColor =
    displayLevel > 75
      ? 'bg-rose-500 shadow-rose-500/50'
      : displayLevel > 35
      ? 'bg-emerald-500 shadow-emerald-500/50'
      : 'bg-blue-500 shadow-blue-500/50';

  return (
    <div className="bg-white/80 backdrop-blur-xs border border-slate-200/80 rounded-xl p-3.5 flex items-center gap-3.5 shadow-2xs">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-600 shrink-0">
        <Mic className="w-4 h-4 text-blue-600" />
        <span>{label || 'Cường độ âm thanh'}:</span>
      </div>

      <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
        <div
          className={`h-full rounded-full transition-all duration-75 ${barColor}`}
          style={{ width: `${displayLevel}%` }}
        />
      </div>

      <span className="text-xs font-mono font-bold text-slate-700 w-12 text-right">
        {enabled ? `${displayLevel}%` : 'OFF'}
      </span>
    </div>
  );
};

export const PreMeetingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { t } = useTranslation();

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
          err.response?.data?.message ||
            t('meeting_prepare.load_error', 'Không thể tải thông tin cuộc họp hoặc bạn không có quyền truy cập'),
        );
        setLoading(false);
      });
  }, [id, t]);

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

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
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

  // Callback ref & reactive effect for camera preview element
  const setVideoNode = useCallback(
    (node: HTMLVideoElement | null) => {
      videoRef.current = node;
      if (node && videoStream) {
        if (node.srcObject !== videoStream) {
          node.srcObject = videoStream;
        }
        node.play().catch(() => {});
      }
    },
    [videoStream],
  );

  useEffect(() => {
    if (videoRef.current && videoStream) {
      if (videoRef.current.srcObject !== videoStream) {
        videoRef.current.srcObject = videoStream;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [videoStream, cameraEnabled]);

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
    if (id) {
      sessionStorage.setItem(`prepared_meeting_${id}`, 'true');
    }
    navigate(`/meetings/${id}/room`, { state: { prepared: true } });
  };

  // 3-step checklist
  const hasMic = !!audioStream && audioStream.getAudioTracks().length > 0;
  const hasCam = !!videoStream && videoStream.getVideoTracks().length > 0;
  const hasPermission = !permissionDenied && (hasMic || hasCam);
  const checklistPassed = hasMic && hasCam && hasPermission;
  const isButtonEnabled =
    checklistPassed && secondsUntilOpen === 0 && !isMeetingOver && !isDeclined;

  const formatCountdown = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-700">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600">
          {t('meeting_prepare.loading', 'Đang tải thông tin cuộc họp...')}
        </p>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="w-full min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-800 p-4">
        <div className="max-w-md w-full bg-white border border-rose-200 rounded-2xl p-6 shadow-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto mb-3">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-900 mb-2">
            {t('meeting_prepare.load_error', 'Không thể truy cập')}
          </h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/meetings')}
            className="w-full py-2.5 bg-slate-900 text-white font-bold text-xs rounded-xl hover:bg-slate-800 transition-colors shadow-xs"
          >
            {t('meeting_prepare.back_to_meetings', 'Quay lại danh sách cuộc họp')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-screen bg-slate-50/70 text-slate-900 flex flex-col overflow-x-hidden antialiased">
      {/* Bauhaus Decorative Ambient Orbs & Geometric Shapes */}
      <div className="pointer-events-none fixed -top-24 -left-24 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl -z-10" />
      <div className="pointer-events-none fixed bottom-10 right-10 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl -z-10" />
      <div className="pointer-events-none fixed top-1/4 right-1/4 h-64 w-64 rounded-full bg-indigo-500/10 blur-2xl -z-10" />
      <div className="pointer-events-none fixed top-1/3 left-1/4 h-32 w-32 border-4 border-indigo-200/40 rounded-full -z-10" />
      <div className="pointer-events-none fixed bottom-1/4 left-10 w-24 h-24 bg-blue-200/20 rotate-45 -z-10" />

      {/* Top Navbar */}
      <header className="h-16 px-6 border-b border-slate-200/80 flex items-center justify-between bg-white/80 backdrop-blur-md shadow-2xs sticky top-0 z-20">
        <button
          type="button"
          onClick={() => navigate('/meetings')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{t('meeting_prepare.back_to_meetings', 'Quay lại danh sách')}</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            {t('meeting_prepare.title', 'Chuẩn bị vào phòng')}
          </span>
        </div>

        <div className="text-xs text-slate-500">
          {t('meeting_prepare.room_code', 'Mã phòng')}:{' '}
          <span className="text-slate-900 font-mono font-bold bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
            {meeting.roomCode}
          </span>
        </div>
      </header>

      {/* Declined Alert Banner */}
      {isDeclined && (
        <div className="bg-rose-50/90 border-b border-rose-200 px-6 py-3 text-center backdrop-blur-xs">
          <div className="max-w-2xl mx-auto flex items-center justify-center gap-2.5 text-rose-700">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="text-xs font-semibold">
              {t('meeting_prepare.rsvp_declined', 'Bạn đã từ chối tham gia')}. {t('meeting_prepare.rsvp_declined_desc', 'Bạn vẫn có thể tham gia nếu muốn.')}
            </span>
          </div>
        </div>
      )}

      {/* Main Split Layout */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-8 flex flex-col lg:flex-row gap-8 items-center justify-center relative z-10">
        {/* Left Column: Camera Preview & Audio Meter */}
        <div className="w-full lg:w-3/5 flex flex-col gap-4">
          <div className="relative w-full aspect-video bg-slate-900 rounded-2xl border border-slate-300/80 overflow-hidden shadow-lg flex items-center justify-center">
            {cameraEnabled && hasCam ? (
              <video
                ref={setVideoNode}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-contain transform -scale-x-100 bg-slate-900"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-400">
                <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center mb-3">
                  <CameraOff className="w-8 h-8" />
                </div>
                <span className="text-xs font-bold text-slate-300">
                  {t('meeting_prepare.camera_off', 'Camera đang tắt')}
                </span>
              </div>
            )}

            {/* Video Overlay Controls */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCameraEnabled(!cameraEnabled)}
                  className={`p-3 rounded-xl border font-bold text-xs flex items-center gap-2 transition-all shadow-md ${
                    cameraEnabled
                      ? 'bg-white/90 border-slate-200 text-slate-700 hover:bg-white'
                      : 'bg-rose-600 border-rose-500 text-white hover:bg-rose-700'
                  }`}
                  title={cameraEnabled ? t('meeting_prepare.camera_on', 'Tắt camera') : t('meeting_prepare.camera_off', 'Bật camera')}
                >
                  {cameraEnabled ? <Camera className="w-4 h-4" /> : <CameraOff className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={() => setMicEnabled(!micEnabled)}
                  className={`p-3 rounded-xl border font-bold text-xs flex items-center gap-2 transition-all shadow-md ${
                    micEnabled
                      ? 'bg-white/90 border-slate-200 text-slate-700 hover:bg-white'
                      : 'bg-rose-600 border-rose-500 text-white hover:bg-rose-700'
                  }`}
                  title={micEnabled ? t('meeting_prepare.mic_working', 'Tắt micro') : t('meeting_prepare.mic_denied', 'Bật micro')}
                >
                  {micEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
              </div>

              {/* PIP Toggle */}
              {hasCam && (
                <button
                  type="button"
                  onClick={togglePip}
                  className="p-2.5 rounded-xl bg-black/60 hover:bg-black/80 text-white backdrop-blur-xs transition-colors"
                  title={t('meeting_prepare.pip_hint', 'Cửa sổ nổi PiP')}
                >
                  <PictureInPicture className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {/* Microphone VU Meter Component */}
          <AudioLevelMeter
            level={audioLevel}
            enabled={micEnabled}
            label={t('meeting_prepare.mic_level', 'Mức âm lượng')}
          />

          {/* Permission Guide if Denied */}
          {permissionDenied && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-start justify-between gap-3 text-rose-800 shadow-2xs">
              <div>
                <h5 className="text-xs font-bold text-rose-800">
                  {t('meeting_prepare.permission_title', 'Cấp quyền truy cập')}
                </h5>
                <p className="text-[11px] text-rose-700 mt-0.5 leading-relaxed">
                  {t('meeting_prepare.camera_denied_desc', 'Vui lòng cấp quyền camera trong cài đặt trình duyệt')}
                </p>
              </div>
              <button
                type="button"
                onClick={initDevices}
                className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors shadow-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('meeting_prepare.retry', 'Thử lại')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Meeting Info & Checklist */}
        <div className="w-full lg:w-2/5 flex flex-col gap-5">
          {/* Meeting Details Card */}
          <div className="bg-white/90 backdrop-blur-md border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-0.5 rounded-md">
                {meeting.scopeType === 'ONE_ON_ONE'
                  ? 'Cuộc họp 1-1'
                  : meeting.scopeType === 'PROJECT'
                  ? 'Dự án'
                  : 'Phòng ban'}
              </span>
              <h2 className="text-lg md:text-xl font-bold text-slate-900 mt-2 leading-tight">
                {meeting.title}
              </h2>
              {meeting.description && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {meeting.description}
                </p>
              )}
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" />
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
                <Users className="w-4 h-4 text-slate-400" />
                <span>
                  {meeting.attendees?.length || 0} {t('meeting_prepare.participants_count', 'người tham dự')}
                </span>
              </div>
            </div>

            {/* Checklist Section */}
            <div className="pt-3 border-t border-slate-100 space-y-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {t('meeting_prepare.checklist_title', 'Kiểm tra trước khi vào phòng')}
              </span>

              <div className="space-y-2">
                <ChecklistItemRow
                  label={t('meeting_prepare.check_mic', 'Mic hoạt động bình thường')}
                  icon={<Mic className="w-4 h-4" />}
                  passed={hasMic}
                  passedText={t('meeting_prepare.check_passed', 'Đã đạt')}
                  pendingText={t('meeting_prepare.check_pending', 'Chưa đạt')}
                />

                <ChecklistItemRow
                  label={t('meeting_prepare.check_camera', 'Camera hoạt động bình thường')}
                  icon={<Camera className="w-4 h-4" />}
                  passed={hasCam}
                  passedText={t('meeting_prepare.check_passed', 'Đã đạt')}
                  pendingText={t('meeting_prepare.check_pending', 'Chưa đạt')}
                />

                <ChecklistItemRow
                  label={t('meeting_prepare.check_permission', 'Quyền truy cập trình duyệt đã được cấp')}
                  icon={<Video className="w-4 h-4" />}
                  passed={hasPermission}
                  passedText={t('meeting_prepare.check_passed', 'Đã đạt')}
                  pendingText={t('meeting_prepare.check_pending', 'Chưa đạt')}
                />
              </div>
            </div>

            {/* Countdown / Status Notice */}
            {secondsUntilOpen > 0 ? (
              <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-center space-y-1">
                <div className="flex items-center justify-center gap-1.5 text-amber-700 text-xs font-bold">
                  <Clock className="w-4 h-4" />
                  <span>{t('meeting_prepare.opens_in', 'Mở phòng sau')}</span>
                </div>
                <div className="text-2xl font-bold font-mono text-amber-600">
                  {formatCountdown(secondsUntilOpen)}
                </div>
              </div>
            ) : isMeetingOver ? (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center space-y-2">
                <p className="text-xs text-slate-600 font-medium">
                  {t('meeting_prepare.meeting_over_desc', 'Thời gian cuộc họp đã qua. Bạn vẫn có thể xem biên bản.')}
                </p>
                <button
                  type="button"
                  onClick={() => navigate(`/meetings/${id}/report`)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-colors w-full shadow-xs"
                >
                  {t('meeting_prepare.view_report', 'Xem báo cáo cuộc họp')}
                </button>
              </div>
            ) : null}

            {/* Enter Meeting Button */}
            {!isMeetingOver && (
              <button
                type="button"
                onClick={handleEnterMeeting}
                disabled={!isButtonEnabled}
                className={`w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-xs ${
                  isButtonEnabled
                    ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer active:scale-[0.99]'
                    : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                }`}
              >
                <Video className="w-5 h-5" />
                <span>
                  {isButtonEnabled
                    ? t('meeting_prepare.join_now', 'Vào cuộc họp ngay')
                    : t('meeting_prepare.join_button_locked', 'Vui lòng hoàn tất 3 bước kiểm tra')}
                </span>
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};
