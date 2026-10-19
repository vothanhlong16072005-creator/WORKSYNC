import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Download,
  CalendarDays,
} from 'lucide-react';
import { useCalendarStore } from '../stores/calendar.store';
import { ScopeSwitcher } from './ScopeSwitcher';
import { ViewSwitcher } from './ViewSwitcher';
import { TimelineFilters } from './TimelineFilters';
import { formatDateShort } from '../utils/date-ranges';

export const WorkCalendarHeader: React.FC = () => {
  const { t } = useTranslation();
  const {
    rangeStart,
    rangeEnd,
    navigatePrev,
    navigateNext,
    navigateToday,
    exportIcs,
  } = useCalendarStore();

  const formattedRange = `${formatDateShort(rangeStart)} — ${formatDateShort(rangeEnd)}`;

  return (
    <div className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-4 shadow-2xs">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Left: Title & Date Range Navigation */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 shadow-xs">
            <CalendarRange className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                {t('calendar.title', 'Lịch làm việc')}
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 border border-blue-200 text-blue-700">
                <CalendarDays className="w-3 h-3 text-blue-600" />
                <span>{formattedRange}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {t('calendar.subtitle', 'Timeline tổng hợp Công việc, Sprint, Cuộc họp, Nghỉ phép và Chấm công')}
            </p>
          </div>
        </div>

        {/* Right: Controls Strip */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Date Navigation */}
          <div className="inline-flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 shadow-2xs">
            <button
              type="button"
              onClick={navigatePrev}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer"
              title={t('calendar.nav.prev', 'Trước')}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={navigateToday}
              className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-white rounded-lg transition-all cursor-pointer"
            >
              {t('calendar.nav.today', 'Hôm nay')}
            </button>
            <button
              type="button"
              onClick={navigateNext}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-all cursor-pointer"
              title={t('calendar.nav.next', 'Tiếp theo')}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Scope Switcher */}
          <ScopeSwitcher />

          {/* View Switcher */}
          <ViewSwitcher />

          {/* Filters */}
          <TimelineFilters />

          {/* Export ICS Button */}
          <button
            type="button"
            onClick={exportIcs}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs hover:shadow-xs active:scale-[0.98] cursor-pointer"
            title={t('calendar.export', 'Xuất file .ics')}
          >
            <Download className="w-3.5 h-3.5 text-blue-600" />
            <span className="hidden sm:inline">{t('calendar.export', 'Xuất .ics')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
