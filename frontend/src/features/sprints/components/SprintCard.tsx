import React from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Play, CheckCircle2, ChevronRight, Trash2, Zap, Clock } from 'lucide-react';
import type { Sprint } from '../types/sprint.types';
import { SprintStatusBadge } from './SprintStatusBadge';

interface SprintCardProps {
  sprint: Sprint;
  projectId: string;
  isPMOrAdmin: boolean;
  onStart?: (sprint: Sprint) => void;
  onComplete?: (sprint: Sprint) => void;
  onDelete?: (sprint: Sprint) => void;
}

export const SprintCard: React.FC<SprintCardProps> = ({
  sprint,
  projectId,
  isPMOrAdmin,
  onStart,
  onComplete,
  onDelete,
}) => {
  const progress = sprint.progress || {
    totalTasks: 0,
    doneTasks: 0,
    totalStoryPoints: 0,
    completedStoryPoints: 0,
    percent: 0,
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`;
  };

  const startFormatted = formatDate(sprint.startDate);
  const endFormatted = formatDate(sprint.endDate);

  const isPlanning = sprint.status === 'PLANNING';
  const isActive = sprint.status === 'ACTIVE';
  const isCompleted = sprint.status === 'COMPLETED';

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        isActive
          ? 'bg-gradient-to-br from-emerald-50/40 via-white to-white border-emerald-300/80 shadow-md ring-1 ring-emerald-400/20'
          : isCompleted
          ? 'bg-slate-50/40 border-slate-200/80 hover:border-slate-300 shadow-xs'
          : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-xs'
      }`}
    >
      {/* Top Accent Strip */}
      <div
        className={`h-1.5 w-full ${
          isActive
            ? 'bg-gradient-to-r from-emerald-500 to-teal-500'
            : isCompleted
            ? 'bg-blue-500'
            : 'bg-slate-300'
        }`}
      />

      <div className="p-5">
        {/* Header line */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2 mb-1.5">
              <SprintStatusBadge status={sprint.status} size="sm" />
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {sprint.durationDays} ngày
              </span>
            </div>
            <Link
              to={`/projects/${projectId}/sprints/${sprint.id}`}
              className="text-base font-bold text-slate-900 hover:text-blue-600 transition-colors line-clamp-1 group flex items-center gap-1.5"
            >
              {sprint.name}
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all" />
            </Link>
            {sprint.goal && (
              <p className="text-xs text-slate-500 mt-1 line-clamp-2 italic">
                "{sprint.goal}"
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            {isPMOrAdmin && isPlanning && onStart && (
              <button
                onClick={() => onStart(sprint)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-98 transition-all flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                Bắt đầu Sprint
              </button>
            )}

            {isPMOrAdmin && isActive && onComplete && (
              <button
                onClick={() => onComplete(sprint)}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs active:scale-98 transition-all flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Hoàn thành
              </button>
            )}

            {isPMOrAdmin && !isActive && onDelete && (
              <button
                onClick={() => onDelete(sprint)}
                title="Xóa Sprint"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Date and SP Badges */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-4 pb-3 border-b border-slate-100">
          {(startFormatted || endFormatted) && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>
                {startFormatted || '---'} đến {endFormatted || '---'}
              </span>
            </div>
          )}

          <div className="flex items-center gap-1.5 text-slate-700 font-medium">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>
              {progress.completedStoryPoints}/{progress.totalStoryPoints} Story Points
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-500">
              Tiến độ công việc:{' '}
              <strong className="text-slate-800 font-semibold">
                {progress.doneTasks}/{progress.totalTasks} task
              </strong>
            </span>
            <span
              className={`font-bold ${
                progress.percent === 100
                  ? 'text-emerald-600'
                  : progress.percent > 50
                  ? 'text-blue-600'
                  : 'text-slate-700'
              }`}
            >
              {progress.percent}%
            </span>
          </div>

          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                progress.percent === 100
                  ? 'bg-emerald-500'
                  : isActive
                  ? 'bg-gradient-to-r from-emerald-500 to-blue-500'
                  : 'bg-blue-600'
              }`}
              style={{ width: `${Math.min(100, progress.percent)}%` }}
            />
          </div>
        </div>

        {/* View Detail Link Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100/80 flex items-center justify-between">
          <Link
            to={`/projects/${projectId}/sprints/${sprint.id}`}
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
          >
            <span>Xem chi tiết nhiệm vụ & Burndown</span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <span className="text-[11px] text-slate-400">
            {progress.totalTasks - progress.doneTasks} task còn lại
          </span>
        </div>
      </div>
    </div>
  );
};
