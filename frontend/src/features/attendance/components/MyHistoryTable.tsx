import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  Wifi,
  AlertCircle,
} from 'lucide-react';
import type { AttendanceRecord, AttendanceStatus } from '../types/attendance.types';

interface MyHistoryTableProps {
  records: AttendanceRecord[];
  isLoading: boolean;
  onFilterChange: (fromDate?: string, toDate?: string) => void;
}

const STATUS_BADGES: Record<
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
    labelVi: 'WFH',
    labelEn: 'WFH',
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
    dot: 'bg-slate-400',
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

export function MyHistoryTable({ records, isLoading, onFilterChange }: MyHistoryTableProps) {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  const [searchStatus, setSearchStatus] = useState<string>('ALL');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const handleApplyFilter = () => {
    onFilterChange(fromDate || undefined, toDate || undefined);
  };

  const filteredRecords = useMemo(() => {
    if (searchStatus === 'ALL') return records;
    return records.filter((r) => r.status === searchStatus);
  }, [records, searchStatus]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(isVi ? 'vi-VN' : 'en-US', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return '--:--';
    const d = new Date(timeStr);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Header & Filter Controls */}
      <div className="p-5 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            {isVi ? 'Lịch sử chấm công' : 'Attendance History'}
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            {isVi ? 'Xem lại nhật ký vào/ra và trạng thái chuyên cần' : 'Review clock in/out timestamps and attendance statuses'}
          </p>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={searchStatus}
            onChange={(e) => setSearchStatus(e.target.value)}
            className="h-9 px-3 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
          >
            <option value="ALL">{isVi ? 'Tất cả trạng thái' : 'All Statuses'}</option>
            <option value="ON_TIME">{isVi ? 'Đúng giờ' : 'On Time'}</option>
            <option value="LATE">{isVi ? 'Đi muộn' : 'Late'}</option>
            <option value="VERY_LATE">{isVi ? 'Rất muộn' : 'Very Late'}</option>
            <option value="WFH">WFH</option>
            <option value="ABSENT_APPROVED">{isVi ? 'Nghỉ phép' : 'Approved Leave'}</option>
            <option value="ABSENT_UNAPPROVED">{isVi ? 'Vắng mặt' : 'Absent'}</option>
            <option value="EARLY_LEAVE_APPROVED">{isVi ? 'Về sớm (OK)' : 'Early Leave (OK)'}</option>
            <option value="EARLY_LEAVE_UNAPPROVED">{isVi ? 'Về sớm (No permit)' : 'Early Leave (No permit)'}</option>
          </select>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <span className="text-[11px] font-semibold text-slate-500">{isVi ? 'Từ' : 'From'}:</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="text-xs bg-transparent border-0 focus:outline-none text-slate-700"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1">
            <span className="text-[11px] font-semibold text-slate-500">{isVi ? 'Đến' : 'To'}:</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="text-xs bg-transparent border-0 focus:outline-none text-slate-700"
            />
          </div>

          <button
            onClick={handleApplyFilter}
            className="h-9 px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-colors"
          >
            {isVi ? 'Lọc' : 'Filter'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">{isVi ? 'Ngày' : 'Date'}</th>
              <th className="py-3 px-4">{isVi ? 'Giờ vào' : 'Check In'}</th>
              <th className="py-3 px-4">{isVi ? 'Giờ ra' : 'Check Out'}</th>
              <th className="py-3 px-4">{isVi ? 'Trạng thái' : 'Status'}</th>
              <th className="py-3 px-4">{isVi ? 'Phương thức' : 'Method'}</th>
              <th className="py-3 px-4">{isVi ? 'Ghi chú' : 'Note'}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400 font-semibold">
                  <div className="inline-flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    <span>{isVi ? 'Đang tải dữ liệu lịch sử...' : 'Loading history...'}</span>
                  </div>
                </td>
              </tr>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center text-slate-400">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-semibold text-slate-600">{isVi ? 'Không có bản ghi nào' : 'No records found'}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isVi ? 'Nhật ký chấm công sẽ hiển thị tại đây khi bạn check-in' : 'Your attendance logs will appear here'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredRecords.map((record) => {
                const badge = STATUS_BADGES[record.status] || STATUS_BADGES.ON_TIME;
                return (
                  <tr key={record.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {formatDate(record.date)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-emerald-700">
                      {formatTime(record.checkInTime)}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-700">
                      {formatTime(record.checkOutTime)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-bold text-[11px] border ${badge.bg} ${badge.text}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {isVi ? badge.labelVi : badge.labelEn}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 font-semibold text-slate-700 text-[11px]">
                        {record.checkInMethod === 'GPS' ? (
                          <MapPin className="w-3 h-3 text-blue-600" />
                        ) : record.checkInMethod === 'IP' ? (
                          <Wifi className="w-3 h-3 text-indigo-600" />
                        ) : null}
                        {record.checkInMethod || 'MANUAL'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium max-w-xs truncate">
                      {record.note || '—'}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
