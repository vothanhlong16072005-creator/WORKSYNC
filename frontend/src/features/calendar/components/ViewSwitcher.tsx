import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar as CalendarIcon, CalendarDays, Grid3X3 } from 'lucide-react';
import { useCalendarStore } from '../stores/calendar.store';
import type { CalendarView } from '../types/calendar.types';

export const ViewSwitcher: React.FC = () => {
  const { t } = useTranslation();
  const { view, setView } = useCalendarStore();

  const views: { key: CalendarView; label: string; icon: React.ElementType }[] = [
    { key: 'day', label: t('calendar.view.day', 'Ngày'), icon: CalendarIcon },
    { key: 'week', label: t('calendar.view.week', 'Tuần'), icon: CalendarDays },
    { key: 'month', label: t('calendar.view.month', 'Tháng'), icon: Grid3X3 },
  ];

  return (
    <div className="inline-flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 shadow-2xs">
      {views.map((v) => {
        const isActive = view === v.key;
        const Icon = v.icon;

        return (
          <button
            key={v.key}
            type="button"
            onClick={() => setView(v.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-all cursor-pointer ${
              isActive
                ? 'bg-white text-slate-900 font-semibold shadow-xs border border-slate-200/60'
                : 'text-slate-600 hover:text-slate-900 font-medium hover:bg-white/50'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
            <span>{v.label}</span>
          </button>
        );
      })}
    </div>
  );
};
