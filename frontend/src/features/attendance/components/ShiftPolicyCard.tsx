import { useTranslation } from 'react-i18next';
import {
  ShieldAlert,
  Clock,
  Coffee,
  Zap,
  MapPin,
  CalendarCheck,
  Building,
} from 'lucide-react';

interface ShiftPolicyCardProps {
  checkInTime?: string | null;
  checkOutTime?: string | null;
}

export function ShiftPolicyCard({ checkInTime, checkOutTime }: ShiftPolicyCardProps) {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  const formatTime = (iso?: string | null) => {
    if (!iso) return null;
    return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formattedCheckIn = formatTime(checkInTime);
  const formattedCheckOut = formatTime(checkOutTime);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-5 hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <Building className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              {isVi ? 'Quy chế Ca làm việc FPT' : 'FPT Work Shift Policy'}
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">
              {isVi ? 'Áp dụng cho nhân sự toàn hệ thống' : 'Applies to all company personnel'}
            </p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
          {isVi ? 'Đang hiệu lực' : 'Active SLA'}
        </span>
      </div>

      {/* Policy Rules Grid */}
      <div className="space-y-2.5 text-xs">
        <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
          <Clock className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">
                {isVi ? 'Ca tiêu chuẩn' : 'Standard Shift'}
              </span>
              <span className="font-mono font-bold text-blue-600">08:30 — 17:30</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isVi
                ? 'Thứ Hai đến Thứ Sáu (8 giờ làm việc định mức/ngày)'
                : 'Monday to Friday (8 standard working hours/day)'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
          <ShieldAlert className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">
                {isVi ? 'Khung giờ ân hạn (Grace)' : 'Grace Period'}
              </span>
              <span className="font-mono font-bold text-emerald-600">
                {isVi ? '+15 phút' : '+15 min'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isVi
                ? 'Điểm danh trước 08:45 được tính đúng giờ không trừ thi đua'
                : 'Check-in before 08:45 is considered on-time'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
          <Coffee className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">
                {isVi ? 'Nghỉ trưa tự động' : 'Automatic Lunch Break'}
              </span>
              <span className="font-mono font-bold text-amber-600">12:00 — 13:00</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isVi
                ? 'Hệ thống tự động trừ 1h nghỉ trưa vào tổng giờ công hàng ngày'
                : 'System auto-subtracts 1h lunch from daily total hours'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
          <Zap className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">
                {isVi ? 'Tăng ca (Overtime)' : 'Overtime (OT)'}
              </span>
              <span className="font-mono font-bold text-purple-600">&gt; 17:30</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isVi
                ? 'Tính theo công thức min(giờ đăng ký, giờ thực tế check-out)'
                : 'Calculated as min(registered hours, actual checkout duration)'}
            </p>
          </div>
        </div>

        <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-50/70 border border-slate-100">
          <MapPin className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">
                {isVi ? 'Geofence FPT Complex' : 'FPT Complex Geofence'}
              </span>
              <span className="font-mono font-bold text-rose-600">
                {isVi ? '500 mét' : '500 m'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isVi
                ? 'Xác thực GPS Haversine hoặc mạng IP FPT Telecom nội bộ'
                : 'Haversine GPS validation or internal FPT corporate subnet'}
            </p>
          </div>
        </div>
      </div>

      {/* Today Shift Timeline Audit Trail */}
      <div className="border-t border-slate-100 pt-3.5">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
          <CalendarCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>{isVi ? 'Nhật ký sự kiện ca hôm nay' : "Today's Shift Audit Log"}</span>
        </h4>

        <div className="relative pl-5 space-y-2.5 border-l-2 border-slate-200">
          {/* Checkin event */}
          <div className="relative">
            <div
              className={`absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                formattedCheckIn ? 'bg-emerald-500 ring-2 ring-emerald-100' : 'bg-slate-300'
              }`}
            />
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-bold text-slate-800">
                {isVi ? 'Vào ca (Check-in)' : 'Shift Check-in'}
              </span>
              <span className="font-mono font-bold text-emerald-600">
                {formattedCheckIn ?? (isVi ? 'Chưa ghi nhận' : 'Pending')}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              {formattedCheckIn
                ? isVi ? 'Xác thực thành công tại FPT Complex' : 'Verified at FPT Complex'
                : isVi ? 'Đang chờ nhân viên chấm công' : 'Waiting for employee check-in'}
            </p>
          </div>

          {/* Lunch event */}
          <div className="relative">
            <div className="absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-amber-400" />
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-bold text-slate-800">
                {isVi ? 'Nghỉ trưa tự động' : 'Lunch Window'}
              </span>
              <span className="font-mono text-slate-600">12:00 — 13:00</span>
            </div>
            <p className="text-[10px] text-slate-400">
              {isVi ? 'Trừ 60 phút nghỉ ngơi theo quy định' : 'Subtracted 60 min per labor policy'}
            </p>
          </div>

          {/* Checkout event */}
          <div className="relative">
            <div
              className={`absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                formattedCheckOut ? 'bg-blue-600 ring-2 ring-blue-100' : 'bg-slate-300'
              }`}
            />
            <div className="flex items-baseline justify-between text-xs">
              <span className="font-bold text-slate-800">
                {isVi ? 'Tan ca (Check-out)' : 'Shift Check-out'}
              </span>
              <span className="font-mono font-bold text-blue-600">
                {formattedCheckOut ?? (isVi ? '17:30 (Dự kiến)' : '17:30 (Expected)')}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              {formattedCheckOut
                ? isVi ? 'Hoàn thành ca làm việc' : 'Shift completed successfully'
                : isVi ? 'Chưa bấm tan ca' : 'Active shift in progress'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
