import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, Square, ChevronRight } from 'lucide-react';
import type { UrgentTask } from '../../types/dashboard.types';

interface Props {
  urgentTasks: UrgentTask[];
  upcomingTasks: UrgentTask[];
}

const PRIORITY_PILL: Record<string, { bg: string; text: string; label: string }> = {
  URGENT: { bg: 'bg-blue-600', text: 'text-white', label: 'Urgent' },
  HIGH: { bg: 'bg-amber-500', text: 'text-white', label: 'High' },
  MEDIUM: { bg: 'bg-amber-700', text: 'text-white', label: 'Medium' },
  LOW: { bg: 'bg-slate-400', text: 'text-white', label: 'Low' },
};

export function CoreTasksChecklist({ urgentTasks, upcomingTasks }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'urgent' | 'upcoming'>('urgent');
  const [completedIds, setCompletedIds] = useState<Record<string, boolean>>({});

  const list = tab === 'urgent' ? urgentTasks : upcomingTasks;

  const toggleCheck = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between">
      <div>
        {/* Header with Tabs */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setTab('urgent')}
              className={`text-xs font-black uppercase tracking-wider pb-1 transition-all ${
                tab === 'urgent'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              {t('dashboard.urgent_tasks', 'Urgent Tasks')} ({urgentTasks.length})
            </button>

            <button
              type="button"
              onClick={() => setTab('upcoming')}
              className={`text-xs font-black uppercase tracking-wider pb-1 transition-all ${
                tab === 'upcoming'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-slate-400 hover:text-slate-700'
              }`}
            >
              {t('dashboard.upcoming_tab', 'Next 7 Days')} ({upcomingTasks.length})
            </button>
          </div>

          <span className="text-[11px] font-bold text-slate-400 uppercase">Priority</span>
        </div>

        {/* Task list with checkboxes */}
        <div className="space-y-2">
          {list.length === 0 ? (
            <div className="py-8 text-center text-xs font-medium text-slate-400 italic">
              {t('dashboard.no_tasks', 'Không có công việc nào.')}
            </div>
          ) : (
            list.slice(0, 6).map((task) => {
              const pill = PRIORITY_PILL[task.priority] ?? PRIORITY_PILL.LOW;
              const isChecked = !!completedIds[task.id];

              return (
                <div
                  key={task.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => navigate('/tasks')}
                  onKeyDown={(e) => e.key === 'Enter' && navigate('/tasks')}
                  className="group flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0 pr-2">
                    <button
                      type="button"
                      onClick={(e) => toggleCheck(task.id, e)}
                      className="text-slate-400 hover:text-blue-600 shrink-0"
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <Square className="w-4 h-4" />
                      )}
                    </button>

                    <span
                      className={`text-xs font-medium truncate ${
                        isChecked ? 'line-through text-slate-400' : 'text-slate-800 group-hover:text-blue-600'
                      }`}
                    >
                      {task.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pill.bg} ${pill.text}`}
                    >
                      {pill.label}
                    </span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-400">
          {list.length} tasks scheduled
        </span>
        <button
          type="button"
          onClick={() => navigate('/tasks')}
          className="text-xs font-bold text-blue-600 hover:underline"
        >
          {t('dashboard.view_all_tasks', 'View all on board →')}
        </button>
      </div>
    </div>
  );
}
