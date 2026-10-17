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
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 transition-all hover:border-slate-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/80 shadow-xs">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block">
              Lịch trình cá nhân
            </span>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Lịch biểu làm việc tuần này (Weekly Shift Schedule)
            </h2>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/90 text-xs font-semibold text-slate-600 border border-slate-200/60">
          <Clock className="w-3.5 h-3.5 text-blue-600" />
          <span>Chuẩn: 40h/tuần (8h/ngày)</span>
        </div>
      </div>

      {/* Mon - Fri Visual Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3.5">
        {days.map((day) => {
          const isWfh = day.type === 'WFH';
          const isLeave = day.type === 'LEAVE';

          return (
            <div
              key={day.date}
              className={`p-3.5 rounded-xl border transition-all relative flex flex-col justify-between ${
                day.isToday
                  ? 'border-2 border-blue-600/90 bg-blue-50/40 shadow-sm ring-2 ring-blue-500/10'
                  : 'border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              {day.isToday && (
                <span className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold shadow-xs">
                  Hôm nay
                </span>
              )}

              <div>
                <div className="flex items-baseline justify-between mb-2.5">
                  <span className="text-xs font-bold text-slate-900">
                    {day.dayName}
                  </span>
                  <span className="text-[11px] font-mono font-medium text-slate-500">
                    {day.dayNumber}
                  </span>
                </div>

                <div className="my-2">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                      isWfh
                        ? 'bg-sky-50 text-sky-800 border-sky-200/70'
                        : isLeave
                        ? 'bg-amber-50 text-amber-800 border-amber-200/70'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200/70'
                    }`}
                  >
                    {isWfh ? (
                      <Laptop className="w-3.5 h-3.5 text-sky-700" />
                    ) : isLeave ? (
                      <CalendarOff className="w-3.5 h-3.5 text-amber-700" />
                    ) : (
                      <Building2 className="w-3.5 h-3.5 text-emerald-700" />
                    )}
                    <span>{isWfh ? 'WFH' : isLeave ? 'Nghỉ phép' : 'Văn phòng'}</span>
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-200/60 pt-2.5 mt-2.5 text-[11px] text-slate-500 flex flex-col gap-1">
                <div className="flex items-center gap-1.5 font-mono font-semibold text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{day.timeRange}</span>
                </div>
                <div className="flex items-center gap-1.5 truncate text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
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
