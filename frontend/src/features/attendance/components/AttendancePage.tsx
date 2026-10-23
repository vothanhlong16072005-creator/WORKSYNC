import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CalendarClock,
  Clock,
  History,
  FileCheck2,
  Users2,
  Calendar as CalendarIcon,
  BarChart3,
  Coffee,
  Sparkles,
  UserCheck,
  Users,
  Home,
  Shield,
  FileText,
  Plus,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore, type UserRole } from '@/stores/auth.store';
import { useAttendanceStore } from '../stores/attendance.store';
import { attendanceApi } from '../api/attendance.api';
import { TodayStatusBanner } from './TodayStatusBanner';
import { LeaveBalanceCard } from './LeaveBalanceCard';
import { GeofenceMapCard } from './GeofenceMapCard';
import { MyHistoryTable } from './MyHistoryTable';
import { MyRequestsList } from './MyRequestsList';
import { ApprovalQueueView } from './ApprovalQueueView';
import { WfhRequestModal } from './WfhRequestModal';
import { LeaveRequestModal } from './LeaveRequestModal';
import { TodayTimeline } from './TodayTimeline';
import { CalendarHeatmapView } from './CalendarHeatmapView';
import { StatsSummaryView } from './StatsSummaryView';
import { ExportButton } from './ExportButton';
import { EarlyLeaveRequestModal } from './EarlyLeaveRequestModal';
import { OvertimeRequestModal } from './OvertimeRequestModal';
import { ShiftPolicyCard } from './ShiftPolicyCard';
import { TeamPresencePulse } from './TeamPresencePulse';
import { AttendanceTeamView } from './AttendanceTeamView';
import { AttendanceCompanyView } from './AttendanceCompanyView';
import { AttendanceSettingsView } from './AttendanceSettingsView';
import { EnterpriseFooter } from '@/features/dashboard/components/widgets/EnterpriseFooter';
import { PermissionGuard } from '@/components/layout/PermissionGuard';
import { DailyReportModal } from '@/features/daily-reports/components/DailyReportModal';
import { MyDailyReportsList } from '@/features/daily-reports/components/MyDailyReportsList';
import { DailyReportTeamView } from '@/features/daily-reports/components/DailyReportTeamView';

type TabKey =
  | 'today'
  | 'heatmap'
  | 'stats'
  | 'history'
  | 'my-requests'
  | 'daily-reports'
  | 'team'
  | 'company'
  | 'settings'
  | 'approvals';

