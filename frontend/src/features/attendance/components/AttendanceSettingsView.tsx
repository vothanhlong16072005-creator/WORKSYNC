import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Settings,
  Clock,
  MapPin,
  ShieldCheck,
  Save,
  RotateCw,
  Building2,
} from 'lucide-react';
import { toast } from 'sonner';
import { attendanceApi } from '../api/attendance.api';

export function AttendanceSettingsView() {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [companyName, setCompanyName] = useState('FPT Software');
  const [workStartTime, setWorkStartTime] = useState('08:30');
  const [workEndTime, setWorkEndTime] = useState('17:30');
  const [checkinStartTime, setCheckinStartTime] = useState('06:00');
  const [checkinEndTime, setCheckinEndTime] = useState('12:00');
  const [officeLatitude, setOfficeLatitude] = useState(15.9686);
  const [officeLongitude, setOfficeLongitude] = useState(108.2608);
  const [gpsRadiusMeters, setGpsRadiusMeters] = useState(500);
  const [ipRangesText, setIpRangesText] = useState('118.69.0.0/16, 172.16.0.0/12');
  const [wfhAutoApproveTime, setWfhAutoApproveTime] = useState('09:30');

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const cfg = await attendanceApi.getSettings();
      if (cfg) {
        setCompanyName(cfg.companyName || 'FPT Software');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                {isVi ? 'Cấu hình Chấm công Toàn hệ thống (Admin Panel)' : 'System Attendance Configuration (Admin Panel)'}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-bold border border-rose-200">
                ADMIN ONLY
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {isVi
                ? 'Thiết lập tham số ca làm việc, tọa độ Geofence FPT Complex và dải mạng bảo mật áp dụng cho toàn công ty'
                : 'Configure work shift hours, GPS Geofence parameters and enterprise network validation'}
            </p>
          </div>
        </div>

        <button
          onClick={fetchSettings}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all disabled:opacity-50 self-start sm:self-auto"
        >
          <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-rose-600' : ''}`} />
          <span>{isVi ? 'Khôi phục' : 'Reload'}</span>
        </button>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Shift & Working Hours */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Clock className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                {isVi ? '1. Tham số Ca làm việc' : '1. Shift & Working Hours'}
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isVi ? 'Tên Doanh nghiệp / Tổ chức' : 'Company Name'}
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-slate-900 font-bold focus:ring-2 focus:ring-blue-600/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isVi ? 'Giờ bắt đầu ca' : 'Shift Start'}
                  </label>
                  <input
                    type="time"
                    value={workStartTime}
                    onChange={(e) => setWorkStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isVi ? 'Giờ kết thúc ca' : 'Shift End'}
                  </label>
                  <input
                    type="time"
                    value={workEndTime}
                    onChange={(e) => setWorkEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isVi ? 'Check-in từ (Bắt đầu)' : 'Check-in Window Start'}
                  </label>
                  <input
                    type="time"
                    value={checkinStartTime}
                    onChange={(e) => setCheckinStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isVi ? 'Check-in đến (Kết thúc)' : 'Check-in Window End'}
                  </label>
                  <input
                    type="time"
                    value={checkinEndTime}
                    onChange={(e) => setCheckinEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isVi ? 'Giờ tự động duyệt đơn WFH quá hạn' : 'WFH Auto-Approve Cutoff'}
                </label>
                <input
                  type="time"
                  value={wfhAutoApproveTime}
                  onChange={(e) => setWfhAutoApproveTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Card 2: GPS Geofence & Office Location */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <MapPin className="w-4 h-4 text-rose-600" />
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                {isVi ? '2. Định vị Geofence & Trụ sở' : '2. Geofence & GPS Parameters'}
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-100 flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-slate-900">FPT Complex Đà Nẵng</p>
                  <p className="text-[11px] text-slate-500">
                    Đường Nam Kỳ Khởi Nghĩa, P. Hòa Hải, Q. Ngũ Hành Sơn, TP. Đà Nẵng
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isVi ? 'Vĩ độ (Latitude)' : 'Latitude'}
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={officeLatitude}
                    onChange={(e) => setOfficeLatitude(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {isVi ? 'Kinh độ (Longitude)' : 'Longitude'}
                  </label>
                  <input
                    type="number"
                    step="0.000001"
                    value={officeLongitude}
                    onChange={(e) => setOfficeLongitude(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  {isVi ? 'Bán kính Geofence hợp lệ (Mét)' : 'Allowed Geofence Radius (Meters)'}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="100"
                    max="2000"
                    step="50"
                    value={gpsRadiusMeters}
                    onChange={(e) => setGpsRadiusMeters(parseInt(e.target.value, 10))}
                    className="flex-1"
                  />
                  <span className="w-16 px-2.5 py-1 rounded-lg bg-slate-100 font-mono font-bold text-slate-900 text-center">
                    {gpsRadiusMeters}m
                  </span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{isVi ? 'Dải IP mạng nội bộ hợp lệ (CIDR Subnets)' : 'Allowed Internal IP Subnets'}</span>
                </label>
                <textarea
                  rows={2}
                  value={ipRangesText}
                  onChange={(e) => setIpRangesText(e.target.value)}
                  placeholder="118.69.0.0/16, 172.16.0.0/12"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs text-slate-800"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  {isVi ? 'Phân cách bằng dấu phẩy (,)' : 'Separated by commas (,)'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
          >
            {isSaving ? <RotateCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>{isSaving ? (isVi ? 'Đang lưu...' : 'Saving...') : isVi ? 'Lưu cấu hình hệ thống' : 'Save System Settings'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}
