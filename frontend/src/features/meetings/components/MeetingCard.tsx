import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  FileText,
  FileSpreadsheet,
  Trash2,
  Users,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';
import { useMeetingsStore } from '../stores/meetings.store';
import type { Meeting } from '../types/meeting.types';
import { AttendeeRsvpButtons } from './AttendeeRsvpButtons';
import { MeetingScopeBadge } from './MeetingScopeBadge';

interface MeetingCardProps {
  meeting: Meeting;
  onOpenMinutes?: (meeting: Meeting) => void;
}

export const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, onOpenMinutes }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { deleteMeeting } = useMeetingsStore();

  const isCreator = user?.id === meeting.createdById;
  const isAdmin = user?.role === 'ADMIN';
  const canManage = isCreator || isAdmin;

  const currentAttendee = meeting.attendees.find((a) => a.userId === user?.id);

  const start = new Date(meeting.startTime);
  const end = new Date(meeting.endTime);
  const durationMinutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
  const isOngoing =
    meeting.status === 'IN_PROGRESS' ||
    (meeting.status === 'SCHEDULED' &&
      new Date() >= start &&
      new Date() <= end);
  const isCompleted = meeting.status === 'COMPLETED' || new Date() > end;

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Bạn có chắc chắn muốn hủy / xóa cuộc họp này?')) return;
    try {
      await deleteMeeting(meeting.id);
      toast.success('Đã xóa cuộc họp');
    } catch (err: any) {
      toast.error(err.message || 'Không thể xóa cuộc họp');
    }
  };

  const getStatusBadge = () => {
    if (meeting.status === 'CANCELLED') {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">
          Đã hủy
        </span>
      );
    }
    if (isOngoing) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500 text-white animate-pulse shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          Đang diễn ra
        </span>
      );
    }
    if (isCompleted) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300">
          Đã kết thúc
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
        Sắp diễn ra
      </span>
    );
  };

  return (
    <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-card p-5 shadow-xs hover:shadow-md transition-all duration-200">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <MeetingScopeBadge scope={meeting.scopeType} />
            {getStatusBadge()}
          </div>
          {canManage && (
            <button
              onClick={handleDelete}
              className="text-muted-foreground hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              title="Xóa cuộc họp"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Title */}
        <h3 className="font-semibold text-foreground text-base tracking-tight mb-1 line-clamp-1 group-hover:text-primary transition-colors">
          {meeting.title}
        </h3>

        {/* Scope Context & Creator */}
        <div className="text-xs text-muted-foreground flex items-center gap-2 mb-3">
          {meeting.scopeType === 'PROJECT' && meeting.project && (
            <span className="font-medium text-blue-600 dark:text-blue-400">
              Dự án: {meeting.project.name}
            </span>
          )}
          {meeting.scopeType === 'DEPARTMENT' && meeting.department && (
            <span className="font-medium text-emerald-600 dark:text-emerald-400">
              Phòng: {meeting.department.name}
            </span>
          )}
          <span>• Người tạo: {meeting.createdBy?.name || 'Ẩn danh'}</span>
        </div>

        {/* Description */}
        {meeting.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
            {meeting.description}
          </p>
        )}

        {/* Time Info */}
        <div className="flex items-center gap-4 text-xs text-foreground/80 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl mb-3">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
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
            <Clock className="w-3.5 h-3.5 text-muted-foreground" />
            <span>
              {start.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} -{' '}
              {end.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-muted-foreground">({durationMinutes}p)</span>
          </div>
        </div>

        {/* Attendees List Avatar Stack */}
        <div className="flex items-center justify-between text-xs mb-3">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-medium text-foreground">
              {meeting.attendees?.length || 0} người tham gia
            </span>
          </div>
          <div className="flex -space-x-1.5 overflow-hidden">
            {meeting.attendees?.slice(0, 5).map((att) => (
              <div
                key={att.id}
                title={`${att.user?.name} (${att.rsvp})`}
                className="inline-block h-6 w-6 rounded-full ring-2 ring-background bg-slate-200 dark:bg-slate-700 text-[10px] font-bold text-center leading-6 text-foreground uppercase overflow-hidden"
              >
                {att.user?.avatar ? (
                  <img
                    src={att.user.avatar}
                    alt={att.user.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  att.user?.name?.charAt(0) || 'U'
                )}
              </div>
            ))}
            {(meeting.attendees?.length || 0) > 5 && (
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-background bg-muted text-[10px] font-medium text-muted-foreground">
                +{(meeting.attendees?.length || 0) - 5}
              </span>
            )}
          </div>
        </div>

        {/* RSVP section */}
        {meeting.status !== 'CANCELLED' && !isCompleted && (
          <div className="pt-2 border-t border-border/60">
            <AttendeeRsvpButtons
              meetingId={meeting.id}
              currentRsvp={currentAttendee?.rsvp}
              isCreator={isCreator}
            />
          </div>
        )}
      </div>

      {/* Action Buttons Footer */}
      <div className="flex items-center justify-between gap-2 pt-3 mt-3 border-t border-border/80">
        <div className="flex items-center gap-1.5">
          {onOpenMinutes && (
            <button
              onClick={() => onOpenMinutes(meeting)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-foreground/80 hover:text-foreground bg-muted/50 hover:bg-muted rounded-lg transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-primary" />
              <span>Biên bản</span>
            </button>
          )}

          <button
            onClick={() => navigate(`/meetings/${meeting.id}/report`)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-foreground/80 hover:text-foreground bg-muted/50 hover:bg-muted rounded-lg transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Báo cáo</span>
          </button>
        </div>

        {meeting.status !== 'CANCELLED' && (
          <button
            onClick={() => navigate(`/meetings/${meeting.id}/room`)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shadow-xs ${
              isOngoing
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                : 'bg-primary hover:bg-primary/90 text-primary-foreground'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            <span>{isOngoing ? 'Vào ngay' : 'Vào phòng'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
