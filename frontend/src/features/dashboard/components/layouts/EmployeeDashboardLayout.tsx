import { useTranslation } from 'react-i18next';
import { HeroBanner } from '../widgets/HeroBanner';
import { QuickAttendanceCard } from '../widgets/QuickAttendanceCard';
import { KpiRibbon } from '../widgets/KpiRibbon';
import { CoreTasksChecklist } from '../widgets/CoreTasksChecklist';
import { VelocityBarChart } from '../widgets/VelocityBarChart';
import { ActiveSprintCard } from '../widgets/ActiveSprintCard';
import { UpcomingMeetingsCard } from '../widgets/UpcomingMeetingsCard';
import { ProjectPortfolioCard } from '../widgets/ProjectPortfolioCard';
import { TaskDonutChart } from '../widgets/TaskDonutChart';
import { RecentDocumentsHub } from '../widgets/RecentDocumentsHub';
import { RecentActivityFeed } from '../widgets/RecentActivityFeed';
import { EnterpriseFooter } from '../widgets/EnterpriseFooter';
import { DeepWorkTrackerWidget } from '../widgets/DeepWorkTrackerWidget';
import { WeeklyShiftScheduleWidget } from '../widgets/WeeklyShiftScheduleWidget';
import type { EmployeeDashboardData } from '../../types/dashboard.types';

interface EmployeeDashboardLayoutProps {
  data: EmployeeDashboardData;
  userName: string;
}

export function EmployeeDashboardLayout({ data, userName }: EmployeeDashboardLayoutProps) {
  useTranslation();

  return (
    <div className="space-y-6">
      {/* 1. Hero Banner with Bauhaus Artwork */}
      <HeroBanner userName={userName} />

      {/* 2. Focus Time & Deep Work Tracker + Quick Attendance Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7">
          <DeepWorkTrackerWidget urgentTasks={data.urgentTasks ?? []} />
        </div>
        <div className="lg:col-span-5">
          <QuickAttendanceCard />
        </div>
      </div>

      {/* 2.1 Weekly Shift Schedule (Lịch biểu làm việc tuần này) */}
      <WeeklyShiftScheduleWidget schedule={data.weeklySchedule} />

      {/* 3. KPI Ribbon for personal tasks */}
      <KpiRibbon summary={data.taskSummary} />

      {/* 4. Middle Dual Grid: Urgent Checklist & Velocity vs Sprint, Meeting & Portfolio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 flex flex-col gap-6">
          <CoreTasksChecklist
            urgentTasks={data.urgentTasks ?? []}
            upcomingTasks={data.upcomingTasks ?? []}
          />
          <VelocityBarChart velocity={data.weeklyVelocity ?? []} />
        </div>

        <div className="lg:col-span-5 flex flex-col gap-6">
          <ActiveSprintCard activeSprint={data.activeSprint} />
          <UpcomingMeetingsCard meetings={data.upcomingMeetings ?? []} />
          <ProjectPortfolioCard projects={data.projectProgress ?? []} />
        </div>
      </div>

      {/* 5. Bottom Triple Grid: Priority Donut, Documents Hub, Activity Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
        <TaskDonutChart
          distribution={
            data.priorityDistribution && data.priorityDistribution.length > 0
              ? data.priorityDistribution
              : data.statusDistribution ?? []
          }
        />
        <RecentDocumentsHub documents={data.recentDocuments ?? []} />
        <RecentActivityFeed activities={data.recentActivities ?? []} />
      </div>

      {/* 6. Footer */}
      <EnterpriseFooter />
    </div>
  );
}
