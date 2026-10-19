import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  FileText,
  FileSpreadsheet,
  Sparkles,
  Trash2,
  Users,
  Video,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import { useMeetingsStore } from '../stores/meetings.store';
import type { Meeting } from '../types/meeting.types';
import { AttendeeRsvpButtons } from './AttendeeRsvpButtons';
import { MeetingScopeBadge } from './MeetingScopeBadge';
import { ConfirmCancelMeetingModal } from './ConfirmCancelMeetingModal';

interface MeetingCardProps {
  meeting: Meeting;
  onOpenMinutes?: (meeting: Meeting) => void;
  onOpenDetail?: (meeting: Meeting) => void;
}

export const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, onOpenMinutes, onOpenDetail }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { deleteMeeting } = useMeetingsStore();
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteMeeting(meeting.id);
      toast.success(t('meetings.delete_success', 'Đã xóa cuộc họp'));
      setIsCancelModalOpen(false);
    } catch (err: any) {
      toast.error(err.message || t('meetings.delete_failed', 'Không thể xóa cuộc họp'));
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = () => {
    if (meeting.status === 'CANCELLED') {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300">
          {t('meetings.status_cancelled', 'Đã hủy')}
        </span>
      );
    }
    if (isOngoing) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500 text-white animate-pulse shadow-xs">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
          {t('meetings.status_ongoing', 'Đang diễn ra')}
        </span>
      );
    }
    if (isCompleted) {
      return (
        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300">
          {t('meetings.status_completed', 'Đã kết thúc')}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300">
        {t('meetings.status_upcoming', 'Sắp diễn ra')}
      </span>
    );
  };

  const locale = i18n.language.startsWith('en') ? 'en-US' : 'vi-VN';

  return (
    <>
      <div className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 dark:border-slate-800 bg-card p-5 shadow-xs hover:shadow-md transition-all duration-200">
        {/* Top Header */}
        <div>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <MeetingScopeBadge scope={meeting.scopeType} />
              {getStatusBadge()}

              {/* Trạng thái tham gia của người dùng */}
              {currentAttendee?.joinedAt ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  {t('meetings.status_joined', 'Đã tham gia')}
                </span>
              ) : currentAttendee?.rsvp === 'ACCEPTED' ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-600 border border-blue-500/20">
                  {t('meetings.status_accepted', 'Đã nhận lời')}
                </span>
              ) : currentAttendee?.rsvp === 'DECLINED' ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-600 border border-rose-500/20">
                  {t('meetings.status_declined', 'Từ chối')}
                </span>
              ) : currentAttendee ? (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  {t('meetings.status_pending', 'Chờ phản hồi')}
                </span>
              ) : null}

              {/* Huy hiệu Biên bản AI */}
              {meeting.minutes?.aiSummary && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  {t('meetings.ai_minutes_badge', 'Biên bản AI')}
                </span>
              )}
            </div>
            {canManage && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsCancelModalOpen(true);
                }}
                className="text-muted-foreground hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                title={t('meetings.cancel_modal_title', 'Xóa cuộc họp')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Title */}
          <h3
            onClick={() => onOpenDetail?.(meeting)}
            className="font-semibold text-foreground text-base tracking-tight mb-1 line-clamp-1 group-hover:text-primary transition-colors cursor-pointer"
          >
            {meeting.title}
          </h3>

          {/* Scope Context & Creator */}
          <div className="text-xs text-muted-foreground flex items-center gap-2 mb-3">
            {meeting.scopeType === 'PROJECT' && meeting.project && (
              <span className="font-medium text-blue-600 dark:text-blue-400">
                {t('meetings.scope_project', 'Dự án')}: {meeting.project.name}
              </span>
            )}
            {meeting.scopeType === 'DEPARTMENT' && meeting.department && (
              <span className="font-medium text-emerald-600 dark:text-emerald-400">
                {t('meetings.scope_department', 'Phòng')}: {meeting.department.name}
              </span>
            )}
            <span>• {t('meetings.creator_label', 'Người tạo')}: {meeting.createdBy?.name || 'Ẩn danh'}</span>
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
                {start.toLocaleDateString(locale, {
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
                {start.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })} -{' '}
                {end.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="text-muted-foreground">({durationMinutes}p)</span>
            </div>
          </div>

          {/* Attendees List Avatar Stack */}
          <div className="flex items-center justify-between text-xs mb-3">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="font-medium text-foreground">
                {t('meetings.participants_count', { count: meeting.attendees?.length || 0 })}
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
                <span>{t('meetings.minutes_btn', 'Biên bản')}</span>
              </button>
            )}

            <button
              onClick={() => onOpenDetail?.(meeting)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors"
              title="Xem chi tiết cuộc họp và Biên bản AI"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>{t('meetings.details_ai_btn', 'Chi tiết & AI')}</span>
            </button>

            <button
              onClick={() => navigate(`/meetings/${meeting.id}/report`)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-foreground/80 hover:text-foreground bg-muted/50 hover:bg-muted rounded-lg transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('meetings.report_btn', 'Báo cáo')}</span>
            </button>
          </div>

          {meeting.status !== 'CANCELLED' && (
            <button
              onClick={() => navigate(`/meetings/${meeting.id}/prepare`)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shadow-xs ${
                isOngoing
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              <span>{isOngoing ? t('meetings.join_now_btn', 'Vào ngay') : t('meetings.join_room_btn', 'Vào phòng')}</span>
            </button>
          )}
        </div>
      </div>

      {/* In-app custom confirmation modal (replaces native window.confirm) */}
      <ConfirmCancelMeetingModal
        isOpen={isCancelModalOpen}
        meetingTitle={meeting.title}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />
    </>
  );
};