export function AttendancePage() {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  const { user } = useAuthStore();
  const userRole = (user?.role || 'EMPLOYEE') as UserRole;
  const isDepartmentHead = userRole === 'DEPARTMENT_HEAD';
  const isApprover = userRole === 'ADMIN' || userRole === 'HR' || userRole === 'DEPARTMENT_HEAD';
  const isHr = userRole === 'HR';
  const isAdmin = userRole === 'ADMIN';
  const isPm = userRole === 'PM';
  const isManagerOrAdmin = isApprover || isPm;

  // Default initial active tab
  const getInitialTab = (): TabKey => {
    if (userRole === 'ADMIN') return 'settings';
    if (userRole === 'HR' || userRole === 'DEPARTMENT_HEAD') return 'approvals';
    if (userRole === 'PM') return 'team';
    return 'today';
  };

  const [activeTab, setActiveTab] = useState<TabKey>(getInitialTab);

  // Sync initial tab when role changes
  useEffect(() => {
    if (userRole === 'ADMIN') {
      setActiveTab('settings');
    } else if (userRole === 'HR' || userRole === 'DEPARTMENT_HEAD') {
      setActiveTab('approvals');
    } else if (userRole === 'PM') {
      setActiveTab('team');
    } else {
      setActiveTab('today');
    }
  }, [userRole]);

  const [companySummary, setCompanySummary] = useState({
    totalEmployees: 12,
    presentToday: 0,
    onLeaveAndWfh: 0,
    onTimeRate: '100%',
  });

  useEffect(() => {
    if (isHr || isAdmin) {
      attendanceApi
        .getCompanyAttendance()
        .then((res) => {
          if (res?.summary) {
            const total = res.summary.totalEmployees;
            const present = res.summary.onTime + res.summary.late;
            const leaveWfh = res.summary.wfh + res.summary.absentApproved;
            const rate = present > 0 ? `${Math.round((res.summary.onTime / present) * 100)}%` : '100%';
            setCompanySummary({
              totalEmployees: total,
              presentToday: present,
              onLeaveAndWfh: leaveWfh,
              onTimeRate: rate,
            });
          }
        })
        .catch(() => {});
    }
  }, [isHr, isAdmin, activeTab]);

  const [isWfhModalOpen, setIsWfhModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isEarlyLeaveModalOpen, setIsEarlyLeaveModalOpen] = useState(false);
  const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState(false);
  const [isBreakActive, setIsBreakActive] = useState(false);
  const [isBreakLoading, setIsBreakLoading] = useState(false);
  const [isDailyReportModalOpen, setIsDailyReportModalOpen] = useState(false);
  const [dailyReportSubTab, setDailyReportSubTab] = useState<'mine' | 'team'>('mine');

  const {
    todayRecord,
    leaveBalance,
    history,
    myWfh,
    myLeaves,
    pendingWfh,
    pendingLeaves,
    config,
    isLoading,
    fetchToday,
    fetchLeaveBalance,
    fetchHistory,
    fetchMyRequests,
    fetchPendingApprovals,
  } = useAttendanceStore();

  useEffect(() => {
    fetchToday();
    fetchLeaveBalance();
    fetchHistory();
    fetchMyRequests();
    if (isApprover) {
      fetchPendingApprovals();
    }
  }, [fetchToday, fetchLeaveBalance, fetchHistory, fetchMyRequests, fetchPendingApprovals, isApprover]);

  // Check today's break status on mount
  useEffect(() => {
    attendanceApi
      .getTodayBreaks()
      .then((breaks) => {
        if (Array.isArray(breaks)) {
          const hasOpen = (breaks as Array<{ endTime?: string | null }>).some((b) => !b.endTime);
          setIsBreakActive(hasOpen);
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleBreak = async () => {
    setIsBreakLoading(true);
    try {
      if (isBreakActive) {
        await attendanceApi.endBreak();
        setIsBreakActive(false);
        toast.success(isVi ? 'Đã kết thúc giờ nghỉ giải lao' : 'Break ended successfully');
      } else {
        await attendanceApi.startBreak('Tạm ra ngoài giải quyết việc riêng');
        setIsBreakActive(true);
        toast.info(isVi ? 'Đã bắt đầu giờ nghỉ giải lao / tạm ra ngoài' : 'Break started');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Lỗi thao tác nghỉ';
      toast.error(msg);
    } finally {
      setIsBreakLoading(false);
    }
  };

  const totalPending = pendingWfh.length + pendingLeaves.length;

  return (
    <div className="space-y-8">
      {/* Header with Signature Bauhaus Color Palette Accents */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {/* Bauhaus 4-color geometric accent bar */}
          <div className="flex items-center gap-1.5 mb-2">
            <div className="h-1.5 w-6 rounded-full bg-blue-600" title="Cobalt Royal Blue" />
            <div className="h-1.5 w-3 rounded-full bg-amber-500" title="Bauhaus Ochre" />
            <div className="h-1.5 w-3 rounded-full bg-[#C95D43]" title="Terracotta Vermilion" />
            <div className="h-1.5 w-3 rounded-full bg-emerald-500" title="Emerald Green" />
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <span>WorkSync Enterprise</span>
            <span>/</span>
            <span className="text-blue-600 font-bold">
              {isHr
                ? isVi ? 'Quản lý Nhân sự & Phê duyệt' : 'HR Management & Approvals'
                : isAdmin
                ? isVi ? 'Quản trị Chấm công & Cấu hình' : 'Attendance Administration'
                : isPm
                ? isVi ? 'Quân số Dự án' : 'Team Attendance'
                : isVi ? 'Chấm công & Điểm danh' : 'Attendance & Timesheet'}
            </span>
          </div>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            {isHr ? (
              <>
                <FileCheck2 className="w-7 h-7 text-blue-600" />
                <span>{isVi ? 'Trung tâm Điều hành Phê duyệt & Chấm công' : 'HR Attendance & Approvals Center'}</span>
              </>
            ) : isAdmin ? (
              <>
                <Shield className="w-7 h-7 text-[#C95D43]" />
                <span>{isVi ? 'Trung tâm Cấu hình Hệ thống & Giám sát Chấm công' : 'Attendance Administration & Audit'}</span>
              </>
            ) : isPm ? (
              <>
                <Users2 className="w-7 h-7 text-blue-600" />
                <span>{isVi ? 'Giám sát Quân số Dự án & Duyệt đơn Team' : 'Project Team Attendance & Approvals'}</span>
              </>
            ) : (
              <>
                <CalendarClock className="w-7 h-7 text-blue-600" />
                <span>{isVi ? 'Hệ thống Điểm danh Thông minh' : 'Smart Attendance System'}</span>
              </>
            )}
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {isHr
              ? isVi
                ? 'Hàng đợi phê duyệt đơn khẩn cấp, theo dõi bảng công và quân số toàn công ty FPT Complex Đà Nẵng'
                : 'Expedited approval queue, enterprise timesheet & attendance tracking for FPT Complex Da Nang'
              : isAdmin
              ? isVi
                ? 'Cấu hình tham số ca làm việc, tọa độ GPS Geofence 100m FPT Complex và dải IP mạng nội bộ'
                : 'Configure shift parameters, 100m GPS Geofence boundary and internal IP subnets'
              : isVi
              ? 'Xác thực định vị GPS FPT Complex Đà Nẵng, đo khoảng cách thời gian thực & phân hệ nhân sự'
              : 'FPT Complex Da Nang GPS Geofence validation, real-time routing & enterprise attendance analytics'}
          </p>
        </div>

        {/* Clean Segmented Navigation Tabs Bar with Prominent My Attendance */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/80 shadow-2xs">
            {/* HR SPECIFIC NAVIGATION */}
            {isHr && (
              <>
                <TabButton
                  active={activeTab === 'approvals'}
                  onClick={() => setActiveTab('approvals')}
                  icon={<FileCheck2 className="w-3.5 h-3.5" />}
                  label={isVi ? 'Phê duyệt đơn' : 'Approvals'}
                  badge={totalPending}
                  badgeColor="rose"
                />
                <TabButton
                  active={activeTab === 'company'}
                  onClick={() => setActiveTab('company')}
                  icon={<CalendarClock className="w-3.5 h-3.5" />}
                  label={isVi ? 'Chấm công toàn công ty' : 'Company Timesheet'}
                />
                <TabButton
                  active={activeTab === 'team'}
                  onClick={() => setActiveTab('team')}
                  icon={<Users2 className="w-3.5 h-3.5" />}
                  label={isVi ? 'Quân số dự án' : 'Team Roster'}
                />
                <TabButton
                  active={activeTab === 'daily-reports'}
                  onClick={() => setActiveTab('daily-reports')}
                  icon={<FileText className="w-3.5 h-3.5" />}
                  label={isVi ? 'Báo cáo ngày' : 'Daily Reports'}
                />
                {/* Bauhaus Separator + Prominently Visible My Attendance Tab */}
                <div className="h-4 w-px bg-slate-300 mx-1.5 self-center" />
                <button
                  onClick={() => setActiveTab('today')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shadow-2xs ${
                    activeTab === 'today' || activeTab === 'history' || activeTab === 'my-requests' || activeTab === 'heatmap' || activeTab === 'stats'
                      ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                      : 'text-blue-700 bg-blue-50/90 hover:bg-blue-100/80 border border-blue-200'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Chấm công của tôi' : 'My Attendance'}</span>
                </button>
              </>
            )}

            {/* ADMIN SPECIFIC NAVIGATION */}
            {isAdmin && (
              <>
                <TabButton
                  active={activeTab === 'settings'}
                  onClick={() => setActiveTab('settings')}
                  icon={<Sparkles className="w-3.5 h-3.5" />}
                  label={isVi ? 'Cấu hình hệ thống' : 'Settings'}
                />
                <TabButton
                  active={activeTab === 'company'}
                  onClick={() => setActiveTab('company')}
                  icon={<CalendarClock className="w-3.5 h-3.5" />}
                  label={isVi ? 'Giám sát toàn công ty' : 'Company Timesheet'}
                />
                <TabButton
                  active={activeTab === 'approvals'}
                  onClick={() => setActiveTab('approvals')}
                  icon={<FileCheck2 className="w-3.5 h-3.5" />}
                  label={isVi ? 'Hàng đợi phê duyệt' : 'System Approvals'}
                  badge={totalPending}
                  badgeColor="rose"
                />
                <TabButton
                  active={activeTab === 'team'}
                  onClick={() => setActiveTab('team')}
                  icon={<Users2 className="w-3.5 h-3.5" />}
                  label={isVi ? 'Quân số dự án' : 'Team Roster'}
                />
                <TabButton
                  active={activeTab === 'daily-reports'}
                  onClick={() => setActiveTab('daily-reports')}
                  icon={<FileText className="w-3.5 h-3.5" />}
                  label={isVi ? 'Báo cáo ngày' : 'Daily Reports'}
                />
                {/* Bauhaus Separator + Prominently Visible My Attendance Tab */}
                <div className="h-4 w-px bg-slate-300 mx-1.5 self-center" />
                <button
                  onClick={() => setActiveTab('today')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shadow-2xs ${
                    activeTab === 'today' || activeTab === 'history' || activeTab === 'my-requests' || activeTab === 'heatmap' || activeTab === 'stats'
                      ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                      : 'text-blue-700 bg-blue-50/90 hover:bg-blue-100/80 border border-blue-200'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Chấm công của tôi' : 'My Attendance'}</span>
                </button>
              </>
            )}

            {/* DEPARTMENT_HEAD SPECIFIC NAVIGATION */}
            {isDepartmentHead && (
              <>
                <TabButton
                  active={activeTab === 'approvals'}
                  onClick={() => setActiveTab('approvals')}
                  icon={<FileCheck2 className="w-3.5 h-3.5" />}
                  label={isVi ? 'Phê duyệt phòng ban' : 'Department Approvals'}
                  badge={totalPending}
                  badgeColor="rose"
                />
                <TabButton
                  active={activeTab === 'team'}
                  onClick={() => setActiveTab('team')}
                  icon={<Users2 className="w-3.5 h-3.5" />}
                  label={isVi ? 'Quân số phòng ban' : 'Department Roster'}
                />
                <TabButton
                  active={activeTab === 'daily-reports'}
                  onClick={() => setActiveTab('daily-reports')}
                  icon={<FileText className="w-3.5 h-3.5" />}
                  label={isVi ? 'Báo cáo ngày' : 'Daily Reports'}
                />
                {/* Bauhaus Separator + Prominently Visible My Attendance Tab */}
                <div className="h-4 w-px bg-slate-300 mx-1.5 self-center" />
                <button
                  onClick={() => setActiveTab('today')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shadow-2xs ${
                    activeTab === 'today' || activeTab === 'history' || activeTab === 'my-requests' || activeTab === 'heatmap' || activeTab === 'stats'
                      ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                      : 'text-blue-700 bg-blue-50/90 hover:bg-blue-100/80 border border-blue-200'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Chấm công của tôi' : 'My Attendance'}</span>
                </button>
              </>
            )}

            {/* PM SPECIFIC NAVIGATION (Read-only Team Attendance + My Attendance) */}
            {isPm && (
              <>
                <TabButton
                  active={activeTab === 'team'}
                  onClick={() => setActiveTab('team')}
                  icon={<Users2 className="w-3.5 h-3.5" />}
                  label={isVi ? 'Hiện diện Nhóm dự án' : 'Team Attendance'}
                />
                <TabButton
                  active={activeTab === 'daily-reports'}
                  onClick={() => setActiveTab('daily-reports')}
                  icon={<FileText className="w-3.5 h-3.5" />}
                  label={isVi ? 'Báo cáo ngày' : 'Daily Reports'}
                />
                {/* Bauhaus Separator + Prominently Visible My Attendance Tab */}
                <div className="h-4 w-px bg-slate-300 mx-1.5 self-center" />
                <button
                  onClick={() => setActiveTab('today')}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap shadow-2xs ${
                    activeTab === 'today' || activeTab === 'history' || activeTab === 'my-requests' || activeTab === 'heatmap' || activeTab === 'stats'
                      ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-600/30'
                      : 'text-blue-700 bg-blue-50/90 hover:bg-blue-100/80 border border-blue-200'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>{isVi ? 'Chấm công của tôi' : 'My Attendance'}</span>
                </button>
              </>
            )}

            {/* EMPLOYEE NAVIGATION */}
            {userRole === 'EMPLOYEE' && (
              <>
                <TabButton
                  active={activeTab === 'today'}
                  onClick={() => setActiveTab('today')}
                  icon={<Clock className="w-3.5 h-3.5" />}
                  label={isVi ? 'Hôm nay & Tổng quan' : 'Today & Hub'}
                />
                <TabButton
                  active={activeTab === 'heatmap'}
                  onClick={() => setActiveTab('heatmap')}
                  icon={<CalendarIcon className="w-3.5 h-3.5" />}
                  label={isVi ? 'Bảng nhiệt 365 ngày' : 'Heatmap'}
                />
                <TabButton
                  active={activeTab === 'stats'}
                  onClick={() => setActiveTab('stats')}
                  icon={<BarChart3 className="w-3.5 h-3.5" />}
                  label={isVi ? 'Thống kê' : 'Stats'}
                />
                <TabButton
                  active={activeTab === 'history'}
                  onClick={() => setActiveTab('history')}
                  icon={<History className="w-3.5 h-3.5" />}
                  label={isVi ? 'Lịch sử' : 'History'}
                  badge={history.length}
                />
                <TabButton
                  active={activeTab === 'my-requests'}
                  onClick={() => setActiveTab('my-requests')}
                  icon={<FileCheck2 className="w-3.5 h-3.5" />}
                  label={isVi ? 'Đơn của tôi' : 'My Requests'}
                  badge={myWfh.length + myLeaves.length}
                  badgeColor="slate"
                />
                <TabButton
                  active={activeTab === 'daily-reports'}
                  onClick={() => setActiveTab('daily-reports')}
                  icon={<FileText className="w-3.5 h-3.5" />}
                  label={isVi ? 'Báo cáo ngày' : 'Daily Reports'}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* HR TOP KPI RIBBON WITH AUTHENTIC BAUHAUS COLOR ACCENT STRIPES */}
      {isHr && activeTab !== 'today' && activeTab !== 'history' && activeTab !== 'my-requests' && activeTab !== 'heatmap' && activeTab !== 'stats' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Workforce (Cobalt Royal Blue Accent #2563EB) */}
          <div className="p-5 rounded-2xl border border-slate-200/80 border-l-4 border-l-blue-600 bg-white shadow-2xs hover:shadow-xs transition-shadow flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isVi ? 'Tổng nhân sự' : 'Total Workforce'}</p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{companySummary.totalEmployees}</h3>
              <p className="text-[11px] text-emerald-600 font-bold mt-0.5">{isVi ? '● 100% tài khoản active' : '● 100% active users'}</p>
            </div>
          </div>

          {/* Card 2: Present Today (Emerald Green Accent #10B981) */}
          <div className="p-5 rounded-2xl border border-slate-200/80 border-l-4 border-l-emerald-500 bg-white shadow-2xs hover:shadow-xs transition-shadow flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold shrink-0">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isVi ? 'Đang có mặt' : 'Present Today'}</p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{companySummary.presentToday}</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">{companySummary.onTimeRate} {isVi ? 'tỷ lệ on-time' : 'on-time rate'}</p>
            </div>
          </div>

          {/* Card 3: On Leave & WFH (Bauhaus Warm Ochre Accent #F59E0B) */}
          <div className="p-5 rounded-2xl border border-slate-200/80 border-l-4 border-l-amber-500 bg-white shadow-2xs hover:shadow-xs transition-shadow flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold shrink-0">
              <Home className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isVi ? 'Nghỉ phép & WFH' : 'On Leave & WFH'}</p>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{companySummary.onLeaveAndWfh}</h3>
              <p className="text-[11px] text-amber-600 font-bold mt-0.5">{isVi ? 'Đăng ký trong ngày' : 'Registered today'}</p>
            </div>
          </div>

          {/* Card 4: Pending Requests (Bauhaus Terracotta/Vermilion Accent #C95D43) */}
          <div
            className={`p-5 rounded-2xl border border-l-4 border-l-[#C95D43] bg-white shadow-2xs hover:shadow-xs transition-all flex items-center gap-4 ${
              totalPending > 0 ? 'border-rose-200 ring-2 ring-rose-100/50 bg-rose-50/15' : 'border-slate-200/80'
            }`}
          >
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                totalPending > 0 ? 'bg-rose-100 text-[#C95D43] animate-pulse' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <FileCheck2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{isVi ? 'Đơn cần duyệt' : 'Pending Requests'}</p>
              <h3 className={`text-2xl font-black tracking-tight ${totalPending > 0 ? 'text-[#C95D43]' : 'text-slate-900'}`}>
                {totalPending}
              </h3>
              <p className="text-[11px] text-[#C95D43] font-bold mt-0.5">
                {totalPending > 0 ? (isVi ? '⚠️ Cần xử lý sớm' : 'Action required') : (isVi ? 'Đã hoàn tất' : 'All clear')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sub-navigation for Managers/Admins when viewing Personal Mode */}
      {isManagerOrAdmin && (activeTab === 'today' || activeTab === 'history' || activeTab === 'my-requests' || activeTab === 'heatmap' || activeTab === 'stats' || activeTab === 'daily-reports') && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl border border-blue-200/70 bg-blue-50/30">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-xs font-black text-slate-800 uppercase tracking-wide">
              {isVi ? 'Không gian Chấm công Cá nhân của bạn:' : 'Your Personal Attendance View:'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <button
              onClick={() => setActiveTab('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'today' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isVi ? 'Hôm nay & Check-in' : 'Today & Check-in'}
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'history' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isVi ? 'Lịch sử' : 'History'}
            </button>
            <button
              onClick={() => setActiveTab('my-requests')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'my-requests' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isVi ? 'Đơn của tôi' : 'My Requests'}
            </button>
            <button
              onClick={() => setActiveTab('heatmap')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'heatmap' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isVi ? 'Bảng nhiệt' : 'Heatmap'}
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'stats' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isVi ? 'Thống kê' : 'Stats'}
            </button>
            <button
              onClick={() => setActiveTab('daily-reports')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'daily-reports' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {isVi ? 'Báo cáo ngày' : 'Daily Reports'}
            </button>
          </div>
        </div>
      )}

      {/* Tab Panels */}
      {activeTab === 'today' && (
        <div className="space-y-6">
          {/* 1. Today Status Banner (Main Clock & Action Card) */}
          <TodayStatusBanner
            onOpenWfhModal={() => setIsWfhModalOpen(true)}
            onOpenLeaveModal={() => setIsLeaveModalOpen(true)}
            onOpenDailyReportModal={() => setIsDailyReportModalOpen(true)}
          />

          {/* 2. Today Timeline (Work Shift Visual Progress & Live Ticking) */}
          {/* ⚠️ KHÔNG fallback sang `history[0]` (hôm qua) — dữ liệu hôm qua hiển thị
              trong "Dải thời gian hôm nay" là sai lệch, gây nhầm lẫn khi chưa check-in. */}
          <TodayTimeline
            checkInTime={todayRecord?.checkInTime ?? null}
            checkOutTime={todayRecord?.checkOutTime ?? null}
            workStartTime={config?.workStartTime ?? '08:00'}
            workEndTime={config?.workEndTime ?? '17:30'}
            status={todayRecord?.status}
          />

          {/* 3. Quick Action Buttons Row (Early Leave + OT + Break + Daily Report) */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Early Leave */}
            <button
              onClick={() => setIsEarlyLeaveModalOpen(true)}
              className="flex items-center gap-3 p-4 rounded-2xl border border-cyan-200/80 bg-cyan-50/60 hover:bg-cyan-50 hover:border-cyan-300 hover:shadow-sm transition-all group text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {isVi ? 'Yêu cầu về sớm' : 'Request Early Leave'}
                </p>
                <p className="text-[11px] text-slate-500 font-medium truncate">
                  {isVi ? 'Xin về trước 17:30 có phép' : 'Leave before 17:30 with permit'}
                </p>
              </div>
            </button>

            {/* Overtime (OT) */}
            <button
              onClick={() => setIsOvertimeModalOpen(true)}
              className="flex items-center gap-3 p-4 rounded-2xl border border-blue-200/80 bg-blue-50/60 hover:bg-blue-50 hover:border-blue-300 hover:shadow-sm transition-all group text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {isVi ? 'Đăng ký OT (Tăng ca)' : 'Register Overtime (OT)'}
                </p>
                <p className="text-[11px] text-slate-500 font-medium truncate">
                  {isVi ? 'Làm thêm giờ sau 17:30' : 'Work extra hours after 17:30'}
                </p>
              </div>
            </button>

            {/* Break Tracking */}
            <button
              onClick={handleToggleBreak}
              disabled={isBreakLoading}
              className={`flex items-center gap-3 p-4 rounded-2xl border transition-all group text-left ${
                isBreakActive
                  ? 'border-amber-300 bg-amber-50 hover:bg-amber-100/80 shadow-xs'
                  : 'border-slate-200/80 bg-slate-50/70 hover:bg-slate-100/80 hover:shadow-sm'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform shrink-0 ${
                  isBreakActive ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-700'
                }`}
              >
                <Coffee className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {isBreakActive
                    ? isVi ? 'Đang nghỉ giải lao' : 'On Break Now'
                    : isVi ? 'Tạm ra ngoài / Nghỉ' : 'Temporary Break'}
                </p>
                <p className="text-[11px] text-slate-500 font-medium truncate">
                  {isBreakActive
                    ? isVi ? 'Nhấn để quay lại ca làm' : 'Click to resume shift'
                    : isVi ? 'Ghi nhận giờ ra ngoài giữa ca' : 'Log personal leave during shift'}
                </p>
              </div>
            </button>

            {/* Daily Report */}
            <button
              onClick={() => setIsDailyReportModalOpen(true)}
              className="flex items-center gap-3 p-4 rounded-2xl border border-indigo-200/80 bg-indigo-50/60 hover:bg-indigo-50 hover:border-indigo-300 hover:shadow-sm transition-all group text-left cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {isVi ? 'Báo cáo ngày' : 'Daily Report'}
                </p>
                <p className="text-[11px] text-slate-500 font-medium truncate">
                  {isVi ? 'Tổng hợp 4 nguồn tự động' : 'Auto 4-source prefilled'}
                </p>
              </div>
            </button>
          </div>

          {/* 4. Core Double Column: Left (Leave Balance + Policy) vs Right (Interactive Map) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Leave Balance & FPT Shift Policy */}
            <div className="lg:col-span-1 space-y-6">
              <LeaveBalanceCard
                balance={leaveBalance}
                onOpenLeaveModal={() => setIsLeaveModalOpen(true)}
              />

              <ShiftPolicyCard
                checkInTime={todayRecord?.checkInTime ?? null}
                checkOutTime={todayRecord?.checkOutTime ?? null}
              />
            </div>

            {/* Right Column: Geofence Interactive Map with Voyager tiles & Route Estimates */}
            <div className="lg:col-span-2">
              <GeofenceMapCard userAvatarUrl={user?.avatar ?? undefined} />
            </div>
          </div>

          {/* 5. Integrated Stats & Working Hours Analysis (Directly inside Today tab!) */}
          <div className="space-y-4 pt-4 border-t border-slate-200/80">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  {isVi ? 'Thống kê Chuyên sâu & Xu hướng Chấm công' : 'Attendance Analytics & Trends'}
                </h3>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                {isVi ? 'Dữ liệu tháng hiện tại' : 'Current month records'}
              </span>
            </div>

            <StatsSummaryView records={history} monthStart={new Date().toISOString().slice(0, 7)} />
          </div>

          {/* 6. Team Presence Pulse (Who's In Today) */}
          <div className="pt-2">
            <TeamPresencePulse />
          </div>
        </div>
      )}

      {/* Tab: Heatmap */}
      {activeTab === 'heatmap' && (
        <div className="space-y-4">
          <CalendarHeatmapView records={history} />
        </div>
      )}

      {/* Tab: Stats */}
      {activeTab === 'stats' && (
        <div className="space-y-4">
          <StatsSummaryView records={history} monthStart={new Date().toISOString().slice(0, 7)} />
        </div>
      )}

      {/* Tab: History */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <ExportButton />
          </div>
          <MyHistoryTable
            records={history}
            isLoading={isLoading}
            onFilterChange={(from, to) => fetchHistory(from, to)}
          />
        </div>
      )}

      {/* Tab: My Requests */}
      {activeTab === 'my-requests' && (
        <MyRequestsList
          wfhRequests={myWfh}
          leaveRequests={myLeaves}
          isLoading={isLoading}
          onOpenWfhModal={() => setIsWfhModalOpen(true)}
          onOpenLeaveModal={() => setIsLeaveModalOpen(true)}
        />
      )}

      {/* Tab: Daily Reports (Báo cáo ngày) */}
      {activeTab === 'daily-reports' && (
        <div className="space-y-4">
          {isManagerOrAdmin && (
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-2xs">
              <div className="flex items-center p-1 bg-slate-100 rounded-xl">
                <button
                  onClick={() => setDailyReportSubTab('mine')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    dailyReportSubTab === 'mine'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isVi ? 'Báo cáo của tôi' : 'My Reports'}
                </button>
                <button
                  onClick={() => setDailyReportSubTab('team')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    dailyReportSubTab === 'team'
                      ? 'bg-white text-blue-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isVi ? 'Ma trận đội ngũ (Tuần)' : 'Team Weekly Matrix'}
                </button>
              </div>

              <button
                onClick={() => setIsDailyReportModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" /> {isVi ? 'Viết báo cáo' : 'New Report'}
              </button>
            </div>
          )}

          {(!isManagerOrAdmin || dailyReportSubTab === 'mine') ? (
            <MyDailyReportsList />
          ) : (
            <DailyReportTeamView />
          )}
        </div>
      )}

      {/* Tab: Approvals (ADMIN, HR, DEPARTMENT_HEAD only — PM does not approve) */}
      {activeTab === 'approvals' && isApprover && (
        <ApprovalQueueView
          pendingWfh={pendingWfh}
          pendingLeaves={pendingLeaves}
          isLoading={isLoading}
          onRefresh={fetchPendingApprovals}
        />
      )}

      {/* Tab: Team Attendance (PM, HR, ADMIN, DEPARTMENT_HEAD) */}
      {activeTab === 'team' && (
        <PermissionGuard allowedRoles={['PM', 'HR', 'ADMIN', 'DEPARTMENT_HEAD']} redirectOnDeny={false}>
          <div className="space-y-4">
            <AttendanceTeamView />
          </div>
        </PermissionGuard>
      )}

      {/* Tab: Company Attendance (HR / ADMIN) */}
      {activeTab === 'company' && (
        <PermissionGuard allowedRoles={['HR', 'ADMIN']} redirectOnDeny={false}>
          <div className="space-y-4">
            <AttendanceCompanyView />
          </div>
        </PermissionGuard>
      )}

      {/* Tab: Attendance Settings (ADMIN) */}
      {activeTab === 'settings' && (
        <PermissionGuard allowedRoles={['ADMIN']} redirectOnDeny={false}>
          <div className="space-y-4">
            <AttendanceSettingsView />
          </div>
        </PermissionGuard>
      )}

      {/* 7. Comprehensive Enterprise Footer at the bottom of the page */}
      <EnterpriseFooter />

      {/* Modals */}
      <WfhRequestModal
        isOpen={isWfhModalOpen}
        onClose={() => setIsWfhModalOpen(false)}
      />
      <LeaveRequestModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
      />
      <EarlyLeaveRequestModal
        isOpen={isEarlyLeaveModalOpen}
        onClose={() => setIsEarlyLeaveModalOpen(false)}
      />
      <OvertimeRequestModal
        isOpen={isOvertimeModalOpen}
        onClose={() => setIsOvertimeModalOpen(false)}
      />
      <DailyReportModal
        isOpen={isDailyReportModalOpen}
        onClose={() => setIsDailyReportModalOpen(false)}
        onSuccess={() => fetchHistory()}
      />
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  badgeColor?: 'slate' | 'rose';
}

function TabButton({ active, onClick, icon, label, badge, badgeColor = 'slate' }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
        active ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
      }`}
    >
      {icon}
      <span>{label}</span>
      {badge !== undefined && badge > 0 && (
        <span
          className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
            badgeColor === 'rose' ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-200 text-slate-700'
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
