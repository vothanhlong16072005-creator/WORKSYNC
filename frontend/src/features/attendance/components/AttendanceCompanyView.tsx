import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Calendar,
  Filter,
  UserCheck,
  RotateCw,
  Search,
  Eye,
} from 'lucide-react';
import { toast } from 'sonner';
import { attendanceApi } from '../api/attendance.api';
import { ExportButton } from './ExportButton';
import { EmployeeAttendanceAudit } from './EmployeeAttendanceAudit';

interface CompanyAttendanceRecord {
  id: string;
  userId: string;
  date: string;
  status: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  checkInMethod?: string | null;
  note?: string | null;
  departmentName: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    departmentId?: string | null;
  };
}

interface CompanyAttendanceData {
  dateRange: { from: string; to: string };
  departments: Array<{ id: string; name: string }>;
  summary: {
    totalEmployees: number;
    totalRecords: number;
    onTime: number;
    late: number;
    wfh: number;
    absentApproved: number;
    earlyLeave: number;
  };
  records: CompanyAttendanceRecord[];
}

export function AttendanceCompanyView() {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  // Sub-view: 'overview' or 'audit'
  const [subView, setSubView] = useState<'overview' | 'audit'>('overview');
  const [auditTargetUserId, setAuditTargetUserId] = useState<string>('');

  const [data, setData] = useState<CompanyAttendanceData | null>(null);
  const [fromDate, setFromDate] = useState<string>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0] ?? '',
  );
  const [toDate, setToDate] = useState<string>(new Date().toISOString().split('T')[0] ?? '');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await attendanceApi.getCompanyAttendance({
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
        departmentId: selectedDeptId || undefined,
      });
      setData(res);
    } catch {
      toast.error(isVi ? 'Không thể tải dữ liệu toàn công ty' : 'Failed to load company attendance');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fromDate, toDate, selectedDeptId]);

  const filteredRecords = (data?.records ?? []).filter((r) => {
    return (
      r.user.name.toLowerCase().includes(search.toLowerCase()) ||
      r.user.email.toLowerCase().includes(search.toLowerCase()) ||
      r.departmentName.toLowerCase().includes(search.toLowerCase())
    );
  });

  const formatTime = (iso?: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString(isVi ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ON_TIME':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {isVi ? 'Đúng giờ' : 'On Time'}
          </span>
        );
      case 'LATE':
      case 'VERY_LATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {isVi ? 'Đi muộn' : 'Late'}
          </span>
        );
      case 'WFH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            WFH
          </span>
        );
      case 'ABSENT_APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            {isVi ? 'Nghỉ phép' : 'On Leave'}
          </span>
        );
      case 'EARLY_LEAVE_APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
            {isVi ? 'Về sớm' : 'Early Leave'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const onTimeRate =
    data?.summary.totalRecords && data.summary.totalRecords > 0
      ? ((data.summary.onTime / data.summary.totalRecords) * 100).toFixed(1)
      : '0.0';

  const handleOpenAuditForUser = (userId: string) => {
    setAuditTargetUserId(userId);
    setSubView('audit');
  };

  return (
    <div className="space-y-6">
      {/* View Switcher: Overview vs Audit */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setSubView('overview')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subView === 'overview'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{isVi ? 'Bảng công Toàn Công ty' : 'Company Timesheet Overview'}</span>
          </button>
          <button
            onClick={() => setSubView('audit')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              subView === 'audit'
                ? 'bg-white text-blue-600 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>{isVi ? 'Tra cứu Chuyên cần & Giờ làm Cá nhân' : 'Employee Attendance Audit'}</span>
          </button>
        </div>

        {subView === 'audit' && (
          <button
            onClick={() => setSubView('overview')}
            className="text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
          >
            ← {isVi ? 'Quay lại Bảng công' : 'Back to Overview'}
          </button>
        )}
      </div>

      {/* RENDER EMPLOYEE AUDIT SUB-VIEW */}
      {subView === 'audit' ? (
        <EmployeeAttendanceAudit initialUserId={auditTargetUserId} />
      ) : (
        /* RENDER COMPANY-WIDE OVERVIEW */
        <>
          {/* Top Filter Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900 tracking-tight">
                    {isVi ? 'Chấm công Toàn Công ty (HR View)' : 'Company-Wide Attendance (HR View)'}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium">
                    {isVi
                      ? 'Quản trị kỷ luật lao động, tổng hợp ngày công và báo cáo nhân sự toàn doanh nghiệp'
                      : 'Monitor corporate work discipline, aggregate timesheets and company-wide HR compliance'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
                <ExportButton />
                <button
                  onClick={fetchData}
                  disabled={isLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                >
                  <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-600' : ''}`} />
                  <span>{isVi ? 'Làm mới' : 'Refresh'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
              {/* Department selector */}
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                  className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-600/20"
                >
                  <option value="">{isVi ? 'Tất cả phòng ban' : 'All Departments'}</option>
                  {data?.departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* From Date */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-600/20"
                />
              </div>

              {/* To Date */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-600/20"
                />
              </div>

              {/* Search box */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={isVi ? 'Tìm nhân viên, phòng ban...' : 'Search employee...'}
                  className="w-full text-xs font-medium rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-600/20"
                />
              </div>
            </div>
          </div>

          {/* KPI Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                {isVi ? 'Tổng nhân sự' : 'Total Employees'}
              </p>
              <p className="text-xl font-black text-slate-900 mt-1 tabular-nums">
                {data?.summary.totalEmployees ?? 0}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                <span>{isVi ? 'Đúng giờ' : 'On Time'}</span>
                <span className="font-mono text-emerald-600 font-bold">{onTimeRate}%</span>
              </div>
              <p className="text-xl font-black text-emerald-700 mt-1 tabular-nums">
                {data?.summary.onTime ?? 0}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
                {isVi ? 'Đi muộn' : 'Late'}
              </p>
              <p className="text-xl font-black text-amber-700 mt-1 tabular-nums">
                {data?.summary.late ?? 0}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">WFH</p>
              <p className="text-xl font-black text-blue-700 mt-1 tabular-nums">
                {data?.summary.wfh ?? 0}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-purple-700">
                {isVi ? 'Nghỉ phép' : 'On Leave'}
              </p>
              <p className="text-xl font-black text-purple-700 mt-1 tabular-nums">
                {data?.summary.absentApproved ?? 0}
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-cyan-50 border border-cyan-200/80">
              <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-700">
                {isVi ? 'Về sớm' : 'Early Leave'}
              </p>
              <p className="text-xl font-black text-cyan-700 mt-1 tabular-nums">
                {data?.summary.earlyLeave ?? 0}
              </p>
            </div>
          </div>

          {/* Table Container */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                {isVi ? 'Nhật ký Chấm công Toàn Công ty' : 'Company Timesheet Records'} ({filteredRecords.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                  <tr>
                    <th className="py-3 px-4">{isVi ? 'Nhân viên' : 'Employee'}</th>
                    <th className="py-3 px-4">{isVi ? 'Phòng ban' : 'Department'}</th>
                    <th className="py-3 px-4">{isVi ? 'Ngày' : 'Date'}</th>
                    <th className="py-3 px-4">{isVi ? 'Trạng thái' : 'Status'}</th>
                    <th className="py-3 px-4">{isVi ? 'Giờ vào' : 'Check-in'}</th>
                    <th className="py-3 px-4">{isVi ? 'Giờ ra' : 'Check-out'}</th>
                    <th className="py-3 px-4">{isVi ? 'Phương thức' : 'Method'}</th>
                    <th className="py-3 px-4 text-right">{isVi ? 'Hành động' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 font-semibold">
                        {isVi ? 'Không có bản ghi nào' : 'No records found'}
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center shrink-0">
                              {r.user.avatar ? (
                                <img src={r.user.avatar} alt={r.user.name} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                r.user.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{r.user.name}</p>
                              <p className="text-[11px] text-slate-400">{r.user.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 font-bold text-[10px]">
                            {r.departmentName}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {new Date(r.date).toLocaleDateString(isVi ? 'vi-VN' : 'en-US')}
                        </td>
                        <td className="py-3 px-4">{getStatusBadge(r.status)}</td>
                        <td className="py-3 px-4 font-mono font-bold text-slate-800">
                          {formatTime(r.checkInTime)}
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          {formatTime(r.checkOutTime)}
                        </td>
                        <td className="py-3 px-4">
                          {r.checkInMethod ? (
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                              {r.checkInMethod}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleOpenAuditForUser(r.userId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-bold transition-colors cursor-pointer"
                            title={isVi ? 'Tra cứu độ chuyên cần nhân viên' : 'Audit Employee'}
                          >
                            <Eye className="w-3 h-3" />
                            <span>{isVi ? 'Soi chuyên cần' : 'Audit'}</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
