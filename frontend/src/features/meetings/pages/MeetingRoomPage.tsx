import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, ShieldAlert } from 'lucide-react';
import { meetingApi } from '../api/meeting.api';
import { VideoCallRoom } from '../components/VideoCallRoom';
import type { Meeting } from '../types/meeting.types';

export const MeetingRoomPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
            'Bạn không có quyền tham gia cuộc họp này (Quyền riêng tư / Scope RBAC)',
        );
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="w-full h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
        <p className="text-sm text-slate-400">Đang chuẩn bị phòng họp trực tuyến...</p>
      </div>
    );
  }

  if (error || !meeting) {
    return (
      <div className="w-full h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-950/60 border border-rose-800 flex items-center justify-center text-rose-400 mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-white mb-2">Không thể tham gia cuộc họp</h2>
        <p className="text-xs text-slate-400 max-w-md text-center mb-6 leading-relaxed">
          {error || 'Cuộc họp không tồn tại hoặc đã bị hủy.'}
        </p>
        <button
          onClick={() => navigate('/meetings')}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách cuộc họp</span>
        </button>
      </div>
    );
  }

  return (
    <VideoCallRoom
      meeting={meeting}
      onLeave={() => navigate('/meetings')}
    />
  );
};
