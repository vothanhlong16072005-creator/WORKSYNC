import { useTranslation } from 'react-i18next';
import {
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  Flame,
  ShieldAlert,
  Users,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { HeroBanner } from '../widgets/HeroBanner';
import { ProjectPortfolioCard } from '../widgets/ProjectPortfolioCard';
import { ActiveSprintCard } from '../widgets/ActiveSprintCard';
import { UpcomingMeetingsCard } from '../widgets/UpcomingMeetingsCard';
import { RecentActivityFeed } from '../widgets/RecentActivityFeed';
import { EnterpriseFooter } from '../widgets/EnterpriseFooter';
import { AiSprintHealthWidget } from '../widgets/AiSprintHealthWidget';
import { TeamCapacityWidget } from '../widgets/TeamCapacityWidget';
import { ScopeCreepWidget } from '../widgets/ScopeCreepWidget';
import type { PmDashboardData } from '../../types/dashboard.types';

interface PmDashboardLayoutProps {
  data: PmDashboardData;
  userName: string;
}

export function PmDashboardLayout({ data, userName }: PmDashboardLayoutProps) {
  const { t } = useTranslation();

  const pmKpi = data.pmKpi || {
    totalProjects: data.projectProgress?.length || 0,
    activeProjects: data.projectProgress?.length || 0,
    openTasks: data.taskSummary?.total - data.taskSummary?.done || 0,
    blockedTasks: data.taskSummary?.blocked || 0,
    overdueTasks: data.taskSummary?.overdueCount || 0,
    teamMembersCount: data.teamWorkload?.length || 8,
    completionRate: data.taskSummary?.completionRate || 0,
  };

  const burndownData = data.sprintBurndown || [
    { day: 'T2', ideal: 24, actual: 24 },
    { day: 'T3', ideal: 20, actual: 22 },
    { day: 'T4', ideal: 16, actual: 18 },
    { day: 'T5', ideal: 12, actual: 15 },
    { day: 'T6', ideal: 8, actual: 10 },
    { day: 'T7', ideal: 4, actual: 7 },
    { day: 'CN', ideal: 0, actual: 4 },
  ];

  const risks = data.risks || [];
  const taskLabel = pmKpi.openTasks === 1 ? t('dashboard.pm.task') : t('dashboard.pm.tasks');

  return (
    <div className="space-y-6">
      {/* 1. Hero Banner with PM Badge */}
      <HeroBanner userName={userName} />

      {/* 1.1 AI Sprint Health & Bottleneck Insights (Khuyến nghị thông minh từ AI) */}
      <AiSprintHealthWidget insight={data.aiSprintInsight} />

      {/* 2. PM Team-level KPI Ribbon — responsive: 2/3/6 columns */}
      <div
        className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5"
        role="region"
        aria-label="Project Manager KPI Ribbon"
      >
        {/* Managed Projects */}
        <div
          className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm border-l-4 border-l-blue-600 transition-all hover:shadow-md"
          role="article"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t('dashboard.pm.managed_projects')}
            </span>
            <FolderKanban className="w-4 h-4 text-blue-600" aria-hidden="true" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight" aria-live="polite">
            {pmKpi.totalProjects}
          </div>
          <p className="text-[10px] text-slate-400 font-medium mt-1">
            {t('dashboard.pm.active_count', { count: pmKpi.activeProjects })}
          </p>
        </div>

        {/* Open Tasks */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm border-l-4 border-l-amber-500 transition-all hover:shadow-md" role="article">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t('dashboard.pm.open_tasks')}
            </span>
            <TrendingUp className="w-4 h-4 text-amber-500" aria-hidden="true" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight" aria-live="polite">
            {pmKpi.openTasks}
          </div>
          <p className="text-[10px] text-amber-600 font-medium mt-1">
            {t('dashboard.pm.in_sprint_backlog')}
          </p>
        </div>

        {/* Blocked Tasks */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm border-l-4 border-l-[#C95D43] transition-all hover:shadow-md" role="article">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t('dashboard.pm.blocked_tasks')}
            </span>
            <AlertTriangle className="w-4 h-4 text-[#C95D43]" aria-hidden="true" />
          </div>
          <div className="text-2xl font-black text-[#C95D43] tracking-tight" aria-live="polite">
            {pmKpi.blockedTasks}
          </div>
          <p className="text-[10px] text-rose-500 font-medium mt-1">
            {pmKpi.blockedTasks > 0 ? t('dashboard.pm.needs_unblock') : t('dashboard.pm.zero_blockers')}
          </p>
        </div>

        {/* Overdue Tasks */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm border-l-4 border-l-rose-500 transition-all hover:shadow-md" role="article">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t('dashboard.pm.overdue_tasks')}
            </span>
            <Clock className="w-4 h-4 text-rose-500" aria-hidden="true" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight" aria-live="polite">
            {pmKpi.overdueTasks}
          </div>
          <p className="text-[10px] text-rose-500 font-medium mt-1">
            {t('dashboard.pm.beyond_deadline')}
          </p>
        </div>

        {/* Team Members */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm border-l-4 border-l-purple-600 transition-all hover:shadow-md" role="article">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t('dashboard.pm.team_members')}
            </span>
            <Users className="w-4 h-4 text-purple-600" aria-hidden="true" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight" aria-live="polite">
            {pmKpi.teamMembersCount}
          </div>
          <p className="text-[10px] text-purple-600 font-medium mt-1">
            {t('dashboard.pm.active_contributors')}
          </p>
        </div>

        {/* Completion Rate */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-sm border-l-4 border-l-emerald-500 transition-all hover:shadow-md" role="article">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              {t('dashboard.pm.completion_rate')}
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          </div>
          <div className="text-2xl font-black text-emerald-600 tracking-tight" aria-live="polite">
            {pmKpi.completionRate}%
          </div>
          <p className="text-[10px] text-emerald-600 font-medium mt-1">
            {t('dashboard.pm.on_track')}
          </p>
        </div>
      </div>

      {/* 3. Middle Dual Grid: Sprint Burndown & Portfolio (Left 7) vs Workload & Risks (Right 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Sprint Burndown Chart */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col" role="region" aria-label={t('dashboard.pm.burndown_title')}>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 mb-4 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2">
                <span className="p-1 rounded-lg text-amber-600 bg-amber-50">
                  <Flame className="w-4 h-4" aria-hidden="true" />
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  {t('dashboard.pm.burndown_title')}
                </h3>
              </div>
              <div className="flex items-center gap-3 text-xs font-semibold">
                <span className="inline-flex items-center gap-1.5 text-slate-400">
                  <span className="w-2.5 h-0.5 bg-slate-400 rounded-full inline-block" aria-hidden="true"></span>
                  {t('dashboard.pm.ideal')}
                </span>
                <span className="inline-flex items-center gap-1.5 text-blue-600 font-bold">
                  <span className="w-2.5 h-1 bg-blue-600 rounded-full inline-block" aria-hidden="true"></span>
                  {t('dashboard.pm.actual_remaining')}
                </span>
              </div>
            </div>

            <div className="h-56 sm:h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={burndownData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} aria-label="Sprint burndown chart comparing ideal and actual remaining tasks over 7 days">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '12px',
                    }}
                  />
                  <Line type="monotone" dataKey="ideal" stroke="#94A3B8" strokeDasharray="4 4" strokeWidth={2} dot={false} name={t('dashboard.pm.ideal')} />
                  <Line type="monotone" dataKey="actual" stroke="#2563EB" strokeWidth={3} dot={{ r: 4, fill: '#2563EB' }} name={t('dashboard.pm.actual_remaining')} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Sprint Scope Creep Tracker (Theo dõi phát sinh task giữa Sprint) */}
          <ScopeCreepWidget scopeCreep={data.scopeCreep} />

          {/* Project Portfolio */}
          <ProjectPortfolioCard projects={data.projectProgress ?? []} />
        </div>

        {/* Right Column (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Team Capacity & Availability Bar (Công suất khả dụng của nhóm hôm nay) */}
          <TeamCapacityWidget capacity={data.teamCapacity} />

          {/* Schedule Risks & Blockers */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col" role="region" aria-label={t('dashboard.pm.risks_title')}>
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <span className="p-1 rounded-lg text-rose-600 bg-rose-50">
                <ShieldAlert className="w-4 h-4" aria-hidden="true" />
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                {t('dashboard.pm.risks_title')}
              </h3>
            </div>

            <ul className="space-y-3" role="list">
              {risks.map((risk) => (
                <li
                  key={risk.id}
                  className={`p-3.5 rounded-xl border transition-all ${
                    risk.severity === 'CRITICAL' || risk.severity === 'HIGH'
                      ? 'bg-rose-50/50 border-rose-200/80'
                      : 'bg-slate-50 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-900 line-clamp-1">{risk.title}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        risk.severity === 'CRITICAL'
                          ? 'bg-rose-600 text-white'
                          : risk.severity === 'HIGH'
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                      aria-label={`Severity: ${risk.severity}`}
                    >
                      {risk.severity}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{risk.description}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Team Workload */}
          {data.teamWorkload && data.teamWorkload.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col" role="region" aria-label={t('dashboard.pm.workload_title')}>
              <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
                <span className="p-1 rounded-lg text-blue-600 bg-blue-50">
                  <Users className="w-4 h-4" aria-hidden="true" />
                </span>
                <h3 className="text-sm font-bold text-slate-900">
                  {t('dashboard.pm.workload_title')}
                </h3>
              </div>
              <ul className="space-y-3" role="list">
                {data.teamWorkload.slice(0, 5).map((member) => (
                  <li key={member.userId} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50/80 border border-slate-200/60">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0" aria-hidden="true">
                        {member.userName.charAt(0)}
                      </div>
                      <span className="text-xs font-bold text-slate-800 truncate">{member.userName}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-bold text-slate-600">
                        {member.openTaskCount} {taskLabel}
                      </span>
                      {member.totalStoryPoints && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 font-bold text-[10px]">
                          {member.totalStoryPoints} pts
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Active Sprint Card */}
          <ActiveSprintCard activeSprint={data.activeSprint} />
        </div>
      </div>

      {/* 4. Bottom Grid: Upcoming Meetings & Team Activity Feed — responsive 1/2 cols */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        <UpcomingMeetingsCard meetings={data.upcomingMeetings ?? []} />
        <RecentActivityFeed activities={data.recentActivities ?? []} />
      </div>

      {/* 5. Footer */}
      <EnterpriseFooter />
    </div>
  );
}
