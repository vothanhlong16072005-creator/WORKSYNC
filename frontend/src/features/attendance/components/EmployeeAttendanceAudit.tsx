import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  UserCheck,
  Clock,
  Calendar,
  AlertTriangle,
  Home,
  Briefcase,
  FileText,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  Percent,
  Timer,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { attendanceApi } from '../api/attendance.api';
import type { EmployeeAuditResponse } from '../types/role-attendance.types';

interface UserOption {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: string;
  position?: string | null;
  departmentId?: string | null;
}

interface Props {
  initialUserId?: string;
  onClose?: () => void;
}

export function EmployeeAttendanceAudit({ initialUserId, onClose }: Props) {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  // Users list
  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(initialUserId || '');
  const [userSearch, setUserSearch] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Date period
  const [periodType, setPeriodType] = useState<'this-month' | 'last-month' | 'custom'>('this-month');
  const [fromDate, setFromDate] = useState<string>(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0] ?? '';
  });
  const [toDate, setToDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0] ?? '';
  });

  // Audit Data State
  const [auditData, setAuditData] = useState<EmployeeAuditResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'records' | 'requests'>('records');

  // Load all users on mount
  useEffect(() => {
    apiClient
      .get<UserOption[]>('/users')
      .then((res) => {
        const list = res.data || [];
        setUsers(list);
        if (!selectedUserId && list.length > 0) {
          // Default to first non-admin employee or first in list
          const defaultUser = list.find((u) => u.role === 'EMPLOYEE') || list[0];
          if (defaultUser) {
            setSelectedUserId(defaultUser.id);
          }
        }
      })
      .catch((err) => {
        console.error('Cannot load users for attendance audit:', err);
      });
  }, []);

  // Fetch audit when selected user or dates change
  useEffect(() => {
    if (!selectedUserId) return;
    loadAudit();
  }, [selectedUserId, fromDate, toDate]);

  const loadAudit = async () => {
    if (!selectedUserId) return;
    setIsLoading(true);
    try {
      const res = await attendanceApi.getEmployeeAudit(selectedUserId, {
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setAuditData(res);
    } catch {
      toast.error(
        isVi
          ? 'Không thể tải báo cáo chuyên cần của nhân viên này'
          : 'Failed to load employee attendance audit',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePeriodChange = (type: 'this-month' | 'last-month' | 'custom') => {
    setPeriodType(type);
    const now = new Date();
    if (type === 'this-month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0] ?? '';
      const end = now.toISOString().split('T')[0] ?? '';
      setFromDate(start);
      setToDate(end);
    } else if (type === 'last-month') {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0] ?? '';
      const end = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0] ?? '';
      setFromDate(start);
      setToDate(end);
    }
  };

  const selectedUser = users.find((u) => u.id === selectedUserId) || auditData?.user;

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase();
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
  });

  const formatTime = (iso?: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(isVi ? 'vi-VN' : 'en-US', {
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ON_TIME':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {isVi ? 'Đúng giờ' : 'On Time'}
          </span>
        );
      case 'LATE':
      case 'VERY_LATE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {isVi ? 'Đi muộn' : 'Late'}
          </span>
        );
      case 'WFH':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            WFH
          </span>
        );
      case 'ABSENT_APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            {isVi ? 'Nghỉ phép' : 'On Leave'}
          </span>
        );
      case 'EARLY_LEAVE_APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
            {isVi ? 'Về sớm' : 'Early Leave'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const getRequestStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            {isVi ? 'Đã duyệt' : 'Approved'}
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-600" />
            {isVi ? 'Từ chối' : 'Rejected'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <HelpCircle className="w-3 h-3 text-amber-600" />
            {isVi ? 'Chờ duyệt' : 'Pending'}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 space-y-6">
      {/* Top Header & User Selector Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center justify-between w-full lg:w-auto">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">
              <UserCheck className="w-4 h-4" />
              <span>{isVi ? 'Hồ sơ chuyên cần & Quân số' : 'Employee Attendance Audit'}</span>
            </div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">
              {isVi
                ? 'Tra cứu Kỷ luật, Giờ công & Đơn yêu cầu'
                : 'Audit Punctuality, Actual Hours & Submitted Requests'}
            </h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden text-xs font-bold text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-xl border border-slate-200"
            >
              ✕
            </button>
          )}
        </div>

        {/* User Selection & Period Filter */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Custom Searchable User Dropdown */}
          <div className="relative min-w-[240px]">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100/80 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2 truncate">
                <img
                  src={
                    selectedUser?.avatar ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      selectedUser?.name || 'User',
                    )}&background=0F172A&color=fff`
                  }
                  alt={selectedUser?.name || 'User'}
                  className="w-5 h-5 rounded-full object-cover shrink-0"
                />
                <span className="truncate">{selectedUser?.name || (isVi ? 'Chọn nhân viên' : 'Select employee')}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-white rounded-2xl border border-slate-200 shadow-xl z-30 p-2 space-y-1.5 animate-in fade-in zoom-in-95">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder={isVi ? 'Tìm tên, email...' : 'Search name, email...'}
                    className="w-full text-xs rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-2.5 py-1.5 text-slate-700 outline-none focus:ring-2 focus:ring-blue-100"
                    autoFocus
                  />
                </div>

                <div className="max-h-56 overflow-y-auto space-y-0.5">
                  {filteredUsers.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">
                      {isVi ? 'Không tìm thấy' : 'No user found'}
                    </div>
                  ) : (
                    filteredUsers.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setSelectedUserId(u.id);
                          setIsDropdownOpen(false);
                          setUserSearch('');
                        }}
                        className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-left text-xs transition-colors cursor-pointer ${
                          u.id === selectedUserId
                            ? 'bg-blue-50 text-blue-700 font-bold'
                            : 'hover:bg-slate-50 text-slate-700 font-medium'
                        }`}
                      >
                        <img
                          src={
                            u.avatar ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(u.name)}&background=0F172A&color=fff`
                          }
                          alt={u.name}
                          className="w-6 h-6 rounded-full object-cover shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-bold">{u.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Period Pill Group */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => handlePeriodChange('this-month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodType === 'this-month' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isVi ? 'Tháng này' : 'This Month'}
            </button>
            <button
              onClick={() => handlePeriodChange('last-month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodType === 'last-month' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isVi ? 'Tháng trước' : 'Last Month'}
            </button>
            <button
              onClick={() => setPeriodType('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                periodType === 'custom' ? 'bg-white text-blue-600 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isVi ? 'Tùy chỉnh' : 'Custom'}
            </button>
          </div>

          {periodType === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="text-xs font-bold rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700"
              />
              <span className="text-slate-400 text-xs">→</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="text-xs font-bold rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-slate-700"
              />
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-3">
          <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span>{isVi ? 'Đang trích xuất dữ liệu chuyên cần...' : 'Loading attendance audit details...'}</span>
        </div>
      ) : !auditData ? (
        <div className="p-12 text-center text-xs text-slate-400">
          {isVi ? 'Vui lòng chọn nhân viên để xem độ chuyên cần.' : 'Please select an employee to view audit.'}
        </div>
      ) : (
        <div className="space-y-6">
          {/* User Profile Summary Header */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <img
                src={
                  auditData.user.avatar ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    auditData.user.name,
                  )}&background=2563EB&color=fff`
                }
                alt={auditData.user.name}
                className="w-12 h-12 rounded-2xl object-cover border-2 border-white/20 shadow-sm"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">{auditData.user.name}</h3>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-white/10 text-slate-200 border border-white/10">
                    {auditData.user.role}
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  {auditData.user.email} • {auditData.user.department?.name || (isVi ? 'Toàn công ty' : 'General')}
                </p>
              </div>
            </div>

            <div className="text-right sm:border-l sm:border-white/10 sm:pl-4">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                {isVi ? 'Khoảng thời gian' : 'Audit Period'}
              </span>
              <span className="text-xs font-mono font-bold text-white">
                {auditData.period.fromDate} → {auditData.period.toDate}
              </span>
            </div>
          </div>

          {/* 6 High-Impact KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Punctuality Rate */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
              <div className="flex items-center justify-between text-emerald-700 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {isVi ? 'Độ chuyên cần' : 'Punctuality'}
                </span>
                <Percent className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-xl font-black text-emerald-700">
                {auditData.kpis.punctualityRate}%
              </div>
              <p className="text-[10px] text-emerald-600/80 mt-0.5 font-medium">
                {auditData.kpis.onTimeDays} {isVi ? 'ngày đúng giờ' : 'on-time days'}
              </p>
            </div>

            {/* Total Actual Work Hours */}
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80">
              <div className="flex items-center justify-between text-blue-700 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {isVi ? 'Tổng giờ làm' : 'Actual Hours'}
                </span>
                <Clock className="w-4 h-4 text-blue-600" />
              </div>
              <div className="text-xl font-black text-blue-700">
                {auditData.kpis.totalWorkHours}h
              </div>
              <p className="text-[10px] text-blue-600/80 mt-0.5 font-medium">
                ~{auditData.kpis.averageDailyHours}h / {isVi ? 'ngày' : 'day'}
              </p>
            </div>

            {/* Attended Days */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex items-center justify-between text-slate-700 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {isVi ? 'Hiện diện' : 'Attended'}
                </span>
                <UserCheck className="w-4 h-4 text-slate-500" />
              </div>
              <div className="text-xl font-black text-slate-800">
                {auditData.kpis.attendedDays}
                <span className="text-xs font-semibold text-slate-400">/{auditData.kpis.totalDays}</span>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                {isVi ? 'Ngày có check-in' : 'Days with check-in'}
              </p>
            </div>

            {/* Late Days */}
            <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80">
              <div className="flex items-center justify-between text-amber-700 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {isVi ? 'Đi muộn' : 'Late Days'}
                </span>
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-xl font-black text-amber-700">
                {auditData.kpis.lateDays}
              </div>
              <p className="text-[10px] text-amber-600/80 mt-0.5 font-medium">
                {auditData.kpis.earlyLeaveDays > 0 ? `+${auditData.kpis.earlyLeaveDays} ${isVi ? 'về sớm' : 'early'}` : (isVi ? 'Sau 08:30' : 'After 08:30')}
              </p>
            </div>

            {/* WFH Days */}
            <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80">
              <div className="flex items-center justify-between text-indigo-700 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {isVi ? 'Làm từ xa (WFH)' : 'WFH Days'}
                </span>
                <Home className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-xl font-black text-indigo-700">
                {auditData.kpis.wfhDays}
              </div>
              <p className="text-[10px] text-indigo-600/80 mt-0.5 font-medium">
                {isVi ? 'Có phê duyệt' : 'Approved WFH'}
              </p>
            </div>

            {/* Leave Days */}
            <div className="p-3.5 rounded-2xl bg-purple-50/70 border border-purple-200/80">
              <div className="flex items-center justify-between text-purple-700 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider">
                  {isVi ? 'Nghỉ phép' : 'Leaves'}
                </span>
                <Briefcase className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-xl font-black text-purple-700">
                {auditData.kpis.leaveDays}
              </div>
              <p className="text-[10px] text-purple-600/80 mt-0.5 font-medium">
                {isVi ? 'Phép năm / bệnh' : 'Annual / Sick'}
              </p>
            </div>
          </div>

          {/* Sub-Tabs: Records vs Requests */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('records')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeSubTab === 'records'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>
                    {isVi ? 'Nhật ký chấm công & Giờ làm' : 'Attendance & Hours Log'} ({auditData.records.length})
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSubTab('requests')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeSubTab === 'requests'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>
                    {isVi ? 'Các đơn đã nộp' : 'Submitted Requests'} (
                    {auditData.requests.leaves.length +
                      auditData.requests.wfhs.length +
                      auditData.requests.overtimes.length}
                    )
                  </span>
                </button>
              </div>
            </div>

            {/* TAB 1: Attendance Log Table */}
            {activeSubTab === 'records' && (
              <div className="overflow-x-auto rounded-2xl border border-slate-200/80">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200/80">
                    <tr>
                      <th className="py-3 px-4">{isVi ? 'Ngày' : 'Date'}</th>
                      <th className="py-3 px-4">{isVi ? 'Trạng thái' : 'Status'}</th>
                      <th className="py-3 px-4">{isVi ? 'Giờ vào' : 'Check-In'}</th>
                      <th className="py-3 px-4">{isVi ? 'Giờ ra' : 'Check-Out'}</th>
                      <th className="py-3 px-4">{isVi ? 'Thời gian làm' : 'Work Hours'}</th>
                      <th className="py-3 px-4">{isVi ? 'Ghi chú' : 'Notes'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditData.records.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          {isVi ? 'Không có bản ghi chấm công nào trong khoảng thời gian này.' : 'No records found.'}
                        </td>
                      </tr>
                    ) : (
                      auditData.records.map((r) => (
                        <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-mono font-medium text-slate-900">
                            {formatDate(r.date)}
                          </td>
                          <td className="py-3 px-4">{getStatusBadge(r.status)}</td>
                          <td className="py-3 px-4 font-mono text-slate-700">{formatTime(r.checkInTime)}</td>
                          <td className="py-3 px-4 font-mono text-slate-700">{formatTime(r.checkOutTime)}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {r.workHours > 0 ? `${r.workHours}h` : '—'}
                          </td>
                          <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                            {r.note || '—'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB 2: Submitted Requests (Leaves, WFH, OT) */}
            {activeSubTab === 'requests' && (
              <div className="space-y-4">
                {/* 1. Leave Requests */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-purple-600" />
                    <span>{isVi ? 'Đơn xin nghỉ phép' : 'Leave Requests'}</span>
                    <span className="text-slate-400 font-normal">({auditData.requests.leaves.length})</span>
                  </h4>

                  {auditData.requests.leaves.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-400 text-center">
                      {isVi ? 'Không có đơn nghỉ phép nào.' : 'No leave requests submitted.'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {auditData.requests.leaves.map((l) => (
                        <div
                          key={l.id}
                          className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              {l.type} • {l.startDate} → {l.endDate}
                            </span>
                            {getRequestStatusBadge(l.status)}
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-2">
                            <strong>{isVi ? 'Lý do:' : 'Reason:'}</strong> {l.reason}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {isVi ? 'Nộp ngày:' : 'Submitted:'} {new Date(l.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2. WFH Requests */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Home className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isVi ? 'Đơn làm việc từ xa (WFH)' : 'WFH Requests'}</span>
                    <span className="text-slate-400 font-normal">({auditData.requests.wfhs.length})</span>
                  </h4>

                  {auditData.requests.wfhs.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-400 text-center">
                      {isVi ? 'Không có đơn WFH nào.' : 'No WFH requests submitted.'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {auditData.requests.wfhs.map((w) => (
                        <div
                          key={w.id}
                          className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              {isVi ? 'Ngày WFH:' : 'Date:'} {w.date}
                            </span>
                            {getRequestStatusBadge(w.status)}
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-2">
                            <strong>{isVi ? 'Lý do:' : 'Reason:'}</strong> {w.reason}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {isVi ? 'Nộp ngày:' : 'Submitted:'} {new Date(w.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. Overtime Requests */}
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Timer className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{isVi ? 'Đăng ký làm thêm giờ (OT)' : 'Overtime Requests'}</span>
                    <span className="text-slate-400 font-normal">({auditData.requests.overtimes.length})</span>
                  </h4>

                  {auditData.requests.overtimes.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-400 text-center">
                      {isVi ? 'Không có đăng ký OT nào.' : 'No overtime requests submitted.'}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {auditData.requests.overtimes.map((o) => (
                        <div
                          key={o.id}
                          className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-slate-50 space-y-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              {o.date} • {o.hours}h OT
                            </span>
                            {getRequestStatusBadge(o.status)}
                          </div>
                          <p className="text-xs text-slate-600 line-clamp-2">
                            <strong>{isVi ? 'Nhiệm vụ:' : 'Reason:'}</strong> {o.reason}
                          </p>
                          <span className="text-[10px] text-slate-400 font-mono block">
                            {isVi ? 'Nộp ngày:' : 'Submitted:'} {new Date(o.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
