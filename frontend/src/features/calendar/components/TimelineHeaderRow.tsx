import React from 'react';
import type { CalendarView } from '../types/calendar.types';
import { isSameDay } from '../utils/date-ranges';

interface TimelineHeaderRowProps {
  view: CalendarView;
  days: Date[];
}

export const TimelineHeaderRow: React.FC<TimelineHeaderRowProps> = ({ view, days }) => {
  const today = new Date();

  const getDayName = (d: Date): string => {
    const daysMap = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return daysMap[d.getDay()];
  };

  return (
    <div className="flex border-b border-slate-200 bg-slate-50/80 sticky top-0 z-20 backdrop-blur-xs">
      {/* Fixed User Column Header */}
      <div className="w-48 sm:w-56 shrink-0 px-4 py-3 border-r border-slate-200 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
        <span>Thành viên / Nguồn</span>
      </div>

      {/* Dynamic Date Columns */}
      <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(${view === 'month' ? '36px' : '140px'}, 1fr))` }}>
        {days.map((date, idx) => {
          const isCurrentDay = isSameDay(date, today);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;

          return (
            <div
              key={idx}
              className={`px-2 py-2 text-center border-r border-slate-200/80 transition-colors ${
                isCurrentDay
                  ? 'bg-blue-50/70 border-b-2 border-b-blue-600'
                  : isWeekend
                  ? 'bg-slate-100/40'
                  : ''
              }`}
            >
              <div className="flex flex-col items-center justify-center">
                <span
                  className={`text-[11px] font-semibold uppercase ${
                    isCurrentDay ? 'text-blue-600 font-bold' : 'text-slate-400'
                  }`}
                >
                  {view === 'month' ? date.getDate() : getDayName(date)}
                </span>

                {view !== 'month' && (
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mt-0.5 ${
                      isCurrentDay
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-800'
                    }`}
                  >
                    {date.getDate()}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
