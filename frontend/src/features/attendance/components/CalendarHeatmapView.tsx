import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar, ChevronLeft, ChevronRight, Info } from 'lucide-react';
import type { AttendanceRecord, AttendanceStatus } from '../types/attendance.types';

interface CalendarHeatmapViewProps {
  records: AttendanceRecord[];
  year?: number;
  onDayClick?: (record: AttendanceRecord) => void;
}

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  ON_TIME: 'bg-emerald-400',
  LATE: 'bg-amber-400',
  VERY_LATE: 'bg-red-400',
  WFH: 'bg-blue-400',
  BUSINESS_TRIP: 'bg-indigo-400',
  ABSENT_APPROVED: 'bg-slate-300',
  ABSENT_UNAPPROVED: 'bg-rose-400',
  EARLY_LEAVE_APPROVED: 'bg-cyan-400',
  EARLY_LEAVE_UNAPPROVED: 'bg-rose-500',
};

const STATUS_LABELS: Record<AttendanceStatus, { vi: string; en: string }> = {
  ON_TIME: { vi: 'Đúng giờ', en: 'On Time' },
  LATE: { vi: 'Đi muộn', en: 'Late' },
  VERY_LATE: { vi: 'Rất muộn', en: 'Very Late' },
  WFH: { vi: 'WFH', en: 'WFH' },
  BUSINESS_TRIP: { vi: 'Công tác', en: 'Business Trip' },
  ABSENT_APPROVED: { vi: 'Nghỉ phép', en: 'Approved Leave' },
  ABSENT_UNAPPROVED: { vi: 'Vắng mặt', en: 'Absent' },
  EARLY_LEAVE_APPROVED: { vi: 'Về sớm (có phép)', en: 'Early Leave (OK)' },
  EARLY_LEAVE_UNAPPROVED: { vi: 'Về sớm (không phép)', en: 'Early Leave (No permit)' },
};

const DAY_LABELS_VI = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const DAY_LABELS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_LABELS_VI = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];
const MONTH_LABELS_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

interface DayCell {
  date: Date;
  dateStr: string;
  status: AttendanceStatus | null;
  record: AttendanceRecord | null;
  isWeekend: boolean;
  isFuture: boolean;
}

