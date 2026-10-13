import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Home, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAttendanceStore } from '../stores/attendance.store';
import { getErrorMessage } from '../utils/error-handler';

interface WfhRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WfhRequestModal({ isOpen, onClose }: WfhRequestModalProps) {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  const { createWfh } = useAttendanceStore();

  const todayStr = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState(todayStr);
  const [expectedStart, setExpectedStart] = useState('08:30');
  const [expectedEnd, setExpectedEnd] = useState('17:30');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error(isVi ? 'Vui lòng nhập lý do làm việc từ xa' : 'Please provide a reason for WFH');
      return;
    }

    if (date < todayStr) {
      toast.error(isVi ? 'Không thể đăng ký WFH cho ngày trong quá khứ' : 'Cannot request WFH for past dates');
      return;
    }

    const [startH, startM] = expectedStart.split(':').map(Number);
    const [endH, endM] = expectedEnd.split(':').map(Number);
    if ((endH * 60 + endM) <= (startH * 60 + startM)) {
      toast.error(isVi ? 'Giờ kết thúc phải sau giờ bắt đầu' : 'End time must be after start time');
      return;
    }

    setIsSubmitting(true);
    try {
      await createWfh({
        date,
        expectedStart,
        expectedEnd,
        reason: reason.trim(),
      });
      toast.success(isVi ? 'Gửi đơn WFH thành công!' : 'WFH request submitted successfully!');
      onClose();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Lỗi khi gửi đơn WFH'));
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
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Home className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {isVi ? 'Đăng ký làm việc từ xa (WFH)' : 'Request Work From Home (WFH)'}
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">
                {isVi ? 'Yêu cầu sẽ được gửi tới HR và PM' : 'Request will be sent to HR & PM'}
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
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isVi ? 'Ngày đăng ký WFH' : 'WFH Date'}
            </label>
            <div className="relative">
              <input
                type="date"
                required
                min={todayStr}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 font-medium text-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isVi ? 'Giờ bắt đầu' : 'Start Time'}
              </label>
              <input
                type="text"
                required
                pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                placeholder="08:30"
                value={expectedStart}
                onChange={(e) => setExpectedStart(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 font-medium text-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                {isVi ? 'Giờ kết thúc' : 'End Time'}
              </label>
              <input
                type="text"
                required
                pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$"
                placeholder="17:30"
                value={expectedEnd}
                onChange={(e) => setExpectedEnd(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 font-medium text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isVi ? 'Lý do xin WFH' : 'Reason for WFH'}
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isVi ? 'Nhập chi tiết lý do (ví dụ: việc gia đình, thời tiết, sức khỏe, sprint tập trung...)' : 'Explain reason (e.g. personal business, health, remote sprint...)'}
              className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-600/20 font-medium text-slate-900 resize-none"
            />
          </div>

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
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm hover:shadow-md transition-all disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? (isVi ? 'Đang gửi...' : 'Submitting...') : (isVi ? 'Gửi đơn' : 'Submit')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
