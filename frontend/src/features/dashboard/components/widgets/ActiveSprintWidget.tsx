import { Flame, Clock, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ProgressBar } from '../ui/ProgressBar';
import type { ActiveSprintSummary } from '../../types/dashboard.types';

interface Props {
  activeSprint: ActiveSprintSummary | null;
}

export function ActiveSprintWidget({ activeSprint }: Props) {
  const { t } = useTranslation();

  if (!activeSprint) {
    return (
      <div className="p-5 bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
        <div className="flex items-center gap-2 pb-3 mb-3 border-b-2 border-slate-900">
          <Flame className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-600">
            {t('dashboard.active_sprint', 'Sprint đang diễn ra')}
          </h2>
        </div>
        <p className="py-4 text-center text-xs font-bold text-slate-400 italic">
          {t('dashboard.no_active_sprint', 'Hiện không có Sprint nào đang ở trạng thái ACTIVE.')}
        </p>
      </div>
    );
  }

  return (
    <div className="p-5 bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
      <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-slate-900">
        <div className="flex items-center gap-2">
          <span className="p-1 text-white bg-amber-600 border border-slate-900">
            <Flame className="w-4 h-4" />
          </span>
          <div>
            <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">
              {t('dashboard.sprint_live', 'Sprint hiện tại')}
            </span>
            <h2 className="text-sm font-black uppercase tracking-tight text-slate-900">
              {activeSprint.name}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border-2 border-amber-400 text-amber-900 text-xs font-black">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>{activeSprint.daysRemaining} {t('dashboard.days_left', 'ngày còn lại')}</span>
        </div>
      </div>

      <div className="flex items-center justify-between text-xs mb-2">
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 border border-slate-900 shrink-0"
            style={{ backgroundColor: activeSprint.projectColor }}
          />
          <span className="font-black text-slate-800 uppercase text-[11px] truncate max-w-[180px]">
            {activeSprint.projectName}
          </span>
        </div>
        <div className="flex items-center gap-1 font-mono font-bold text-slate-600">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>
            {activeSprint.doneTasks}/{activeSprint.totalTasks} ({activeSprint.progressPercent}%)
          </span>
        </div>
      </div>

      <ProgressBar
        value={activeSprint.progressPercent}
        color={activeSprint.projectColor}
        height="md"
        showPercent={false}
      />
    </div>
  );
}
