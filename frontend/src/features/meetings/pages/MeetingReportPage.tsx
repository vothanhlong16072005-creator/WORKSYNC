import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, Clock, Loader2, ShieldAlert } from 'lucide-react';
import { meetingApi } from '../api/meeting.api';
import { AttendanceReport } from '../components/AttendanceReport';
import { MeetingScopeBadge } from '../components/MeetingScopeBadge';
import type { AttendanceReportData } from '../types/meeting.types';

export const MeetingReportPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<AttendanceReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    meetingApi
      .getReport(id)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        setError(
          err.response?.data?.message ||
            'Không thể tải báo cáo cuộc họp hoặc bạn không có quyền xem.',
        );
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-muted-foreground">
        <Loader2 className="w-8 h-8 text-primary animate-spin mb-3" />
        <p className="text-xs">Đang tổng hợp báo cáo điểm danh cuộc họp...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="py-16 text-center flex flex-col items-center justify-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h3 className="font-bold text-base text-foreground mb-1">Không thể xem báo cáo</h3>
        <p className="text-xs text-muted-foreground mb-4">{error}</p>
        <button
          onClick={() => navigate('/meetings')}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-muted hover:bg-muted/80 text-foreground rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách</span>
        </button>
      </div>
    );
  }

  const start = new Date(data.meeting.startTime);
  const end = new Date(data.meeting.endTime);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border">
        <div>
          <button
            onClick={() => navigate('/meetings')}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại cuộc họp</span>
          </button>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Báo cáo cuộc họp: {data.meeting.title}
            </h1>
            <MeetingScopeBadge scope={data.meeting.scopeType} />
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {start.toLocaleDateString('vi-VN', {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} -{' '}
                {end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <span>• Người tạo: {data.meeting.createdBy?.name}</span>
          </div>
        </div>
      </div>

      {/* Main Report Body */}
      <AttendanceReport data={data} />
    </div>
  );
};