export function CalendarHeatmapView({
  records,
  year: initialYear,
  onDayClick,
}: CalendarHeatmapViewProps) {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');
  const [year, setYear] = useState(initialYear ?? new Date().getFullYear());
  const [hoveredDay, setHoveredDay] = useState<DayCell | null>(null);

  // Build a map of dateStr → record
  const recordsByDate = useMemo(() => {
    const map = new Map<string, AttendanceRecord>();
    for (const r of records) {
      const dateKey = r.date.split('T')[0] ?? r.date;
      map.set(dateKey, r);
    }
    return map;
  }, [records]);

  // Build 365 days
  const days = useMemo((): DayCell[][] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // Start from Jan 1 of year
    const startDate = new Date(year, 0, 1);
    // End on Dec 31 of year
    const endDate = new Date(year, 11, 31);
    // Build 53 weeks (column-major)
    const weeks: DayCell[][] = [];
    let currentWeek: DayCell[] = [];

    // Pad start to align with Monday
    const startDayOfWeek = (startDate.getDay() + 6) % 7; // Monday = 0
    for (let i = 0; i < startDayOfWeek; i++) {
      currentWeek.push({
        date: new Date(0),
        dateStr: '',
        status: null,
        record: null,
        isWeekend: false,
        isFuture: true,
      });
    }

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const record = recordsByDate.get(dateStr) ?? null;
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      const isFuture = d.getTime() > today.getTime();
      currentWeek.push({
        date: new Date(d),
        dateStr,
        status: record?.status ?? null,
        record,
        isWeekend,
        isFuture,
      });
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push({
          date: new Date(0),
          dateStr: '',
          status: null,
          record: null,
          isWeekend: false,
          isFuture: true,
        });
      }
      weeks.push(currentWeek);
    }
    return weeks;
  }, [year, recordsByDate]);

  // Count statuses
  const stats = useMemo(() => {
    const counts: Record<string, number> = {
      ON_TIME: 0,
      LATE: 0,
      VERY_LATE: 0,
      WFH: 0,
      BUSINESS_TRIP: 0,
      ABSENT_APPROVED: 0,
      ABSENT_UNAPPROVED: 0,
      EARLY_LEAVE_APPROVED: 0,
      EARLY_LEAVE_UNAPPROVED: 0,
    };
    for (const r of records) {
      const yearOfRecord = new Date(r.date).getFullYear();
      if (yearOfRecord === year && counts[r.status] !== undefined) {
        counts[r.status] = (counts[r.status] ?? 0) + 1;
      }
    }
    return counts;
  }, [records, year]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              {isVi ? `Bảng nhiệt chuyên cần ${year}` : `Attendance Heatmap ${year}`}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              {isVi ? '365 ngày, click để xem chi tiết' : '365 days, click for details'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors"
            title={isVi ? 'Năm trước' : 'Previous year'}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="font-mono font-bold text-sm text-slate-900 w-12 text-center tabular-nums">{year}</span>
          <button
            onClick={() => setYear((y) => y + 1)}
            disabled={year >= new Date().getFullYear()}
            className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title={isVi ? 'Năm sau' : 'Next year'}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Heatmap grid */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-1 min-w-fit">
          {/* Day labels (Mon-Sun) */}
          <div className="flex flex-col gap-1 mr-1.5 pt-5">
            {(isVi ? DAY_LABELS_VI : DAY_LABELS_EN).map((label, i) => (
              <div
                key={i}
                className="h-3 text-[9px] font-bold text-slate-400 flex items-center"
                style={{ visibility: i % 2 === 0 ? 'visible' : 'hidden' }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* 53 weeks */}
          <div className="flex flex-col">
            {/* Month labels */}
            <div className="flex gap-1 mb-1 h-4">
              {Array.from({ length: 53 }).map((_, weekIdx) => {
                const firstDayOfWeek = days[weekIdx]?.[0]?.date;
                if (!firstDayOfWeek || firstDayOfWeek.getTime() === 0) {
                  return <div key={weekIdx} className="w-3" />;
                }
                // Show month label if week starts at day 1-7
                const showLabel = firstDayOfWeek.getDate() <= 7;
                return (
                  <div key={weekIdx} className="w-3 text-[9px] font-bold text-slate-500">
                    {showLabel ? (isVi ? MONTH_LABELS_VI[firstDayOfWeek.getMonth()] : MONTH_LABELS_EN[firstDayOfWeek.getMonth()]) : ''}
                  </div>
                );
              })}
            </div>
            {/* Day cells */}
            <div className="flex gap-1">
              {days.map((week, weekIdx) => (
                <div key={weekIdx} className="flex flex-col gap-1">
                  {week.map((day, dayIdx) => {
                    if (!day.dateStr) {
                      return <div key={dayIdx} className="w-3 h-3" />;
                    }
                    const colorClass = day.status ? STATUS_COLORS[day.status] : day.isWeekend ? 'bg-slate-100' : 'bg-slate-50';
                    return (
                      <button
                        key={day.dateStr}
                        disabled={day.isFuture && !day.status}
                        onClick={() => day.record && onDayClick?.(day.record)}
                        onMouseEnter={() => setHoveredDay(day)}
                        onMouseLeave={() => setHoveredDay(null)}
                        className={`w-3 h-3 rounded-sm ${colorClass} ${day.record ? 'cursor-pointer hover:ring-2 hover:ring-blue-400 hover:scale-125' : 'cursor-default'} transition-all ${day.isFuture ? 'opacity-40' : ''}`}
                        title={`${day.dateStr} - ${day.status ? STATUS_LABELS[day.status][isVi ? 'vi' : 'en'] : (day.isWeekend ? (isVi ? 'Cuối tuần' : 'Weekend') : (isVi ? 'Không có dữ liệu' : 'No data'))}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-600">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">
            {isVi ? 'Chú thích' : 'Legend'}:
          </span>
          {Object.entries(STATUS_LABELS).map(([key, labels]) => {
            const count = stats[key] ?? 0;
            if (count === 0) return null;
            return (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-sm ${STATUS_COLORS[key as AttendanceStatus]}`} />
                <span>{isVi ? labels.vi : labels.en}</span>
                <span className="font-black text-slate-900 tabular-nums">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Hovered day info */}
      {hoveredDay && hoveredDay.status && (
        <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200/60 flex items-center gap-2 text-xs">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <div className="flex-1">
            <span className="font-bold text-slate-900">
              {hoveredDay.dateStr} • {isVi ? STATUS_LABELS[hoveredDay.status].vi : STATUS_LABELS[hoveredDay.status].en}
            </span>
            {hoveredDay.record?.checkInTime && (
              <span className="text-slate-500 ml-2 font-mono">
                {new Date(hoveredDay.record.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                {hoveredDay.record.checkOutTime && (
                  <> → {new Date(hoveredDay.record.checkOutTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</>
                )}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
