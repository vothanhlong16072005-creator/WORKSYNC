import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, LogOut, Calendar, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useAttendanceStore } from '../stores/attendance.store';

interface EarlyLeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EarlyLeaveRequestModal({ isOpen, onClose }: EarlyLeaveRequestModalProps) {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0] ?? '');
  const [expectedLeaveTime, setExpectedLeaveTime] = useState('16:00');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { createEarlyLeave, fetchMyRequests } = useAttendanceStore();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (reason.length < 3) {
      toast.error(isVi ? 'Lý do phải có ít nhất 3 ký tự' : 'Reason must be at least 3 characters');
      return;
    }
    setSubmitting(true);
    try {
      await createEarlyLeave({
        date,
        expectedLeaveTime: `${date}T${expectedLeaveTime}:00+07:00`,
        reason,
      });
      toast.success(isVi ? 'Đã gửi đơn về sớm' : 'Early leave request submitted');
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
            <div className="w-9 h-9 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isVi ? 'Yêu cầu về sớm' : 'Early Leave Request'}
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                {isVi ? 'Cần PM/HR duyệt' : 'Requires PM/HR approval'}
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
              {isVi ? 'Ngày về sớm' : 'Date'}
            </label>
            <input
              type="date"
              required
              min={new Date().toISOString().split('T')[0]}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {isVi ? 'Giờ dự kiến về (phải trước 17:30)' : 'Expected Leave Time (before 17:30)'}
            </label>
            <input
              type="time"
              required
              max="17:30"
              value={expectedLeaveTime}
              onChange={(e) => setExpectedLeaveTime(e.target.value)}
              className="w-full h-10 px-3 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-500"
            />
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
              placeholder={isVi ? 'VD: Việc gia đình, khám bệnh, ...' : 'e.g., Family matter, medical appointment, ...'}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-600/20 focus:border-cyan-500 resize-none"
            />
          </div>

          <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200/60">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 font-medium">
              {isVi
                ? 'Nếu không có đơn được duyệt và bạn về sớm, hệ thống sẽ ghi nhận "Về sớm không phép".'
                : 'If you leave early without an approved request, the system will mark "Early Leave (No Permit)".'}
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
              className="flex-1 h-10 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-bold transition-colors disabled:opacity-50"
            >
              {submitting ? '...' : (isVi ? 'Gửi đơn' : 'Submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
