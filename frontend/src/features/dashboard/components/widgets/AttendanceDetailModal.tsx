/**
 * AttendanceDetailModal — Modal chi tiết Hiện diện & Điểm danh phòng ban
 *
 * Cho phép Trưởng phòng (DEPARTMENT_HEAD) kiểm tra nhanh:
 *  - Ai đang có mặt tại văn phòng (GPS / WiFi, giờ check-in, trạng thái)
 *  - Ai đang WFH (kèm đơn / lý do làm việc từ xa)
 *  - Ai đang nghỉ phép (loại nghỉ phép, khoảng ngày, lý do)
 *  - Ai chưa điểm danh (kèm trạng thái nếu có đơn chờ duyệt)
 *  - Nút điều hướng trực tiếp sang trang Chấm công & Quản trị đơn (/attendance)
 */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  X,
  MapPin,
  Laptop,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import type { AttendanceSummaryDetails } from '../../types/dashboard.types';

export type AttendanceTab = 'IN_OFFICE' | 'WFH' | 'LEAVE' | 'NOT_CHECKED_IN';

interface AttendanceDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: AttendanceTab;
  details?: AttendanceSummaryDetails;
  counts: {
    inOffice: number;
    wfh: number;
    leave: number;
    notCheckedIn: number;
  };
}

