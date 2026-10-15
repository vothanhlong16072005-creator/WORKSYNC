import { Calendar, Building2, Laptop, CalendarOff, Clock, MapPin } from 'lucide-react';
import type { DailyShift } from '../../types/dashboard.types';

interface Props {
  schedule?: DailyShift[];
}

export function WeeklyShiftScheduleWidget({ schedule = [] }: Props) {
  // Default Mon-Fri fallback if empty
  const days: DailyShift[] =
    schedule.length > 0
      ? schedule
      : [
          { date: '2026-10-12', dayName: 'Thứ 2', dayNumber: '12/10', type: 'OFFICE', badgeLabel: 'Văn phòng FPT Complex', timeRange: '08:30 - 17:30', isToday: false },
          { date: '2026-10-13', dayName: 'Thứ 3', dayNumber: '13/10', type: 'OFFICE', badgeLabel: 'Văn phòng FPT Complex', timeRange: '08:30 - 17:30', isToday: false },
          { date: '2026-10-14', dayName: 'Thứ 4', dayNumber: '14/10', type: 'WFH', badgeLabel: 'WFH (Làm từ xa)', timeRange: '08:30 - 17:30', isToday: false },
          { date: '2026-10-15', dayName: 'Thứ 5', dayNumber: '15/10', type: 'OFFICE', badgeLabel: 'Văn phòng FPT Complex', timeRange: '08:30 - 17:30', isToday: false },
          { date: '2026-10-16', dayName: 'Thứ 6', dayNumber: '16/10', type: 'OFFICE', badgeLabel: 'Văn phòng FPT Complex', timeRange: '08:30 - 17:30', isToday: true },
        ];

  return (
    <div className="p-5 bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b-2 border-slate-900">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-blue-600 text-white border border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <Calendar className="w-4 h-4" />
          </span>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">
              Lịch trình cá nhân
            </span>
            <h2 className="text-sm font-black uppercase tracking-tight text-slate-900">
              Lịch biểu làm việc tuần này (Weekly Shift Schedule)
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-900 text-xs font-mono font-bold text-slate-700">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>Chuẩn: 40h/tuần (8h/ngày)</span>
        </div>
      </div>

      {/* Mon - Fri Visual Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {days.map((day) => {
          const isWfh = day.type === 'WFH';
          const isLeave = day.type === 'LEAVE';

          return (
            <div
              key={day.date}
              className={`p-3 border-2 transition-all relative flex flex-col justify-between ${
                day.isToday
                  ? 'border-blue-600 bg-blue-50/50 shadow-[3px_3px_0px_0px_rgba(37,99,235,1)] ring-2 ring-blue-500/20'
                  : 'border-slate-900 bg-white hover:bg-slate-50'
              }`}
            >
              {day.isToday && (
                <span className="absolute -top-2.5 right-2 px-1.5 py-0.5 bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider border border-slate-900 shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]">
                  Hôm nay
                </span>
              )}

              <div>
                <div className="flex items-baseline justify-between mb-2">
                  <span className="text-xs font-black uppercase text-slate-900">
                    {day.dayName}
                  </span>
                  <span className="text-[11px] font-mono font-bold text-slate-500">
                    {day.dayNumber}
                  </span>
                </div>

                <div className="my-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-1 text-[11px] font-black uppercase border border-slate-900 ${
                      isWfh
                        ? 'bg-sky-100 text-sky-800'
                        : isLeave
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {isWfh ? (
                      <Laptop className="w-3 h-3 text-sky-700" />
                    ) : isLeave ? (
                      <CalendarOff className="w-3 h-3 text-amber-700" />
                    ) : (
                      <Building2 className="w-3 h-3 text-emerald-700" />
                    )}
                    <span>{isWfh ? 'WFH' : isLeave ? 'Nghỉ phép' : 'Văn phòng'}</span>
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-2 mt-2 text-[10px] text-slate-500 flex flex-col gap-0.5">
                <div className="flex items-center gap-1 font-mono font-bold text-slate-700">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span>{day.timeRange}</span>
                </div>
                <div className="flex items-center gap-1 truncate text-slate-500">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{isWfh ? 'Remote / Nhà riêng' : 'FPT Complex ĐN'}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
