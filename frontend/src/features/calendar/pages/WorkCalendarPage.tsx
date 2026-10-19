import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarRange,
  ListTodo,
  Flag,
  Video,
  PlaneTakeoff,
  Home,
  Clock4,
  AlertTriangle,
} from 'lucide-react';
import { useCalendarStore } from '../stores/calendar.store';
import { WorkCalendarHeader } from '../components/WorkCalendarHeader';
import { TimelineCanvas } from '../components/TimelineCanvas';
import { ItemDetailPopover } from '../components/ItemDetailPopover';
import { RescheduleConfirmModal } from '../components/RescheduleConfirmModal';

export const WorkCalendarPage: React.FC = () => {
  const { t } = useTranslation();
  const { items, conflicts, fetchItems } = useCalendarStore();

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // Compute KPI metrics
  const taskCount = items.filter((i) => i.kind === 'task').length;
  const sprintCount = items.filter((i) => i.kind === 'sprint').length;
  const meetingCount = items.filter((i) => i.kind === 'meeting').length;
  const leaveCount = items.filter((i) => i.kind === 'leave').length;
  const wfhCount = items.filter((i) => i.kind === 'wfh').length;
  const overtimeCount = items.filter((i) => i.kind === 'overtime').length;

  const kpis = [
    {
      label: t('calendar.kpi.total', 'Tổng'),
      value: items.length,
      icon: CalendarRange,
      color: 'text-slate-800 bg-slate-50 border-slate-200',
    },
    {
      label: t('calendar.kpi.tasks', 'Tasks'),
      value: taskCount,
      icon: ListTodo,
      color: 'text-blue-700 bg-blue-50/60 border-blue-200',
    },
    {
      label: t('calendar.kpi.sprints', 'Sprints'),
      value: sprintCount,
      icon: Flag,
      color: 'text-indigo-700 bg-indigo-50/60 border-indigo-200',
    },
    {
      label: t('calendar.kpi.meetings', 'Cuộc họp'),
      value: meetingCount,
      icon: Video,
      color: 'text-purple-700 bg-purple-50/60 border-purple-200',
    },
    {
      label: t('calendar.kpi.leave', 'Nghỉ phép'),
      value: leaveCount,
      icon: PlaneTakeoff,
      color: 'text-amber-700 bg-amber-50/60 border-amber-200',
    },
    {
      label: t('calendar.kpi.wfh', 'WFH'),
      value: wfhCount,
      icon: Home,
      color: 'text-emerald-700 bg-emerald-50/60 border-emerald-200',
    },
    {
      label: t('calendar.kpi.overtime', 'Tăng ca'),
      value: overtimeCount,
      icon: Clock4,
      color: 'text-rose-700 bg-rose-50/60 border-rose-200',
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-50/50">
      {/* Top Header */}
      <WorkCalendarHeader />

      <div className="p-4 sm:p-6 space-y-4 flex-1 flex flex-col">
        {/* KPI Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {kpis.map((kpi, idx) => {
            const Icon = kpi.icon;
            return (
              <div
                key={idx}
                className={`p-3 rounded-2xl border bg-white shadow-2xs flex items-center justify-between ${kpi.color}`}
              >
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {kpi.label}
                  </span>
                  <p className="text-xl font-bold tracking-tight mt-0.5">{kpi.value}</p>
                </div>
                <div className="p-2 rounded-xl bg-white/80 shadow-2xs">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>

        {/* Conflict Alert Banner if any */}
        {conflicts.length > 0 && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 shadow-xs flex items-center justify-between gap-3 animate-in fade-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 animate-pulse" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-rose-900">
                  {t('calendar.conflict_banner', 'Đã phát hiện xung đột lịch làm việc cần chú ý')} ({conflicts.length})
                </h4>
                <p className="text-[11px] text-rose-700 mt-0.5">
                  {conflicts[0].message}
                  {conflicts.length > 1 && ` (+${conflicts.length - 1} xung đột khác)`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Main Canvas Grid */}
        <TimelineCanvas />
      </div>

      {/* Popovers and Modals */}
      <ItemDetailPopover />
      <RescheduleConfirmModal />
    </div>
  );
};
