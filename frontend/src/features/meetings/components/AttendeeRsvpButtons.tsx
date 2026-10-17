import React, { useState } from 'react';
import { Check, Clock, X } from 'lucide-react';
import { toast } from 'sonner';
import { useMeetingsStore } from '../stores/meetings.store';
import type { RSVP } from '../types/meeting.types';

interface AttendeeRsvpButtonsProps {
  meetingId: string;
  currentRsvp?: RSVP;
  isCreator?: boolean;
}

export const AttendeeRsvpButtons: React.FC<AttendeeRsvpButtonsProps> = ({
  meetingId,
  currentRsvp = 'PENDING',
  isCreator = false,
}) => {
  const { submitRsvp } = useMeetingsStore();
  const [submitting, setSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const handleRsvp = async (status: 'ACCEPTED' | 'DECLINED') => {
    setSubmitting(true);
    try {
      await submitRsvp(meetingId, status);
      toast.success(
        status === 'ACCEPTED' ? 'Đã xác nhận tham gia cuộc họp' : 'Đã từ chối tham gia',
      );
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.message || 'Không thể cập nhật phản hồi');
    } finally {
      setSubmitting(false);
    }
  };

  if (isCreator) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
        <Check className="w-3 h-3 text-emerald-600" />
        Người tạo (Tự động tham gia)
      </span>
    );
  }

  if (!isEditing && currentRsvp === 'ACCEPTED') {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
          <Check className="w-3.5 h-3.5" />
          Đã chấp nhận
        </span>
        <button
          onClick={() => setIsEditing(true)}
          className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
        >
          Đổi ý
        </button>
      </div>
    );
  }

  if (!isEditing && currentRsvp === 'DECLINED') {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800">
          <X className="w-3.5 h-3.5" />
          Đã từ chối
        </span>
        <button
          onClick={() => setIsEditing(true)}
          className="text-xs text-muted-foreground hover:text-foreground underline transition-colors"
        >
          Đổi ý
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-medium text-muted-foreground flex items-center gap-1 mr-1">
        <Clock className="w-3.5 h-3.5 text-amber-500" />
        RSVP:
      </span>
      <button
        onClick={() => handleRsvp('ACCEPTED')}
        disabled={submitting}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors disabled:opacity-50 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800"
      >
        <Check className="w-3 h-3" />
        Tham gia
      </button>
      <button
        onClick={() => handleRsvp('DECLINED')}
        disabled={submitting}
        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors disabled:opacity-50 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800"
      >
        <X className="w-3 h-3" />
        Từ chối
      </button>
      {isEditing && (
        <button
          onClick={() => setIsEditing(false)}
          className="text-xs text-muted-foreground hover:text-foreground ml-1"
        >
          Hủy
        </button>
      )}
    </div>
  );
};
