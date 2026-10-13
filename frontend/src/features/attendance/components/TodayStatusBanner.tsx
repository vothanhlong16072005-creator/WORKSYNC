import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Clock,
  MapPin,
  CheckCircle2,
  Home,
  LogOut,
  FileText,
  RotateCw,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAttendanceStore } from '../stores/attendance.store';
import { usePublicIp } from '../hooks/usePublicIp';
import { getErrorMessage } from '../utils/error-handler';
import type { AttendanceStatus } from '../types/attendance.types';

interface TodayStatusBannerProps {
  onOpenWfhModal: () => void;
  onOpenLeaveModal: () => void;
}

const STATUS_CONFIG: Record<
  AttendanceStatus,
  { labelVi: string; labelEn: string; dot: string; bg: string; text: string }
> = {
  ON_TIME: {
    labelVi: 'Đúng giờ',
    labelEn: 'On Time',
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
  },
  LATE: {
    labelVi: 'Đi muộn',
    labelEn: 'Late',
    dot: 'bg-amber-500',
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
  },
  VERY_LATE: {
    labelVi: 'Rất muộn',
    labelEn: 'Very Late',
    dot: 'bg-red-500',
    bg: 'bg-red-50 border-red-200',
    text: 'text-red-700',
  },
  WFH: {
    labelVi: 'Làm việc từ xa (WFH)',
    labelEn: 'Work From Home',
    dot: 'bg-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-700',
  },
  BUSINESS_TRIP: {
    labelVi: 'Công tác',
    labelEn: 'Business Trip',
    dot: 'bg-indigo-500',
    bg: 'bg-indigo-50 border-indigo-200',
    text: 'text-indigo-700',
  },
  ABSENT_APPROVED: {
    labelVi: 'Nghỉ có phép',
    labelEn: 'Approved Leave',
    dot: 'bg-slate-500',
    bg: 'bg-slate-100 border-slate-200',
    text: 'text-slate-700',
  },
  ABSENT_UNAPPROVED: {
    labelVi: 'Vắng không phép',
    labelEn: 'Unapproved Absence',
    dot: 'bg-rose-500',
    bg: 'bg-rose-50 border-rose-200',
    text: 'text-rose-700',
  },
  EARLY_LEAVE_APPROVED: {
    labelVi: 'Về sớm (có phép)',
    labelEn: 'Early Leave (Approved)',
    dot: 'bg-cyan-500',
    bg: 'bg-cyan-50 border-cyan-200',
    text: 'text-cyan-700',
  },
  EARLY_LEAVE_UNAPPROVED: {
    labelVi: 'Về sớm (không phép)',
    labelEn: 'Early Leave (No Permit)',
    dot: 'bg-rose-600',
    bg: 'bg-rose-50 border-rose-300',
    text: 'text-rose-800',
  },
};

