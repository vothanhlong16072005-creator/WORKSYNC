import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';
import type { Sprint } from '../types/sprint.types';
import { useSprintStore } from '../stores/sprint.store';

interface CompleteSprintDialogProps {
  sprint: Sprint | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CompleteSprintDialog: React.FC<CompleteSprintDialogProps> = ({
  sprint,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { completeSprint, isLoading } = useSprintStore();
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !sprint) return null;

  const handleComplete = async () => {
    setError(null);
    try {
      await completeSprint(sprint.id);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể hoàn thành sprint';
      setError(message);
    }
  };

  const doneCount = sprint.progress?.doneTasks ?? 0;
  const totalCount = sprint.progress?.totalTasks ?? 0;
  const remainingCount = Math.max(0, totalCount - doneCount);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Hoàn Thành Sprint</h3>
              <p className="text-xs text-slate-500">Đóng chu kỳ phát triển hiện tại</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <p className="text-sm text-slate-600 leading-relaxed">
            Bạn có chắc muốn đóng <strong className="text-slate-900 font-semibold">{sprint.name}</strong>?
          </p>

          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-center">
              <span className="text-xs text-emerald-700 font-medium">Đã hoàn thành</span>
              <p className="text-xl font-bold text-emerald-900 mt-0.5">{doneCount} task</p>
            </div>
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-2xl text-center">
              <span className="text-xs text-amber-700 font-medium">Chưa hoàn thành</span>
              <p className="text-xl font-bold text-amber-900 mt-0.5">{remainingCount} task</p>
            </div>
          </div>

          {remainingCount > 0 && (
            <p className="text-xs text-slate-500 italic">
              * Các task chưa hoàn thành sẽ có thể được chuyển sang Sprint tiếp theo hoặc về Backlog.
            </p>
          )}

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
              type="button"
              onClick={handleComplete}
              disabled={isLoading}
              className="px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-xs transition-all flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isLoading ? 'Đang đóng...' : 'Xác Nhận Hoàn Thành'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
