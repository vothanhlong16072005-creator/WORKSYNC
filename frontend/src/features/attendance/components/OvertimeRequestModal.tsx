import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, TrendingUp, Calendar, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAttendanceStore } from '../stores/attendance.store';

interface OvertimeRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OvertimeRequestModal({ isOpen, onClose }: OvertimeRequestModalProps) {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0] ?? '');
  const [startTime, setStartTime] = useState('18:00');
  const [endTime, setEndTime] = useState('21:00');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { createOvertime, fetchMyRequests } = useAttendanceStore();

  // Auto-calculate hours
  const calculatedHours = useMemo(() => {
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    if (sh === undefined || sm === undefined || eh === undefined || em === undefined) return 0;
    let startMin = sh * 60 + sm;
    let endMin = eh * 60 + em;
    if (endMin <= startMin) return 0;  // handle invalid
    if (endMin - startMin > 12 * 60) return 12.0;
    return Math.round(((endMin - startMin) / 60) * 10) / 10;
  }, [startTime, endTime]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.length < 3) {
      toast.error(isVi ? 'Lý do phải có ít nhất 3 ký tự' : 'Reason must be at least 3 characters');
      return;
    }
    if (calculatedHours <= 0) {
      toast.error(isVi ? 'Giờ kết thúc phải sau giờ bắt đầu' : 'End time must be after start time');
      return;
    }
    if (calculatedHours > 12) {
      toast.error(isVi ? 'OT không quá 12 giờ/ngày' : 'OT cannot exceed 12 hours per day');
      return;
    }
    setSubmitting(true);
    try {
      await createOvertime({
        date,
        registeredStart: `${date}T${startTime}:00+07:00`,
        registeredEnd: `${date}T${endTime}:00+07:00`,
        reason,
      });
      toast.success(isVi ? `Đã đăng ký OT ${calculatedHours}h` : `OT request submitted (${calculatedHours}h)`);
      setReason('');
      await fetchMyRequests();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast.error(isVi ? `Lỗi: ${msg}` : `Error: ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isVi ? 'Đăng ký làm thêm giờ (OT)' : 'Overtime Request'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {isVi ? 'OT chỉ tính thực tế (min đăng ký, check-out)' : 'Actual OT = min(registered, actual)'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              {isVi ? 'Ngày OT' : 'OT Date'}
            </label>
            <input
              type="date"
              required
              min={new Date().toISOString().split('T')[0]}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {isVi ? 'Bắt đầu (sau 17:30)' : 'Start (after 17:30)'}
              </label>
              <input
                type="time"
                required
                min="17:30"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                {isVi ? 'Kết thúc' : 'End'}
              </label>
              <input
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200/60 flex items-center justify-between">
            <span className="text-xs font-bold text-blue-700">{isVi ? 'Tổng OT đăng ký' : 'Registered OT'}</span>
            <span className="text-lg font-black text-blue-900 tabular-nums">{calculatedHours.toFixed(1)}h</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isVi ? 'Lý do' : 'Reason'} <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              minLength={3}
              maxLength={500}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isVi ? 'VD: Dự án gấp deadline, ...' : 'e.g., Urgent project deadline, ...'}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-500 resize-none"
            />
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200/60">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 font-medium">
              {isVi
                ? 'Nếu bạn về sớm hơn giờ kết thúc, OT thực tế sẽ tính theo giờ check-out (tối đa = giờ đăng ký).'
                : 'If you check out before the registered end time, actual OT = min(registered, actual hours).'}
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-lg border border-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-colors"
            >
              {isVi ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
            >
              {submitting ? '...' : (isVi ? 'Gửi đơn' : 'Submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
