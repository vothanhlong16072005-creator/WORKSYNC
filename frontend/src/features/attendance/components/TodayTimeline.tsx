import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, TrendingUp, Coffee, AlertTriangle, CheckCircle2, MapPin, LogIn, LogOut } from 'lucide-react';
import { calculateWorkHours, calculateEarlyMinutes, DEFAULT_LUNCH_CONFIG } from '../utils/time-calculator';

interface TodayTimelineProps {
  checkInTime: string | null;
  checkOutTime: string | null;
  workStartTime?: string;  // "08:00"
  workEndTime?: string;    // "17:30"
  status?: string;
}

function parseTime(timeStr: string, baseDate: Date = new Date()): Date {
  const [h, m] = timeStr.split(':').map(Number);
  const d = new Date(baseDate);
  d.setHours(h ?? 0, m ?? 0, 0, 0);
  return d;
}

export function TodayTimeline({
  checkInTime,
  checkOutTime,
  workStartTime = '08:00',
  workEndTime = '17:30',
  status = 'ON_TIME',
}: TodayTimelineProps) {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const workStart = useMemo(() => parseTime(workStartTime), [workStartTime]);
  const workEnd = useMemo(() => parseTime(workEndTime), [workEndTime]);

  const checkIn = useMemo(() => (checkInTime ? new Date(checkInTime) : null), [checkInTime]);
  const checkOut = useMemo(() => (checkOutTime ? new Date(checkOutTime) : null), [checkOutTime]);

  // Calculate progress percentages
  const totalDayMs = workEnd.getTime() - workStart.getTime();
  const elapsedMs = Math.max(0, Math.min(now.getTime() - workStart.getTime(), totalDayMs));
  const progressPct = totalDayMs > 0 ? (elapsedMs / totalDayMs) * 100 : 0;

  // Check-in dot position (% of day)
  const checkInPct = checkIn
    ? Math.max(0, Math.min(((checkIn.getTime() - workStart.getTime()) / totalDayMs) * 100, 100))
    : 0;
  const checkOutPct = checkOut
    ? Math.max(0, Math.min(((checkOut.getTime() - workStart.getTime()) / totalDayMs) * 100, 100))
    : null;

  // Calculate work hours
  const workHours = checkIn && checkOut
    ? calculateWorkHours(checkIn, checkOut)
    : checkIn
    ? calculateWorkHours(checkIn, now)
    : 0;

  // Late by minutes
  const lateMinutes = checkIn
    ? Math.max(0, Math.floor((checkIn.getTime() - workStart.getTime()) / 60000))
    : 0;

  // Early leave minutes
  const earlyMinutes = checkOut
    ? calculateEarlyMinutes(checkOut, workEnd.getHours(), workEnd.getMinutes())
    : 0;

  // Overtime (negative early = overtime)
  const overtimeMinutes = checkOut && earlyMinutes < 0 ? Math.abs(earlyMinutes) : 0;

  const formatDuration = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  const formatTime = (d: Date): string =>
    d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });

  // Status color
  const statusColor: Record<string, string> = {
    ON_TIME: '#10b981',
    LATE: '#f59e0b',
    VERY_LATE: '#ef4444',
    WFH: '#3b82f6',
    BUSINESS_TRIP: '#8b5cf6',
    ABSENT_APPROVED: '#94a3b8',
    ABSENT_UNAPPROVED: '#f43f5e',
    EARLY_LEAVE_APPROVED: '#06b6d4',
    EARLY_LEAVE_UNAPPROVED: '#e11d48',
  };
  const dotColor = statusColor[status] ?? '#10b981';

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sticky top-4 z-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              {isVi ? 'Dải thời gian hôm nay' : 'Today Timeline'}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              {isVi ? 'Cập nhật mỗi giây' : 'Updates every second'}
            </p>
          </div>
        </div>
        <div className="font-mono text-2xl font-black text-blue-600 tabular-nums">
          {formatTime(now)}
        </div>
      </div>

      {/* Timeline visual */}
      <div className="relative h-16 mb-6 px-2">
        {/* Base line */}
        <div className="absolute inset-x-2 top-1/2 h-1.5 bg-slate-100 rounded-full -translate-y-1/2" />
        {/* Progress fill */}
        <div
          className="absolute left-2 top-1/2 h-1.5 rounded-full -translate-y-1/2 transition-all duration-500"
          style={{ width: `${progressPct}%`, background: dotColor, opacity: 0.5 }}
        />
        {/* Lunch zone highlight (12:00 - 13:00) */}
        {(() => {
          const lunchStart = new Date(now);
          lunchStart.setHours(DEFAULT_LUNCH_CONFIG.lunchStartHour, 0, 0, 0);
          const lunchEnd = new Date(now);
          lunchEnd.setHours(DEFAULT_LUNCH_CONFIG.lunchEndHour, 0, 0, 0);
          const lunchStartPct = Math.max(0, ((lunchStart.getTime() - workStart.getTime()) / totalDayMs) * 100);
          const lunchWidthPct = ((lunchEnd.getTime() - lunchStart.getTime()) / totalDayMs) * 100;
          return (
            <div
              className="absolute top-1/2 -translate-y-1/2 h-1.5 bg-amber-100/80 border-x border-amber-300/60"
              style={{ left: `calc(${lunchStartPct}% + 8px)`, width: `${lunchWidthPct}%` }}
              title={isVi ? 'Giờ nghỉ trưa (tự động trừ)' : 'Lunch break (auto-subtracted)'}
            />
          );
        })()}

        {/* Work start dot */}
        <div className="absolute left-2 top-1/2 -translate-y-1/2 -translate-x-1/2">
          <div className="w-3 h-3 rounded-full bg-slate-300 ring-2 ring-white" />
          <span className="absolute top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-500 whitespace-nowrap">
            {workStartTime}
          </span>
        </div>

        {/* Check-in dot */}
        {checkIn && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
            style={{ left: `${checkInPct}%` }}
            title={`Check-in: ${formatTime(checkIn)}`}
          >
            <div className="w-4 h-4 rounded-full ring-4 ring-emerald-100" style={{ background: dotColor }} />
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-emerald-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap">
              <LogIn className="w-2.5 h-2.5 inline" /> {formatTime(checkIn)}
            </div>
          </div>
        )}

        {/* Now dot (pulsing) */}
        {!checkOut && checkIn && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20"
            style={{ left: `${progressPct}%` }}
          >
            <div className="relative w-5 h-5">
              <div className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-50" />
              <div className="relative w-5 h-5 rounded-full bg-blue-600 ring-4 ring-blue-100 flex items-center justify-center text-white text-[8px] font-black">
                NOW
              </div>
            </div>
          </div>
        )}

        {/* Check-out dot */}
        {checkOut && checkOutPct !== null && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
            style={{ left: `${checkOutPct}%` }}
            title={`Check-out: ${formatTime(checkOut)}`}
          >
            <div className="w-4 h-4 rounded-full bg-slate-600 ring-4 ring-slate-200" />
            <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-slate-700 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow whitespace-nowrap">
              <LogOut className="w-2.5 h-2.5 inline" /> {formatTime(checkOut)}
            </div>
          </div>
        )}

        {/* Work end dot */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 translate-x-1/2">
          <div className="w-3 h-3 rounded-full bg-slate-300 ring-2 ring-white" />
          <span className="absolute top-5 right-0 text-[10px] font-bold text-slate-500 whitespace-nowrap">
            {workEndTime}
          </span>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200/60">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
              {isVi ? 'Đã làm' : 'Working'}
            </p>
            <p className="text-sm font-black text-emerald-900 tabular-nums">
              {workHours.toFixed(1)}h
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200/60">
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
            {lateMinutes > 0 ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">
              {isVi ? 'Trễ' : 'Late'}
            </p>
            <p className="text-sm font-black text-amber-900 tabular-nums">
              {lateMinutes > 0 ? `${lateMinutes}m` : '—'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200/60">
          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Coffee className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              {isVi ? 'Nghỉ trưa' : 'Lunch'}
            </p>
            <p className="text-sm font-black text-slate-900 tabular-nums">1h</p>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200/60">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
              {isVi ? 'OT/OT' : 'OT'}
            </p>
            <p className="text-sm font-black text-blue-900 tabular-nums">
              {overtimeMinutes > 0 ? `+${formatDuration(overtimeMinutes)}` : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* Status note */}
      <div className="mt-4 flex items-center gap-2 text-[11px] text-slate-500 font-medium">
        <MapPin className="w-3 h-3" />
        <span>
          {isVi
            ? 'Giờ làm việc: 08:00 - 17:30 • Nghỉ trưa 12:00-13:00 tự động trừ'
            : 'Work hours: 08:00 - 17:30 • Lunch break 12:00-13:00 auto-subtracted'}
        </span>
      </div>
    </div>
  );
}
