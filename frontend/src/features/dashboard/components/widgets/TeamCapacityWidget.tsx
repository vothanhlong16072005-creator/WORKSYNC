import { Users, Building2, Laptop, CalendarOff, Gauge } from 'lucide-react';
import type { TeamCapacity } from '../../types/dashboard.types';

interface Props {
  capacity?: TeamCapacity;
}

export function TeamCapacityWidget({ capacity }: Props) {
  if (!capacity) return null;

  const isOverloaded = capacity.capacityPercent > 90;
  const isUnderCapacity = capacity.capacityPercent < 70;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 transition-all hover:border-slate-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/80 shadow-xs">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block">
              Hiện diện & Năng suất dự án
            </span>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Công suất khả dụng của nhóm hôm nay
            </h2>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200/60">
          <Gauge className="w-3.5 h-3.5 text-blue-600" />
          <span>{capacity.totalMembers} thành viên</span>
        </div>
      </div>

      {/* Real-time Presence Breakdown Chips */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-700" />
            <span className="text-xs font-semibold text-emerald-900">Tại văn phòng</span>
          </div>
          <span className="text-sm font-bold font-mono text-emerald-800">
            {capacity.inOfficeToday}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-sky-50/70 border border-sky-200/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Laptop className="w-4 h-4 text-sky-700" />
            <span className="text-xs font-semibold text-sky-900">Làm từ xa (WFH)</span>
          </div>
          <span className="text-sm font-bold font-mono text-sky-800">
            {capacity.wfhToday}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarOff className="w-4 h-4 text-amber-700" />
            <span className="text-xs font-semibold text-amber-900">Nghỉ phép</span>
          </div>
          <span className="text-sm font-bold font-mono text-amber-800">
            {capacity.onLeaveToday}
          </span>
        </div>
      </div>

      {/* Capacity Meter Bar */}
      <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/70 mb-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-bold text-slate-700 uppercase tracking-wide text-[11px]">
            Tổng giờ khả dụng tuần này:
          </span>
          <span className="font-mono font-bold text-slate-900">
            {capacity.totalAvailableHoursWeek}h / {capacity.maxCapacityHoursWeek}h{' '}
            <span
              className={`font-black ${
                isOverloaded
                  ? 'text-rose-600'
                  : isUnderCapacity
                  ? 'text-amber-600'
                  : 'text-emerald-600'
              }`}
            >
              ({capacity.capacityPercent}%)
            </span>
          </span>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full h-3 bg-slate-200/80 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 rounded-full ${
              isOverloaded
                ? 'bg-rose-500'
                : isUnderCapacity
                ? 'bg-amber-500'
                : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(capacity.capacityPercent, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mt-1.5">
          <span>0h</span>
          <span className="text-slate-500 font-medium">
            {isOverloaded
              ? '⚠️ Cảnh báo: Team đang có nguy cơ quá tải tiến độ'
              : '✅ Công suất hoạt động ở ngưỡng ổn định'}
          </span>
          <span>{capacity.maxCapacityHoursWeek}h max</span>
        </div>
      </div>

      {/* Member Avatar Presence Pulse */}
      <div>
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2.5">
          Nhân sự điểm danh sáng nay (Live Pulse):
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(capacity.membersSummary || []).slice(0, 6).map((m) => {
            const isOffice = m.status === 'OFFICE';
            const isWfh = m.status === 'WFH';

            return (
              <div
                key={m.id}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-50/60 border border-slate-200/60 hover:bg-white hover:border-slate-300 transition-all text-xs"
              >
                <div className="relative shrink-0">
                  <img
                    src={m.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}`}
                    alt={m.name}
                    referrerPolicy="no-referrer"
                    className="w-7 h-7 rounded-full object-cover border border-slate-200"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${
                      isOffice
                        ? 'bg-emerald-500'
                        : isWfh
                        ? 'bg-sky-500'
                        : 'bg-amber-500'
                    }`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-slate-900 truncate text-[11px]">
                    {m.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">
                    {isOffice ? `Onsite ${m.checkInTime || '08:24'}` : isWfh ? 'WFH' : 'Nghỉ phép'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
