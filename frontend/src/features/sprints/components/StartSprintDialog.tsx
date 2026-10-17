import React, { useState } from 'react';
import { Play, AlertTriangle, X } from 'lucide-react';
import type { Sprint } from '../types/sprint.types';
import { useSprintStore } from '../stores/sprint.store';

interface StartSprintDialogProps {
  sprint: Sprint | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const StartSprintDialog: React.FC<StartSprintDialogProps> = ({
  sprint,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { startSprint, isLoading } = useSprintStore();
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !sprint) return null;

  const handleStart = async () => {
    setError(null);
    try {
      await startSprint(sprint.id);
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể bắt đầu sprint';
      setError(message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Play className="w-4 h-4 fill-white ml-0.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Bắt Đầu Sprint</h3>
              <p className="text-xs text-slate-500">Kích hoạt chu kỳ phát triển Scrum</p>
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
            Bạn có chắc muốn kích hoạt <strong className="text-slate-900 font-semibold">{sprint.name}</strong>?
          </p>

          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 text-xs text-slate-600 space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Thời lượng:</span>
              <strong className="text-slate-800">{sprint.durationDays} ngày</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Mục tiêu:</span>
              <span className="text-slate-800 font-medium italic">{sprint.goal || 'Chưa thiết lập'}</span>
            </div>
          </div>

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
              onClick={handleStart}
              disabled={isLoading}
              className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-98 rounded-xl shadow-xs transition-all flex items-center gap-2"
            >
              <Play className="w-4 h-4 fill-white" />
              {isLoading ? 'Đang kích hoạt...' : 'Bắt Đầu Ngay'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
