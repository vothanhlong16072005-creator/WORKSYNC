import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Settings,
  Clock,
  MapPin,
  ShieldCheck,
  Save,
  RotateCw,
  Building2,
  CheckCircle2,
  Radio,
} from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toast } from 'sonner';
import { attendanceApi } from '../api/attendance.api';
import { OFFICE_PRESETS } from '../utils/office-presets';

export function AttendanceSettingsView() {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [companyName, setCompanyName] = useState('FPT Complex Đà Nẵng');
  const [workStartTime, setWorkStartTime] = useState('08:30');
  const [workEndTime, setWorkEndTime] = useState('17:30');
  const [checkinStartTime, setCheckinStartTime] = useState('06:00');
  const [checkinEndTime, setCheckinEndTime] = useState('12:00');
  const [officeLatitude, setOfficeLatitude] = useState(15.9686);
  const [officeLongitude, setOfficeLongitude] = useState(108.2608);
  const [gpsRadiusMeters, setGpsRadiusMeters] = useState(500);
  const [ipRangesText, setIpRangesText] = useState('118.69.0.0/16, 172.16.0.0/12, 127.0.0.1');
  const [wfhAutoApproveTime, setWfhAutoApproveTime] = useState('09:30');

  // Map refs
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const circleRef = useRef<L.Circle | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const cfg = await attendanceApi.getSettings();
      if (cfg) {
        setCompanyName(cfg.companyName || 'FPT Complex Đà Nẵng');
        setWorkStartTime(cfg.workStartTime || '08:30');
        setWorkEndTime(cfg.workEndTime || '17:30');
        setCheckinStartTime(cfg.checkinStartTime || '06:00');
        setCheckinEndTime(cfg.checkinEndTime || '12:00');
        setOfficeLatitude(cfg.officeLatitude || 15.9686);
        setOfficeLongitude(cfg.officeLongitude || 108.2608);
        setGpsRadiusMeters(cfg.gpsRadiusMeters || 500);
        setWfhAutoApproveTime(cfg.wfhAutoApproveTime || '09:30');
        if (Array.isArray(cfg.allowedIpRanges)) {
          setIpRangesText(cfg.allowedIpRanges.join(', '));
        }
      }
    } catch {
      toast.error(isVi ? 'Không thể tải cấu hình chấm công' : 'Failed to load attendance settings');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Initialize and update live Leaflet map preview
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [officeLatitude, officeLongitude],
        zoom: 15,
        zoomControl: false,
        attributionControl: false,
      });

      L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        { maxZoom: 19 }
      ).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Create initial circle
      const circle = L.circle([officeLatitude, officeLongitude], {
        radius: gpsRadiusMeters,
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.18,
        weight: 2,
        dashArray: '6, 6',
      }).addTo(map);

      // Create office marker icon
      const icon = L.divIcon({
        className: 'custom-office-pin',
        html: `<div style="background:#2563eb; color:white; padding:6px; border-radius:9999px; border:2px solid white; box-shadow:0 4px 6px -1px rgba(0,0,0,0.2);"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg></div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const marker = L.marker([officeLatitude, officeLongitude], { icon }).addTo(map);

      mapInstanceRef.current = map;
      circleRef.current = circle;
      markerRef.current = marker;
    } else {
      const map = mapInstanceRef.current;
      map.setView([officeLatitude, officeLongitude]);
      if (circleRef.current) {
        circleRef.current.setLatLng([officeLatitude, officeLongitude]);
        circleRef.current.setRadius(gpsRadiusMeters);
      }
      if (markerRef.current) {
        markerRef.current.setLatLng([officeLatitude, officeLongitude]);
      }
    }
  }, [officeLatitude, officeLongitude, gpsRadiusMeters]);

  const handleApplyPreset = (preset: typeof OFFICE_PRESETS[number]) => {
    setCompanyName(isVi ? preset.nameVi : preset.nameEn);
    setOfficeLatitude(preset.lat);
    setOfficeLongitude(preset.lng);
    setGpsRadiusMeters(preset.radiusMeters);
    toast.info(`Đã điền thông số ${isVi ? preset.nameVi : preset.nameEn}`, {
      description: `Tọa độ: ${preset.lat}, ${preset.lng} (Bán kính ${preset.radiusMeters}m)`,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const allowedIpRanges = ipRangesText
        .split(',')
        .map((ip) => ip.trim())
        .filter(Boolean);

      await attendanceApi.updateSettings({
        companyName,
        workStartTime,
        workEndTime,
        checkinStartTime,
        checkinEndTime,
        officeLatitude: Number(officeLatitude),
        officeLongitude: Number(officeLongitude),
        gpsRadiusMeters: Number(gpsRadiusMeters),
        allowedIpRanges,
        wfhAutoApproveTime,
      });

      toast.success(
        isVi ? 'Đã lưu cấu hình chấm công toàn hệ thống thành công!' : 'System attendance settings updated successfully!',
      );
    } catch {
      toast.error(isVi ? 'Lỗi khi lưu cấu hình' : 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1520px] mx-auto pb-8">
      {/* 1. Header & System Governance Ribbon */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold border border-rose-100 shadow-xs">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                {isVi ? 'Trung tâm Điều hành & Cấu hình Chấm công Toàn hệ thống' : 'Enterprise Attendance Governance & Parameters'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[11px] font-bold border border-rose-200">
                ADMIN CONSOLE
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[11px] font-bold border border-emerald-200 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                100% Policy Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isVi
                ? 'Quản trị tập trung tham số ca làm việc, định vị GPS Geofence đa chi nhánh và dải mạng bảo mật áp dụng cho toàn công ty'
                : 'Centralized governance for work shifts, multi-branch GPS geofencing and zero-trust internal network boundaries'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-end lg:self-center">
          <div className="text-right hidden sm:block text-xs">
            <span className="text-slate-400 block text-[10px] font-mono">CLUSTER: DA NANG DC-01</span>
            <span className="font-bold text-slate-700 font-mono">Ping: 4ms • Uptime: 99.98%</span>
          </div>

          <button
            onClick={fetchSettings}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-2xs disabled:opacity-50"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-rose-600' : ''}`} />
            <span>{isVi ? 'Tải lại' : 'Reload'}</span>
          </button>
        </div>
      </div>

      {/* 2. Office Presets Quick-Selection Cards */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              {isVi ? 'Chọn Nhanh Trụ Sở Áp Dụng (Office Presets)' : 'Quick-Apply Office Presets'}
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            Bấm để tự động điền tọa độ và bán kính chuẩn
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {OFFICE_PRESETS.map((preset) => {
            const isSelected =
              Math.abs(officeLatitude - preset.lat) < 0.001 &&
              Math.abs(officeLongitude - preset.lng) < 0.001;

            return (
              <div
                key={preset.id}
                onClick={() => handleApplyPreset(preset)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-2 border-blue-600 bg-blue-50/50 shadow-sm ring-2 ring-blue-500/10'
                    : 'border-slate-200/80 bg-slate-50/40 hover:bg-white hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="font-bold text-sm text-slate-900">{isVi ? preset.nameVi : preset.nameEn}</div>
                  {isSelected ? (
                    <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold shrink-0">
                      Đang chọn
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-semibold shrink-0">
                      Chọn
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 line-clamp-1 mb-2.5">{isVi ? preset.addressVi : preset.addressEn}</p>
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-600 pt-2 border-t border-slate-200/60">
                  <span>GPS: {preset.lat.toFixed(4)}, {preset.lng.toFixed(4)}</span>
                  <span className="font-bold text-blue-600">R: {preset.radiusMeters}m</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Main Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Card 1: Shift & Time Parameters (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3 mb-4">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {isVi ? '1. Tham số Ca làm việc' : '1. Shift & Working Hours'}
                  </h3>
                  <p className="text-[11px] text-slate-400">Khung giờ chuẩn và tự động hóa</p>
                </div>
              </div>

              <div className="space-y-3.5 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    {isVi ? 'Tên Doanh nghiệp / Trụ sở chính' : 'Organization Name'}
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-900 font-bold focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      {isVi ? 'Giờ bắt đầu ca' : 'Shift Start'}
                    </label>
                    <input
                      type="time"
                      value={workStartTime}
                      onChange={(e) => setWorkStartTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-blue-600/20"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      {isVi ? 'Giờ kết thúc ca' : 'Shift End'}
                    </label>
                    <input
                      type="time"
                      value={workEndTime}
                      onChange={(e) => setWorkEndTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-blue-600/20"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      {isVi ? 'Cửa sổ Check-in từ' : 'Window Open'}
                    </label>
                    <input
                      type="time"
                      value={checkinStartTime}
                      onChange={(e) => setCheckinStartTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-blue-600/20"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      {isVi ? 'Cửa sổ Check-in đến' : 'Window Close'}
                    </label>
                    <input
                      type="time"
                      value={checkinEndTime}
                      onChange={(e) => setCheckinEndTime(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-blue-600/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    {isVi ? 'Giờ tự động duyệt đơn WFH trong ngày' : 'WFH Auto-Approve Cutoff'}
                  </label>
                  <input
                    type="time"
                    value={wfhAutoApproveTime}
                    onChange={(e) => setWfhAutoApproveTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-blue-600/20"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Đơn WFH chưa được duyệt trước giờ này sẽ tự động chuyển trạng thái AUTO_APPROVED.
                  </p>
                </div>
              </div>
            </div>

            {/* Shift Rules Micro-summary */}
            <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-600">
                <span className="font-bold text-slate-800 block">Ân hạn đi muộn:</span>
                15 phút (đến 08:45)
              </div>
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-600">
                <span className="font-bold text-slate-800 block">Nghỉ trưa tự trừ:</span>
                12:00 - 13:00 (1.0h)
              </div>
            </div>
          </div>

          {/* Card 2: Interactive Geofence Map & Live Radar (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {isVi ? '2. Giám sát Định vị Geofence Thời gian thực' : '2. Live Geofence Radar & Boundary'}
                    </h3>
                    <p className="text-[11px] text-slate-400">Bản đồ CartoDB Voyager và vòng quét radar</p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/80 text-xs font-mono font-bold">
                  <Radio className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                  <span>Bán kính: {gpsRadiusMeters}m</span>
                </span>
              </div>

              {/* Interactive Live Leaflet Map Container */}
              <div className="relative w-full h-56 rounded-xl overflow-hidden border border-slate-200 shadow-inner mb-4">
                <div ref={mapContainerRef} className="w-full h-full" />
                <div className="absolute top-2 left-2 z-[400] bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-lg border border-slate-200 text-[10px] font-mono font-bold text-slate-700 shadow-xs">
                  GPS: {officeLatitude.toFixed(6)}, {officeLongitude.toFixed(6)}
                </div>
              </div>

              {/* Sliders and Numerical Coords */}
              <div className="space-y-3.5 text-xs">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">
                      {isVi ? 'Điều chỉnh Bán kính Vùng Chấm công (Geofence Radius)' : 'Geofence Radius Slider'}
                    </label>
                    <span className="font-mono font-bold text-blue-600 text-sm">
                      {gpsRadiusMeters} mét
                    </span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="2000"
                    step="50"
                    value={gpsRadiusMeters}
                    onChange={(e) => setGpsRadiusMeters(parseInt(e.target.value, 10))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
                    <span>100m (Tòa nhà)</span>
                    <span>500m (Chuẩn Campus FPT)</span>
                    <span>2000m (Khu công nghệ cao)</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      {isVi ? 'Vĩ độ (Latitude)' : 'Latitude'}
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      value={officeLatitude}
                      onChange={(e) => setOfficeLatitude(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-blue-600/20"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      {isVi ? 'Kinh độ (Longitude)' : 'Longitude'}
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      value={officeLongitude}
                      onChange={(e) => setOfficeLongitude(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900 text-xs focus:ring-2 focus:ring-blue-600/20"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Network Subnets */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <label className="font-semibold text-slate-700 text-xs block mb-1.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>{isVi ? 'Dải IP Mạng Nội Bộ Hợp Lệ (CIDR Subnets)' : 'Allowed Internal IP Subnets'}</span>
              </label>
              <textarea
                rows={2}
                value={ipRangesText}
                onChange={(e) => setIpRangesText(e.target.value)}
                placeholder="118.69.0.0/16, 172.16.0.0/12, 127.0.0.1"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs text-slate-800 focus:ring-2 focus:ring-blue-600/20"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Các IP nằm trong dải này sẽ tự động được chấm công hợp lệ (dù GPS lệch hoặc yếu sóng trong tòa nhà).
              </p>
            </div>
          </div>
        </div>

        {/* 4. Action Save Button Bar */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Mọi thay đổi sẽ có hiệu lực ngay lập tức đối với toàn bộ 15 nhân sự và 5 phòng ban.</span>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <RotateCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? (isVi ? 'Đang lưu...' : 'Saving...') : isVi ? 'Lưu Cấu Hình Hệ Thống' : 'Save System Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
