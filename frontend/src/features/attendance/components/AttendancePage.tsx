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
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { useAttendanceStore } from '../stores/attendance.store';
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

type TabKey = 'today' | 'history' | 'my-requests' | 'approvals' | 'heatmap' | 'stats';

export function AttendancePage() {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  const { user } = useAuthStore();
  const isManagerOrAdmin = user?.role === 'ADMIN' || user?.role === 'HR' || user?.role === 'PM';

  const [activeTab, setActiveTab] = useState<TabKey>('today');
  const [isWfhModalOpen, setIsWfhModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isEarlyLeaveModalOpen, setIsEarlyLeaveModalOpen] = useState(false);
  const [isOvertimeModalOpen, setIsOvertimeModalOpen] = useState(false);

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
    if (isManagerOrAdmin) {
      fetchPendingApprovals();
    }
  }, [fetchToday, fetchLeaveBalance, fetchHistory, fetchMyRequests, fetchPendingApprovals, isManagerOrAdmin]);

  const totalPending = pendingWfh.length + pendingLeaves.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <span>WorkSync</span>
            <span>/</span>
            <span className="text-blue-600">{isVi ? 'Chấm công & Điểm danh' : 'Attendance & Timesheet'}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
            <CalendarClock className="w-7 h-7 text-blue-600" />
            <span>{isVi ? 'Hệ thống Điểm danh Thông minh' : 'Smart Attendance System'}</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            {isVi
              ? 'Xác thực định vị GPS đa chi nhánh FPT & dải mạng nội bộ bảo mật'
              : 'Multi-branch FPT GPS geofence & enterprise network validation'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center p-1 bg-slate-100/80 rounded-xl border border-slate-200/80 overflow-x-auto self-start sm:self-auto">
          <TabButton active={activeTab === 'today'} onClick={() => setActiveTab('today')} icon={<Clock className="w-3.5 h-3.5" />} label={isVi ? 'Hôm nay' : 'Today'} />
          <TabButton active={activeTab === 'heatmap'} onClick={() => setActiveTab('heatmap')} icon={<CalendarIcon className="w-3.5 h-3.5" />} label={isVi ? 'Bảng nhiệt' : 'Heatmap'} />
          <TabButton active={activeTab === 'stats'} onClick={() => setActiveTab('stats')} icon={<BarChart3 className="w-3.5 h-3.5" />} label={isVi ? 'Thống kê' : 'Stats'} />
          <TabButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<History className="w-3.5 h-3.5" />} label={isVi ? 'Lịch sử' : 'History'} badge={history.length} />
          <TabButton
            active={activeTab === 'my-requests'}
            onClick={() => setActiveTab('my-requests')}
            icon={<FileCheck2 className="w-3.5 h-3.5" />}
            label={isVi ? 'Đơn của tôi' : 'My Requests'}
            badge={myWfh.length + myLeaves.length}
            badgeColor="slate"
          />
          {isManagerOrAdmin && (
            <TabButton
              active={activeTab === 'approvals'}
              onClick={() => setActiveTab('approvals')}
              icon={<Users2 className="w-3.5 h-3.5" />}
              label={isVi ? 'Duyệt đơn' : 'Approvals'}
              badge={totalPending}
              badgeColor="rose"
            />
          )}
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'today' && (
        <div className="space-y-6">
          {/* Today Timeline (sticky live) */}
          <TodayTimeline
            checkInTime={todayRecord?.checkInTime ?? history[0]?.checkInTime ?? null}
            checkOutTime={todayRecord?.checkOutTime ?? history[0]?.checkOutTime ?? null}
            workStartTime={config?.workStartTime ?? '08:00'}
            workEndTime={config?.workEndTime ?? '17:30'}
            status={todayRecord?.status ?? history[0]?.status}
          />

          <TodayStatusBanner
            onOpenWfhModal={() => setIsWfhModalOpen(true)}
            onOpenLeaveModal={() => setIsLeaveModalOpen(true)}
          />

          {/* Quick action buttons for Early Leave + Overtime */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => setIsEarlyLeaveModalOpen(true)}
              className="flex items-center gap-3 p-4 rounded-2xl border border-cyan-200/80 bg-cyan-50/60 hover:bg-cyan-50 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-100 text-cyan-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-bold text-slate-900">
                  {isVi ? 'Yêu cầu về sớm' : 'Request Early Leave'}
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  {isVi ? 'Xin về trước 17:30 có phép' : 'Leave before 17:30 with approval'}
                </p>
              </div>
            </button>

            <button
              onClick={() => setIsOvertimeModalOpen(true)}
              className="flex items-center gap-3 p-4 rounded-2xl border border-blue-200/80 bg-blue-50/60 hover:bg-blue-50 transition-all group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                  <polyline points="16 7 22 7 22 13" />
                </svg>
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-bold text-slate-900">
                  {isVi ? 'Đăng ký OT' : 'Register Overtime'}
                </p>
                <p className="text-[11px] text-slate-500 font-medium">
                  {isVi ? 'Làm thêm giờ sau 17:30' : 'Work extra hours after 17:30'}
                </p>
              </div>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <LeaveBalanceCard
                balance={leaveBalance}
                onOpenLeaveModal={() => setIsLeaveModalOpen(true)}
              />
            </div>
            <div className="lg:col-span-2">
              <GeofenceMapCard userAvatarUrl={user?.avatar ?? undefined} />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'heatmap' && (
        <div className="space-y-4">
          <CalendarHeatmapView records={history} />
        </div>
      )}

      {activeTab === 'stats' && (
        <div className="space-y-4">
          <StatsSummaryView records={history} monthStart={new Date().toISOString().slice(0, 7)} />
        </div>
      )}

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

      {activeTab === 'my-requests' && (
        <MyRequestsList
          wfhRequests={myWfh}
          leaveRequests={myLeaves}
          isLoading={isLoading}
          onOpenWfhModal={() => setIsWfhModalOpen(true)}
          onOpenLeaveModal={() => setIsLeaveModalOpen(true)}
        />
      )}

      {activeTab === 'approvals' && isManagerOrAdmin && (
        <ApprovalQueueView
          pendingWfh={pendingWfh}
          pendingLeaves={pendingLeaves}
          isLoading={isLoading}
          onRefresh={fetchPendingApprovals}
        />
      )}

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
