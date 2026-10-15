/**
 * Dashboard Layouts Test Suite
 * M12 Step 5 — i18n + a11y + responsive verification
 *
 * Validates:
 * 1. All 3 layouts (PM/HR/Admin) render without crash
 * 2. i18n keys are present (no fallback string returned)
 * 3. a11y attributes (role, aria-label, aria-live, aria-hidden)
 * 4. Responsive Tailwind classes (grid-cols breakpoints)
 * 5. No `isVi ? 'x' : 'y'` hardcoded strings (i18n clean)
 */
import { describe, it, expect, beforeEach, vi as _vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/i18n';
import { PmDashboardLayout } from './PmDashboardLayout';
import { HrDashboardLayout } from './HrDashboardLayout';
import { AdminDashboardLayout } from './AdminDashboardLayout';
import viBundle from '@/i18n/locales/vi.json';
import enBundle from '@/i18n/locales/en.json';
const vi = viBundle;
const en = enBundle;

// Build a fully-loaded mock dashboard data object
const buildPmData = () => ({
  taskSummary: { total: 50, todo: 5, inProgress: 20, inReview: 3, blocked: 2, done: 20, completionRate: 40, overdueCount: 4, totalStoryPoints: 100, totalEstimatedHours: 200, totalActualHours: 180 },
  urgentTasks: [],
  upcomingTasks: [],
  myWeeklyDone: 8,
  weeklyVelocity: [],
  projectProgress: [{ projectId: 'p1', projectName: 'Platform v3.1', projectColor: '#2563EB', totalTasks: 30, doneTasks: 20, progressPercent: 67, sprints: [] }],
  statusDistribution: [],
  priorityDistribution: [],
  recentActivities: [],
  teamWorkload: [
    { userId: 'u1', userName: 'Nguyen Van A', avatar: null, openTaskCount: 5, totalStoryPoints: 12 },
    { userId: 'u2', userName: 'Tran Thi B', avatar: null, openTaskCount: 3, totalStoryPoints: 8 },
  ],
  activeSprint: null,
  upcomingMeetings: [],
  recentDocuments: [],
  pmKpi: {
    totalProjects: 4,
    activeProjects: 3,
    openTasks: 25,
    blockedTasks: 2,
    overdueTasks: 3,
    teamMembersCount: 12,
    completionRate: 65,
  },
  sprintBurndown: [
    { day: 'T2', ideal: 24, actual: 24 },
    { day: 'T3', ideal: 20, actual: 22 },
    { day: 'CN', ideal: 0, actual: 5 },
  ],
  risks: [
    { id: 'r1', type: 'BLOCKED_TASK' as const, severity: 'HIGH' as const, title: 'Blocked: API Integration', description: 'Need backend team' },
    { id: 'r2', type: 'OVERDUE' as const, severity: 'CRITICAL' as const, title: 'Overdue: Auth Module', description: '5 days late' },
  ],
});

const buildHrData = () => ({
  taskSummary: { total: 50, todo: 0, inProgress: 10, inReview: 0, blocked: 2, done: 30, completionRate: 60, overdueCount: 0, totalStoryPoints: 0, totalEstimatedHours: 0, totalActualHours: 0 },
  workforceSummary: { totalEmployees: 18, activeToday: 15, onLeave: 2, wfhToday: 3, absentUnapproved: 0 },
  attendanceKpi: { attendanceRate: 95, onTimeRate: 88, lateRate: 12, avgWorkHours: 8.2 },
  attendanceDistribution: { onTime: 14, late: 1, veryLate: 0, wfh: 3, absentApproved: 2, absentUnapproved: 0 },
  lateArrivalsByDepartment: [
    { departmentName: 'Engineering', totalMembers: 10, presentCount: 9, lateCount: 1, lateRate: 10, onLeaveCount: 1 },
  ],
  leaveUsageByDepartment: [
    { departmentName: 'Engineering', totalMembers: 10, presentCount: 9, lateCount: 1, lateRate: 10, onLeaveCount: 1 },
  ],
  pendingApprovals: { wfhCount: 2, leaveCount: 1, total: 3 },
  complianceAlerts: [
    { id: 'a1', userName: 'Tran Van Hoang', department: 'Engineering', issue: 'Đi muộn 22 phút', severity: 'MEDIUM' as const, date: '08:52 AM' },
  ],
});

const buildAdminData = () => ({
  taskSummary: { total: 50, todo: 0, inProgress: 10, inReview: 0, blocked: 2, done: 30, completionRate: 60, overdueCount: 0, totalStoryPoints: 0, totalEstimatedHours: 0, totalActualHours: 0 },
  urgentTasks: [],
  upcomingTasks: [],
  myWeeklyDone: 0,
  weeklyVelocity: [],
  projectProgress: [],
  statusDistribution: [],
  priorityDistribution: [],
  recentActivities: [],
  teamWorkload: [],
  activeSprint: null,
  upcomingMeetings: [],
  recentDocuments: [],
  systemHealth: { activeUsers: 18, totalProjects: 4, totalTasks: 50, completedTasks: 30 },
  platformHealth: { activeUsers: 18, activeUsersNow: 14, apiRequestsToday: 18450, errorRateToday: 0.02, dbSize: '24.8 MB', uptime: '99.98%' },
  systemGauges: { cpuUsagePercent: 18, memoryUsagePercent: 42, dbConnectionsActive: 6, dbConnectionsMax: 100, storageUsedGb: 1.4, storageMaxGb: 50 },
  apiLatency: { p50: 12, p95: 45, p99: 115 },
  errorLogs: [
    { id: 'e1', timestamp: new Date().toISOString(), level: 'WARN' as const, source: 'GeoValidationService', message: 'GPS off by 512m', resolved: true },
  ],
  configStatus: { officeName: 'FPT Complex', gpsRadiusMeters: 500, ipRangesCount: 2, workHours: '08:00 - 17:30' },
});

// Helper: render layout with i18n provider and router
const renderWithI18n = (component: React.ReactNode) =>
  render(
    <I18nextProvider i18n={i18n}>
      <MemoryRouter>{component}</MemoryRouter>
    </I18nextProvider>,
  );

beforeEach(() => {
  // Reset to Vietnamese
  i18n.changeLanguage('vi');
});

describe('M12 Step 5: i18n + a11y + responsive', () => {
  describe('PmDashboardLayout', () => {
    it('renders in Vietnamese with all required i18n keys', () => {
      i18n.changeLanguage('vi');
      renderWithI18n(<PmDashboardLayout data={buildPmData() as any} userName="Test PM" />);

      // Check that critical VI keys are rendered
      expect(screen.getByText(vi.dashboard.pm.managed_projects)).toBeInTheDocument();
      expect(screen.getByText(vi.dashboard.pm.completion_rate)).toBeInTheDocument();
      expect(screen.getByText(vi.dashboard.pm.burndown_title)).toBeInTheDocument();
      expect(screen.getByText(vi.dashboard.pm.ideal)).toBeInTheDocument();
      expect(screen.getByText(vi.dashboard.pm.actual_remaining)).toBeInTheDocument();
    });

    it('renders in English with all required i18n keys', () => {
      i18n.changeLanguage('en');
      renderWithI18n(<PmDashboardLayout data={buildPmData() as any} userName="Test PM" />);

      expect(screen.getByText(en.dashboard.pm.managed_projects)).toBeInTheDocument();
      expect(screen.getByText(en.dashboard.pm.completion_rate)).toBeInTheDocument();
      expect(screen.getByText(en.dashboard.pm.burndown_title)).toBeInTheDocument();
    });

    it('has responsive grid breakpoints (2/3/6 cols)', () => {
      i18n.changeLanguage('vi');
      const { container } = renderWithI18n(<PmDashboardLayout data={buildPmData() as any} userName="Test PM" />);
      const kpiGrid = container.querySelector('[role="region"][aria-label]');
      expect(kpiGrid?.className).toMatch(/grid-cols-2/);
      expect(kpiGrid?.className).toMatch(/md:grid-cols-3/);
      expect(kpiGrid?.className).toMatch(/lg:grid-cols-6/);
    });

    it('has a11y attributes (role=region, aria-label, aria-hidden on icons)', () => {
      i18n.changeLanguage('vi');
      const { container } = renderWithI18n(<PmDashboardLayout data={buildPmData() as any} userName="Test PM" />);
      expect(container.querySelector('[role="region"]')).toBeInTheDocument();
      const hiddenIcons = container.querySelectorAll('[aria-hidden="true"]');
      expect(hiddenIcons.length).toBeGreaterThan(5);
    });

    it('has aria-live on KPI numbers (screen reader announces updates)', () => {
      i18n.changeLanguage('vi');
      const { container } = renderWithI18n(<PmDashboardLayout data={buildPmData() as any} userName="Test PM" />);
      const liveRegions = container.querySelectorAll('[aria-live="polite"]');
      expect(liveRegions.length).toBeGreaterThanOrEqual(6);
    });

    it('uses ul/li for list semantics (risks + workload)', () => {
      i18n.changeLanguage('vi');
      const { container } = renderWithI18n(<PmDashboardLayout data={buildPmData() as any} userName="Test PM" />);
      const lists = container.querySelectorAll('ul[role="list"]');
      expect(lists.length).toBeGreaterThanOrEqual(2);
    });

    it('does not contain raw isVi ternary or hardcoded VI/EN strings', () => {
      i18n.changeLanguage('vi');
      const { container } = renderWithI18n(<PmDashboardLayout data={buildPmData() as any} userName="Test PM" />);
      const html = container.innerHTML;
      // No leaked "isVi" identifier, no English in VI mode
      expect(html).not.toMatch(/isVi/);
      expect(html).not.toContain('Managed Projects'); // en fallback shouldn't show
    });

    it('all 7 PMI keys exist in both VI and EN', () => {
      ['vi', 'en'].forEach((lng) => {
        const bundle = lng === 'vi' ? vi : en;
        expect(bundle.dashboard.pm.managed_projects).toBeTruthy();
        expect(bundle.dashboard.pm.open_tasks).toBeTruthy();
        expect(bundle.dashboard.pm.blocked_tasks).toBeTruthy();
        expect(bundle.dashboard.pm.overdue_tasks).toBeTruthy();
        expect(bundle.dashboard.pm.team_members).toBeTruthy();
        expect(bundle.dashboard.pm.completion_rate).toBeTruthy();
        expect(bundle.dashboard.pm.burndown_title).toBeTruthy();
      });
    });
  });

  describe('HrDashboardLayout', () => {
    it('renders in Vietnamese with all required i18n keys', () => {
      i18n.changeLanguage('vi');
      renderWithI18n(<HrDashboardLayout data={buildHrData() as any} userName="Test HR" />);

      expect(screen.getByText(vi.dashboard.hr.total_workforce)).toBeInTheDocument();
      expect(screen.getByText(vi.dashboard.hr.distribution_title)).toBeInTheDocument();
      expect(screen.getByText(vi.dashboard.hr.approval_hub_title)).toBeInTheDocument();
    });

    it('renders in English with all required i18n keys', () => {
      i18n.changeLanguage('en');
      renderWithI18n(<HrDashboardLayout data={buildHrData() as any} userName="Test HR" />);

      expect(screen.getByText(en.dashboard.hr.total_workforce)).toBeInTheDocument();
      expect(screen.getByText(en.dashboard.hr.distribution_title)).toBeInTheDocument();
    });

    it('has responsive grid breakpoints (1/2/4 cols)', () => {
      i18n.changeLanguage('vi');
      const { container } = renderWithI18n(<HrDashboardLayout data={buildHrData() as any} userName="Test HR" />);
      const kpiGrid = container.querySelector('[role="region"][aria-label]');
      expect(kpiGrid?.className).toMatch(/grid-cols-1/);
      expect(kpiGrid?.className).toMatch(/sm:grid-cols-2/);
      expect(kpiGrid?.className).toMatch(/lg:grid-cols-4/);
    });

    it('uses semantic progressbar for dept attendance bars', () => {
      i18n.changeLanguage('vi');
      const { container } = renderWithI18n(<HrDashboardLayout data={buildHrData() as any} userName="Test HR" />);
      const progressBars = container.querySelectorAll('[role="progressbar"]');
      expect(progressBars.length).toBeGreaterThan(0);
      progressBars.forEach((bar) => {
        expect(bar.getAttribute('aria-valuenow')).toBeTruthy();
        expect(bar.getAttribute('aria-valuemin')).toBe('0');
        expect(bar.getAttribute('aria-valuemax')).toBeTruthy();
      });
    });

    it('has focus ring on NavLink buttons (a11y keyboard nav)', () => {
      i18n.changeLanguage('vi');
      const { container } = renderWithI18n(<HrDashboardLayout data={buildHrData() as any} userName="Test HR" />);
      const navLinks = container.querySelectorAll('a[href="/attendance"]');
      expect(navLinks.length).toBeGreaterThanOrEqual(2);
      navLinks.forEach((link) => {
        expect(link.className).toMatch(/focus:ring/);
        expect(link.className).toMatch(/focus:outline-none/);
      });
    });

    it('all HR i18n keys exist in both VI and EN', () => {
      ['vi', 'en'].forEach((lng) => {
        const bundle = lng === 'vi' ? vi : en;
        expect(bundle.dashboard.hr.total_workforce).toBeTruthy();
        expect(bundle.dashboard.hr.present_today).toBeTruthy();
        expect(bundle.dashboard.hr.leave_wfh).toBeTruthy();
        expect(bundle.dashboard.hr.pending_approvals).toBeTruthy();
        expect(bundle.dashboard.hr.distribution_title).toBeTruthy();
        expect(bundle.dashboard.hr.dept_breakdown).toBeTruthy();
        expect(bundle.dashboard.hr.approval_hub_title).toBeTruthy();
      });
    });
  });

  describe('AdminDashboardLayout', () => {
    it('renders in Vietnamese with all required i18n keys', () => {
      i18n.changeLanguage('vi');
      renderWithI18n(<AdminDashboardLayout data={buildAdminData() as any} userName="Test Admin" />);

      expect(screen.getByText(vi.dashboard.admin.system_users)).toBeInTheDocument();
      expect(screen.getByText(vi.dashboard.admin.infrastructure)).toBeInTheDocument();
      expect(screen.getByText(vi.dashboard.admin.latency)).toBeInTheDocument();
      expect(screen.getByText(vi.dashboard.admin.error_log)).toBeInTheDocument();
    });

    it('renders in English with all required i18n keys', () => {
      i18n.changeLanguage('en');
      renderWithI18n(<AdminDashboardLayout data={buildAdminData() as any} userName="Test Admin" />);

      expect(screen.getByText(en.dashboard.admin.system_users)).toBeInTheDocument();
      expect(screen.getByText(en.dashboard.admin.infrastructure)).toBeInTheDocument();
    });

    it('has responsive grid breakpoints (2/3/6 cols)', () => {
      i18n.changeLanguage('vi');
      const { container } = renderWithI18n(<AdminDashboardLayout data={buildAdminData() as any} userName="Test Admin" />);
      const kpiGrid = container.querySelector('[role="region"][aria-label]');
      expect(kpiGrid?.className).toMatch(/grid-cols-2/);
      expect(kpiGrid?.className).toMatch(/md:grid-cols-3/);
      expect(kpiGrid?.className).toMatch(/lg:grid-cols-6/);
    });

    it('uses semantic progressbar for system gauges', () => {
      i18n.changeLanguage('vi');
      const { container } = renderWithI18n(<AdminDashboardLayout data={buildAdminData() as any} userName="Test Admin" />);
      const progressBars = container.querySelectorAll('[role="progressbar"]');
      // CPU + Memory + DB Pool + Storage = 4 gauges
      expect(progressBars.length).toBeGreaterThanOrEqual(4);
    });

    it('uses semantic <time> element for log timestamps', () => {
      i18n.changeLanguage('vi');
      const { container } = renderWithI18n(<AdminDashboardLayout data={buildAdminData() as any} userName="Test Admin" />);
      const times = container.querySelectorAll('time[datetime]');
      expect(times.length).toBeGreaterThanOrEqual(1);
    });

    it('uses semantic <dl>/<dt>/<dd> for config status (term-description pairs)', () => {
      i18n.changeLanguage('vi');
      const { container } = renderWithI18n(<AdminDashboardLayout data={buildAdminData() as any} userName="Test Admin" />);
      const dl = container.querySelector('dl');
      expect(dl).toBeInTheDocument();
      expect(dl?.querySelectorAll('dt').length).toBeGreaterThan(0);
      expect(dl?.querySelectorAll('dd').length).toBeGreaterThan(0);
    });

    it('all Admin i18n keys exist in both VI and EN', () => {
      ['vi', 'en'].forEach((lng) => {
        const bundle = lng === 'vi' ? vi : en;
        expect(bundle.dashboard.admin.system_users).toBeTruthy();
        expect(bundle.dashboard.admin.api_requests).toBeTruthy();
        expect(bundle.dashboard.admin.uptime_sla).toBeTruthy();
        expect(bundle.dashboard.admin.db_size).toBeTruthy();
        expect(bundle.dashboard.admin.total_projects).toBeTruthy();
        expect(bundle.dashboard.admin.total_tasks).toBeTruthy();
        expect(bundle.dashboard.admin.infrastructure).toBeTruthy();
        expect(bundle.dashboard.admin.latency).toBeTruthy();
        expect(bundle.dashboard.admin.error_log).toBeTruthy();
        expect(bundle.dashboard.admin.config_status).toBeTruthy();
      });
    });
  });
});
