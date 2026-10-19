import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarSync, X, ArrowRight } from 'lucide-react';
import { useCalendarStore } from '../stores/calendar.store';
import { formatDateShort, formatTime } from '../utils/date-ranges';

export const RescheduleConfirmModal: React.FC = () => {
  const { t } = useTranslation();
  const { pendingReschedule, setPendingReschedule, confirmReschedule } = useCalendarStore();
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!pendingReschedule) return null;

  const { item, newStart } = pendingReschedule;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await confirmReschedule(reason.trim() || undefined);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-2xs">
              <CalendarSync className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {t('calendar.rescheduleModal.title', 'Xác nhận đổi lịch sự kiện')}
              </h3>
              <p className="text-[11px] text-slate-400">
                {t('calendar.rescheduleModal.desc', 'Kéo thả để thay đổi thời gian diễn ra')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setPendingReschedule(null)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Sự kiện
            </span>
            <p className="text-sm font-bold text-slate-900 mt-0.5">{item.title}</p>
          </div>

          {/* Time change preview */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
            <div className="text-left">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {t('calendar.rescheduleModal.from', 'Thời gian cũ')}
              </span>
              <p className="text-xs font-bold text-slate-700 mt-0.5">
                {formatDateShort(item.startAt)} {formatTime(item.startAt)}
              </p>
            </div>

            <ArrowRight className="w-4 h-4 text-blue-600 shrink-0" />

            <div className="text-right">
              <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">
                {t('calendar.rescheduleModal.to', 'Thời gian mới')}
              </span>
              <p className="text-xs font-bold text-blue-700 mt-0.5">
                {formatDateShort(newStart)} {formatTime(newStart)}
              </p>
            </div>
          </div>

          {/* Optional reason */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t('calendar.rescheduleModal.reason', 'Lý do đổi lịch (tuỳ chọn)')}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t(
                'calendar.rescheduleModal.reason_placeholder',
                'Nhập lý do dời lịch để các bên liên quan nắm được...',
              )}
              rows={3}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={() => setPendingReschedule(null)}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            {t('calendar.rescheduleModal.cancel', 'Hủy bỏ')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs cursor-pointer active:scale-[0.98] disabled:opacity-50"
          >
            {isSubmitting ? 'Đang cập nhật...' : t('calendar.rescheduleModal.confirm', 'Xác nhận đổi lịch')}
          </button>
        </div>
      </div>
    </div>
  );
};
