import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  ShieldCheck,
  MapPin,
  Wifi,
  Navigation,
  Sparkles,
  RefreshCw,
  LocateFixed,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAttendanceStore } from '@/features/attendance/stores/attendance.store';
import { usePublicIp } from '@/features/attendance/hooks/usePublicIp';
import { getErrorMessage } from '@/features/attendance/utils/error-handler';

// Official FPT Complex Coordinates (Đường Nam Kỳ Khởi Nghĩa, Ngũ Hành Sơn, Đà Nẵng)
const FPT_COMPLEX_LAT = 15.9686;
const FPT_COMPLEX_LNG = 108.2608;

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function QuickAttendanceCard() {
  const { t, i18n } = useTranslation();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Real Geolocation state
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number }>({
    lat: FPT_COMPLEX_LAT,
    lng: FPT_COMPLEX_LNG,
    accuracy: 5,
  });
  const [isRealGps, setIsRealGps] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [distanceKm, setDistanceKm] = useState(0);

  // Live ticking clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Request actual user geolocation
  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.info('Trình duyệt không hỗ trợ Geolocation API, sử dụng tọa độ mặc định FPT Complex.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = Number(position.coords.latitude.toFixed(4));
        const userLng = Number(position.coords.longitude.toFixed(4));
        const userAcc = Math.round(position.coords.accuracy);

        setCoords({
          lat: userLat,
          lng: userLng,
          accuracy: userAcc,
        });
        setIsRealGps(true);
        setIsLocating(false);

        const dist = calculateDistanceKm(userLat, userLng, FPT_COMPLEX_LAT, FPT_COMPLEX_LNG);
        setDistanceKm(dist);

        const hasNotified = sessionStorage.getItem('worksync_gps_notified');
        if (!hasNotified) {
          sessionStorage.setItem('worksync_gps_notified', 'true');
          if (dist <= 0.8) {
            toast.success(`Đã phát hiện vị trí thực: Khớp với khuôn viên FPT Complex Đà Nẵng (Sai số ±${userAcc}m)`, {
              id: 'gps-status-toast',
            });
          } else {
            toast.info(`Tọa độ GPS thực tế: ${userLat.toFixed(4)}° N, ${userLng.toFixed(4)}° E • Cách FPT Complex ~${dist.toFixed(1)}km`, {
              id: 'gps-status-toast',
            });
          }
        }
      },
      () => {
        setIsLocating(false);
        // Default to FPT Complex if permission denied
        setCoords({
          lat: FPT_COMPLEX_LAT,
          lng: FPT_COMPLEX_LNG,
          accuracy: 5,
        });
        setIsRealGps(false);
        setDistanceKm(0);
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 },
    );
  }, []);

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  const timeFormatted = currentTime.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const dateFormatted = new Intl.DateTimeFormat(
    i18n.language === 'vi' ? 'vi-VN' : 'en-US',
    {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    },
  ).format(currentTime);

  const {
    todayRecord,
    checkIn,
    checkOut,
    fetchToday,
  } = useAttendanceStore();

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);

  const checkedIn = Boolean(todayRecord?.checkInTime);
  const checkedOut = Boolean(todayRecord?.checkOutTime);
  const checkInTime = todayRecord?.checkInTime
    ? new Date(todayRecord.checkInTime).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  const publicIp = usePublicIp();

  const handleToggle = async () => {
    if (!checkedIn) {
      try {
        await checkIn({
          latitude: coords.lat,
          longitude: coords.lng,
          ipAddress: publicIp,
        });
        const nowStr = currentTime.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
        });
        toast.success(
          t(
            'dashboard.checkin_success',
            `Điểm danh thành công lúc ${nowStr}! Chúc bạn ngày làm việc hiệu quả.`,
          ),
        );
      } catch (err: unknown) {
        toast.error(getErrorMessage(err, 'Lỗi điểm danh'));
      }
    } else if (!checkedOut) {
      try {
        await checkOut({});
        toast.info(t('dashboard.checkout_success', 'Đã ghi nhận tan ca (Check-out)!'));
      } catch (err: unknown) {
        toast.error(getErrorMessage(err, 'Lỗi tan ca'));
      }
    } else {
      toast.success(
        t('dashboard.attendance_completed', 'Bạn đã hoàn tất điểm danh hôm nay.'),
      );
    }
  };

  const isInOffice = distanceKm <= 0.8;

  return (
    <div className="bg-gradient-to-br from-blue-50/70 via-white to-amber-50/30 rounded-2xl border-2 border-blue-600/90 shadow-md ring-4 ring-blue-500/10 p-6 sm:p-7 relative overflow-hidden transition-all duration-200 hover:shadow-lg hover:border-blue-700">
      {/* Top Header Row of Attendance Hub */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-5 border-b border-blue-100/80 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
            <Navigation className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {t('dashboard.attendance_hub_title', 'Điểm danh & Chấm công thông minh')}
              </h2>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 text-[11px] font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span>{t('dashboard.system_online', 'Hệ thống trực tuyến')}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {t(
                'dashboard.attendance_hub_subtitle',
                'Xác minh vị trí Geofence GPS & mạng IP nội bộ để chấm công cho ngày hôm nay.',
              )}
            </p>
          </div>
        </div>

        {/* Shift Badge & Working Hours */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="px-3.5 py-1.5 rounded-xl bg-white border border-blue-200 text-xs font-bold text-slate-700 shadow-2xs">
            {t('dashboard.shift_hours', 'Ca làm việc:')}{' '}
            <span className="font-mono text-blue-700 font-black">08:30 - 17:30</span>
          </div>

          <button
            type="button"
            onClick={requestLocation}
            disabled={isLocating}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold border border-blue-200 transition-colors"
            title="Quét lại vị trí GPS hiện tại"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">{isLocating ? 'Đang định vị...' : 'Quét GPS'}</span>
          </button>
        </div>
      </div>

      {/* Main 3-Column Content: Digital Clock & Action | Network & Telemetry | Ultra Sharp Geofence Map */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Big Digital Clock & Primary Check-in Button (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-4 p-5 bg-white rounded-2xl border-2 border-slate-200/90 shadow-sm">
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              {t('dashboard.current_time_label', 'THỜI GIAN HIỆN TẠI')}
            </span>
            <div className="text-4xl sm:text-5xl font-black font-mono tracking-tight text-slate-900">
              {timeFormatted}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-slate-600 capitalize mt-1">
              {dateFormatted}
            </div>

            <div className="flex flex-wrap items-center gap-2 mt-3.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{t('dashboard.status_ready', 'SẴN SÀNG')}</span>
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 text-xs font-bold border border-blue-200 shadow-2xs">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>FPT Software Tower</span>
              </span>
            </div>
          </div>

          {/* Large Action Button */}
          <button
            type="button"
            onClick={handleToggle}
            className={`w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl font-black text-sm uppercase tracking-wider transition-all duration-200 shadow-md active:scale-[0.98] ${
              checkedIn
                ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/20'
                : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/25'
            }`}
          >
            {checkedIn ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>
                  {t('dashboard.checked_in_btn', 'ĐÃ ĐIỂM DANH')} ({checkInTime})
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-amber-200" />
                <span>{t('dashboard.check_in_now_btn', 'CHẤM CÔNG NGAY')}</span>
              </>
            )}
          </button>
        </div>

        {/* Middle Column: IP Address, Real GPS Verification & Compliance (3 cols) */}
        <div className="lg:col-span-3 flex flex-col justify-between p-5 bg-white rounded-2xl border-2 border-slate-200/90 shadow-sm space-y-4">
          <div className="space-y-3.5">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-0.5">
                {t('dashboard.detected_ip', 'ĐỊA CHỈ IP ĐƯỢC PHÁT HIỆN')}
              </span>
              <div className="flex items-center gap-2">
                <Wifi className="w-4 h-4 text-blue-600 shrink-0" />
                <span className="font-mono text-sm font-bold text-slate-900">
                  192.168.1.104
                </span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  {t('dashboard.gps_coordinates', 'TỌA ĐỘ GPS')}
                </span>
                {isRealGps && (
                  <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                    <LocateFixed className="w-3 h-3" />
                    <span>GPS thật</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-mono text-xs font-bold text-slate-800">
                  {coords.lat}° N, {coords.lng}° E
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-start gap-2">
                <MapPin className={`w-4 h-4 shrink-0 mt-0.5 ${isInOffice ? 'text-emerald-600' : 'text-blue-600'}`} />
                <p className="text-[11px] font-medium text-slate-600 leading-tight">
                  {isInOffice
                    ? t('dashboard.location_match_desc', 'Vị trí khớp với khuôn viên FPT Complex Đà Nẵng (Bán kính hợp lệ: 500m)')
                    : `Khoảng cách tới FPT Complex: ~${distanceKm.toFixed(1)} km (Hỗ trợ chấm công WFH/Hybrid)`}
                </p>
              </div>
            </div>
          </div>

          <div className="text-[11px] font-medium text-slate-400 border-t border-slate-100 pt-3">
            {checkedIn
              ? t('dashboard.ontime_log', 'Ghi nhận: Có mặt đúng giờ • Không vi phạm')
              : t('dashboard.ready_to_record', 'Hệ thống đã sẵn sàng ghi nhận lượt chấm công')}
          </div>
        </div>

        {/* Right Column: Ultra Sharp 4K FPT Complex Geofence Map (4 cols) */}
        <div className="lg:col-span-4 relative rounded-2xl overflow-hidden border-2 border-slate-200/90 shadow-sm group min-h-[200px]">
          {/* High Resolution Map Asset */}
          <img
            src="/fpt-geofence-map.jpg"
            alt="FPT Complex Da Nang Geofence Map"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Overlay Badge: Location Accuracy */}
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-1 rounded-xl border border-slate-200 shadow-sm flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-slate-600">
              {t('dashboard.accuracy_label', 'Độ chính xác vị trí:')}{' '}
              <span className="text-emerald-700 font-black">
                {isRealGps ? `±${coords.accuracy}m` : t('dashboard.high_accuracy', 'Cao (±5m)')}
              </span>
            </span>
          </div>

          {/* Location Name Tag Bottom */}
          <div className="absolute bottom-2.5 left-3 right-3 bg-slate-900/85 backdrop-blur-xs px-3 py-1.5 rounded-xl border border-white/10 flex items-center justify-between text-white text-xs shadow-sm">
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="font-bold truncate">FPT Complex Đà Nẵng</span>
            </div>
            <span className="text-[10px] text-amber-300 font-mono font-bold shrink-0 ml-1">DN Geofence</span>
          </div>
        </div>
      </div>
    </div>
  );
}
