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

      {/* 2. Executive Quick Attendance Card (Đầy đủ không gian, đẹp mắt & độc lập) */}
      <QuickAttendanceCard />

      {/* 3. KPI Ribbon for personal tasks (6 thẻ tiến độ cốt lõi) */}
      <KpiRibbon summary={data.taskSummary} />

      {/* 4. Biểu đồ thống kê hiệu suất & phân bổ đưa lên trên (Analytics & Velocity Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7">
          <VelocityBarChart velocity={data.weeklyVelocity ?? []} />
        </div>
        <div className="lg:col-span-5">
          <TaskDonutChart
            distribution={
              data.priorityDistribution && data.priorityDistribution.length > 0
                ? data.priorityDistribution
                : data.statusDistribution ?? []
            }
          />
        </div>
      </div>

      {/* 5. Lịch biểu làm việc tuần này (Weekly Shift Schedule) đồng bộ thiết kế Enterprise */}
      <WeeklyShiftScheduleWidget schedule={data.weeklySchedule} />

      {/* 6. Khu vực thực thi công việc & Sprint (Tasks, Deep Work, Active Sprint, Meetings) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Việc cần làm & Đồng hồ làm việc sâu Deep Work */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <CoreTasksChecklist
            urgentTasks={data.urgentTasks ?? []}
            upcomingTasks={data.upcomingTasks ?? []}
          />
          <DeepWorkTrackerWidget urgentTasks={data.urgentTasks ?? []} />
        </div>

        {/* Right Column: Sprint đang diễn ra, Cuộc họp sắp tới, Danh mục dự án */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <ActiveSprintCard activeSprint={data.activeSprint} />
          <UpcomingMeetingsCard meetings={data.upcomingMeetings ?? []} />
          <ProjectPortfolioCard projects={data.projectProgress ?? []} />
        </div>
      </div>

      {/* 7. Bottom Grid: Documents Hub & Activity Feed */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        <RecentDocumentsHub documents={data.recentDocuments ?? []} />
        <RecentActivityFeed activities={data.recentActivities ?? []} />
      </div>

      {/* 8. Enterprise Footer */}
      <EnterpriseFooter />
    </div>
  );
}
