import { Flame, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ActiveSprintSummary } from '../../types/dashboard.types';

interface Props {
  activeSprint: ActiveSprintSummary | null;
}

export function ActiveSprintCard({ activeSprint }: Props) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Flame className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">
            {t('dashboard.active_sprint', 'Active Sprint')}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400">
          <Users className="w-4 h-4" />
          <span className="text-xs font-bold text-slate-600">5 members</span>
        </div>
      </div>

      <div>
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-2xl font-black font-mono text-slate-900 tracking-tight">
            {activeSprint ? `${activeSprint.daysRemaining}d : 14h : 22m` : '00:23:48 41m'}
          </span>
          <span className="text-xs font-bold text-blue-600">
            {activeSprint ? `${activeSprint.progressPercent}% done` : '70% done'}
          </span>
        </div>

        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-500"
            style={{ width: `${activeSprint ? activeSprint.progressPercent : 70}%` }}
          />
        </div>

        <p className="text-xs font-medium text-slate-500 truncate">
          {activeSprint ? activeSprint.name : 'Sprint 14: Q4 Launch & Architecture Hardening'}
        </p>
      </div>

      <div className="pt-2 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
        <span>Target: 32 story points</span>
        <span className="text-blue-600 font-bold">● Sprint goal on track</span>
      </div>
    </div>
  );
}
