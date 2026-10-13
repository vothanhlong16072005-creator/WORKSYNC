import { History, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { RecentActivity } from '../../types/dashboard.types';

interface Props {
  activities: RecentActivity[];
}

function formatRelativeTime(dateStr: string, t: (key: string, fallback: string) => string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (diffSec < 60) return t('dashboard.just_now', 'Vừa xong');
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} ${t('dashboard.min_ago', 'phút trước')}`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} ${t('dashboard.hours_ago', 'giờ trước')}`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ${t('dashboard.days_ago', 'ngày trước')}`;
}

const STATUS_BADGE: Record<string, { bg: string; text: string }> = {
  DONE: { bg: 'bg-emerald-100 border-emerald-300', text: 'text-emerald-900' },
  IN_PROGRESS: { bg: 'bg-amber-100 border-amber-300', text: 'text-amber-900' },
  IN_REVIEW: { bg: 'bg-blue-100 border-blue-300', text: 'text-blue-900' },
  BLOCKED: { bg: 'bg-red-100 border-red-300', text: 'text-red-900' },
  TODO: { bg: 'bg-slate-100 border-slate-300', text: 'text-slate-800' },
};

export function RecentActivityWidget({ activities }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="p-5 bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
      <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-slate-900">
        <div className="flex items-center gap-2">
          <span className="p-1 text-white bg-slate-900 border border-slate-900">
            <History className="w-4 h-4" />
          </span>
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
            {t('dashboard.recent_activity', 'Hoạt động gần đây')}
          </h2>
        </div>
        <span className="text-xs font-bold text-slate-500">
          {activities.length} {t('dashboard.updates', 'cập nhật')}
        </span>
      </div>

      {activities.length === 0 ? (
        <p className="py-4 text-center text-xs font-bold text-slate-400 italic">
          {t('dashboard.no_activities', 'Chưa có hoạt động cập nhật nào gần đây.')}
        </p>
      ) : (
        <div className="space-y-2">
          {activities.map((act) => {
            const badge = STATUS_BADGE[act.status] ?? STATUS_BADGE.TODO;
            const timeAgo = formatRelativeTime(act.updatedAt, t);

            return (
              <div
                key={act.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate('/tasks')}
                onKeyDown={(e) => e.key === 'Enter' && navigate('/tasks')}
                className="group flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 hover:border-slate-900 hover:bg-white transition-all cursor-pointer"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className="text-[9px] font-black uppercase px-1.5 py-0.2 border border-slate-300 bg-white text-slate-700 truncate max-w-[120px]"
                      style={{ borderLeftColor: act.projectColor, borderLeftWidth: 3 }}
                    >
                      {act.projectName}
                    </span>
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 border ${badge.bg} ${badge.text}`}>
                      {act.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600">
                    {act.title}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">
                    {timeAgo}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
