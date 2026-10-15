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
    <div className="p-5 bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b-2 border-slate-900">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-blue-600 text-white border border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <Users className="w-4 h-4" />
          </span>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">
              Hiện diện & Năng suất dự án
            </span>
            <h2 className="text-sm font-black uppercase tracking-tight text-slate-900">
              Công suất khả dụng của nhóm hôm nay
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-slate-900 text-xs font-mono font-bold text-slate-800">
          <Gauge className="w-3.5 h-3.5 text-blue-600" />
          <span>{capacity.totalMembers} thành viên</span>
        </div>
      </div>

      {/* Real-time Presence Breakdown Chips */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <div className="p-3 bg-emerald-50 border-2 border-emerald-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-700" />
            <span className="text-xs font-bold text-emerald-900">Tại văn phòng</span>
          </div>
          <span className="text-sm font-black font-mono text-emerald-800">
            {capacity.inOfficeToday}
          </span>
        </div>

        <div className="p-3 bg-sky-50 border-2 border-sky-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Laptop className="w-4 h-4 text-sky-700" />
            <span className="text-xs font-bold text-sky-900">Làm từ xa (WFH)</span>
          </div>
          <span className="text-sm font-black font-mono text-sky-800">
            {capacity.wfhToday}
          </span>
        </div>

        <div className="p-3 bg-amber-50 border-2 border-amber-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarOff className="w-4 h-4 text-amber-700" />
            <span className="text-xs font-bold text-amber-900">Nghỉ phép</span>
          </div>
          <span className="text-sm font-black font-mono text-amber-800">
            {capacity.onLeaveToday}
          </span>
        </div>
      </div>

      {/* Weekly Capacity Hours Meter */}
      <div className="p-3.5 bg-slate-50 border-2 border-slate-900 mb-4">
        <div className="flex items-center justify-between text-xs mb-2">
          <span className="font-black text-slate-800 uppercase tracking-tight">
            Tổng giờ khả dụng tuần này:
          </span>
          <span className="font-mono font-black text-slate-900 text-sm">
            {capacity.totalAvailableHoursWeek}h / {capacity.maxCapacityHoursWeek}h{' '}
            <span className="text-blue-600">({capacity.capacityPercent}%)</span>
          </span>
        </div>

        {/* Progress Bar with segmented look */}
        <div className="w-full h-4 bg-slate-200 border-2 border-slate-900 overflow-hidden relative">
          <div
            className={`h-full transition-all duration-500 ${
              isOverloaded
                ? 'bg-rose-500'
                : isUnderCapacity
                ? 'bg-amber-400'
                : 'bg-blue-600'
            }`}
            style={{ width: `${Math.min(100, capacity.capacityPercent)}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-2 text-[11px] font-bold text-slate-500">
          <span>0h</span>
          <span className="text-slate-700">
            {isOverloaded
              ? '⚠️ Cảnh báo: Team đang có nguy cơ quá tải tiến độ'
              : '⚡ Công suất tiêu chuẩn: Đủ nguồn lực đáp ứng Sprint'}
          </span>
          <span>{capacity.maxCapacityHoursWeek}h max</span>
        </div>
      </div>

      {/* Members Availability List */}
      <div className="border-t border-slate-200 pt-3">
        <div className="text-[11px] font-black uppercase text-slate-500 mb-2">
          Chi tiết trạng thái nhân sự hôm nay:
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {capacity.membersSummary.map((m) => (
            <div
              key={m.id}
              className="flex items-center justify-between p-2 bg-white border border-slate-200 hover:border-slate-900 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="relative shrink-0">
                  <img
                    src={
                      m.avatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(m.name)}&background=0F172A&color=fff`
                    }
                    alt={m.name}
                    className="w-7 h-7 rounded-full object-cover border border-slate-900"
                  />
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-white ${
                      m.status === 'OFFICE'
                        ? 'bg-emerald-500'
                        : m.status === 'WFH'
                        ? 'bg-sky-500'
                        : 'bg-amber-500'
                    }`}
                  />
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-slate-900 truncate">{m.name}</div>
                  <div className="text-[10px] text-slate-500 truncate">{m.role}</div>
                </div>
              </div>

              <div className="text-right shrink-0 pl-1">
                <span
                  className={`inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                    m.status === 'OFFICE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : m.status === 'WFH'
                      ? 'bg-sky-100 text-sky-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {m.status === 'OFFICE' ? 'Tại VP' : m.status === 'WFH' ? 'WFH' : 'Nghỉ'}
                </span>
                {m.checkInTime && (
                  <div className="text-[9px] font-mono text-slate-400">{m.checkInTime}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
