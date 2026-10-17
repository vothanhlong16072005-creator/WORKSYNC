/**
 * DepartmentHeadDashboardLayout — M3.5 Enterprise Command Center
 *
 * Dashboard độc quyền dành cho Trưởng phòng (DEPARTMENT_HEAD):
 *  1. Header Command Ribbon: Lời chào buổi sáng, tên phòng ban, ngày giờ, nút + Tạo dự án & + Giao việc nhanh
 *  2. 6 Thẻ KPI chuẩn Bauhaus Modern Enterprise:
 *     - Nhân sự phòng ban & Tỷ lệ hiện diện
 *     - Dự án phòng ban đang hoạt động
 *     - Sprint đang Active trong phòng
 *     - Quick Task cần xử lý hôm nay & Cảnh báo quá hạn
 *     - Tỷ lệ hoàn thành On-track
 *     - Tỷ lệ có mặt tại văn phòng vs WFH
 *  3. Danh mục dự án phòng ban (Department Projects Portfolio):
 *     - Tên dự án, màu sắc nhận diện, mô tả yêu cầu do trưởng phòng đặt ra
 *     - Định hướng quy trình: Scrum (Sprint Agile) vs Kanban
 *     - Project Manager (PM) phụ trách: Avatar, Tên, Chức vụ
 *     - Tiến độ hoàn thành (Task counts & progress bar)
 *     - Trạng thái Active Sprint
 *     - Nút [Xem chi tiết], nút [+ Tạo dự án mới]
 *  4. Giám sát Sprint Real-time (Read-only Department Sprint Monitor):
 *     - Xem mục tiêu sprint, tiến độ task hoàn thành, ngày còn lại
 *     - Tỷ lệ story points, liên kết tới Kanban Board
 *  5. Tình trạng Hiện diện & Điểm danh phòng ban hôm nay (Live Capacity):
 *     - Số người tại văn phòng (In Office), WFH, nghỉ phép (Leave), chưa điểm danh
 *  6. Quick Tasks Feed (Công việc nhanh cần theo dõi):
 *     - Bộ lọc trạng thái trực quan (Tất cả, Cần làm, Đang làm, Hoàn thành)
 *     - Thẻ task với assignee, deadline, độ ưu tiên
 *  7. Bảng Tải công việc & Sự hiện diện nhân viên (Team Capacity & Workload Grid):
 *     - Avatar, tên, chức danh, trạng thái chấm công hôm nay
 *     - Số task đang mở, số task quá hạn, nút "⚡ Giao việc" nhanh
 *
 * Design System: Bauhaus Modern SaaS (rounded-2xl, border-slate-200/80, shadow-sm, vibrant enterprise accents)
 */
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Users,
  FolderKanban,
  Zap,
  Plus,
  Building2,
  TrendingUp,
  Clock,
  Flame,
  ArrowUpRight,
  Calendar,
  ShieldCheck,
  MapPin,
  Laptop,
} from 'lucide-react';
import { useProjectStore } from '@/stores/project.store';
import { useQuickTaskStore } from '@/features/quick-tasks/stores/quick-task.store';
import { QuickTaskModal } from '@/features/quick-tasks/components/QuickTaskModal';
import { CreateProjectModal } from '@/features/projects/components/CreateProjectModal';
import { EnterpriseFooter } from '../widgets/EnterpriseFooter';
import { AttendanceDetailModal, type AttendanceTab } from '../widgets/AttendanceDetailModal';
import { DepartmentAnalyticsCharts } from '../widgets/DepartmentAnalyticsCharts';
import { apiClient } from '@/lib/api-client';
import { getErrorMessage } from '@/features/attendance/utils/error-handler';
import type { DepartmentHeadDashboardData } from '../../types/dashboard.types';

interface DepartmentHeadLayoutProps {
  userName: string;
  initialData?: DepartmentHeadDashboardData | null;
}

