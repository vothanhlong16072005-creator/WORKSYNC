import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Activity } from 'lucide-react';
import { useDashboardStore } from '../stores/dashboard.store';
import { useAuthStore } from '@/stores/auth.store';
import { HeroBanner } from './widgets/HeroBanner';
import { QuickAttendanceCard } from './widgets/QuickAttendanceCard';
import { KpiRibbon } from './widgets/KpiRibbon';
import { CoreTasksChecklist } from './widgets/CoreTasksChecklist';
import { VelocityBarChart } from './widgets/VelocityBarChart';
import { ActiveSprintCard } from './widgets/ActiveSprintCard';
import { UpcomingMeetingsCard } from './widgets/UpcomingMeetingsCard';
import { ProjectPortfolioCard } from './widgets/ProjectPortfolioCard';
import { TaskDonutChart } from './widgets/TaskDonutChart';
import { RecentDocumentsHub } from './widgets/RecentDocumentsHub';
import { RecentActivityFeed } from './widgets/RecentActivityFeed';
import { EnterpriseFooter } from './widgets/EnterpriseFooter';
import type {
  EmployeeDashboardData,
  AdminDashboardData,
} from '../types/dashboard.types';

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { state, fetchDashboard, reset } = useDashboardStore();

  useEffect(() => {
    fetchDashboard('me');
    return () => reset();
  }, [fetchDashboard, reset]);

  if (state.status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        <p className="text-xs font-bold text-slate-500">
          {t('dashboard.loading', 'Loading enterprise dashboard...')}
        </p>
      </div>
    );
  }

  if (state.status === 'error') {
    return (
      <div className="max-w-4xl mx-auto p-6 bg-red-50/80 rounded-2xl border border-red-200 shadow-sm my-8">
        <h2 className="text-sm font-bold text-red-800 mb-1">
          {t('dashboard.error_title', 'Lỗi tải dữ liệu')}
        </h2>
        <p className="text-xs text-red-600 mb-4">{state.error}</p>
        <button
          type="button"
          onClick={() => fetchDashboard('me')}
          className="px-4 py-2 bg-red-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-red-700 transition-colors"
        >
          {t('dashboard.retry', 'Thử lại')}
        </button>
      </div>
    );
  }

  if (state.status !== 'success') {
    return null;
  }

  const { data } = state;
  const empData = data as EmployeeDashboardData;
  const adminData = data as Partial<AdminDashboardData>;

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1520px] mx-auto">
      {/* 1. Hero Banner with Constructivist Bauhaus Artwork & Workspace Greetings */}
      <HeroBanner userName={user?.name ?? 'Long Võ'} />

      {/* 2. Top-most Quick Attendance Card (Working hours badge + live Check-in) */}
      <QuickAttendanceCard />

      {/* 3. KPI Ribbon (6 stats matching reference layout) */}
      <KpiRibbon summary={empData.taskSummary} />

      {/* 4. Middle Dual Grid: Urgent Checklist & Velocity (Left 7 cols) vs Sprint, Meeting & Portfolio (Right 5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <CoreTasksChecklist
            urgentTasks={empData.urgentTasks ?? []}
            upcomingTasks={empData.upcomingTasks ?? []}
          />

          <VelocityBarChart velocity={empData.weeklyVelocity ?? []} />
        </div>

        {/* Right Column (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <ActiveSprintCard activeSprint={empData.activeSprint} />

          <UpcomingMeetingsCard meetings={empData.upcomingMeetings ?? []} />

          <ProjectPortfolioCard projects={empData.projectProgress ?? []} />
        </div>
      </div>

      {/* 5. Bottom Triple Grid: Priority Donut, Documents Hub, Activity Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        <TaskDonutChart
          distribution={
            empData.priorityDistribution && empData.priorityDistribution.length > 0
              ? empData.priorityDistribution
              : empData.statusDistribution ?? []
          }
        />

        <RecentDocumentsHub documents={empData.recentDocuments ?? []} />

        <RecentActivityFeed activities={empData.recentActivities ?? []} />
      </div>

      {/* 6. Admin System Health (Clean subtle card for Admin role) */}
      {adminData.systemHealth && (
        <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
            <span className="p-1 rounded-lg text-blue-600 bg-blue-50">
              <Activity className="w-4 h-4" />
            </span>
            <h2 className="text-xs font-bold text-slate-800">
              {t('dashboard.system_health', 'System Health (Admin Overview)')}
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-400">
                {t('dashboard.active_users', 'Active Users')}
              </span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {adminData.systemHealth.activeUsers}
              </p>
            </div>
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-400">
                {t('dashboard.total_projects', 'Total Projects')}
              </span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {adminData.systemHealth.totalProjects}
              </p>
            </div>
            <div className="p-3 bg-slate-50/70 rounded-xl border border-slate-200/60">
              <span className="text-[11px] font-bold text-slate-400">
                {t('dashboard.system_tasks', 'Total Tasks')}
              </span>
              <p className="text-xl font-bold text-slate-900 mt-1">
                {adminData.systemHealth.totalTasks}
              </p>
            </div>
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200">
              <span className="text-[11px] font-bold text-emerald-800">
                {t('dashboard.completed_tasks', 'Completed')}
              </span>
              <p className="text-xl font-bold text-emerald-900 mt-1">
                {adminData.systemHealth.completedTasks}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* 7. Enterprise Footer */}
      <EnterpriseFooter />
    </div>
  );
}
