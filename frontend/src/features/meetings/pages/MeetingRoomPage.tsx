import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, ShieldAlert } from 'lucide-react';
import { meetingApi } from '../api/meeting.api';
import { useActiveCallStore } from '../stores/active-call.store';

export const MeetingRoomPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeMeeting, setActiveMeeting } = useActiveCallStore();

  const [loading, setLoading] = useState(!activeMeeting || activeMeeting.id !== id);
  const [error, setError] = useState<string | null>(null);

  // Requirement: Ensure user goes through the Prepare page first unless already confirmed
  useEffect(() => {
    if (!id) return;
    const isPrepared =
      location.state?.prepared || sessionStorage.getItem(`prepared_meeting_${id}`) === 'true';
    const params = new URLSearchParams(window.location.search);
    if (!isPrepared && params.get('direct') !== 'true') {
      navigate(`/meetings/${id}/prepare`, { replace: true });
    }
  }, [id, location.state, navigate]);

  useEffect(() => {
    if (!id) return;
    // If call is already active for this meeting, don't refetch
    if (activeMeeting && activeMeeting.id === id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    meetingApi
      .getById(id)
      .then((data) => {
        setActiveMeeting(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(
          err.response?.data?.message ||
            'Bạn không có quyền tham gia cuộc họp này (Quyền riêng tư / Scope RBAC)',
        );
        setLoading(false);
      });
  }, [id, activeMeeting, setActiveMeeting]);

  if (loading) {
    return (
      <div className="w-full h-screen bg-slate-100 flex flex-col items-center justify-center text-slate-700">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-500">Đang chuẩn bị phòng họp trực tuyến...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-screen bg-slate-100 flex flex-col items-center justify-center text-slate-800 p-4">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4 shadow-xs">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">Không thể tham gia cuộc họp</h2>
        <p className="text-xs text-slate-500 max-w-md text-center mb-6 leading-relaxed">
          {error || 'Cuộc họp không tồn tại hoặc đã bị hủy.'}
        </p>
        <button
          onClick={() => navigate('/meetings')}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 rounded-xl transition-colors shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách cuộc họp</span>
        </button>
      </div>
    );
  }

  // PersistentCallManager (mounted in App.tsx) will render full room UI when on /meetings/:id/room
  return <div className="w-full h-screen bg-slate-100" />;
};
