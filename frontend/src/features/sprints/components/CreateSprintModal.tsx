import React, { useState } from 'react';
import { X, Calendar, Flag, Sparkles, AlertCircle } from 'lucide-react';
import { useSprintStore } from '../stores/sprint.store';

interface CreateSprintModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateSprintModal: React.FC<CreateSprintModalProps> = ({
  projectId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { createSprint, isLoading } = useSprintStore();
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const [durationDays, setDurationDays] = useState(14);
  const [startDate, setStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên Sprint');
      return;
    }

    setError(null);
    try {
      await createSprint({
        projectId,
        name: name.trim(),
        goal: goal.trim() || undefined,
        durationDays,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
      });
      setName('');
      setGoal('');
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi khi tạo Sprint';
      setError(message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Tạo Sprint Mới</h3>
              <p className="text-xs text-slate-500">Khởi tạo chu kỳ phát triển Scrum cho dự án</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4.5">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          {/* Sprint Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Tên Sprint <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Sprint 14: Mobile Biometrics & Push Sync"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Sprint Goal */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Flag className="w-3.5 h-3.5 text-slate-400" />
              Mục tiêu Sprint (Sprint Goal)
            </label>
            <textarea
              rows={2}
              placeholder="VD: Hoàn thành đăng nhập FaceID/Vân tay và đồng bộ thông báo đẩy"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* Duration Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Thời Lượng Chu Kỳ (Duration)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { days: 7, label: '1 tuần' },
                { days: 14, label: '2 tuần' },
                { days: 21, label: '3 tuần' },
                { days: 30, label: '1 tháng' },
              ].map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => setDurationDays(opt.days)}
                  className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all ${
                    durationDays === opt.days
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              Ngày Bắt Đầu Dự Kiến
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-xs transition-all flex items-center gap-2"
            >
              {isLoading ? 'Đang tạo...' : 'Tạo Sprint'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
