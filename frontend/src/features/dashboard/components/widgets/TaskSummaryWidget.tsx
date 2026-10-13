import { ListTodo, Clock, Eye, AlertOctagon, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { StatCard } from '../ui/StatCard';
import type { TaskSummary } from '../../types/dashboard.types';

interface Props {
  summary: TaskSummary;
  weeklyDone?: number;
}

export function TaskSummaryWidget({ summary, weeklyDone }: Props) {
  const { t } = useTranslation();

  return (
    <section aria-labelledby="task-summary-title">
      <div className="flex items-center justify-between mb-3">
        <h2 id="task-summary-title" className="text-xs font-black uppercase tracking-widest text-slate-500">
          {t('dashboard.task_summary', 'Tổng quan công việc & Hiệu suất')}
        </h2>
        <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
          {summary.totalStoryPoints > 0 && (
            <span className="px-2 py-0.5 bg-amber-50 border border-amber-300 text-amber-900 font-mono">
              {summary.totalStoryPoints} {t('dashboard.story_points', 'Story Points')}
            </span>
          )}
          {summary.totalActualHours > 0 && (
            <span className="px-2 py-0.5 bg-blue-50 border border-blue-300 text-blue-900 font-mono">
              {summary.totalActualHours}h / {summary.totalEstimatedHours}h
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          label={t('dashboard.total', 'Tổng việc')}
          value={summary.total}
          icon={<ListTodo className="h-4 w-4" />}
          variant="default"
        />
        <StatCard
          label={t('dashboard.in_progress', 'Đang làm')}
          value={summary.inProgress}
          icon={<Clock className="h-4 w-4" />}
          variant="progress"
        />
        <StatCard
          label={t('dashboard.in_review', 'Đánh giá')}
          value={summary.inReview}
          icon={<Eye className="h-4 w-4" />}
          variant="default"
        />
        <StatCard
          label={t('dashboard.blocked', 'Bị chặn')}
          value={summary.blocked}
          icon={<AlertOctagon className="h-4 w-4" />}
          variant="blocked"
        />
        <StatCard
          label={t('dashboard.overdue', 'Quá hạn')}
          value={summary.overdueCount}
          icon={<AlertTriangle className="h-4 w-4" />}
          variant={summary.overdueCount > 0 ? 'blocked' : 'default'}
        />
        <StatCard
          label={t('dashboard.done', 'Hoàn thành')}
          value={summary.done}
          icon={<CheckCircle2 className="h-4 w-4" />}
          variant="done"
          subtitle={
            weeklyDone !== undefined && weeklyDone > 0
              ? `+${weeklyDone} ${t('dashboard.this_week', 'tuần này')}`
              : `${summary.completionRate}%`
          }
        />
      </div>
    </section>
  );
}