export function DepartmentHeadDashboardLayout({ userName, initialData }: DepartmentHeadLayoutProps) {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  // Stores
  const { loadMine } = useProjectStore();
  const { loadStats, state: qtState, loadAll } = useQuickTaskStore();

  // Modals
  const [createProjectOpen, setCreateProjectOpen] = useState(false);
  const [quickTaskOpen, setQuickTaskOpen] = useState(false);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string | undefined>(undefined);
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [attendanceModalTab, setAttendanceModalTab] = useState<AttendanceTab>('IN_OFFICE');

  // Dashboard backend data
  const [dashboardData, setDashboardData] = useState<DepartmentHeadDashboardData | null>(
    initialData ?? null,
  );
  const [loading, setLoading] = useState(!initialData);
  const [quickTaskFilter, setQuickTaskFilter] = useState<'ALL' | 'TODO' | 'IN_PROGRESS' | 'DONE'>('ALL');

  // Fetch full department head dashboard data
  const loadDashboard = async () => {
    try {
      const res = await apiClient.get<{ success: boolean; data: DepartmentHeadDashboardData }>(
        '/dashboard/department-head',
      );
      if (res.data?.data) {
        setDashboardData(res.data.data);
      }
    } catch (err: unknown) {
      // Fallback to /dashboard/me
      try {
        const fallback = await apiClient.get<{ success: boolean; data: DepartmentHeadDashboardData }>(
          '/dashboard/me',
        );
        if (fallback.data?.data) {
          setDashboardData(fallback.data.data);
        }
      } catch (e: unknown) {
        console.error('Failed to load department dashboard:', getErrorMessage(e, 'Lỗi'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
    void loadMine();
    void loadStats();
    void loadAll();
  }, [loadMine, loadStats, loadAll]);

  const departmentName = dashboardData?.department?.name || (isVi ? 'Phòng Kỹ thuật Phần mềm' : 'Software Engineering');
  const metrics = dashboardData?.metrics;
  const attendance = dashboardData?.attendanceSummary;
  const deptProjects = dashboardData?.projects || [];
  const activeSprints = dashboardData?.activeSprints || [];
  const teamWorkload = dashboardData?.teamWorkload || [];
  const quickTasks = qtState.status === 'success' ? qtState.data : dashboardData?.quickTasks || [];

  // Filtered quick tasks
  const filteredQuickTasks = useMemo(() => {
    if (quickTaskFilter === 'ALL') return quickTasks;
    return quickTasks.filter((t) => t.status === quickTaskFilter);
  }, [quickTasks, quickTaskFilter]);

  const handleQuickAssignToUser = (userId: string) => {
    setSelectedAssigneeId(userId);
    setQuickTaskOpen(true);
  };

  const handleOpenGeneralQuickTask = () => {
    setSelectedAssigneeId(undefined);
    setQuickTaskOpen(true);
  };

  const handleOpenAttendanceModal = (tab: AttendanceTab) => {
    setAttendanceModalTab(tab);
    setAttendanceModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* 1. Hero Banner với định danh Trưởng Phòng & Bauhaus Character Artwork */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white p-6 sm:p-8 shadow-xl overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-32 -mb-16 w-60 h-60 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold tracking-wide">
              <Building2 className="w-3.5 h-3.5" />
              <span>{departmentName}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
              {isVi ? `Chào buổi sáng, ${userName}!` : `Good morning, ${userName}!`}
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              {isVi
                ? `Trung tâm chỉ huy phòng ban: Quản lý ${metrics?.totalMembers ?? teamWorkload.length} nhân sự, giám sát ${deptProjects.length} dự án & điều phối năng lực thực thi.`
                : `Department Control Center: Managing ${metrics?.totalMembers ?? teamWorkload.length} members, monitoring ${deptProjects.length} projects & coordinating capacity.`}
            </p>
          </div>

          {/* Center: Bauhaus Character Artwork + Colored Chips */}
          <div className="hidden xl:flex items-center gap-4 shrink-0 px-2">
            <img
              src="/hero-illustration.png"
              alt="WorkSync Team Balance Artwork"
              className="h-28 sm:h-32 object-contain drop-shadow-lg"
            />
            {/* Subtle Bauhaus geometric accent palette */}
            <div className="grid grid-cols-2 gap-1.5 p-1.5 rounded-xl bg-white/10 backdrop-blur border border-white/20">
              <div className="w-4 h-4 rounded-md bg-[#D97706]" title="Amber Ochre" />
              <div className="w-4 h-4 rounded-md bg-[#2563EB]" title="Cobalt Blue" />
              <div className="w-4 h-4 rounded-md bg-[#DC2626]" title="Terracotta Red" />
              <div className="w-4 h-4 rounded-md bg-[#10B981]" title="Emerald Green" />
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setCreateProjectOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              {isVi ? 'Tạo dự án & Gán PM' : '+ Create Project'}
            </button>

            <button
              type="button"
              onClick={handleOpenGeneralQuickTask}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/20 text-white font-black text-xs sm:text-sm backdrop-blur transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Zap className="w-4 h-4 text-amber-400" strokeWidth={2.5} />
              {isVi ? 'Giao việc nhanh' : 'Quick Task'}
            </button>
          </div>
        </div>
      </div>

      {/* 2. 6 KPI Ribbon Tiles — Màu sắc phân hóa sống động */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <KpiCard
          label={isVi ? 'Quân số phòng' : 'Department Team'}
          value={metrics?.totalMembers ?? teamWorkload.length}
          subtext={isVi ? `${attendance?.inOffice ?? 0} tại VP, ${attendance?.wfh ?? 0} WFH` : 'Active members'}
          icon={Users}
          color="text-blue-700 bg-blue-100/80 border-blue-200"
          bgGradient="from-blue-50/80 to-white"
          borderColor="border-blue-200/80"
          loading={loading}
        />
        <KpiCard
          label={isVi ? 'Dự án đang chạy' : 'Active Projects'}
          value={metrics?.activeProjects ?? deptProjects.length}
          subtext={isVi ? 'Thuộc phòng ban' : 'Managed projects'}
          icon={FolderKanban}
          color="text-indigo-700 bg-indigo-100/80 border-indigo-200"
          bgGradient="from-indigo-50/80 to-white"
          borderColor="border-indigo-200/80"
          loading={loading}
        />
        <KpiCard
          label={isVi ? 'Sprint đang Active' : 'Active Sprints'}
          value={metrics?.activeSprints ?? activeSprints.length}
          subtext={isVi ? 'Chu kỳ 2 tuần' : 'Scrum iterations'}
          icon={Flame}
          color="text-amber-700 bg-amber-100/80 border-amber-200"
          bgGradient="from-amber-50/80 to-white"
          borderColor="border-amber-200/80"
          loading={loading}
        />
        <KpiCard
          label={isVi ? 'Quick Task hôm nay' : 'Quick Tasks Today'}
          value={metrics?.quickTasksToday ?? 0}
          subtext={
            (metrics?.quickTasksOverdue ?? 0) > 0
              ? `${metrics?.quickTasksOverdue} quá hạn`
              : isVi ? 'Đúng tiến độ' : 'On track'
          }
          isWarning={(metrics?.quickTasksOverdue ?? 0) > 0}
          icon={Zap}
          color="text-emerald-700 bg-emerald-100/80 border-emerald-200"
          bgGradient="from-emerald-50/80 to-white"
          borderColor="border-emerald-200/80"
          loading={loading}
        />
        <KpiCard
          label={isVi ? 'Tiến độ On-track' : 'On-track Rate'}
          value={`${metrics?.onTrackPercent ?? 92}%`}
          subtext={isVi ? 'Chỉ số tin cậy' : 'Reliability score'}
          icon={TrendingUp}
          color="text-purple-700 bg-purple-100/80 border-purple-200"
          bgGradient="from-purple-50/80 to-white"
          borderColor="border-purple-200/80"
          loading={loading}
        />
        <KpiCard
          label={isVi ? 'Hiện diện hôm nay' : 'Attendance Rate'}
          value={`${metrics?.attendanceRate ?? 85}%`}
          subtext={isVi ? 'Điểm danh đạt chuẩn' : 'Check-in compliant'}
          icon={ShieldCheck}
          color="text-teal-700 bg-teal-100/80 border-teal-200"
          bgGradient="from-teal-50/80 to-white"
          borderColor="border-teal-200/80"
          loading={loading}
        />
      </div>

      {/* 3. Lưới Biểu Đồ Phân Tích & Tiến Độ Phòng Ban (Department Analytics & Progress Charts) */}
      <DepartmentAnalyticsCharts
        projects={deptProjects}
        attendance={attendance}
        onTrackPercent={metrics?.onTrackPercent}
      />

      {/* 4. Khối chính: Dự án phòng mình (Trái) & Giám sát Sprint + Điểm danh (Phải) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CỘT TRÁI (7 cols): Dự án phòng ban (Department Projects Portfolio) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-indigo-100 shadow-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" />
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FolderKanban className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    {isVi ? 'Dự Án Phòng Ban Quản Lý' : 'Department Project Portfolio'}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {isVi
                      ? 'Trưởng phòng giao mục tiêu & chỉ định PM; PM điều phối chi tiết'
                      : 'High-level governance & PM assignment'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCreateProjectOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {isVi ? 'Tạo dự án mới' : 'New Project'}
              </button>
            </div>

            {/* Project List */}
            {deptProjects.length === 0 ? (
              <div className="py-12 text-center">
                <FolderKanban className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-700">
                  {isVi ? 'Chưa có dự án nào trong phòng ban' : 'No projects yet'}
                </h3>
                <p className="text-xs text-slate-500 mt-1 mb-4 max-w-sm mx-auto">
                  {isVi
                    ? 'Hãy tạo dự án đầu tiên, chỉ định Project Manager và nêu rõ yêu cầu để team bắt đầu thực thi.'
                    : 'Create your first department project, assign a PM and set the sprint direction.'}
                </p>
                <button
                  type="button"
                  onClick={() => setCreateProjectOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-sm hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {isVi ? 'Tạo dự án ngay' : 'Create project now'}
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {deptProjects.map((proj) => {
                  const isScrum = proj.workflowType === 'SCRUM';
                  return (
                    <div
                      key={proj.id}
                      className="group p-4 rounded-2xl border border-slate-200/90 hover:border-blue-400 hover:shadow-md transition-all bg-slate-50/80 hover:bg-white"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className="w-3 h-3 rounded-md mt-1 shrink-0"
                            style={{ backgroundColor: proj.color || '#3B82F6' }}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                                {proj.name}
                              </h3>
                              <span
                                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                                  isScrum
                                    ? 'bg-blue-100 text-blue-700'
                                    : 'bg-indigo-100 text-indigo-700'
                                }`}
                              >
                                {isScrum ? '🚀 Scrum / Sprint' : '📋 Kanban Board'}
                              </span>
                              <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                {proj.status}
                              </span>
                            </div>

                            {proj.description && (
                              <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                                {proj.description}
                              </p>
                            )}

                            {/* PM in charge & Member count */}
                            <div className="flex items-center gap-4 mt-3 text-xs text-slate-500 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                {proj.pm?.avatar ? (
                                  <img
                                    src={proj.pm.avatar}
                                    alt={proj.pm.name}
                                    className="w-5 h-5 rounded-full object-cover border border-slate-200"
                                  />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-black text-[9px] flex items-center justify-center">
                                    {(proj.pm?.name || 'P').charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span className="font-bold text-slate-700">
                                  PM: {proj.pm?.name || (isVi ? 'Chưa chỉ định' : 'Unassigned')}
                                </span>
                              </div>

                              <div className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                <span>{proj.memberCount} {isVi ? 'nhân sự' : 'members'}</span>
                              </div>

                              {proj.activeSprint && (
                                <div className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-bold text-[10px]">
                                  <Flame className="w-3 h-3 text-amber-500" />
                                  <span>{proj.activeSprint.name}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right: Progress & Link */}
                        <div className="text-right shrink-0">
                          <div className="text-xs font-black text-slate-900 tabular-nums">
                            {proj.progressPercent}%
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {proj.taskCounts.done}/{proj.taskCounts.total} task
                          </div>
                          <Link
                            to={`/projects/${proj.id}/tasks`}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 mt-2 transition-colors"
                          >
                            <span>{isVi ? 'Bảng việc' : 'Board'}</span>
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${proj.progressPercent}%`,
                            backgroundColor: proj.color || '#3B82F6',
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Tasks Feed cần theo dõi — Gọn gàng, màu sắc phân biệt */}
          <div className="bg-gradient-to-br from-amber-50/40 via-slate-50/60 to-white rounded-3xl border border-amber-200/80 p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600" />
            <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-black text-slate-900">
                    {isVi ? 'Quick Task Giao Trực Tiếp' : 'Direct Quick Tasks'}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    {isVi ? 'Giao việc nhanh không qua sprint (Top 3 task gần nhất)' : 'Instant tasks (Top 3 recent)'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleOpenGeneralQuickTask}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Giao việc' : 'Assign'}</span>
                </button>
                <Link
                  to="/quick-tasks"
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  <span>{isVi ? 'Xem trang riêng' : 'Full Page'}</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Status Filter Tabs */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-1 text-[11px] font-bold mb-3 overflow-x-auto">
              {(['ALL', 'TODO', 'IN_PROGRESS', 'DONE'] as const).map((tab) => {
                const count =
                  tab === 'ALL'
                    ? quickTasks.length
                    : quickTasks.filter((t) => t.status === tab).length;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setQuickTaskFilter(tab)}
                    className={`px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1.5 shrink-0 ${
                      quickTaskFilter === tab
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>
                      {tab === 'ALL'
                        ? isVi ? 'Tất cả' : 'All'
                        : tab === 'TODO'
                        ? isVi ? 'Cần làm' : 'Todo'
                        : tab === 'IN_PROGRESS'
                        ? isVi ? 'Đang làm' : 'In Prog'
                        : isVi ? 'Xong' : 'Done'}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        quickTaskFilter === tab
                          ? 'bg-amber-100 text-amber-800 font-black'
                          : 'bg-slate-200/80 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Quick Task List — High-Density Compact Layout */}
            {filteredQuickTasks.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                {isVi ? 'Không có Quick Task nào trong mục này' : 'No quick tasks found'}
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredQuickTasks.slice(0, 3).map((task) => {
                  const isDone = task.status === 'DONE';
                  const isOverdue = !isDone && new Date(task.dueDate) < new Date();
                  return (
                    <div
                      key={task.id}
                      className="group p-3 rounded-2xl border border-slate-200/80 hover:border-amber-300 hover:shadow-xs transition-all bg-white flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Assignee Avatar */}
                        {task.assignee?.avatar ? (
                          <img
                            src={task.assignee.avatar}
                            alt={task.assignee.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-800 font-black text-xs flex items-center justify-center shrink-0">
                            {(task.assignee?.name || 'U').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-slate-900 group-hover:text-amber-700 transition-colors truncate max-w-[200px] sm:max-w-xs">
                              {task.title}
                            </span>
                            {task.project && (
                              <span
                                className="text-[9px] font-bold px-1.5 py-0.5 rounded-md truncate max-w-[120px]"
                                style={{
                                  backgroundColor: `${task.project.color}15`,
                                  color: task.project.color,
                                }}
                              >
                                {task.project.name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5 flex-wrap">
                            <span className="font-semibold text-slate-600 truncate">{task.assignee?.name}</span>
                            <span>•</span>
                            <span className={isOverdue ? 'font-bold text-rose-600' : 'text-slate-500'}>
                              {isOverdue ? (isVi ? 'Quá hạn: ' : 'Overdue: ') : (isVi ? 'Hạn chót: ' : 'Due: ')}
                              {new Date(task.dueDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full ${
                            task.status === 'DONE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : task.status === 'IN_PROGRESS'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {task.status === 'DONE'
                            ? isVi ? 'Xong' : 'Done'
                            : task.status === 'IN_PROGRESS'
                            ? isVi ? 'Đang làm' : 'In Prog'
                            : isVi ? 'Cần làm' : 'Todo'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-3.5 mt-3.5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {isVi
                  ? `Đang hiển thị ${Math.min(3, filteredQuickTasks.length)} / ${filteredQuickTasks.length} task`
                  : `Showing ${Math.min(3, filteredQuickTasks.length)} of ${filteredQuickTasks.length}`}
              </span>
              <Link
                to="/quick-tasks"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors inline-flex items-center gap-1"
              >
                {isVi ? 'Mở toàn bộ danh sách Quick Tasks →' : 'View all Quick Tasks →'}
              </Link>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (5 cols): Giám sát Sprint + Điểm danh & Hiện diện */}
        <div className="lg:col-span-5 space-y-6">
          {/* Card 1: Giám sát Sprint Real-time (Read-only) */}
          <div className="bg-gradient-to-br from-orange-50/50 via-amber-50/20 to-white rounded-3xl border border-orange-200/80 p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500" />
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-100 text-orange-700 flex items-center justify-center">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {isVi ? 'Giám Sát Sprint (Real-time)' : 'Active Sprint Monitor'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isVi ? 'Giám sát tiến độ sprint (Read-only)' : 'Read-only sprint oversight'}
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-orange-700 bg-orange-100 px-2.5 py-0.5 rounded-full border border-orange-200">
                {activeSprints.length} {isVi ? 'Active' : 'Running'}
              </span>
            </div>

            {activeSprints.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                <Flame className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                {isVi ? 'Không có Sprint nào đang chạy trong phòng' : 'No active sprints running'}
              </div>
            ) : (
              <div className="space-y-4">
                {activeSprints.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-2xl bg-gradient-to-br from-slate-50 to-orange-50/30 border border-slate-200/80 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: s.projectColor || '#3B82F6' }}
                          />
                          <span className="text-[11px] font-bold text-slate-600">
                            {s.projectName}
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-slate-900 mt-0.5">{s.name}</h4>
                        {s.goal && (
                          <p className="text-[11px] text-slate-500 mt-1 italic">
                            &ldquo;{s.goal}&rdquo;
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-black text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                          {isVi ? `Còn ${s.daysRemaining} ngày` : `${s.daysRemaining}d left`}
                        </span>
                      </div>
                    </div>

                    {/* Progress */}
                    <div>
                      <div className="flex items-center justify-between text-xs font-bold mb-1">
                        <span className="text-slate-600">
                          {isVi ? 'Tiến độ hoàn thành' : 'Completion'}: {s.doneTasks}/{s.totalTasks} task
                        </span>
                        <span className="text-orange-700 tabular-nums">{s.progressPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-full transition-all duration-500"
                          style={{ width: `${s.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        {s.pmAvatar ? (
                          <img
                            src={s.pmAvatar}
                            alt={s.pmName}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold text-[8px] flex items-center justify-center">
                            {s.pmName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-[11px] font-semibold">{s.pmName}</span>
                      </div>

                      <Link
                        to={`/projects/${s.projectId}/tasks`}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                      >
                        {isVi ? 'Mở Kanban Board' : 'Open Board'}
                        <ArrowUpRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 2: Hiện diện & Công suất phòng ban hôm nay (Live Attendance) */}
          <div className="bg-gradient-to-br from-teal-50/50 via-blue-50/20 to-white rounded-3xl border border-teal-200/80 p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-blue-500 to-indigo-500" />
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">
                    {isVi ? 'Hiện Diện Phòng Ban Hôm Nay' : 'Team Live Attendance'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    {isVi ? 'Tình hình chấm công GPS & WFH theo thời gian thực' : 'Real-time presence tracking'}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* 1. Tại văn phòng */}
              <button
                type="button"
                onClick={() => handleOpenAttendanceModal('IN_OFFICE')}
                className="group p-3.5 rounded-2xl bg-blue-50/70 border border-blue-100 hover:border-blue-400 hover:shadow-md transition-all text-left relative overflow-hidden"
              >
                <div className="flex items-center justify-between text-blue-700 mb-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-wider">
                      {isVi ? 'Tại văn phòng' : 'In Office'}
                    </span>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <div className="text-2xl font-black text-blue-900 tabular-nums">
                  {attendance?.inOffice ?? 0}
                </div>
                <div className="text-[10px] text-blue-600 font-bold mt-0.5 flex items-center justify-between">
                  <span>{isVi ? 'Đã check-in GPS/WiFi' : 'Verified on-site'}</span>
                  <span className="text-blue-700 underline underline-offset-2 opacity-80 group-hover:opacity-100">
                    {isVi ? 'Xem danh sách' : 'View list'}
                  </span>
                </div>
              </button>

              {/* 2. WFH */}
              <button
                type="button"
                onClick={() => handleOpenAttendanceModal('WFH')}
                className="group p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-100 hover:border-indigo-400 hover:shadow-md transition-all text-left relative overflow-hidden"
              >
                <div className="flex items-center justify-between text-indigo-700 mb-1">
                  <div className="flex items-center gap-1.5">
                    <Laptop className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-wider">WFH</span>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <div className="text-2xl font-black text-indigo-900 tabular-nums">
                  {attendance?.wfh ?? 0}
                </div>
                <div className="text-[10px] text-indigo-600 font-bold mt-0.5 flex items-center justify-between">
                  <span>{isVi ? 'Đã duyệt làm từ xa' : 'Approved remote'}</span>
                  <span className="text-indigo-700 underline underline-offset-2 opacity-80 group-hover:opacity-100">
                    {isVi ? 'Xem đơn WFH' : 'View requests'}
                  </span>
                </div>
              </button>

              {/* 3. Nghỉ phép */}
              <button
                type="button"
                onClick={() => handleOpenAttendanceModal('LEAVE')}
                className="group p-3.5 rounded-2xl bg-amber-50/70 border border-amber-100 hover:border-amber-400 hover:shadow-md transition-all text-left relative overflow-hidden"
              >
                <div className="flex items-center justify-between text-amber-700 mb-1">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-wider">
                      {isVi ? 'Nghỉ phép' : 'On Leave'}
                    </span>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <div className="text-2xl font-black text-amber-900 tabular-nums">
                  {attendance?.leave ?? 0}
                </div>
                <div className="text-[10px] text-amber-600 font-bold mt-0.5 flex items-center justify-between">
                  <span>{isVi ? 'Có phép / Vắng mặt' : 'Approved leave'}</span>
                  <span className="text-amber-700 underline underline-offset-2 opacity-80 group-hover:opacity-100">
                    {isVi ? 'Xem đơn nghỉ' : 'View leave'}
                  </span>
                </div>
              </button>

              {/* 4. Chưa điểm danh */}
              <button
                type="button"
                onClick={() => handleOpenAttendanceModal('NOT_CHECKED_IN')}
                className="group p-3.5 rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-400 hover:shadow-md transition-all text-left relative overflow-hidden"
              >
                <div className="flex items-center justify-between text-slate-700 mb-1">
                  <div className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4" />
                    <span className="text-xs font-black uppercase tracking-wider">
                      {isVi ? 'Chưa điểm danh' : 'Pending'}
                    </span>
                  </div>
                  <ArrowUpRight className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                </div>
                <div className="text-2xl font-black text-slate-900 tabular-nums">
                  {attendance?.notCheckedIn ?? 0}
                </div>
                <div className="text-[10px] text-slate-500 font-bold mt-0.5 flex items-center justify-between">
                  <span>{isVi ? 'Chờ check-in' : 'Awaiting check-in'}</span>
                  <span className="text-slate-700 underline underline-offset-2 opacity-80 group-hover:opacity-100">
                    {isVi ? 'Kiểm tra' : 'Audit'}
                  </span>
                </div>
              </button>
            </div>

            <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {isVi ? 'Bấm vào từng ô để xem chi tiết danh sách' : 'Click any card to inspect members'}
              </span>
              <Link
                to="/attendance"
                className="text-xs font-bold text-teal-700 hover:text-teal-800 transition-colors inline-flex items-center gap-1"
              >
                {isVi ? 'Trang chấm công chi tiết →' : 'Detailed attendance →'}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* 5. Team Workload & Member Capacity Grid — Canvas Slate phân cách */}
      <div className="bg-gradient-to-b from-slate-50/90 to-slate-100/50 rounded-3xl border border-slate-200/90 p-6 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-blue-500 to-teal-500" />
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">
                {isVi ? 'Tải Công Việc & Hiện Diện Nhân Viên Phòng Ban' : 'Team Workload & Capacity'}
              </h2>
              <p className="text-[11px] text-slate-500">
                {isVi
                  ? `Quản lý ${teamWorkload.length} nhân sự: Theo dõi task mở, cảnh báo quá hạn và giao việc tức thì`
                  : 'Track member capacity, overdue warnings, and assign tasks directly'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenGeneralQuickTask}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            {isVi ? 'Giao việc mới' : 'Assign Task'}
          </button>
        </div>

        {teamWorkload.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            {isVi ? 'Chưa có nhân viên nào trong phòng ban' : 'No team members in this department'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {teamWorkload.map((m) => {
              const isOverdue = m.overdueTasks > 0;
              const isWfh = m.attendanceStatus === 'WFH';
              const isInOffice =
                m.attendanceStatus === 'ON_TIME' || m.attendanceStatus === 'LATE';

              return (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl border border-slate-200/80 hover:border-blue-300 hover:shadow-md transition-all bg-white flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* User Profile + Attendance Status badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {m.avatar ? (
                          <img
                            src={m.avatar}
                            alt={m.name}
                            className="w-10 h-10 rounded-2xl object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-black text-slate-900 truncate">{m.name}</h4>
                          <p className="text-[10px] text-slate-500 truncate">
                            {m.position || m.role}
                          </p>
                        </div>
                      </div>

                      {/* Attendance indicator */}
                      <span
                        className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                          isInOffice
                            ? 'bg-blue-100 text-blue-700'
                            : isWfh
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {isInOffice
                          ? 'Văn phòng'
                          : isWfh
                          ? 'WFH'
                          : isVi ? 'Chưa vào' : 'Pending'}
                      </span>
                    </div>

                    {/* Task Counts Ribbon */}
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-100">
                        <div className="text-[9px] font-black uppercase tracking-wider text-blue-600">
                          {isVi ? 'Đang mở' : 'Open'}
                        </div>
                        <div className="text-lg font-black text-blue-900 tabular-nums">
                          {m.openTasks}
                        </div>
                      </div>

                      <div
                        className={`p-2 rounded-xl border ${
                          isOverdue
                            ? 'bg-rose-50 border-rose-200'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div
                          className={`text-[9px] font-black uppercase tracking-wider ${
                            isOverdue ? 'text-rose-600' : 'text-slate-500'
                          }`}
                        >
                          {isVi ? 'Quá hạn' : 'Overdue'}
                        </div>
                        <div
                          className={`text-lg font-black tabular-nums ${
                            isOverdue ? 'text-rose-700' : 'text-slate-700'
                          }`}
                        >
                          {m.overdueTasks}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Button for this member */}
                  <div className="pt-3 mt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleQuickAssignToUser(m.id)}
                      className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold transition-colors"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      {isVi ? 'Giao việc cho người này' : 'Assign to member'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <EnterpriseFooter />

      {/* Modals */}
      <CreateProjectModal
        isOpen={createProjectOpen}
        onClose={() => setCreateProjectOpen(false)}
        onSuccess={() => {
          void loadDashboard();
          void loadMine();
        }}
        departmentId={dashboardData?.department?.id}
      />

      <QuickTaskModal
        isOpen={quickTaskOpen}
        onClose={() => setQuickTaskOpen(false)}
        preselectedAssigneeId={selectedAssigneeId}
      />

      <AttendanceDetailModal
        isOpen={attendanceModalOpen}
        onClose={() => setAttendanceModalOpen(false)}
        initialTab={attendanceModalTab}
        details={attendance?.details}
        counts={{
          inOffice: attendance?.inOffice ?? 0,
          wfh: attendance?.wfh ?? 0,
          leave: attendance?.leave ?? 0,
          notCheckedIn: attendance?.notCheckedIn ?? 0,
        }}
      />
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: number | string;
  subtext?: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgGradient?: string;
  borderColor?: string;
  loading?: boolean;
  isWarning?: boolean;
}

function KpiCard({
  label,
  value,
  subtext,
  icon: Icon,
  color,
  bgGradient = 'from-white to-white',
  borderColor = 'border-slate-200/80',
  loading,
  isWarning,
}: KpiCardProps) {
  return (
    <div
      className={`rounded-2xl border p-4 shadow-sm hover:shadow-md transition-all bg-gradient-to-br ${bgGradient} ${borderColor}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center border shadow-2xs ${color}`}>
          <Icon className="w-4 h-4" />
        </div>
        {isWarning && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
        )}
      </div>
      <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 truncate">
        {label}
      </div>
      <div className="text-2xl font-black text-slate-900 tabular-nums mt-0.5">
        {loading ? '—' : value}
      </div>
      {subtext && (
        <div className={`text-[10px] mt-1 font-semibold truncate ${isWarning ? 'text-rose-600' : 'text-slate-500'}`}>
          {subtext}
        </div>
      )}
    </div>
  );
}
