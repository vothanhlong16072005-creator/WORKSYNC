import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Calendar, AlertCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAttendanceStore } from '../stores/attendance.store';
import { getErrorMessage } from '../utils/error-handler';
import type { LeaveType } from '../types/attendance.types';

interface LeaveRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LeaveRequestModal({ isOpen, onClose }: LeaveRequestModalProps) {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  const { createLeave, leaveBalance } = useAttendanceStore();

  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [leaveType, setLeaveType] = useState<LeaveType>('ANNUAL');
  const [isHalfDay, setIsHalfDay] = useState<boolean>(false);
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Compute calculated days automatically
  const isSingleDay = startDate === endDate;
  const calculatedDays = useMemo(() => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) return 0;
    const diffMs = end.getTime() - start.getTime();
    const days = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1;
    if (days === 1 && isHalfDay) {
      return 0.5;
    }
    return days;
  }, [startDate, endDate, isHalfDay]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error(isVi ? 'Vui lòng nhập lý do nghỉ phép' : 'Please provide a reason for leave');
      return;
    }
    if (calculatedDays <= 0) {
      toast.error(isVi ? 'Khoảng ngày nghỉ không hợp lệ' : 'Invalid date range');
      return;
    }

    setIsSubmitting(true);
    try {
      await createLeave({
        startDate,
        endDate,
        leaveType,
        dayCount: calculatedDays,
        reason: reason.trim(),
      });
      toast.success(isVi ? 'Gửi đơn nghỉ phép thành công!' : 'Leave request submitted successfully!');
      onClose();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Lỗi khi gửi đơn nghỉ phép'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl max-w-md w-full overflow-hidden transition-all">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isVi ? 'Tạo đơn xin nghỉ phép' : 'Submit Leave Request'}
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                {isVi ? `Quỹ phép còn lại: ${leaveBalance?.remaining ?? 12} ngày` : `Remaining leave: ${leaveBalance?.remaining ?? 12} days`}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isVi ? 'Từ ngày' : 'Start Date'}
              </label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  if (e.target.value > endDate) setEndDate(e.target.value);
                }}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isVi ? 'Đến ngày' : 'End Date'}
              </label>
              <input
                type="date"
                required
                min={startDate}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isVi ? 'Loại nghỉ phép' : 'Leave Type'}
              </label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium text-slate-900 bg-white"
              >
                <option value="ANNUAL">{isVi ? 'Phép năm (ANNUAL)' : 'Annual Leave'}</option>
                <option value="SICK">{isVi ? 'Nghỉ ốm (SICK)' : 'Sick Leave'}</option>
                <option value="UNPAID">{isVi ? 'Nghỉ không lương (UNPAID)' : 'Unpaid Leave'}</option>
                <option value="COMPENSATORY">{isVi ? 'Nghỉ bù (COMPENSATORY)' : 'Compensatory'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isVi ? 'Số ngày (Tính tự động)' : 'Days (Auto calculated)'}
              </label>
              <div className="h-10 px-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <span className="text-xs font-black text-amber-700">
                  {calculatedDays} {isVi ? 'ngày' : 'day(s)'}
                </span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">Khóa</span>
              </div>
            </div>
          </div>

          {/* Half day option when startDate === endDate */}
          {isSingleDay && (
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700">
                {isVi ? 'Nghỉ nửa ngày (0.5 ngày)?' : 'Request half-day (0.5 day)?'}
              </span>
              <button
                type="button"
                onClick={() => setIsHalfDay(!isHalfDay)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  isHalfDay ? 'bg-amber-500' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    isHalfDay ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isVi ? 'Lý do xin nghỉ' : 'Reason for Leave'}
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isVi ? 'Nhập chi tiết lý do xin nghỉ phép...' : 'Provide details for your leave request...'}
              className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-medium text-slate-900 resize-none"
            />
          </div>

          {leaveType === 'ANNUAL' && leaveBalance && calculatedDays > leaveBalance.remaining && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                {isVi
                  ? `Cảnh báo: Bạn chỉ còn ${leaveBalance.remaining} ngày phép năm khả dụng. Số ngày xin (${calculatedDays}) vượt quá quỹ phép!`
                  : `Warning: You only have ${leaveBalance.remaining} annual days left. Requested (${calculatedDays}) exceeds balance!`}
              </span>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              {isVi ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || calculatedDays <= 0}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm hover:shadow-md transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? (isVi ? 'Đang gửi...' : 'Submitting...') : (isVi ? 'Gửi đơn nghỉ' : 'Submit')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
