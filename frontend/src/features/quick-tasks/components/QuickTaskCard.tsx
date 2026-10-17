/**
 * QuickTaskCard — M3.5
 * Card hiển thị 1 Quick Task với đầy đủ info + actions (toggle status, delete).
 *
 * Design: Modern Enterprise SaaS + Bauhaus Accents
 * - Border-left 4px theo priority
 * - Pill badges cho status / priority
 * - Avatar assignee + assigner
 * - Hover lift + focus ring
 */
import { useTranslation } from 'react-i18next';
import { Clock, AlertTriangle, Trash2, CalendarDays, FolderKanban, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import type { QuickTask, TaskStatus, Priority } from '../types/quick-task.types';
import { useQuickTaskStore } from '../stores/quick-task.store';
import { useAuthStore } from '@/stores/auth.store';
import { getErrorMessage } from '@/features/attendance/utils/error-handler';

interface QuickTaskCardProps {
  task: QuickTask;
  onClick?: () => void;
}

const STATUS_META: Record<TaskStatus, { label: string; color: string; iconBg: string; iconColor: string; Icon: typeof CheckCircle2 }> = {
  TODO: { label: 'Cần làm', color: 'bg-slate-100 text-slate-700 border-slate-200', iconBg: 'bg-slate-100', iconColor: 'text-slate-500', Icon: Clock },
  IN_PROGRESS: { label: 'Đang làm', color: 'bg-amber-50 text-amber-700 border-amber-200', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', Icon: Clock },
  IN_REVIEW: { label: 'Đang duyệt', color: 'bg-blue-50 text-blue-700 border-blue-200', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', Icon: Clock },
  BLOCKED: { label: 'Bị chặn', color: 'bg-rose-50 text-rose-700 border-rose-200', iconBg: 'bg-rose-100', iconColor: 'text-rose-600', Icon: AlertTriangle },
  DONE: { label: 'Hoàn thành', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', Icon: CheckCircle2 },
};

const PRIORITY_LEFT_BORDER: Record<Priority, string> = {
  LOW: 'border-l-slate-300',
  MEDIUM: 'border-l-amber-400',
  HIGH: 'border-l-orange-500',
  URGENT: 'border-l-rose-600',
};

const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: 'Thấp',
  MEDIUM: 'Trung bình',
  HIGH: 'Cao',
  URGENT: 'Khẩn',
};

function formatDue(dueDate: string): { label: string; isOverdue: boolean } {
  const d = new Date(dueDate);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const isOverdue = diffMs < 0;
  const dayDiff = Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24));

  if (dayDiff === 0) {
    return { label: `Hôm nay ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`, isOverdue };
  }
  if (dayDiff === 1) {
    return { label: isOverdue ? 'Quá hạn 1 ngày' : 'Ngày mai', isOverdue };
  }
  if (dayDiff < 7) {
    return {
      label: isOverdue ? `Quá hạn ${dayDiff} ngày` : `Còn ${dayDiff} ngày`,
      isOverdue,
    };
  }
  return {
    label: d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    isOverdue,
  };
}

export function QuickTaskCard({ task, onClick }: QuickTaskCardProps) {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');
  const { user } = useAuthStore();
  const { update, remove } = useQuickTaskStore();

  const isAssignee = task.assigneeId === user?.id;
  const isAssigner = task.assignedById === user?.id;
  const isAdmin = user?.role === 'ADMIN';
  const canToggleStatus = isAssignee || isAssigner || isAdmin;
  const canDelete = isAssigner || isAdmin || user?.role === 'PM';

  const statusMeta = STATUS_META[task.status];
  const due = formatDue(task.dueDate);

  const handleToggleStatus = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextStatus: TaskStatus = task.status === 'DONE' ? 'TODO' : 'DONE';
    try {
      await update(task.id, { status: nextStatus });
      toast.success(
        nextStatus === 'DONE'
          ? isVi
            ? 'Đã đánh dấu hoàn thành'
            : 'Marked as done'
          : isVi
            ? 'Đã mở lại task'
            : 'Re-opened task',
      );
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, isVi ? 'Lỗi cập nhật' : 'Update failed'));
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(isVi ? 'Bạn có chắc muốn xóa task này?' : 'Delete this task?')) return;
    try {
      await remove(task.id);
      toast.success(isVi ? 'Đã xóa task' : 'Task deleted');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, isVi ? 'Lỗi xóa' : 'Delete failed'));
    }
  };

  return (
    <div
      className={`group relative bg-white rounded-2xl border border-slate-200/80 ${PRIORITY_LEFT_BORDER[task.priority]} border-l-4 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden`}
      onClick={onClick}
      data-testid="quick-task-card"
    >
      <div className="p-4 space-y-3">
        {/* Row 1: Title + Status badge */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-bold text-slate-900 leading-snug flex-1 min-w-0">
            {task.title}
          </h4>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border rounded-full whitespace-nowrap ${statusMeta.color}`}
          >
            <statusMeta.Icon className="w-3 h-3" />
            {statusMeta.label}
          </span>
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">{task.description}</p>
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2 text-[11px]">
          {/* Due date */}
          <div
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border ${
              due.isOverdue
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            <CalendarDays className="w-3 h-3" />
            <span className="font-bold">{due.label}</span>
          </div>

          {/* Priority pill */}
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border ${
              task.priority === 'URGENT'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : task.priority === 'HIGH'
                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                  : task.priority === 'MEDIUM'
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
          >
            <span className="font-bold uppercase tracking-wider">{PRIORITY_LABEL[task.priority]}</span>
          </span>

          {/* Project ref */}
          {task.project && (
            <span
              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-slate-50 text-slate-700"
              style={{ borderLeftColor: task.project.color, borderLeftWidth: 3 }}
            >
              <FolderKanban className="w-3 h-3" />
              <span className="font-bold truncate max-w-[120px]">{task.project.name}</span>
            </span>
          )}
        </div>

        {/* Footer: Assignee + Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2 min-w-0">
            {/* Assignee avatar */}
            <div className="flex items-center gap-1.5 min-w-0">
              {task.assignee.avatar ? (
                <img
                  src={task.assignee.avatar}
                  alt={task.assignee.name}
                  className="w-6 h-6 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 border border-slate-200 flex items-center justify-center text-[10px] font-black">
                  {task.assignee.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-[11px] font-bold text-slate-700 truncate max-w-[120px]">
                {task.assignee.name}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">←</span>
            <div className="flex items-center gap-1.5 min-w-0">
              {task.assignedBy.avatar ? (
                <img
                  src={task.assignedBy.avatar}
                  alt={task.assignedBy.name}
                  className="w-6 h-6 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center text-[10px] font-black">
                  {task.assignedBy.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span className="text-[10px] text-slate-500 truncate max-w-[100px]">
                {task.assignedBy.name}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {canToggleStatus && task.status !== 'DONE' && (
              <button
                type="button"
                onClick={handleToggleStatus}
                className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                title={isVi ? 'Đánh dấu hoàn thành' : 'Mark as done'}
                aria-label="Mark as done"
              >
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title={isVi ? 'Xóa' : 'Delete'}
                aria-label="Delete task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