export function AttendanceDetailModal({
  isOpen,
  onClose,
  initialTab = 'IN_OFFICE',
  details,
  counts,
}: AttendanceDetailModalProps) {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');
  const [activeTab, setActiveTab] = useState<AttendanceTab>(initialTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const inOfficeList = details?.inOffice || [];
  const wfhList = details?.wfh || [];
  const leaveList = details?.leave || [];
  const notCheckedInList = details?.notCheckedIn || [];

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '--:--';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    } catch {
      return '';
    }
  };

  const getLeaveTypeBadge = (type: string) => {
    switch (type) {
      case 'ANNUAL':
        return { label: isVi ? 'Phép năm' : 'Annual Leave', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'SICK':
        return { label: isVi ? 'Nghỉ ốm' : 'Sick Leave', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'MATERNITY':
        return { label: isVi ? 'Thai sản' : 'Maternity', color: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'UNPAID':
        return { label: isVi ? 'Không lương' : 'Unpaid', color: 'bg-amber-50 text-amber-700 border-amber-200' };
      default:
        return { label: isVi ? 'Có phép' : 'Approved Leave', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[90vh] z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 via-white to-blue-50/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                {isVi ? 'Hiện Diện & Chấm Công Hôm Nay' : 'Today Team Attendance'}
              </h2>
              <p className="text-xs text-slate-500">
                {isVi
                  ? 'Theo dõi vị trí làm việc, lý do xin phép và giờ check-in thực tế'
                  : 'Live attendance audit, location and leave request inspection'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 4 Navigation Tabs */}
        <div className="px-6 pt-4 pb-1 border-b border-slate-100 bg-white">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {/* Tab: Tại văn phòng */}
            <button
              type="button"
              onClick={() => setActiveTab('IN_OFFICE')}
              className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                activeTab === 'IN_OFFICE'
                  ? 'bg-blue-50/80 border-blue-400 text-blue-900 ring-2 ring-blue-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <MapPin className={`w-4 h-4 ${activeTab === 'IN_OFFICE' ? 'text-blue-600' : 'text-slate-400'}`} />
                <span className="text-xs font-black">{isVi ? 'Tại văn phòng' : 'In Office'}</span>
              </div>
              <span
                className={`text-xs font-black px-2 py-0.5 rounded-full ${
                  activeTab === 'IN_OFFICE' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {counts.inOffice}
              </span>
            </button>

            {/* Tab: WFH */}
            <button
              type="button"
              onClick={() => setActiveTab('WFH')}
              className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                activeTab === 'WFH'
                  ? 'bg-indigo-50/80 border-indigo-400 text-indigo-900 ring-2 ring-indigo-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <Laptop className={`w-4 h-4 ${activeTab === 'WFH' ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span className="text-xs font-black">WFH</span>
              </div>
              <span
                className={`text-xs font-black px-2 py-0.5 rounded-full ${
                  activeTab === 'WFH' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {counts.wfh}
              </span>
            </button>

            {/* Tab: Nghỉ phép */}
            <button
              type="button"
              onClick={() => setActiveTab('LEAVE')}
              className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                activeTab === 'LEAVE'
                  ? 'bg-amber-50/80 border-amber-400 text-amber-900 ring-2 ring-amber-500/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calendar className={`w-4 h-4 ${activeTab === 'LEAVE' ? 'text-amber-600' : 'text-slate-400'}`} />
                <span className="text-xs font-black">{isVi ? 'Nghỉ phép' : 'On Leave'}</span>
              </div>
              <span
                className={`text-xs font-black px-2 py-0.5 rounded-full ${
                  activeTab === 'LEAVE' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {counts.leave}
              </span>
            </button>

            {/* Tab: Chưa điểm danh */}
            <button
              type="button"
              onClick={() => setActiveTab('NOT_CHECKED_IN')}
              className={`flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                activeTab === 'NOT_CHECKED_IN'
                  ? 'bg-slate-100 border-slate-400 text-slate-900 ring-2 ring-slate-400/20 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className={`w-4 h-4 ${activeTab === 'NOT_CHECKED_IN' ? 'text-slate-700' : 'text-slate-400'}`} />
                <span className="text-xs font-black">{isVi ? 'Chưa điểm danh' : 'Pending'}</span>
              </div>
              <span
                className={`text-xs font-black px-2 py-0.5 rounded-full ${
                  activeTab === 'NOT_CHECKED_IN' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {counts.notCheckedIn}
              </span>
            </button>
          </div>
        </div>

        {/* Tab Body / Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 min-h-[300px]">
          {/* TAB 1: IN OFFICE */}
          {activeTab === 'IN_OFFICE' && (
            <>
              {inOfficeList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <MapPin className="w-10 h-10 mx-auto opacity-40 text-blue-500" />
                  <p className="text-sm font-bold text-slate-600">
                    {isVi ? 'Chưa có nhân sự nào check-in tại văn phòng' : 'No members checked in on-site yet'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {inOfficeList.map((m) => (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-2xl border border-slate-200/90 bg-white hover:border-blue-300 hover:shadow-xs transition-all flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {m.avatar ? (
                          <img
                            src={m.avatar}
                            alt={m.name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-black text-sm flex items-center justify-center shrink-0">
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-slate-900 truncate">{m.name}</h4>
                          <p className="text-xs text-slate-500 truncate">
                            {m.position || (isVi ? 'Kỹ sư phần mềm' : 'Software Engineer')} • {m.email}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0 text-right">
                        <div>
                          <div className="inline-flex items-center gap-1 text-xs font-black text-slate-900">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            <span>{formatTime(m.checkInTime)}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            Phương thức: <span className="font-bold text-blue-700">{m.checkInMethod}</span>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            m.status === 'ON_TIME'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {m.status === 'ON_TIME'
                            ? isVi ? 'Đúng giờ' : 'On-time'
                            : isVi ? 'Đi muộn' : 'Late'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* TAB 2: WFH */}
          {activeTab === 'WFH' && (
            <>
              {wfhList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Laptop className="w-10 h-10 mx-auto opacity-40 text-indigo-500" />
                  <p className="text-sm font-bold text-slate-600">
                    {isVi ? 'Không có ai làm việc từ xa (WFH) hôm nay' : 'No members working remotely today'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {wfhList.map((m) => (
                    <div
                      key={m.id}
                      className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/30 hover:border-indigo-300 transition-all space-y-2.5"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {m.avatar ? (
                            <img
                              src={m.avatar}
                              alt={m.name}
                              className="w-10 h-10 rounded-full object-cover border border-indigo-200 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-black text-sm flex items-center justify-center shrink-0">
                              {m.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="text-sm font-black text-slate-900 truncate">{m.name}</h4>
                            <p className="text-xs text-slate-500 truncate">{m.position || 'Thành viên phòng ban'}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 bg-indigo-100/80 px-2.5 py-0.5 rounded-full">
                            <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                            {isVi ? 'Đã duyệt WFH' : 'Approved WFH'}
                          </span>
                          {m.checkInTime && (
                            <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                              {formatTime(m.checkInTime)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* WFH Reason */}
                      <div className="p-2.5 rounded-xl bg-white border border-indigo-100 text-xs text-slate-700 flex items-start gap-2">
                        <FileText className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-slate-900">{isVi ? 'Lý do đăng ký: ' : 'Reason: '}</span>
                          <span className="italic">{m.reason || (isVi ? 'Làm việc từ xa theo quy định' : 'Remote work')}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* TAB 3: LEAVE */}
          {activeTab === 'LEAVE' && (
            <>
              {leaveList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <Calendar className="w-10 h-10 mx-auto opacity-40 text-amber-500" />
                  <p className="text-sm font-bold text-slate-600">
                    {isVi ? 'Không có nhân sự nào nghỉ phép hôm nay' : 'No members on leave today'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {leaveList.map((m) => {
                    const badge = getLeaveTypeBadge(m.leaveType);
                    return (
                      <div
                        key={m.id}
                        className="p-4 rounded-2xl border border-amber-100 bg-amber-50/30 hover:border-amber-300 transition-all space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3 min-w-0">
                            {m.avatar ? (
                              <img
                                src={m.avatar}
                                alt={m.name}
                                className="w-10 h-10 rounded-full object-cover border border-amber-200 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-800 font-black text-sm flex items-center justify-center shrink-0">
                                {m.name.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="text-sm font-black text-slate-900 truncate">{m.name}</h4>
                              <p className="text-xs text-slate-500 truncate">{m.position || 'Thành viên phòng ban'}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${badge.color}`}>
                              {badge.label}
                            </span>
                            {m.dayCount && (
                              <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                                {m.dayCount} {isVi ? 'ngày' : 'day(s)'}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Leave details & Reason */}
                        <div className="p-2.5 rounded-xl bg-white border border-amber-100 text-xs text-slate-700 space-y-1">
                          {m.startDate && (
                            <div className="text-[11px] text-slate-500 font-semibold">
                              {isVi ? 'Thời gian nghỉ: ' : 'Duration: '}
                              <span className="text-slate-800 font-bold">
                                {formatDate(m.startDate)} - {formatDate(m.endDate)}
                              </span>
                            </div>
                          )}
                          <div className="flex items-start gap-1.5">
                            <span className="font-bold text-slate-900">{isVi ? 'Lý do: ' : 'Reason: '}</span>
                            <span className="italic">{m.reason || (isVi ? 'Nghỉ phép theo chế độ' : 'Leave request')}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* TAB 4: NOT CHECKED IN */}
          {activeTab === 'NOT_CHECKED_IN' && (
            <>
              {notCheckedInList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
                  <p className="text-sm font-bold text-slate-700">
                    {isVi ? 'Tuyệt vời! Toàn bộ phòng ban đã điểm danh đầy đủ.' : 'All department members are present!'}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notCheckedInList.map((m) => (
                    <div
                      key={m.id}
                      className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white transition-all flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {m.avatar ? (
                          <img
                            src={m.avatar}
                            alt={m.name}
                            className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 font-black text-sm flex items-center justify-center shrink-0">
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-sm font-black text-slate-900 truncate">{m.name}</h4>
                          <p className="text-xs text-slate-500 truncate">
                            {m.position || 'Thành viên phòng ban'} • {m.email}
                          </p>
                          {m.pendingWfh && (
                            <p className="text-[11px] font-bold text-indigo-600 mt-0.5">
                              ⏳ {isVi ? 'Có đơn WFH chờ duyệt: ' : 'Pending WFH: '}{m.pendingWfh}
                            </p>
                          )}
                          {m.pendingLeave && (
                            <p className="text-[11px] font-bold text-amber-600 mt-0.5">
                              ⏳ {isVi ? 'Có đơn nghỉ phép chờ duyệt: ' : 'Pending Leave: '}{m.pendingLeave}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-xl">
                          <AlertCircle className="w-3.5 h-3.5 text-slate-400" />
                          {isVi ? 'Chờ check-in' : 'Awaiting'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer with direct Link to /attendance */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="text-xs text-slate-500">
            {isVi
              ? 'Trưởng phòng có thẩm quyền duyệt đơn WFH, Nghỉ phép và Chấm công'
              : 'Department Head has approval authority for attendance and requests'}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200 font-bold text-xs transition-colors"
            >
              {isVi ? 'Đóng' : 'Close'}
            </button>

            <Link
              to="/attendance"
              onClick={onClose}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>{isVi ? 'Quản lý Chấm công & Duyệt đơn chi tiết' : 'Go to Attendance Page'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
