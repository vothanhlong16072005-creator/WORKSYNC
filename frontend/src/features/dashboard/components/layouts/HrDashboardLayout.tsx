import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Home,
  FileCheck2,
  Clock,
  Building2,
  CalendarDays,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { HeroBanner } from '../widgets/HeroBanner';
import { EnterpriseFooter } from '../widgets/EnterpriseFooter';
import { QuickApprovalWidget } from '../widgets/QuickApprovalWidget';
import { HeadcountTrendWidget } from '../widgets/HeadcountTrendWidget';
import { CompanyCultureCard } from '../widgets/CompanyCultureCard';
import type { HrDashboardData } from '../../types/dashboard.types';

interface HrDashboardLayoutProps {
  data: HrDashboardData;
  userName: string;
}

export function HrDashboardLayout({ data, userName }: HrDashboardLayoutProps) {
  const { t } = useTranslation();

  const workforce = data.workforceSummary || {
    totalEmployees: 12,
    activeToday: 11,
    onLeave: 1,
    wfhToday: 2,
    absentUnapproved: 0,
  };

  const kpi = data.attendanceKpi || {
    attendanceRate: 98,
    onTimeRate: 88,
    lateRate: 12,
    avgWorkHours: 8.2,
  };

  const dist = data.attendanceDistribution || {
    onTime: 9,
    late: 2,
    veryLate: 0,
    wfh: 2,
    absentApproved: 1,
    absentUnapproved: 0,
  };

  const pieData = [
    { name: t('dashboard.hr.on_time'), value: dist.onTime || 1, color: '#10B981' },
    { name: t('dashboard.hr.late'), value: dist.late || 0, color: '#F59E0B' },
    { name: t('dashboard.hr.wfh'), value: dist.wfh || 0, color: '#2563EB' },
    { name: t('dashboard.hr.approved_leave'), value: dist.absentApproved || 0, color: '#64748B' },
    { name: t('dashboard.hr.unapproved'), value: dist.absentUnapproved || 0, color: '#EF4444' },
  ].filter((item) => item.value > 0);

  const deptData = data.lateArrivalsByDepartment || [
    { departmentName: 'Kỹ thuật (Engineering)', totalMembers: 18, lateCount: 2, lateRate: 11, onLeaveCount: 1, presentCount: 16 },
    { departmentName: 'Sản phẩm (Product)', totalMembers: 8, lateCount: 1, lateRate: 12, onLeaveCount: 0, presentCount: 7 },
    { departmentName: 'Thiết kế (UI/UX)', totalMembers: 6, lateCount: 0, lateRate: 0, onLeaveCount: 0, presentCount: 6 },
    { departmentName: 'Vận hành (Operations)', totalMembers: 5, lateCount: 0, lateRate: 0, onLeaveCount: 0, presentCount: 5 },
    { departmentName: 'Kinh doanh (Sales)', totalMembers: 7, lateCount: 1, lateRate: 14, onLeaveCount: 1, presentCount: 6 },
  ];

  const alerts = data.complianceAlerts || [];
  const pending = data.pendingApprovals || { wfhCount: 2, leaveCount: 2, total: 4 };

  return (
    <div className="space-y-6">
      {/* 1. Hero Banner with HR Badge */}
      <HeroBanner userName={userName} />

      {/* 2. Top-level 4 KPI Ribbon — responsive 1/2/4 columns */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        role="region"
        aria-label="HR KPI Ribbon"
      >
        {/* Total Workforce */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm border-l-4 border-l-blue-600 transition-all hover:shadow-md" role="article">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t('dashboard.hr.total_workforce')}
            </span>
            <Users className="w-5 h-5 text-blue-600" aria-hidden="true" />
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight" aria-live="polite">
            {workforce.totalEmployees}
          </div>
          <p className="text-xs text-blue-600 font-semibold mt-1">
            {t('dashboard.hr.active_accounts')}
          </p>
        </div>

        {/* Present Today */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm border-l-4 border-l-emerald-500 transition-all hover:shadow-md" role="article">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t('dashboard.hr.present_today')}
            </span>
            <UserCheck className="w-5 h-5 text-emerald-600" aria-hidden="true" />
          </div>
          <div className="text-3xl font-black text-emerald-600 tracking-tight" aria-live="polite">
            {workforce.activeToday}
          </div>
          <p className="text-xs text-emerald-700 font-semibold mt-1">
            {t('dashboard.hr.on_time_rate', { rate: kpi.onTimeRate })}
          </p>
        </div>

        {/* On Leave & WFH */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm border-l-4 border-l-amber-500 transition-all hover:shadow-md" role="article">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t('dashboard.hr.leave_wfh')}
            </span>
            <Home className="w-5 h-5 text-amber-500" aria-hidden="true" />
          </div>
          <div className="text-3xl font-black text-slate-900 tracking-tight" aria-live="polite">
            {workforce.onLeave + workforce.wfhToday}
          </div>
          <p className="text-xs text-amber-600 font-semibold mt-1">
            {workforce.wfhToday} {t('dashboard.hr.wfh_label')} • {workforce.onLeave} {t('dashboard.hr.leave_label')}
          </p>
        </div>

        {/* Pending Approvals */}
        <div className="p-5 bg-white rounded-2xl border border-slate-200/90 shadow-sm border-l-4 border-l-[#C95D43] transition-all hover:shadow-md" role="article">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {t('dashboard.hr.pending_approvals')}
            </span>
            <FileCheck2 className="w-5 h-5 text-[#C95D43]" aria-hidden="true" />
          </div>
          <div className="text-3xl font-black text-[#C95D43] tracking-tight" aria-live="polite">
            {pending.total}
          </div>
          <div className="mt-1 flex items-center justify-between">
            <p className="text-xs text-rose-500 font-semibold">
              {pending.wfhCount} {t('dashboard.hr.wfh_label')} • {pending.leaveCount} {t('dashboard.hr.leave_label')}
            </p>
            <NavLink
              to="/attendance"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 rounded px-1"
              aria-label={t('dashboard.hr.process')}
            >
              <span>{t('dashboard.hr.process')}</span>
              <ArrowRight className="w-3 h-3" aria-hidden="true" />
            </NavLink>
          </div>
        </div>
      </div>

      {/* 2.1 Quick Approval Widget (Duyệt nhanh 1-Click ngay trên Dashboard) */}
      <QuickApprovalWidget requests={data.quickApprovals} />

      {/* 3. Middle Dual Grid: Attendance Distribution & Dept Metrics vs Compliance Alerts & Leave Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column (7 cols): Attendance Pie + Dept Breakdown */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Distribution Donut */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col" role="region" aria-label={t('dashboard.hr.distribution_title')}>
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <span className="p-1 rounded-lg text-blue-600 bg-blue-50">
                <Clock className="w-4 h-4" aria-hidden="true" />
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                {t('dashboard.hr.distribution_title')}
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              <div className="md:col-span-6 h-52 sm:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart aria-label="Company-wide attendance status pie chart">
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        fontSize: '12px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <ul className="md:col-span-6 space-y-2.5" role="list">
                {pieData.map((item) => (
                  <li key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-md" style={{ backgroundColor: item.color }} aria-hidden="true" />
                      <span className="font-semibold text-slate-700">{item.name}</span>
                    </div>
                    <span className="font-bold text-slate-900">
                      {item.value} {t('dashboard.hr.people')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Department Attendance Breakdown */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col" role="region" aria-label={t('dashboard.hr.dept_breakdown')}>
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <span className="p-1 rounded-lg text-purple-600 bg-purple-50">
                <Building2 className="w-4 h-4" aria-hidden="true" />
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                {t('dashboard.hr.dept_breakdown')}
              </h3>
            </div>

            <ul className="space-y-3" role="list">
              {deptData.map((dept) => (
                <li key={dept.departmentName} className="p-3 rounded-xl bg-slate-50 border border-slate-200/70">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-800">{dept.departmentName}</span>
                    <span className="text-xs font-bold text-slate-600">
                      {t('dashboard.hr.present_ratio', { present: dept.presentCount, total: dept.totalMembers })}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden flex" role="progressbar" aria-valuenow={Math.round((dept.presentCount / dept.totalMembers) * 100)} aria-valuemin={0} aria-valuemax={100}>
                    <div
                      className="bg-emerald-500 h-full"
                      style={{ width: `${(dept.presentCount / dept.totalMembers) * 100}%` }}
                      title={`${dept.presentCount} on time`}
                    />
                    <div
                      className="bg-amber-500 h-full"
                      style={{ width: `${(dept.lateCount / dept.totalMembers) * 100}%` }}
                      title={`${dept.lateCount} late`}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 font-medium">
                    <span>{t('dashboard.hr.late_count_label', { count: dept.lateCount, rate: dept.lateRate })}</span>
                    <span>{t('dashboard.hr.leave_count_label', { count: dept.onLeaveCount })}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column (5 cols): Compliance Alerts & Quick Approvals */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          {/* Compliance Alerts */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col" role="region" aria-label={t('dashboard.hr.compliance_title')}>
            <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
              <span className="p-1 rounded-lg text-amber-600 bg-amber-50">
                <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              </span>
              <h3 className="text-sm font-bold text-slate-900">
                {t('dashboard.hr.compliance_title')}
              </h3>
            </div>

            <ul className="space-y-3" role="list">
              {alerts.map((alert) => (
                <li
                  key={alert.id}
                  className="p-3.5 rounded-xl border border-amber-200/80 bg-amber-50/40 flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900">{alert.userName}</span>
                    <span className="text-[10px] font-bold text-slate-500">{alert.date}</span>
                  </div>
                  <p className="text-xs text-amber-800 font-medium">{alert.issue}</p>
                  <span className="text-[10px] text-slate-500">{alert.department}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Approvals Card */}
          <div className="bg-gradient-to-br from-blue-900 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-md border border-slate-800">
            <div className="flex items-center gap-2 text-blue-400 mb-3">
              <CalendarDays className="w-5 h-5" aria-hidden="true" />
              <span className="text-xs font-bold uppercase tracking-wider">
                {t('dashboard.hr.approval_hub')}
              </span>
            </div>
            <h4 className="text-lg font-black tracking-tight mb-2">
              {t('dashboard.hr.approval_hub_title')}
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed mb-4">
              {t('dashboard.hr.approval_hub_desc', { count: pending.total })}
            </p>
            <NavLink
              to="/attendance"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-900/40 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900"
              aria-label={t('dashboard.hr.open_queue')}
            >
              <span>{t('dashboard.hr.open_queue')}</span>
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </NavLink>
          </div>
        </div>
      </div>

      {/* 4. Headcount Growth Trend & Company Culture Anniversaries */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7">
          <HeadcountTrendWidget trend={data.headcountTrend} />
        </div>
        <div className="lg:col-span-5">
          <CompanyCultureCard events={data.cultureEvents} />
        </div>
      </div>

      {/* 5. Footer */}
      <EnterpriseFooter />
    </div>
  );
}
