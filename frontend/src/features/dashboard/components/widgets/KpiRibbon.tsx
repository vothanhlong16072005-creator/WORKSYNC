import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { TaskSummary } from '../../types/dashboard.types';

interface Props {
  summary: TaskSummary;
}

export function KpiRibbon({ summary }: Props) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
      {/* 1. Total Tasks */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-4 hover:shadow-md transition-shadow">
        <span className="text-xs font-bold text-slate-500 block mb-1">
          {t('dashboard.total', 'Total Tasks')}
        </span>
        <div className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">
          {summary.total}
        </div>
      </div>

      {/* 2. In Progress (Ochre/Amber) */}
      <div className="bg-white rounded-2xl border border-amber-300 shadow-sm p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-slate-700">
            {t('dashboard.in_progress', 'In Progress')}
          </span>
          <span className="w-2 h-2 rounded-full bg-amber-500" />
        </div>
        <div className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">
          {summary.inProgress}
        </div>
      </div>

      {/* 3. In Review (Cobalt Blue) */}
      <div className="bg-white rounded-2xl border border-blue-300 shadow-sm p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-slate-700">
            {t('dashboard.in_review', 'In Review')}
          </span>
          <span className="w-2 h-2 rounded-full bg-blue-600" />
        </div>
        <div className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">
          {summary.inReview}
        </div>
      </div>

      {/* 4. Blocked (Terracotta) */}
      <div className="bg-white rounded-2xl border border-red-300 shadow-sm p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-bold text-slate-700">
            {t('dashboard.blocked', 'Blocked')}
          </span>
          <span className="w-2 h-2 rounded-full bg-red-600" />
        </div>
        <div className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">
          {summary.blocked}
        </div>
      </div>

      {/* 5. Overdue (Red/Terracotta Alert) */}
      <div className="bg-white rounded-2xl border border-red-400 shadow-sm p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1 text-xs font-bold text-red-700">
            <span>{t('dashboard.overdue', 'Overdue')}</span>
            <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
          </div>
          {summary.overdueCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-red-600 text-white font-mono text-[10px] font-bold">
              Alert
            </span>
          )}
        </div>
        <div className="text-2xl sm:text-3xl font-black text-red-700 leading-none">
          {summary.overdueCount}
        </div>
      </div>

      {/* 6. Completed (Emerald Green) */}
      <div className="bg-white rounded-2xl border border-emerald-400 shadow-sm p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t('dashboard.done', 'Completed')}</span>
          </div>
        </div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl sm:text-3xl font-black text-slate-900 leading-none">
            {summary.done}
          </span>
          <span className="text-[11px] font-bold text-emerald-600 font-mono">
            {summary.completionRate}% rate
          </span>
        </div>
      </div>
    </div>
  );
}
