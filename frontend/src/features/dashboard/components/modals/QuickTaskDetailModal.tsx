import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  ArrowUpRight,
} from 'lucide-react';
import { ModalShell } from './ModalShell';
import { apiClient } from '@/lib/api-client';
import { getErrorMessage } from '@/features/attendance/utils/error-handler';

interface QuickTaskDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: any | null;
  onTaskUpdated?: () => void;
}

export function QuickTaskDetailModal({
  isOpen,
  onClose,
  task,
  onTaskUpdated,
}: QuickTaskDetailModalProps) {
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!task) return null;

  const isDone = task.status === 'DONE';
  const isOverdue = !isDone && new Date(task.dueDate) < new Date();

  const handleUpdateStatus = async (newStatus: 'TODO' | 'IN_PROGRESS' | 'DONE') => {
    setUpdating(true);
    setError(null);
    try {
      await apiClient.patch(`/quick-tasks/${task.id}`, { status: newStatus });
      if (onTaskUpdated) onTaskUpdated();
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Không thể cập nhật trạng thái'));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Chi Tiết Quick Task"
      subtitle={task.title}
      size="md"
      headerGradient="amber"
      footer={
        <div className="flex items-center justify-between w-full">
          <Link
            to="/quick-tasks"
            onClick={onClose}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
          >
            <span>Quản lý trang Quick Tasks</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-colors"
          >
            Đóng
          </button>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Title & Project Badge */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isDone
                  ? 'bg-emerald-100 text-emerald-800'
                  : task.status === 'IN_PROGRESS'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {task.status === 'DONE'
                ? 'Đã hoàn thành'
                : task.status === 'IN_PROGRESS'
                ? 'Đang thực hiện'
                : 'Cần làm'}
            </span>
            {task.project && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                style={{
                  backgroundColor: `${task.project.color}15`,
                  color: task.project.color,
                }}
              >
                {task.project.name}
              </span>
            )}
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
              Ưu tiên: {task.priority}
            </span>
          </div>
          <h3 className="text-base font-black text-slate-900 leading-snug">{task.title}</h3>
        </div>

        {/* Description */}
        {task.description && (
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 block mb-1">
              Mô tả chi tiết
            </span>
            <p className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-slate-700 leading-relaxed">
              {task.description}
            </p>
          </div>
        )}

        {/* Metadata grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Assignee */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] font-black uppercase text-slate-400 block">
              Người thực hiện
            </span>
            <div className="flex items-center gap-2 mt-1.5">
              {task.assignee?.avatar ? (
                <img
                  src={task.assignee.avatar}
                  alt={task.assignee.name}
                  className="w-6 h-6 rounded-full object-cover"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-amber-100 text-amber-800 font-bold text-xs flex items-center justify-center">
                  {(task.assignee?.name || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <div className="font-bold text-slate-900 truncate">
                  {task.assignee?.name || 'Chưa gán'}
                </div>
                {task.assignee?.position && (
                  <div className="text-[10px] text-slate-400 truncate">
                    {task.assignee.position}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Due date */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
            <span className="text-[10px] font-black uppercase text-slate-400 block">
              Hạn chót
            </span>
            <div className="flex items-center gap-2 mt-2">
              <Calendar
                className={`w-4 h-4 ${isOverdue ? 'text-rose-600' : 'text-slate-500'}`}
              />
              <span className={`font-bold ${isOverdue ? 'text-rose-600' : 'text-slate-800'}`}>
                {new Date(task.dueDate).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </span>
            </div>
            {isOverdue && (
              <span className="text-[10px] text-rose-600 font-black mt-0.5 block">
                Nhiệm vụ đã quá hạn
              </span>
            )}
          </div>
        </div>

        {/* Quick status change buttons */}
        <div className="pt-2">
          <span className="text-[10px] font-black uppercase text-slate-400 block mb-2">
            Cập nhật trạng thái nhanh:
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={updating || task.status === 'TODO'}
              onClick={() => handleUpdateStatus('TODO')}
              className={`py-2 px-3 rounded-xl font-bold text-xs border transition-colors ${
                task.status === 'TODO'
                  ? 'bg-slate-200 text-slate-800 border-slate-300'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              Cần làm
            </button>
            <button
              type="button"
              disabled={updating || task.status === 'IN_PROGRESS'}
              onClick={() => handleUpdateStatus('IN_PROGRESS')}
              className={`py-2 px-3 rounded-xl font-bold text-xs border transition-colors ${
                task.status === 'IN_PROGRESS'
                  ? 'bg-blue-100 text-blue-800 border-blue-300'
                  : 'bg-white hover:bg-blue-50 text-slate-700 border-slate-200'
              }`}
            >
              Đang làm
            </button>
            <button
              type="button"
              disabled={updating || task.status === 'DONE'}
              onClick={() => handleUpdateStatus('DONE')}
              className={`py-2 px-3 rounded-xl font-bold text-xs border transition-colors ${
                task.status === 'DONE'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-white hover:bg-emerald-50 text-slate-700 border-slate-200'
              }`}
            >
              Hoàn thành
            </button>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
