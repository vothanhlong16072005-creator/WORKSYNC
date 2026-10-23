import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Users,
  Building2,
  FolderKanban,
  CalendarClock,
  FileText,
  Video,
  Activity,
  Cpu,
  Database,
  Server,
  Plus,
  Search,
  ArrowUpRight,
  RotateCw,
  ExternalLink,
  ChevronRight,
  MapPin,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  CartesianGrid,
} from 'recharts';
import { toast } from 'sonner';
import { adminApi } from '../api/admin.api';
import type {
  AdminOverviewData,
  AdminUserItem,
  AdminDepartmentItem,
  AdminProjectItem,
  AdminDocumentItem,
  AdminMeetingItem,
} from '../types/admin.types';
import { ExportButton } from '@/features/attendance/components/ExportButton';

const ROLE_COLORS: Record<string, { label: string; bg: string; text: string; border: string }> = {
  ADMIN: { label: 'Admin', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
  HR: { label: 'HR', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  PM: { label: 'PM', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  DEPARTMENT_HEAD: { label: 'Trưởng phòng', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  EMPLOYEE: { label: 'Nhân viên', bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
};

export default function AdminControlCenterPage() {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');
  const navigate = useNavigate();

  // Active Tab
  const [activeTab, setActiveTab] = useState<
    'overview' | 'users' | 'departments' | 'projects' | 'attendance' | 'documents' | 'infrastructure'
  >('overview');

  // Loading states
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingDepartments, setLoadingDepartments] = useState(false);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);

  // Data states
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [departments, setDepartments] = useState<AdminDepartmentItem[]>([]);
  const [projects, setProjects] = useState<AdminProjectItem[]>([]);
  const [documents, setDocuments] = useState<AdminDocumentItem[]>([]);
  const [meetings, setMeetings] = useState<AdminMeetingItem[]>([]);

  // Search & Filters for Users Tab
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [userDeptFilter, setUserDeptFilter] = useState('ALL');

  // Modals
  const [roleModalUser, setRoleModalUser] = useState<AdminUserItem | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<string>('EMPLOYEE');
  const [updatingRole, setUpdatingRole] = useState(false);

  const [createDeptModal, setCreateDeptModal] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');
  const [newDeptManagerId, setNewDeptManagerId] = useState('');
  const [newDeptMemberIds, setNewDeptMemberIds] = useState<string[]>([]);
  const [creatingDept, setCreatingDept] = useState(false);

  // Load Overview Data
  const loadOverview = async () => {
    setLoadingOverview(true);
    try {
      const data = await adminApi.getOverview();
      setOverview(data);
    } catch (err) {
      toast.error(isVi ? 'Không thể tải số liệu trung tâm quản trị' : 'Failed to load admin overview');
    } finally {
      setLoadingOverview(false);
    }
  };

  // Load Users Tab Data
  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const data = await adminApi.getAllUsers();
      setUsers(data);
    } catch {
      toast.error(isVi ? 'Không thể tải danh sách nhân sự' : 'Failed to load users');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load Departments Tab Data
  const loadDepartments = async () => {
    setLoadingDepartments(true);
    try {
      const data = await adminApi.getAllDepartments();
      setDepartments(data);
    } catch {
      toast.error(isVi ? 'Không thể tải danh sách phòng ban' : 'Failed to load departments');
    } finally {
      setLoadingDepartments(false);
    }
  };

  // Load Projects Tab Data
  const loadProjects = async () => {
    setLoadingProjects(true);
    try {
      const data = await adminApi.getAllProjects();
      setProjects(data);
    } catch {
      toast.error(isVi ? 'Không thể tải danh sách dự án' : 'Failed to load projects');
    } finally {
      setLoadingProjects(false);
    }
  };

  // Load Documents Tab Data
  const loadDocs = async () => {
    setLoadingDocs(true);
    try {
      const [docs, meets] = await Promise.all([
        adminApi.getAllDocuments(),
        adminApi.getAllMeetings(),
      ]);
      setDocuments(docs);
      setMeetings(meets);
    } catch {
      toast.error(isVi ? 'Không thể tải tài liệu và cuộc họp' : 'Failed to load documents');
    } finally {
      setLoadingDocs(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  useEffect(() => {
    if (activeTab === 'users' && users.length === 0) loadUsers();
    if (activeTab === 'departments' && departments.length === 0) loadDepartments();
    if (activeTab === 'projects' && projects.length === 0) loadProjects();
    if (activeTab === 'documents' && documents.length === 0) loadDocs();
  }, [activeTab]);

  // Handle Update Role
  const handleSaveRole = async () => {
    if (!roleModalUser) return;
    setUpdatingRole(true);
    try {
      await adminApi.updateUserRole(roleModalUser.id, selectedNewRole);
      toast.success(isVi ? `Đã cập nhật vai trò ${selectedNewRole} cho ${roleModalUser.name}` : `Role updated`);
      setRoleModalUser(null);
      loadUsers();
      loadOverview();
    } catch {
      toast.error(isVi ? 'Cập nhật vai trò thất bại' : 'Failed to update role');
    } finally {
      setUpdatingRole(false);
    }
  };

  // Handle Toggle Status (ACTIVE <-> SUSPENDED)
  const handleToggleStatus = async (user: AdminUserItem) => {
    const nextStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      await adminApi.updateUserStatus(user.id, nextStatus);
      toast.success(isVi ? `Đã chuyển trạng thái ${user.name} sang ${nextStatus}` : `Status updated`);
      loadUsers();
      loadOverview();
    } catch {
      toast.error(isVi ? 'Cập nhật trạng thái thất bại' : 'Failed to update status');
    }
  };

  // Handle Create Department
  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName || !newDeptCode) {
      toast.error(isVi ? 'Vui lòng nhập tên và mã phòng ban' : 'Name and code are required');
      return;
    }
    setCreatingDept(true);
    try {
      await adminApi.createDepartment({
        name: newDeptName,
        code: newDeptCode.toUpperCase(),
        description: newDeptDesc || undefined,
        managerId: newDeptManagerId || undefined,
        memberIds: newDeptMemberIds.length > 0 ? newDeptMemberIds : undefined,
      });
      toast.success(isVi ? 'Tạo phòng ban mới thành công' : 'Department created');
      setCreateDeptModal(false);
      setNewDeptName('');
      setNewDeptCode('');
      setNewDeptDesc('');
      setNewDeptManagerId('');
      setNewDeptMemberIds([]);
      loadDepartments();
      loadUsers();
      loadOverview();
    } catch (err: any) {
      const msg = err?.response?.data?.message || (isVi ? 'Lỗi tạo phòng ban' : 'Failed to create department');
      toast.error(msg);
    } finally {
      setCreatingDept(false);
    }
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase());
      const matchRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
      const matchDept = userDeptFilter === 'ALL' || u.departmentId === userDeptFilter;
      return matchSearch && matchRole && matchDept;
    });
  }, [users, userSearch, userRoleFilter, userDeptFilter]);

  // Attendance Chart Data
  const attendanceChartData = useMemo(() => {
    if (!overview) return [];
    const att = overview.todayAttendance;
    return [
      { name: isVi ? 'Đúng giờ' : 'On Time', value: att.onTime, color: '#10B981' },
      { name: isVi ? 'Đi muộn' : 'Late', value: att.late, color: '#F59E0B' },
      { name: 'WFH', value: att.wfh, color: '#3B82F6' },
      { name: isVi ? 'Nghỉ phép' : 'Leave', value: att.leave, color: '#8B5CF6' },
      { name: isVi ? 'Về sớm' : 'Early', value: att.earlyLeave, color: '#06B6D4' },
    ].filter((item) => item.value > 0);
  }, [overview, isVi]);

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Executive Top Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-900 via-slate-800 to-indigo-950 p-7 text-white shadow-xl border border-slate-700/60">
        <div className="absolute right-0 top-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute right-1/4 bottom-0 -mb-8 h-40 w-40 rounded-full bg-blue-500/10 blur-2xl" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-black tracking-wider uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>{isVi ? 'Trung tâm Quản trị Toàn năng WorkSync' : 'WorkSync Enterprise Command Center'}</span>
              {loadingOverview && (
                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-indigo-400/20 text-[10px] animate-pulse">
                  {isVi ? 'Đang tải...' : 'Syncing...'}
                </span>
              )}
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              {isVi ? 'Bảng Điều Khiển Quản Trị Hệ Thống' : 'Master Enterprise Administration'}
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl font-medium">
              {isVi
                ? 'Giám sát tập trung toàn bộ nhân sự 5 phân quyền, cơ cấu phòng ban, dự án Scrum/Kanban, tiến độ sprints, kỷ luật chấm công và kho tài liệu tri thức doanh nghiệp.'
                : 'Centralized oversight of all 5 organizational roles, departments structure, Scrum/Kanban project lifecycles, attendance compliance, and enterprise knowledge bases.'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => {
                loadOverview();
                if (activeTab === 'users') loadUsers();
                if (activeTab === 'departments') loadDepartments();
                if (activeTab === 'projects') loadProjects();
                if (activeTab === 'documents') loadDocs();
                toast.success(isVi ? 'Đã làm mới dữ liệu' : 'Refreshed');
              }}
              className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs backdrop-blur-xs transition-all border border-white/10"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>{isVi ? 'Làm mới' : 'Refresh'}</span>
            </button>

            <button
              onClick={() => setCreateDeptModal(true)}
              className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all hover:shadow-indigo-500/25"
            >
              <Plus className="w-4 h-4" />
              <span>{isVi ? 'Thêm phòng ban' : 'New Department'}</span>
            </button>
          </div>
        </div>

        {/* Live SLA & Geofence Ribbon */}
        <div className="mt-6 pt-5 border-t border-slate-700/60 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-slate-400 font-medium">{isVi ? 'Tình trạng hệ thống:' : 'System SLA:'}</span>
            <div className="flex items-center gap-1.5 mt-0.5 font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>99.98% Uptime (FPT Cloud)</span>
            </div>
          </div>
          <div>
            <span className="text-slate-400 font-medium">{isVi ? 'Bán kính Geofence:' : 'Geofence Radius:'}</span>
            <div className="font-bold text-slate-200 mt-0.5">
              100m ({isVi ? 'Chuẩn khuôn viên FPT' : 'Campus Standard'})
            </div>
          </div>
          <div>
            <span className="text-slate-400 font-medium">{isVi ? 'Cơ sở dữ liệu:' : 'Database:'}</span>
            <div className="font-bold text-slate-200 mt-0.5">
              PostgreSQL 16 (PgBouncer)
            </div>
          </div>
          <div>
            <span className="text-slate-400 font-medium">{isVi ? 'Phân quyền RBAC:' : 'RBAC Access:'}</span>
            <div className="font-bold text-indigo-300 mt-0.5">
              5 Roles Strict Guard
            </div>
          </div>
        </div>
      </div>

      {/* 2. Executive 6 KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        {/* Total Users */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm border-l-4 border-l-blue-600 transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isVi ? 'Nhân sự' : 'Personnel'}
            </span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {overview?.kpis.totalUsers ?? '...'}
          </div>
          <p className="text-[10px] text-blue-600 font-semibold mt-1">
            {overview?.kpis.activeUsers ?? 0} {isVi ? 'đang hoạt động' : 'active'}
          </p>
        </div>

        {/* Departments */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm border-l-4 border-l-purple-600 transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isVi ? 'Phòng ban' : 'Departments'}
            </span>
            <Building2 className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {overview?.kpis.totalDepartments ?? '...'}
          </div>
          <p className="text-[10px] text-purple-600 font-semibold mt-1">
            {isVi ? 'Cơ cấu toàn công ty' : 'Company structure'}
          </p>
        </div>

        {/* Projects */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm border-l-4 border-l-amber-500 transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isVi ? 'Dự án' : 'Projects'}
            </span>
            <FolderKanban className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {overview?.kpis.totalProjects ?? '...'}
          </div>
          <p className="text-[10px] text-amber-600 font-semibold mt-1">
            {overview?.kpis.activeProjects ?? 0} {isVi ? 'đang chạy' : 'active'}
          </p>
        </div>

        {/* Today Attendance Rate */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm border-l-4 border-l-emerald-500 transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isVi ? 'Chuyên cần hôm nay' : 'Attendance'}
            </span>
            <CalendarClock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600 tracking-tight">
            {overview?.kpis.todayAttendanceRate ?? 0}%
          </div>
          <p className="text-[10px] text-slate-500 font-semibold mt-1">
            {overview?.todayAttendance.present ?? 0} / {overview?.todayAttendance.totalExpected ?? 0} {isVi ? 'có mặt' : 'present'}
          </p>
        </div>

        {/* Documents */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm border-l-4 border-l-indigo-600 transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isVi ? 'Tài liệu' : 'Documents'}
            </span>
            <FileText className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {overview?.kpis.totalDocuments ?? '...'}
          </div>
          <p className="text-[10px] text-indigo-600 font-semibold mt-1">
            {isVi ? 'Kho tri thức doanh nghiệp' : 'Enterprise Wiki'}
          </p>
        </div>

        {/* Meetings */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm border-l-4 border-l-rose-500 transition-all hover:shadow-md">
          <div className="flex items-center justify-between text-slate-400 mb-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {isVi ? 'Cuộc họp' : 'Meetings'}
            </span>
            <Video className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {overview?.kpis.totalMeetings ?? '...'}
          </div>
          <p className="text-[10px] text-rose-600 font-semibold mt-1">
            {isVi ? 'Lịch trao đổi công việc' : 'Scheduled meetings'}
          </p>
        </div>
      </div>

      {/* 3. Visual Charts Grid (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Department Distribution BarChart (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
                <Building2 className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                {isVi ? 'Phân bổ nhân sự theo phòng ban' : 'Personnel by Department'}
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              {overview?.departmentStats.length ?? 0} {isVi ? 'phòng ban' : 'departments'}
            </span>
          </div>

          <div className="h-64 w-full">
            {overview?.departmentStats && overview.departmentStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview.departmentStats} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="code" tick={{ fontSize: 11, fill: '#64748B' }} interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                  <Tooltip
                    formatter={(val: any) => [`${val ?? 0} ${isVi ? 'nhân sự' : 'members'}`, isVi ? 'Số lượng' : 'Count']}
                    labelFormatter={(code) => {
                      const dept = overview.departmentStats.find((d) => d.code === code);
                      return dept ? dept.name : code;
                    }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                  />
                  <Bar dataKey="userCount" fill="#3B82F6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                {isVi ? 'Đang tải dữ liệu biểu đồ...' : 'Loading chart...'}
              </div>
            )}
          </div>
        </div>

        {/* Right: 5-Role Distribution PieChart (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Users className="w-4 h-4" />
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                {isVi ? 'Cơ cấu 5 Phân quyền Doanh nghiệp' : '5-Role Distribution'}
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-medium">RBAC Matrix</span>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {overview?.roleDistribution && overview.roleDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={overview.roleDistribution}
                    dataKey="count"
                    nameKey="label"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                  >
                    {overview.roleDistribution.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [`${val ?? 0} ${isVi ? 'người' : 'users'}`, isVi ? 'Số lượng' : 'Count']}
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', fontSize: '12px' }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                {isVi ? 'Đang tải biểu đồ vai trò...' : 'Loading roles chart...'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Tab Navigation Strip */}
      <div className="border-b border-slate-200 bg-white rounded-2xl shadow-sm px-4 pt-2">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'overview'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>{isVi ? 'Tổng quan Hệ thống' : 'Overview'}</span>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>{isVi ? 'Nhân sự & Phân quyền (5 Roles)' : 'Users & Roles'}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] text-slate-600">
              {users.length || overview?.kpis.totalUsers || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('departments')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'departments'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>{isVi ? 'Cơ cấu Phòng ban' : 'Departments'}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] text-slate-600">
              {departments.length || overview?.kpis.totalDepartments || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('projects')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'projects'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FolderKanban className="w-4 h-4" />
            <span>{isVi ? 'Dự án & Sprints' : 'Projects & Sprints'}</span>
            <span className="px-1.5 py-0.2 rounded-full bg-slate-100 text-[10px] text-slate-600">
              {projects.length || overview?.kpis.totalProjects || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'attendance'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <CalendarClock className="w-4 h-4" />
            <span>{isVi ? 'Giám sát Chấm công' : 'Attendance Oversight'}</span>
          </button>

          <button
            onClick={() => setActiveTab('documents')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'documents'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>{isVi ? 'Tài liệu & Họp' : 'Documents & Meetings'}</span>
          </button>

          <button
            onClick={() => setActiveTab('infrastructure')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'infrastructure'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-900'
            }`}
          >
            <Server className="w-4 h-4" />
            <span>{isVi ? 'Hạ tầng & Geofence (100m)' : 'Infrastructure'}</span>
          </button>
        </div>
      </div>

      {/* 5. TAB CONTENT */}

      {/* TAB 1: OVERVIEW DASHBOARD */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Project Workflow Distribution */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm">
              <div className="flex items-center gap-2 pb-3 mb-3 border-b border-slate-100">
                <span className="p-1.5 rounded-lg bg-amber-50 text-amber-600">
                  <FolderKanban className="w-4 h-4" />
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  {isVi ? 'Mô hình Dự án đang vận hành' : 'Project Lifecycles'}
                </h4>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Scrum Sprints</span>
                  <span className="font-bold text-blue-600">{overview?.projectStats.scrumCount ?? 0} {isVi ? 'dự án' : 'projects'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">Kanban Board</span>
                  <span className="font-bold text-amber-600">{overview?.projectStats.kanbanCount ?? 0} {isVi ? 'dự án' : 'projects'}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">{isVi ? 'Đang triển khai (Active)' : 'Active'}</span>
                  <span className="font-bold text-emerald-600">{overview?.projectStats.active ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-600">{isVi ? 'Đã hoàn thành' : 'Completed'}</span>
                  <span className="font-bold text-slate-700">{overview?.projectStats.completed ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Today Attendance Pulse */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                    <CalendarClock className="w-4 h-4" />
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">
                    {isVi ? 'Chấm công Hôm nay' : 'Today Attendance'}
                  </h4>
                </div>
                <ExportButton />
              </div>

              {attendanceChartData.length > 0 && (
                <div className="h-28 w-full mb-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={attendanceChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={25}
                        outerRadius={45}
                        paddingAngle={3}
                      >
                        {attendanceChartData.map((entry, idx) => (
                          <Cell key={`att-cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-600 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {isVi ? 'Đúng giờ' : 'On Time'}
                  </span>
                  <span className="font-bold text-emerald-600">{overview?.todayAttendance.onTime ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-600 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    {isVi ? 'Đi muộn' : 'Late'}
                  </span>
                  <span className="font-bold text-amber-600">{overview?.todayAttendance.late ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-600 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    WFH
                  </span>
                  <span className="font-bold text-blue-600">{overview?.todayAttendance.wfh ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-600 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    {isVi ? 'Nghỉ phép' : 'Leave'}
                  </span>
                  <span className="font-bold text-purple-600">{overview?.todayAttendance.leave ?? 0}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-2 text-slate-600 font-semibold">
                    <span className="w-2 h-2 rounded-full bg-cyan-500" />
                    {isVi ? 'Về sớm' : 'Early Leave'}
                  </span>
                  <span className="font-bold text-cyan-600">{overview?.todayAttendance.earlyLeave ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Quick Navigation to Departments */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-sm">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                    <Building2 className="w-4 h-4" />
                  </span>
                  <h4 className="text-sm font-bold text-slate-900">
                    {isVi ? 'Phòng ban Tiêu biểu' : 'Top Departments'}
                  </h4>
                </div>
                <button
                  onClick={() => setActiveTab('departments')}
                  className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
                >
                  {isVi ? 'Xem tất cả' : 'View all'}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2.5">
                {(overview?.departmentStats ?? []).slice(0, 4).map((d) => (
                  <div key={d.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div>
                      <div className="font-bold text-slate-800">{d.name}</div>
                      <span className="text-[10px] text-slate-400">
                        {d.managerName ? `${isVi ? 'Trưởng phòng' : 'Head'}: ${d.managerName}` : 'Chưa có trưởng phòng'}
                      </span>
                    </div>
                    <span className="font-black text-slate-900 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                      {d.userCount} {isVi ? 'nv' : 'users'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USERS & 5 ROLES MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          {/* Filters Bar */}
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isVi ? 'Quản lý Người dùng & Phân quyền Hệ thống' : 'Users & Roles Management'}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isVi
                  ? 'Theo dõi mọi thành viên công ty, điều chỉnh vai trò trong 5 Roles và trạng thái tài khoản'
                  : 'Manage all organization members, alter roles among 5 RBAC roles, and modify account status'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={isVi ? 'Tìm tên hoặc email...' : 'Search name or email...'}
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="h-9 pl-8 pr-3 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-48 sm:w-60"
                />
              </div>

              {/* Role Filter */}
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">{isVi ? 'Tất cả vai trò' : 'All Roles'}</option>
                <option value="ADMIN">ADMIN</option>
                <option value="HR">HR</option>
                <option value="PM">PM</option>
                <option value="DEPARTMENT_HEAD">{isVi ? 'Trưởng phòng' : 'Dept Head'}</option>
                <option value="EMPLOYEE">{isVi ? 'Nhân viên' : 'Employee'}</option>
              </select>

              {/* Department Filter */}
              <select
                value={userDeptFilter}
                onChange={(e) => setUserDeptFilter(e.target.value)}
                className="h-9 px-3 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="ALL">{isVi ? 'Tất cả phòng ban' : 'All Departments'}</option>
                {overview?.departmentStats.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">{isVi ? 'Thành viên' : 'User'}</th>
                  <th className="py-3 px-4">{isVi ? 'Phòng ban' : 'Department'}</th>
                  <th className="py-3 px-4">{isVi ? 'Vai trò hiện tại' : 'Role'}</th>
                  <th className="py-3 px-4">{isVi ? 'Trạng thái' : 'Status'}</th>
                  <th className="py-3 px-4">{isVi ? 'Công việc' : 'Tasks'}</th>
                  <th className="py-3 px-4 text-right">{isVi ? 'Thao tác Quản trị' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loadingUsers ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      {isVi ? 'Đang tải danh sách nhân sự...' : 'Loading users...'}
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      {isVi ? 'Không tìm thấy người dùng phù hợp' : 'No users found'}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const roleInfo = ROLE_COLORS[u.role] || ROLE_COLORS.EMPLOYEE;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                              {u.avatar ? (
                                <img src={u.avatar} alt={u.name} className="w-8 h-8 rounded-full object-cover" />
                              ) : (
                                u.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{u.name}</div>
                              <div className="text-[11px] text-slate-500">{u.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          {u.department ? (
                            <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              {u.department.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">{isVi ? 'Chưa phân bổ' : 'Unassigned'}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${roleInfo.bg} ${roleInfo.text} ${roleInfo.border}`}
                          >
                            <ShieldCheck className="w-3 h-3" />
                            {roleInfo.label}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {u.status === 'ACTIVE' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {isVi ? 'Hoạt động' : 'Active'}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                              {isVi ? 'Tạm khóa' : 'Suspended'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-600">
                          {u._count.assignedTasks} tasks • {u._count.projectMemberships} projects
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => {
                                setRoleModalUser(u);
                                setSelectedNewRole(u.role);
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 transition-colors"
                            >
                              {isVi ? 'Đổi vai trò' : 'Change Role'}
                            </button>
                            <button
                              onClick={() => handleToggleStatus(u)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                                u.status === 'ACTIVE'
                                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700'
                              }`}
                            >
                              {u.status === 'ACTIVE' ? (isVi ? 'Khóa' : 'Suspend') : (isVi ? 'Mở khóa' : 'Activate')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: DEPARTMENTS MANAGEMENT */}
      {activeTab === 'departments' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isVi ? 'Cơ cấu Tổ chức & Danh sách Phòng ban' : 'Organization & Departments'}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isVi ? 'Quản lý các khối chuyên môn, phân bổ trưởng phòng và dự án' : 'Manage organizational units and department heads'}
              </p>
            </div>
            <button
              onClick={() => setCreateDeptModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>{isVi ? 'Tạo phòng ban' : 'Add Department'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {loadingDepartments ? (
              <div className="col-span-3 py-12 text-center text-slate-400 text-xs">
                {isVi ? 'Đang tải danh sách phòng ban...' : 'Loading departments...'}
              </div>
            ) : (
              departments.map((dept) => (
                <div
                  key={dept.id}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-black text-[10px] border border-indigo-200">
                          {dept.code}
                        </span>
                        <h4 className="text-base font-black text-slate-900 mt-1">{dept.name}</h4>
                      </div>
                      <span className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
                        <Building2 className="w-4 h-4" />
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-2 mb-4 font-medium">
                      {dept.description || (isVi ? 'Chưa có mô tả phòng ban' : 'No description')}
                    </p>

                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 mb-4">
                      <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">
                        {isVi ? 'Trưởng phòng (Department Head)' : 'Department Head'}
                      </div>
                      {dept.manager ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                            {dept.manager.name.charAt(0)}
                          </div>
                          <span className="text-xs font-bold text-slate-800">{dept.manager.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">{isVi ? 'Chưa bổ nhiệm' : 'Unassigned'}</span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-bold">
                    <span>{dept._count.users} {isVi ? 'nhân sự' : 'members'}</span>
                    <span>{dept._count.projects} {isVi ? 'dự án' : 'projects'}</span>
                    <span>{dept._count.documents} {isVi ? 'tài liệu' : 'docs'}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 4: PROJECTS & SPRINTS */}
      {activeTab === 'projects' && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isVi ? 'Giám sát Tiến độ Dự án & Sprints Toàn Doanh nghiệp' : 'Enterprise Projects & Sprints'}
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {isVi ? 'Theo dõi vòng đời phát triển Scrum/Kanban, tiến độ hoàn thành task của từng PM' : 'Track Scrum/Kanban lifecycles and team sprint progress'}
              </p>
            </div>
            <button
              onClick={() => navigate('/projects')}
              className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-colors"
            >
              <span>{isVi ? 'Trang Dự án chính' : 'Projects Page'}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">{isVi ? 'Dự án' : 'Project'}</th>
                  <th className="py-3 px-4">{isVi ? 'Quy trình' : 'Workflow'}</th>
                  <th className="py-3 px-4">{isVi ? 'Phòng ban & PM' : 'Dept & PM'}</th>
                  <th className="py-3 px-4">{isVi ? 'Quy mô nhóm' : 'Team Size'}</th>
                  <th className="py-3 px-4">{isVi ? 'Tiến độ hoàn thành' : 'Progress'}</th>
                  <th className="py-3 px-4 text-right">{isVi ? 'Hành động' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {loadingProjects ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      {isVi ? 'Đang tải danh sách dự án...' : 'Loading projects...'}
                    </td>
                  </tr>
                ) : projects.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400">
                      {isVi ? 'Không có dự án nào' : 'No projects found'}
                    </td>
                  </tr>
                ) : (
                  projects.map((proj) => (
                    <tr key={proj.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: proj.color || '#3B82F6' }}
                          />
                          <div>
                            <div className="font-bold text-slate-900">{proj.name}</div>
                            <span className="text-[10px] text-slate-400 font-mono">{proj.code}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {proj.workflowType}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">
                          {proj.manager?.name || (isVi ? 'Chưa gán PM' : 'No PM')}
                        </div>
                        <div className="text-[10px] text-slate-400">{proj.department?.name || 'Toàn công ty'}</div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-600">
                        {proj.memberCount} {isVi ? 'thành viên' : 'members'} • {proj.sprintCount} sprints
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-36">
                          <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                            <span className="text-slate-600">{proj.completedTaskCount}/{proj.taskCount} tasks</span>
                            <span className="text-blue-600">{proj.progressPercent}%</span>
                          </div>
                          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-600 h-full rounded-full transition-all"
                              style={{ width: `${proj.progressPercent}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => navigate(`/projects/${proj.id}`)}
                          className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 text-slate-700 transition-colors inline-flex items-center gap-1"
                        >
                          <span>{isVi ? 'Chi tiết' : 'View'}</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: ATTENDANCE OVERSIGHT */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200/90 p-6 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {isVi ? 'Giám sát Kỷ luật Chấm công Doanh nghiệp' : 'Enterprise Attendance Oversight'}
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {isVi
                    ? 'Xuất dữ liệu chấm công định dạng Excel / PDF có đầy đủ số giờ làm, số phút đi muộn và tên nhân viên để tính lương'
                    : 'Export salary-ready attendance reports with complete work hours, late minutes, and employee names'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <ExportButton />
                <button
                  onClick={() => navigate('/attendance')}
                  className="inline-flex items-center gap-1.5 px-4 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors"
                >
                  <span>{isVi ? 'Trang Chấm công đầy đủ' : 'Full Attendance Page'}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-6">
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-center">
                <div className="text-[11px] font-bold text-emerald-800">{isVi ? 'Đúng giờ' : 'On Time'}</div>
                <div className="text-2xl font-black text-emerald-950 mt-1">{overview?.todayAttendance.onTime ?? 0}</div>
              </div>
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 text-center">
                <div className="text-[11px] font-bold text-amber-800">{isVi ? 'Đi muộn' : 'Late'}</div>
                <div className="text-2xl font-black text-amber-950 mt-1">{overview?.todayAttendance.late ?? 0}</div>
              </div>
              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-center">
                <div className="text-[11px] font-bold text-blue-800">WFH</div>
                <div className="text-2xl font-black text-blue-950 mt-1">{overview?.todayAttendance.wfh ?? 0}</div>
              </div>
              <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 text-center">
                <div className="text-[11px] font-bold text-purple-800">{isVi ? 'Nghỉ phép' : 'Leave'}</div>
                <div className="text-2xl font-black text-purple-950 mt-1">{overview?.todayAttendance.leave ?? 0}</div>
              </div>
              <div className="p-4 rounded-xl bg-cyan-50/70 border border-cyan-200 text-center">
                <div className="text-[11px] font-bold text-cyan-800">{isVi ? 'Về sớm' : 'Early Leave'}</div>
                <div className="text-2xl font-black text-cyan-950 mt-1">{overview?.todayAttendance.earlyLeave ?? 0}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: DOCUMENTS & MEETINGS */}
      {activeTab === 'documents' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Documents Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <FileText className="w-4 h-4" />
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  {isVi ? 'Tài liệu Doanh nghiệp gần đây' : 'Recent Enterprise Documents'}
                </h4>
              </div>
              <button
                onClick={() => navigate('/documents')}
                className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-0.5"
              >
                {isVi ? 'Quản lý' : 'Manage'}
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto">
              {loadingDocs ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  {isVi ? 'Đang tải tài liệu...' : 'Loading documents...'}
                </div>
              ) : documents.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  {isVi ? 'Chưa có tài liệu nào' : 'No documents found'}
                </div>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs hover:bg-slate-100/70 transition-colors">
                    <div>
                      <div className="font-bold text-slate-800">{doc.title}</div>
                      <span className="text-[10px] text-slate-400">
                        {doc.scope} • {doc.owner?.name || 'Hệ thống'}
                      </span>
                    </div>
                    <button
                      onClick={() => navigate(`/documents/${doc.id}`)}
                      className="px-2.5 py-1 rounded-md bg-white border border-slate-200 text-indigo-600 font-bold text-[11px]"
                    >
                      {isVi ? 'Mở' : 'Open'}
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Meetings Card */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                  <Video className="w-4 h-4" />
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  {isVi ? 'Lịch Họp Toàn Doanh nghiệp' : 'Enterprise Meetings'}
                </h4>
              </div>
              <button
                onClick={() => navigate('/meetings')}
                className="text-xs font-bold text-rose-600 hover:underline flex items-center gap-0.5"
              >
                {isVi ? 'Chi tiết' : 'Details'}
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-96 overflow-y-auto">
              {loadingDocs ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  {isVi ? 'Đang tải lịch họp...' : 'Loading meetings...'}
                </div>
              ) : meetings.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  {isVi ? 'Không có cuộc họp nào' : 'No meetings found'}
                </div>
              ) : (
                meetings.map((m) => (
                  <div key={m.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-bold text-slate-800">{m.title}</div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(m.startTime).toLocaleString('vi-VN')} • {m._count.attendees} {isVi ? 'người tham gia' : 'attendees'}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] font-bold text-slate-600">
                      {m.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: INFRASTRUCTURE & GEOFENCE */}
      {activeTab === 'infrastructure' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-2 font-bold text-xs">
                <Cpu className="w-4 h-4 text-blue-600" />
                <span>CPU Load (vCPU 8 Cores)</span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {overview?.systemHealth.cpuUsagePercent ?? 18}%
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-blue-600 h-full rounded-full"
                  style={{ width: `${overview?.systemHealth.cpuUsagePercent ?? 18}%` }}
                />
              </div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-2 font-bold text-xs">
                <Activity className="w-4 h-4 text-purple-600" />
                <span>Memory Heap Usage</span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {overview?.systemHealth.memoryUsagePercent ?? 42}%
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-purple-600 h-full rounded-full"
                  style={{ width: `${overview?.systemHealth.memoryUsagePercent ?? 42}%` }}
                />
              </div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-2 font-bold text-xs">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>Database Connection Pool</span>
              </div>
              <div className="text-2xl font-black text-slate-900">
                {overview?.systemHealth.dbConnectionsActive ?? 6} / {overview?.systemHealth.dbConnectionsMax ?? 100}
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-2">
                <div className="bg-emerald-600 h-full rounded-full" style={{ width: '6%' }} />
              </div>
            </div>

            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-2 text-slate-500 mb-2 font-bold text-xs">
                <MapPin className="w-4 h-4 text-rose-600" />
                <span>Geofence GPS Radius</span>
              </div>
              <div className="text-2xl font-black text-rose-600">
                {overview?.systemHealth.geofenceRadiusMeters ?? 100}m
              </div>
              <p className="text-[10px] text-slate-400 mt-2 font-medium">
                {isVi ? 'Đà Nẵng, Hà Nội, TP.HCM' : 'Danang, Hanoi, HCMC'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: ROLE SWITCHER MODAL */}
      {roleModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900">
                {isVi ? 'Phân quyền Vai trò (5 Roles)' : 'Modify User Role'}
              </h3>
            </div>

            <div className="mb-4">
              <p className="text-xs text-slate-500 font-medium mb-1">
                {isVi ? 'Thành viên được chọn:' : 'Selected user:'}
              </p>
              <div className="font-bold text-sm text-slate-900">{roleModalUser.name}</div>
              <div className="text-xs text-slate-400">{roleModalUser.email}</div>
            </div>

            <div className="space-y-2 mb-6">
              {[
                { role: 'ADMIN', title: 'ADMIN (Quản trị toàn năng)', desc: 'Toàn quyền cấu hình hệ thống, quản lý mọi user, phòng ban, dự án và báo cáo.' },
                { role: 'HR', title: 'HR (Quản trị Nhân sự)', desc: 'Quản lý chuyên cần, duyệt phép/WFH/OT toàn công ty, xuất file tính công lương.' },
                { role: 'DEPARTMENT_HEAD', title: 'DEPARTMENT_HEAD (Trưởng phòng)', desc: 'Giao việc nhanh, duyệt đơn cấp phòng, giám sát nhân sự phòng ban.' },
                { role: 'PM', title: 'PM (Quản lý Dự án)', desc: 'Tạo và quản lý dự án Scrum/Kanban, sprints, tasks, burndown và team members.' },
                { role: 'EMPLOYEE', title: 'EMPLOYEE (Nhân viên)', desc: 'Điểm danh GPS/IP trong 100m, gửi đơn WFH/OT/Về sớm, nhận việc và báo cáo.' },
              ].map((item) => (
                <label
                  key={item.role}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    selectedNewRole === item.role
                      ? 'border-indigo-600 bg-indigo-50/50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="roleSelection"
                    value={item.role}
                    checked={selectedNewRole === item.role}
                    onChange={(e) => setSelectedNewRole(e.target.value)}
                    className="mt-1 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <div className="font-bold text-xs text-slate-900">{item.title}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{item.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRoleModalUser(null)}
                className="px-4 h-9 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                {isVi ? 'Hủy' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={updatingRole}
                onClick={handleSaveRole}
                className="px-4 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm disabled:opacity-50"
              >
                {updatingRole ? (isVi ? 'Đang lưu...' : 'Saving...') : (isVi ? 'Lưu thay đổi' : 'Save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE DEPARTMENT MODAL */}
      {createDeptModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateDepartment}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Building2 className="w-4 h-4" />
              </span>
              <h3 className="text-base font-bold text-slate-900">
                {isVi ? 'Tạo Phòng Ban Mới' : 'Create New Department'}
              </h3>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isVi ? 'Tên phòng ban' : 'Department Name'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder={isVi ? 'VD: Ban Công Nghệ & AI' : 'e.g. AI & Cloud Engineering'}
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isVi ? 'Mã phòng ban (Code)' : 'Department Code'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: TECH_AI, FIN, HR_CORE"
                  value={newDeptCode}
                  onChange={(e) => setNewDeptCode(e.target.value)}
                  className="w-full h-9 px-3 text-xs uppercase font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isVi ? 'Mô tả nhiệm vụ' : 'Description'}
                </label>
                <textarea
                  rows={2}
                  placeholder={isVi ? 'Mô tả chức năng nhiệm vụ...' : 'Department scope and goals...'}
                  value={newDeptDesc}
                  onChange={(e) => setNewDeptDesc(e.target.value)}
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isVi ? 'Chỉ định Trưởng phòng (Manager)' : 'Appoint Department Head'}
                </label>
                <select
                  value={newDeptManagerId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewDeptManagerId(val);
                    // Remove from members if chosen as manager
                    setNewDeptMemberIds((prev) => prev.filter((id) => id !== val));
                  }}
                  className="w-full h-9 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white"
                >
                  <option value="">{isVi ? '-- Chưa chỉ định (Chọn sau) --' : '-- Not assigned (Select later) --'}</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.email}) — [{u.role}]
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isVi ? 'Gán nhân viên ban đầu vào phòng ban' : 'Assign Initial Members'}
                  {newDeptMemberIds.length > 0 && (
                    <span className="ml-2 font-normal text-indigo-600">
                      ({newDeptMemberIds.length} {isVi ? 'đã chọn' : 'selected'})
                    </span>
                  )}
                </label>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2 space-y-1.5 bg-slate-50/50">
                  {users
                    .filter((u) => u.id !== newDeptManagerId)
                    .map((u) => {
                      const isSelected = newDeptMemberIds.includes(u.id);
                      return (
                        <label
                          key={u.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white text-xs cursor-pointer select-none transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewDeptMemberIds((prev) => [...prev, u.id]);
                              } else {
                                setNewDeptMemberIds((prev) => prev.filter((id) => id !== u.id));
                              }
                            }}
                            className="w-3.5 h-3.5 text-indigo-600 rounded-sm border-slate-300"
                          />
                          <span className="font-semibold text-slate-800">{u.name}</span>
                          <span className="text-[11px] text-slate-400">({u.email})</span>
                          {u.department && (
                            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200/80 text-slate-600">
                              {u.department.name}
                            </span>
                          )}
                        </label>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setCreateDeptModal(false)}
                className="px-4 h-9 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                {isVi ? 'Hủy' : 'Cancel'}
              </button>
              <button
                type="submit"
                disabled={creatingDept}
                className="px-4 h-9 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm disabled:opacity-50"
              >
                {creatingDept ? (isVi ? 'Đang tạo...' : 'Creating...') : (isVi ? 'Tạo phòng ban' : 'Create')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
