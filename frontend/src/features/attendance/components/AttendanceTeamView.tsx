import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users2,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Home,
  UserX,
  RotateCw,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { attendanceApi } from '../api/attendance.api';

interface TeamMemberAttendance {
  userId: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    position?: string | null;
  };
  projectRoles: string[];
  projectNames: string[];
  status: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  checkInMethod?: string | null;
}

interface TeamAttendanceData {
  date: string;
  projects: Array<{ id: string; name: string; color: string }>;
  summary: {
    totalMembers: number;
    presentCount: number;
    onTimeCount: number;
    lateCount: number;
    wfhCount: number;
    missingCount: number;
  };
  members: TeamMemberAttendance[];
}

export function AttendanceTeamView() {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  const [data, setData] = useState<TeamAttendanceData | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0] ?? '',
  );
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await attendanceApi.getTeamAttendance({
        projectId: selectedProjectId || undefined,
        date: selectedDate || undefined,
      });
      setData(res);
    } catch {
      toast.error(isVi ? 'Không thể tải dữ liệu chấm công nhóm' : 'Failed to load team attendance');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedProjectId, selectedDate]);

  const filteredMembers = (data?.members ?? []).filter((m) => {
    const matchSearch =
      m.user.name.toLowerCase().includes(search.toLowerCase()) ||
      m.user.email.toLowerCase().includes(search.toLowerCase()) ||
      m.projectRoles.some((r) => r.toLowerCase().includes(search.toLowerCase()));

    const matchStatus = statusFilter === 'ALL' || m.status === statusFilter;

    return matchSearch && matchStatus;
  });

  const formatTime = (iso?: string | null) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
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
            {isVi ? 'Về sớm (OK)' : 'Early Leave'}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            {isVi ? 'Chưa điểm danh' : 'Missing'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Users2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 tracking-tight">
                {isVi ? 'Chấm công Nhóm Dự án (PM View)' : 'Team Project Attendance (PM View)'}
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {isVi
                  ? 'Theo dõi hiện diện thời gian thực của các thành viên trong các dự án bạn phụ trách'
                  : 'Track real-time workplace attendance of members across your managed projects'}
              </p>
            </div>
          </div>

          <button
            onClick={fetchData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all disabled:opacity-50 self-start sm:self-auto"
          >
            <RotateCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
            <span>{isVi ? 'Làm mới' : 'Refresh'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100">
          {/* Project selector */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            >
              <option value="">{isVi ? 'Tất cả dự án của tôi' : 'All My Projects'}</option>
              {data?.projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date selector */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full text-xs font-bold rounded-xl border border-slate-200 bg-white px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isVi ? 'Tìm theo tên, email, role...' : 'Search member...'}
              className="w-full text-xs font-medium rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-600/20"
            />
          </div>
        </div>
      </div>

      {/* KPI Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
            {isVi ? 'Tổng thành viên' : 'Total Members'}
          </p>
          <p className="text-xl font-black text-slate-900 mt-1 tabular-nums">
            {data?.summary.totalMembers ?? 0}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200/80">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-emerald-700">
            <span>{isVi ? 'Đang có mặt' : 'Present'}</span>
            <CheckCircle2 className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-black text-emerald-900 mt-1 tabular-nums">
            {data?.summary.presentCount ?? 0}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200/80">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
            {isVi ? 'Đúng giờ' : 'On Time'}
          </p>
          <p className="text-xl font-black text-blue-900 mt-1 tabular-nums">
            {data?.summary.onTimeCount ?? 0}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200/80">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-amber-700">
            <span>{isVi ? 'Đi muộn' : 'Late'}</span>
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-black text-amber-900 mt-1 tabular-nums">
            {data?.summary.lateCount ?? 0}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-indigo-50 border border-indigo-200/80">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-indigo-700">
            <span>WFH</span>
            <Home className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-black text-indigo-900 mt-1 tabular-nums">
            {data?.summary.wfhCount ?? 0}
          </p>
        </div>

        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200/80">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-rose-700">
            <span>{isVi ? 'Chưa điểm danh' : 'Missing'}</span>
            <UserX className="w-3.5 h-3.5" />
          </div>
          <p className="text-xl font-black text-rose-900 mt-1 tabular-nums">
            {data?.summary.missingCount ?? 0}
          </p>
        </div>
      </div>

      {/* Member Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
              {isVi ? 'Danh sách Thành viên' : 'Team Members Roster'} ({filteredMembers.length})
            </h3>
          </div>

          {/* Quick status filter tabs */}
          <div className="flex items-center gap-1.5 text-xs font-bold">
            <button
              onClick={() => setStatusFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                statusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {isVi ? 'Tất cả' : 'All'}
            </button>
            <button
              onClick={() => setStatusFilter('ON_TIME')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                statusFilter === 'ON_TIME' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {isVi ? 'Đúng giờ' : 'On Time'}
            </button>
            <button
              onClick={() => setStatusFilter('LATE')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                statusFilter === 'LATE' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {isVi ? 'Đi muộn' : 'Late'}
            </button>
            <button
              onClick={() => setStatusFilter('WFH')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                statusFilter === 'WFH' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              WFH
            </button>
            <button
              onClick={() => setStatusFilter('NOT_CHECKED_IN')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                statusFilter === 'NOT_CHECKED_IN' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {isVi ? 'Chưa điểm danh' : 'Missing'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
              <tr>
                <th className="py-3 px-4">{isVi ? 'Thành viên' : 'Member'}</th>
                <th className="py-3 px-4">{isVi ? 'Dự án & Vai trò' : 'Project & Role'}</th>
                <th className="py-3 px-4">{isVi ? 'Trạng thái' : 'Status'}</th>
                <th className="py-3 px-4">{isVi ? 'Giờ vào (In)' : 'Check-in'}</th>
                <th className="py-3 px-4">{isVi ? 'Giờ ra (Out)' : 'Check-out'}</th>
                <th className="py-3 px-4">{isVi ? 'Phương thức' : 'Method'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                    {isVi ? 'Không tìm thấy thành viên nào' : 'No members found'}
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => (
                  <tr key={m.userId} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0">
                          {m.user.avatar ? (
                            <img src={m.user.avatar} alt={m.user.name} className="w-full h-full rounded-full object-cover" />
                          ) : (
                            m.user.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{m.user.name}</p>
                          <p className="text-[11px] text-slate-400">{m.user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 flex-wrap">
                          {m.projectNames.map((pName, idx) => (
                            <span key={idx} className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                              {pName}
                            </span>
                          ))}
                        </div>
                        <p className="text-[10px] text-blue-600 font-semibold">{m.projectRoles.join(', ')}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(m.status)}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {formatTime(m.checkInTime)}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {formatTime(m.checkOutTime)}
                    </td>
                    <td className="py-3 px-4">
                      {m.checkInMethod ? (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px] font-bold">
                          {m.checkInMethod}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
