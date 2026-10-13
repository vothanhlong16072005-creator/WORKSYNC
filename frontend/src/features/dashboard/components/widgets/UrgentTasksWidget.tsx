import { useState } from 'react';
import { AlertTriangle, Calendar, ArrowRight, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import type { UrgentTask } from '../../types/dashboard.types';

interface Props {
  urgentTasks: UrgentTask[];
  upcomingTasks: UrgentTask[];
}

const PRIORITY_THEME: Record<
  string,
  { border: string; bg: string; badge: string; text: string }
> = {
  URGENT: {
    border: 'border-l-red-600',
    bg: 'hover:bg-red-50/40',
    badge: 'bg-red-600 text-white',
    text: 'text-red-700',
  },
  HIGH: {
    border: 'border-l-amber-500',
    bg: 'hover:bg-amber-50/40',
    badge: 'bg-amber-500 text-white',
    text: 'text-amber-700',
  },
  MEDIUM: {
    border: 'border-l-sky-500',
    bg: 'hover:bg-sky-50/40',
    badge: 'bg-sky-500 text-white',
    text: 'text-sky-700',
  },
  LOW: {
    border: 'border-l-slate-400',
    bg: 'hover:bg-slate-50',
    badge: 'bg-slate-400 text-white',
    text: 'text-slate-600',
  },
};

function formatDeadlineText(dueDateStr: string | null, t: (key: string, fallback: string) => string): { text: string; isOverdue: boolean } {
  if (!dueDateStr) return { text: '', isOverdue: false };
  const due = new Date(dueDateStr);
  const now = new Date();
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      text: `${t('dashboard.overdue', 'Quá hạn')} ${Math.abs(diffDays)}d`,
      isOverdue: true,
    };
  }
  if (diffDays === 0) {
    return { text: t('dashboard.today', 'Hôm nay'), isOverdue: false };
  }
  if (diffDays === 1) {
    return { text: t('dashboard.tomorrow', 'Ngày mai'), isOverdue: false };
  }
  return {
    text: `${t('dashboard.remaining', 'Còn')} ${diffDays}d`,
    isOverdue: false,
  };
}

export function UrgentTasksWidget({ urgentTasks, upcomingTasks }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'urgent' | 'upcoming'>('urgent');

  const currentList = tab === 'urgent' ? urgentTasks : upcomingTasks;

  return (
    <div className="p-5 bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]" aria-labelledby="urgent-tasks-title">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4 border-b-2 border-slate-900 gap-2">
        <div className="flex items-center gap-2">
          <span className="p-1 text-white bg-red-600 border border-slate-900">
            <AlertTriangle className="w-4 h-4" />
          </span>
          <h2 id="urgent-tasks-title" className="text-sm font-black uppercase tracking-wider text-slate-900">
            {t('dashboard.prioritized_tasks', 'Nhiệm vụ trọng tâm')}
          </h2>
        </div>

        {/* Tab switch between Urgent and Upcoming */}
        <div className="flex border-2 border-slate-900 bg-slate-100 text-xs font-black">
          <button
            type="button"
            onClick={() => setTab('urgent')}
            className={`px-3 py-1 uppercase transition-all flex items-center gap-1.5 ${
              tab === 'urgent'
                ? 'bg-red-600 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>{t('dashboard.urgent_tab', 'Gấp & Quá hạn')}</span>
            <span className={`px-1 text-[10px] ${tab === 'urgent' ? 'bg-red-800' : 'bg-slate-300'}`}>
              {urgentTasks.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setTab('upcoming')}
            className={`px-3 py-1 uppercase transition-all flex items-center gap-1.5 ${
              tab === 'upcoming'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3 h-3" />
            <span>{t('dashboard.upcoming_tab', '7 ngày tới')}</span>
            <span className={`px-1 text-[10px] ${tab === 'upcoming' ? 'bg-slate-700' : 'bg-slate-300'}`}>
              {upcomingTasks.length}
            </span>
          </button>
        </div>
      </div>

      {currentList.length === 0 ? (
        <div className="py-10 text-center text-slate-400 font-medium italic text-xs">
          {tab === 'urgent'
            ? t('dashboard.no_urgent_tasks', 'Tuyệt vời! Không có công việc nào quá hạn hoặc cần làm gấp.')
            : t('dashboard.no_upcoming_tasks', 'Không có công việc nào có hạn chót trong 7 ngày tới.')}
        </div>
      ) : (
        <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
          {currentList.map((task) => {
            const theme = PRIORITY_THEME[task.priority] ?? PRIORITY_THEME.LOW;
            const deadline = formatDeadlineText(task.dueDate, t);

            return (
              <div
                key={task.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate('/tasks')}
                onKeyDown={(e) => e.key === 'Enter' && navigate('/tasks')}
                className={`group flex items-center justify-between p-3.5 bg-white border-2 border-slate-200 border-l-4 ${theme.border} ${theme.bg} cursor-pointer transition-all hover:border-slate-900 hover:shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]`}
              >
                <div className="min-w-0 pr-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 border border-slate-900/10 ${theme.badge}`}>
                      {task.priority}
                    </span>
                    <span
                      className="text-[10px] font-bold uppercase px-1.5 py-0.5 border border-slate-300 bg-slate-50 text-slate-700 truncate max-w-[160px]"
                      style={{ borderLeftColor: task.projectColor, borderLeftWidth: 3 }}
                    >
                      {task.projectName}
                    </span>
                    {task.storyPoints != null && (
                      <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-1 border border-amber-200">
                        {task.storyPoints} SP
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 truncate normal-case group-hover:text-blue-600">
                    {task.title}
                  </h3>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {deadline.text && (
                    <div
                      className={`flex items-center gap-1 text-xs font-bold px-2 py-1 border ${
                        deadline.isOverdue
                          ? 'border-red-600 bg-red-100 text-red-700'
                          : 'border-slate-300 bg-slate-50 text-slate-700'
                      }`}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{deadline.text}</span>
                    </div>
                  )}
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