export function TodayStatusBanner({ onOpenWfhModal, onOpenLeaveModal }: TodayStatusBannerProps) {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');
  const [time, setTime] = useState(new Date());

  const publicIp = usePublicIp();

  const {
    todayRecord,
    todayWfh,
    config,
    isCheckingIn,
    isCheckingOut,
    checkIn,
    checkOut,
  } = useAttendanceStore();

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleCheckIn = async () => {
    try {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            try {
              await checkIn({
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                ipAddress: publicIp,
              });
              toast.success(isVi ? 'Check-in thành công!' : 'Checked in successfully!');
            } catch (err: unknown) {
              toast.error(getErrorMessage(err, 'Lỗi điểm danh'));
            }
          },
          async () => {
            // Fallback without GPS
            try {
              await checkIn({ ipAddress: publicIp });
              toast.success(isVi ? 'Check-in thành công qua IP mạng!' : 'Checked in via Network IP!');
            } catch (err: unknown) {
              toast.error(getErrorMessage(err, 'Lỗi điểm danh'));
            }
          },
        );
      } else {
        await checkIn({ ipAddress: publicIp });
        toast.success(isVi ? 'Check-in thành công!' : 'Checked in successfully!');
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Lỗi điểm danh'));
    }
  };

  const handleCheckOut = async () => {
    try {
      await checkOut({});
      toast.success(isVi ? 'Check-out thành công!' : 'Checked out successfully!');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Lỗi tan ca'));
    }
  };

  const formatTimeString = (dateStr?: string | null) => {
    if (!dateStr) return '--:--';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const statusInfo = todayRecord ? STATUS_CONFIG[todayRecord.status] : null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 relative overflow-hidden transition-all duration-200 hover:shadow-md">
      {/* Bauhaus Accent Top-Right Stripe */}
      <div className="absolute top-0 right-0 w-32 h-1.5 bg-gradient-to-r from-blue-600 via-amber-500 to-rose-500 rounded-bl-full" />

      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        {/* Left: Clock & Today Header */}
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-inner flex-shrink-0">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                {isVi ? 'Hôm nay' : 'Today'} • {time.toLocaleDateString(isVi ? 'vi-VN' : 'en-US', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
              </span>
              {statusInfo && (
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusInfo.bg} ${statusInfo.text}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusInfo.dot}`} />
                  {isVi ? statusInfo.labelVi : statusInfo.labelEn}
                </span>
              )}
              {todayWfh?.status === 'PENDING' && !todayRecord && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border bg-blue-50 border-blue-200 text-blue-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                  {isVi ? 'Đơn WFH đang chờ duyệt' : 'WFH Request Pending'}
                </span>
              )}
            </div>

            <div className="flex items-baseline gap-3 mt-1">
              <h1 className="text-3xl font-black text-slate-900 tracking-tight font-mono">
                {time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </h1>
              <span className="text-xs font-semibold text-slate-500">
                (GMT+7 • {config?.workStartTime || '08:30'} - {config?.workEndTime || '17:30'})
              </span>
            </div>

            {/* Checkin / Checkout summary pills */}
            <div className="flex items-center gap-4 mt-3 text-xs font-medium text-slate-600 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Check-in:</span>
                <strong className="text-slate-900 font-semibold">{formatTimeString(todayRecord?.checkInTime)}</strong>
              </div>
              <span className="text-slate-300">|</span>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                <span>Check-out:</span>
                <strong className="text-slate-900 font-semibold">{formatTimeString(todayRecord?.checkOutTime)}</strong>
              </div>
              {todayRecord?.checkInMethod && (
                <>
                  <span className="text-slate-300">|</span>
                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold text-[11px]">
                    {todayRecord.checkInMethod}
                  </span>
                </>
              )}
            </div>

            {/* Warning when check-in is MANUAL outside office */}
            {todayRecord?.checkInMethod === 'MANUAL' && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                <span>{isVi ? 'Cảnh báo: Vị trí ngoài văn phòng (cần quản lý xác nhận)' : 'Warning: Recorded outside office (pending review)'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {!todayRecord?.checkInTime ? (
            <button
              onClick={handleCheckIn}
              disabled={isCheckingIn}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {isCheckingIn ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                <MapPin className="w-4 h-4" />
              )}
              <span>{isVi ? 'Check-in ngay' : 'Check In Now'}</span>
            </button>
          ) : !todayRecord?.checkOutTime ? (
            <button
              onClick={handleCheckOut}
              disabled={isCheckingOut}
              className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
            >
              {isCheckingOut ? (
                <RotateCw className="w-4 h-4 animate-spin" />
              ) : (
                <LogOut className="w-4 h-4" />
              )}
              <span>{isVi ? 'Check-out' : 'Check Out'}</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm font-bold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{isVi ? 'Đã hoàn thành chấm công hôm nay' : 'Attendance completed for today'}</span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenWfhModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors"
            >
              <Home className="w-4 h-4 text-blue-600" />
              <span>{isVi ? 'Xin WFH' : 'Request WFH'}</span>
            </button>

            <button
              onClick={onOpenLeaveModal}
              className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs transition-colors"
            >
              <FileText className="w-4 h-4 text-amber-600" />
              <span>{isVi ? 'Nghỉ phép' : 'Leave Request'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
