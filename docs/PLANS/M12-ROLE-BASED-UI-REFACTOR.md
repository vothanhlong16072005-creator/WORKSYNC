# M12 — Role-Based UI Refactor Plan (Bilingual VN/EN)
> **Phương án**: Kết hợp **Option A (Layout riêng)** + **Option B (Ẩn widgets theo role)**
> **Mục tiêu**: 4 role × 2 module chính (Dashboard + Attendance) có trải nghiệm thực sự khác biệt và phù hợp nghiệp vụ
> **Ngày tạo**: 2026-10-14
> **Tác giả**: AI Plan (theo yêu cầu user)
> **Lưu ý**: File này **MỚI**, không sửa đổi bất kỳ file docs nào khác

---

## 0. TỔNG QUAN & BỐI CẢNH

### Vấn đề hiện tại
Codebase có **4 roles (ADMIN, HR, PM, EMPLOYEE)** nhưng UI gần như **1 layout duy nhất cho tất cả**, chỉ ẩn/hiện vài nút theo role:

- **Backend**: 4 endpoint dashboard riêng biệt đã có (`/dashboard/employee`, `/pm`, `/hr`, `/admin`) + `/attendance/*` có RBAC guards
- **Frontend**: 
  - `DashboardPage.tsx` gọi `/dashboard/me` rồi hiển thị **1 layout chung** (Employee-style)
  - `AttendancePage.tsx` chỉ check `isManagerOrAdmin` để ẩn/hiện tab "Approvals"
  - **EMPLOYEE thấy**: "Project Portfolio", "Team workload", "Sprint velocity" → vô nghĩa với họ
  - **HR/PM/ADMIN thấy**: cùng widget cá nhân, không có bảng quản lý

### Bằng chứng code (đã đọc)
1. `backend/src/dashboard/dashboard.service.ts:429` — `getPmDashboard()` **placeholder**, trả về `getEmployeeDashboard()`:
   ```ts
   async getPmDashboard(userId: string): Promise<PmDashboardDto> {
     return this.getEmployeeDashboard(userId);  // ← PLACEHOLDER
   }
   ```
2. `backend/src/dashboard/dashboard.service.ts:435` — `getHrDashboard()` chỉ trả 1 task summary rỗng
3. `backend/src/dashboard/dashboard.service.ts:456` — `getAdminDashboard()` chỉ thêm `systemHealth`, chưa có real admin metrics
4. `frontend/src/features/dashboard/components/DashboardPage.tsx` — chưa phân role
5. `frontend/src/components/layout/Sidebar.tsx` — **chưa filter menu theo role** (mọi role thấy Settings, Documents, v.v.)

### Mục tiêu M12
- ✅ 4 dashboard thực sự khác biệt (Employee / PM / HR / Admin)
- ✅ 4 attendance view thực sự khác biệt (My / Team / Company / Settings)
- ✅ Sidebar filter theo role
- ✅ Permission guard ở frontend (chặn truy cập trước khi gọi API)
- ✅ 100% giữ nguyên design language **Modern Enterprise SaaS + Bauhaus Accents** (DESIGN.md)
- ✅ 100% Bilingual VN/EN
- ✅ TDD-first: mỗi service/component có unit test trước khi hoàn thành
- ✅ Không phá vỡ 161 tests đang pass

---

## 1. CHIẾN LƯỢC: LAYOUT RIÊNG + ẨN WIDGETS

### Tại sao kết hợp cả 2?

| Tiêu chí | Layout riêng (A) | Ẩn widgets (B) | Kết hợp A+B |
|----------|------------------|----------------|------------|
| PM có cái nhìn tổng quan team | ✅ | ❌ | ✅ |
| HR có bảng chấm công riêng | ✅ | ⚠️ | ✅ |
| Admin có panel cấu hình | ✅ | ❌ | ✅ |
| Employee giao diện gọn gàng | ✅ | ⚠️ | ✅ |
| Tái sử dụng components | ❌ | ✅ | ✅ (shared widgets) |
| Thời gian dev | Cao | Thấp | Trung bình |

**Kết luận**: Dùng **A cho top-level structure** (4 layout khác nhau) + **B cho cùng loại widget** (trong layout, ẩn widget không liên quan — ví dụ PM Dashboard ẩn "Personal Leave Balance" nếu không cần).

### Pattern thiết kế: `RoleAwareLayout` + `WidgetRegistry`

```tsx
// Pattern 1: Top-level switch theo role
<RoleBasedRouter>
  {role === 'EMPLOYEE' && <EmployeeDashboardLayout />}
  {role === 'PM' && <PmDashboardLayout />}
  {role === 'HR' && <HrDashboardLayout />}
  {role === 'ADMIN' && <AdminDashboardLayout />}
</RoleBasedRouter>

// Pattern 2: Shared widget với visibility rule
<DashboardWidget id="team-workload" roles={['PM', 'ADMIN']}>
  <TeamWorkloadCard />
</DashboardWidget>
```

---

## 2. MỤC TIÊU CHI TIẾT THEO ROLE

### 2.1. EMPLOYEE Dashboard (Mở rộng từ hiện tại)
**Loại bỏ**: Team workload widget, Project portfolio nâng cao, Sprint management
**Giữ nguyên**: 
- Hero banner cá nhân hóa
- Today Attendance (vừa có GD1+2)
- 6 KPI ribbon cá nhân
- Urgent tasks + Next 7 days
- 7-day velocity
- Active sprint (của mình)
- Personal upcoming meetings
- Recent documents của mình
- Personal recent activities

### 2.2. PM Dashboard (Mới, thay placeholder)
**Focus**: Quản lý dự án + team workload + sprint burndown
- Hero banner "PM Workspace"
- 6 KPI ribbon **team-level** (Active projects, Open tasks, Blocked tasks, Team members, Sprint burndown rate, Overdue across team)
- **Team Velocity Chart** (so sánh giữa các sprint)
- **Sprint Burndown Chart** (Recharts line chart, ideal vs actual)
- **Project Portfolio** (multi-project cards, progress %)
- **Team Workload** (heatmap theo assignee, story points)
- **Team Members Status** (online/offline, current task)
- **Risks & Blockers** (tasks BLOCKED > 3 ngày)
- **Sprint Health Indicators** (velocity trend, scope creep)

### 2.3. HR Dashboard (Mới, thay 1 task summary)
**Focus**: Nhân sự + chấm công + quỹ phép
- Hero banner "HR Control Center"
- 6 KPI ribbon **HR-level** (Total employees, Active today, Late today, On leave, Pending approvals, Avg attendance rate)
- **Company Attendance Donut** (On-time / Late / Absent / WFH / Leave)
- **Late Arrivals Heatmap** (theo phòng ban, theo ngày trong tuần)
- **Leave Usage Chart** (quỹ phép đã dùng, còn lại, theo phòng ban)
- **Headcount Trend** (30 ngày, onboarding/resignation)
- **Pending Approvals** (WFH, Leave, Early Leave, Overtime)
- **Compliance Alerts** (đi muộn > 3 lần/tháng, về sớm không phép)

### 2.4. ADMIN Dashboard (Mới, thay systemHealth tối thiểu)
**Focus**: System health + platform metrics + security
- Hero banner "System Command Center"
- 6 KPI ribbon **system-level** (Active users, API requests/day, Error rate, DB size, Storage, Uptime)
- **System Health Gauges** (Recharts radial bar: CPU, Memory, DB)
- **Active Users Chart** (24h line, real-time via WebSocket nếu có)
- **API Latency Distribution** (p50, p95, p99)
- **Error Logs Feed** (last 10 errors, click to view detail)
- **Configuration Quick Access** (link to System Config page)
- **Recent Admin Actions** (audit log)

### 2.5. Attendance — 4 view mode

| View | Path | Roles | Mục đích |
|------|------|-------|----------|
| **My Attendance** | `/attendance/my` | All (default) | Cá nhân: Today timeline, heatmap, stats (đã có ở GD1+2) |
| **Team Attendance** | `/attendance/team` | PM, HR, ADMIN | Bảng thành viên trong team, filter theo project/ngày/trạng thái |
| **Company Attendance** | `/attendance/company` | HR, ADMIN | Bảng toàn công ty, drill-down theo phòng ban |
| **Attendance Settings** | `/attendance/settings` | ADMIN | Cấu hình IP/GPS/Work-hours/Office presets |

**Role visibility**:
- EMPLOYEE chỉ thấy "My"
- PM thấy "My" + "Team" (team = projects PM sở hữu)
- HR thấy "My" + "Team" (all teams) + "Company"
- ADMIN thấy tất cả + "Settings"

---

## 3. THIẾT KẾ KỸ THUẬT

### 3.1. Backend Changes

#### 3.1.1. Cấu trúc thư mục (mới)
```
backend/src/dashboard/
├── dashboard.controller.ts          (cập nhật, thêm guard chi tiết)
├── dashboard.service.ts             (refactor lớn, tách 4 service con)
├── dashboard.module.ts
├── services/
│   ├── employee-dashboard.service.ts   (tách từ service hiện tại)
│   ├── pm-dashboard.service.ts         (MỚI, thay placeholder)
│   ├── hr-dashboard.service.ts         (MỚI, thay 1 task summary)
│   ├── admin-dashboard.service.ts      (MỚI, mở rộng từ systemHealth)
│   └── shared-dashboard.service.ts     (helper: weekly velocity, distribution)
├── dto/
│   ├── dashboard-response.dto.ts    (cập nhật: thêm PM/HR/Admin DTOs)
│   ├── pm-dashboard.dto.ts          (MỚI)
│   ├── hr-dashboard.dto.ts          (MỚI)
│   └── admin-dashboard.dto.ts       (MỚI)
└── __tests__/
    ├── pm-dashboard.service.spec.ts
    ├── hr-dashboard.service.spec.ts
    └── admin-dashboard.service.spec.ts
```

#### 3.1.2. DTO mới — ví dụ PM Dashboard
```typescript
// pm-dashboard.dto.ts
export interface PmDashboardDto {
  workspaceSummary: {
    totalProjects: number;
    activeProjects: number;
    teamMembers: number;
    activeSprints: number;
  };
  kpiRibbon: {
    openTasks: number;
    blockedTasks: number;
    overdueTasks: number;
    completionRate: number;
    avgSprintProgress: number;
    teamUtilization: number;       // % story points done vs capacity
  };
  projectPortfolio: ProjectSummaryDto[];   // NEW: PM-specific
  sprintHealth: SprintHealthDto[];         // NEW
  teamWorkload: TeamMemberWorkloadDto[];   // EXPANDED
  risks: RiskAlertDto[];                   // NEW
  recentApprovals: ApprovalQueueItemDto[]; // NEW: WFH/Leave của team
}

export interface ProjectSummaryDto {
  id: string;
  name: string;
  color: string;
  totalTasks: number;
  doneTasks: number;
  progressPercent: number;
  teamSize: number;
  activeSprint: {
    name: string;
    progress: number;
    daysRemaining: number;
  };
}

export interface SprintHealthDto {
  id: string;
  name: string;
  projectName: string;
  idealBurndown: number[];   // 7 days
  actualBurndown: number[];
  scopeChange: number;       // story points added mid-sprint
  isHealthy: boolean;        // AI rule-based
}

export interface RiskAlertDto {
  type: 'BLOCKED_TASK' | 'OVERDUE' | 'LATE_ASSIGNEE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  link?: string;
}
```

#### 3.1.3. DTO mới — HR Dashboard
```typescript
// hr-dashboard.dto.ts
export interface HrDashboardDto {
  workforceSummary: {
    totalEmployees: number;
    activeToday: number;
    onLeave: number;
    wfhToday: number;
    absentUnapproved: number;
  };
  attendanceKpi: {
    attendanceRate: number;          // % present / total
    onTimeRate: number;
    lateRate: number;
    avgWorkHours: number;
  };
  attendanceDistribution: {
    onTime: number;
    late: number;
    veryLate: number;
    wfh: number;
    businessTrip: number;
    absentApproved: number;
    absentUnapproved: number;
    earlyLeaveApproved: number;
    earlyLeaveUnapproved: number;
  };
  lateArrivalsByDepartment: DepartmentMetricDto[];
  leaveUsageByDepartment: DepartmentMetricDto[];
  pendingApprovals: {
    wfh: number;
    leave: number;
    earlyLeave: number;
    overtime: number;
  };
  complianceAlerts: ComplianceAlertDto[];   // NEW
}
```

#### 3.1.4. DTO mới — Admin Dashboard
```typescript
// admin-dashboard.dto.ts
export interface AdminDashboardDto {
  platformHealth: {
    activeUsers: number;
    activeUsersNow: number;          // last 15 min
    apiRequestsToday: number;
    errorRateToday: number;
    dbSize: string;                  // human-readable
    uptime: string;                  // human-readable
  };
  systemGauges: {
    cpu: number;                      // 0-100
    memory: number;
    dbConnections: number;
    storageUsed: number;
  };
  apiLatency: {                       // NEW
    p50: number;
    p95: number;
    p99: number;
  };
  errorLogs: ErrorLogEntryDto[];     // NEW
  recentAdminActions: AuditLogDto[]; // NEW
  configStatus: {                     // NEW
    ipRangesConfigured: number;
    officePresetsActive: number;
    workHoursStart: string;
    workHoursEnd: string;
  };
}
```

#### 3.1.5. Endpoints mới (HR/PM/Admin)
- `GET /api/dashboard/employee` (đã có)
- `GET /api/dashboard/pm` (đã có — sửa từ placeholder)
- `GET /api/dashboard/hr` (đã có — sửa)
- `GET /api/dashboard/admin` (đã có — sửa)
- `GET /api/dashboard/me` (đã có — đã switch theo role)
- `GET /api/attendance/team` (MỚI, PM/HR/ADMIN)
- `GET /api/attendance/company` (MỚI, HR/ADMIN)
- `GET /api/attendance/settings` (MỚI, ADMIN)
- `PATCH /api/attendance/settings` (MỚI, ADMIN)

#### 3.1.6. SystemConfig model update (cho Attendance Settings)
- Hiện tại chỉ có 1 row duy nhất (singleton) — cần giữ nguyên
- Thêm 1 model mới: `OfficePreset` lưu DB để Admin quản lý runtime (thay vì hardcode `office-presets.ts`)

### 3.2. Frontend Changes

#### 3.2.1. Cấu trúc thư mục
```
frontend/src/features/dashboard/components/
├── DashboardPage.tsx              (cập nhật: switch theo role)
├── layouts/
│   ├── EmployeeDashboardLayout.tsx
│   ├── PmDashboardLayout.tsx
│   ├── HrDashboardLayout.tsx
│   └── AdminDashboardLayout.tsx
├── widgets/                        (shared, có visibility rule)
│   ├── HeroBanner.tsx              (refactor từ code cũ)
│   ├── KpiRibbon.tsx               (refactor)
│   ├── UrgentTasksList.tsx
│   ├── WeeklyVelocityChart.tsx
│   ├── TeamWorkloadCard.tsx        (NEW, PM)
│   ├── SprintBurndownChart.tsx     (NEW, PM)
│   ├── ProjectPortfolioCard.tsx    (refactor, PM)
│   ├── AttendanceDistributionDonut.tsx (NEW, HR)
│   ├── LeaveUsageChart.tsx         (NEW, HR)
│   ├── HeadcountTrendChart.tsx     (NEW, HR)
│   ├── SystemHealthGauges.tsx      (NEW, ADMIN)
│   ├── ApiLatencyChart.tsx         (NEW, ADMIN)
│   ├── ErrorLogsFeed.tsx           (NEW, ADMIN)
│   └── RoleAwareWidget.tsx         (NEW, wrapper)
├── stores/
│   └── dashboard.store.ts          (refactor, multi-role)
└── api/
    └── dashboard.api.ts            (thêm 4 endpoint methods)

frontend/src/features/attendance/components/
├── AttendancePage.tsx              (cập nhật: 4 sub-routes)
├── AttendanceMyView.tsx            (refactor từ code cũ)
├── AttendanceTeamView.tsx          (NEW, PM/HR/ADMIN)
├── AttendanceCompanyView.tsx       (NEW, HR/ADMIN)
├── AttendanceSettingsView.tsx      (NEW, ADMIN)
└── components/
    ├── AttendanceTable.tsx         (NEW, shared cho team/company)
    ├── AttendanceFilters.tsx       (NEW, date range, dept, status)
    └── AttendanceEditModal.tsx     (NEW, HR edit thủ công)

frontend/src/components/layout/
├── Sidebar.tsx                     (cập nhật: filter theo role)
├── TopBar.tsx                      (cập nhật: hiển thị role badge)
└── PermissionGuard.tsx             (NEW, wrap component với role check)
```

#### 3.2.2. Component mới quan trọng

**`RoleAwareWidget.tsx`**
```tsx
interface Props {
  allowedRoles: Array<'EMPLOYEE' | 'PM' | 'HR' | 'ADMIN'>;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export function RoleAwareWidget({ allowedRoles, fallback = null, children }: Props) {
  const { user } = useAuthStore();
  if (!user || !allowedRoles.includes(user.role as Role)) {
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
```

**`PermissionGuard.tsx`**
```tsx
interface Props {
  requiredRoles: Array<Role>;
  redirectTo?: string;
  children: React.ReactNode;
}

export function PermissionGuard({ requiredRoles, redirectTo = '/dashboard', children }: Props) {
  const { user } = useAuthStore();
  const location = useLocation();
  if (!user || !requiredRoles.includes(user.role as Role)) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }
  return <>{children}</>;
}
```

**`DashboardPage.tsx` (refactored)**
```tsx
export function DashboardPage() {
  const { user } = useAuthStore();
  if (!user) return <Loading />;

  return (
    <Suspense fallback={<DashboardSkeleton />}>
      {user.role === 'EMPLOYEE' && <EmployeeDashboardLayout />}
      {user.role === 'PM' && <PmDashboardLayout />}
      {user.role === 'HR' && <HrDashboardLayout />}
      {user.role === 'ADMIN' && <AdminDashboardLayout />}
    </Suspense>
  );
}
```

**`AttendancePage.tsx` (refactored)**
```tsx
export function AttendancePage() {
  return (
    <Routes>
      <Route index element={<Navigate to="my" replace />} />
      <Route path="my" element={<AttendanceMyView />} />
      <Route
        path="team"
        element={
          <PermissionGuard requiredRoles={['PM', 'HR', 'ADMIN']}>
            <AttendanceTeamView />
          </PermissionGuard>
        }
      />
      <Route
        path="company"
        element={
          <PermissionGuard requiredRoles={['HR', 'ADMIN']}>
            <AttendanceCompanyView />
          </PermissionGuard>
        }
      />
      <Route
        path="settings"
        element={
          <PermissionGuard requiredRoles={['ADMIN']}>
            <AttendanceSettingsView />
          </PermissionGuard>
        }
      />
    </Routes>
  );
}
```

**`Sidebar.tsx` (refactored)**
```tsx
const navItemsByRole: Record<Role, NavItem[]> = {
  EMPLOYEE: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: CheckSquare, label: 'Tasks', path: '/tasks' },
    { icon: CalendarClock, label: 'Attendance', path: '/attendance/my' },
    { icon: Video, label: 'Meetings', path: '/meetings' },
    { icon: FileText, label: 'Documents', path: '/documents' },
  ],
  PM: [
    /* + Project Management, Team Attendance, Approvals */
  ],
  HR: [
    /* + HR Dashboard, Company Attendance, Leave Management */
  ],
  ADMIN: [
    /* + System Health, User Management, Settings */
  ],
};
```

#### 3.2.3. Widget visibility matrix (Dashboard)

| Widget | EMP | PM | HR | ADMIN |
|--------|-----|----|----|-------|
| Hero Banner | ✅ | ✅ | ✅ | ✅ |
| My Today Attendance | ✅ | ✅ | ✅ | ✅ |
| My 6 KPI Ribbon | ✅ | ✅ | ✅ | ✅ |
| Urgent Tasks (cá nhân) | ✅ | ✅ | ✅ | ✅ |
| My 7-day Velocity | ✅ | ✅ | ✅ | ✅ |
| Active Sprint (của tôi) | ✅ | ✅ | ✅ | ✅ |
| Project Portfolio (của tôi) | ✅ | ✅ | ✅ | ✅ |
| Personal Leave Balance | ✅ | ✅ | ✅ | ✅ |
| **Team KPI Ribbon** | ❌ | ✅ | ✅ | ✅ |
| **Team Velocity** | ❌ | ✅ | ⚠️ | ⚠️ |
| **Sprint Burndown** | ❌ | ✅ | ❌ | ❌ |
| **Team Workload** | ❌ | ✅ | ⚠️ | ✅ |
| **Project Portfolio (multi)** | ❌ | ✅ | ⚠️ | ✅ |
| **Sprint Health** | ❌ | ✅ | ❌ | ❌ |
| **Risks & Blockers** | ❌ | ✅ | ⚠️ | ✅ |
| **HR KPI Ribbon** | ❌ | ❌ | ✅ | ✅ |
| **Attendance Distribution** | ❌ | ❌ | ✅ | ✅ |
| **Late Heatmap** | ❌ | ❌ | ✅ | ✅ |
| **Leave Usage by Dept** | ❌ | ❌ | ✅ | ✅ |
| **Headcount Trend** | ❌ | ❌ | ✅ | ✅ |
| **Pending Approvals** | ❌ | ⚠️ | ✅ | ✅ |
| **Compliance Alerts** | ❌ | ❌ | ✅ | ✅ |
| **Admin KPI Ribbon** | ❌ | ❌ | ❌ | ✅ |
| **System Health Gauges** | ❌ | ❌ | ❌ | ✅ |
| **API Latency** | ❌ | ❌ | ❌ | ✅ |
| **Error Logs Feed** | ❌ | ❌ | ❌ | ✅ |
| **Recent Admin Actions** | ❌ | ❌ | ❌ | ✅ |

> ⚠️ = Optional (ẩn theo context)

---

## 4. PHASE BREAKDOWN & MILESTONES

> **Nguyên tắc**: TDD-first (test trước → code sau), mỗi milestone có verification gate

### Phase 1: Backend Dashboard Services (4-5 ngày)
- **1.1** Tách `EmployeeDashboardService` từ code hiện tại (refactor an toàn, không phá tests)
- **1.2** Tạo `SharedDashboardService` (helper cho weekly velocity, distribution)
- **1.3** Tạo `PmDashboardService` (TDD: 8-10 tests) — team workload, sprint health, project portfolio
- **1.4** Tạo `HrDashboardService` (TDD: 8-10 tests) — attendance summary, leave usage, compliance
- **1.5** Tạo `AdminDashboardService` (TDD: 6-8 tests) — system health, error logs
- **1.6** Update DTO files + Controller (giữ 4 endpoints, sửa logic `/me`)
- **1.7** Update `attendance.service.ts` thêm `getTeamAttendance(userId, filter)` + `getCompanyAttendance(filter)`
- **1.8** Update `attendance.controller.ts` thêm 2 endpoints `/team`, `/company`
- **1.9** Tests + Build verify: target **195+ tests pass** (tăng +34 từ 161)

### Phase 2: Frontend Role-Aware Infrastructure (2-3 ngày)
- **2.1** Tạo `PermissionGuard` + `RoleAwareWidget`
- **2.2** Update `auth.store.ts` — thêm `hasRole(roles[])`, `hasAnyRole()`
- **2.3** Refactor `Sidebar.tsx` filter menu theo role
- **2.4** Refactor `TopBar.tsx` hiển thị role badge
- **2.5** Tests: PermissionGuard.spec.tsx (4 tests), useAuth.role.spec.ts (6 tests)

### Phase 3: Frontend 4 Dashboard Layouts (6-8 ngày)
- **3.1** Refactor `DashboardPage.tsx` thành router switch theo role
- **3.2** Tạo `EmployeeDashboardLayout` (tái sử dụng code hiện tại + thêm skeleton states)
- **3.3** Tạo `PmDashboardLayout` + 4 widget mới (SprintBurndown, TeamWorkload, SprintHealth, RiskAlerts)
- **3.4** Tạo `HrDashboardLayout` + 3 widget mới (AttendanceDistribution, LeaveUsage, HeadcountTrend)
- **3.5** Tạo `AdminDashboardLayout` + 3 widget mới (SystemHealthGauges, ApiLatency, ErrorLogsFeed)
- **3.6** Tests: mỗi widget có `.spec.tsx` riêng (2-3 tests/widget = ~24 tests)
- **3.7** Tests: mỗi layout `.spec.tsx` (1-2 tests = 8 tests)

### Phase 4: Frontend 4 Attendance Views (4-5 ngày)
- **4.1** Refactor `AttendancePage.tsx` thành sub-routes (`/my`, `/team`, `/company`, `/settings`)
- **4.2** Tách `AttendanceMyView` từ code hiện tại (refactor an toàn)
- **4.3** Tạo `AttendanceTeamView` (PM/HR/ADMIN) + `AttendanceTable` + `AttendanceFilters`
- **4.4** Tạo `AttendanceCompanyView` (HR/ADMIN) + drill-down theo department
- **4.5** Tạo `AttendanceSettingsView` (ADMIN) — form cấu hình IP/GPS/Work-hours/Office presets
- **4.6** Tạo `AttendanceEditModal` (HR) — edit thủ công với audit log
- **4.7** Tests: mỗi view có `.spec.tsx` (~12 tests tổng)

### Phase 5: Bilingual & Polish (2-3 ngày)
- **5.1** Cập nhật `vi.json` + `en.json` cho tất cả widget mới
- **5.2** Verify design token (Bauhaus colors, rounded-2xl, shadow-sm) trên widget mới
- **5.3** Accessibility: ARIA labels, keyboard navigation cho charts
- **5.4** Responsive: tablet (768px) + mobile (375px) cho layout mới
- **5.5** Loading skeletons + error states cho 4 dashboard + 4 attendance view
- **5.6** Visual regression test qua browser subagent (chụp screenshot 4 role)

### Phase 6: Integration & E2E (2-3 ngày)
- **6.1** Manual test: đăng nhập 4 role khác nhau, kiểm tra từng route
- **6.2** Verify permission guard hoạt động (gõ URL trực tiếp vào `/attendance/settings` với role EMPLOYEE → redirect)
- **6.3** Verify backend RBAC vẫn hoạt động (frontend không bypass được)
- **6.4** E2E test: HR duyệt WFH → PM thấy trong team attendance
- **6.5** Performance: thời gian load dashboard < 2s với dataset 200 users + 1000 tasks

### **TỔNG THỜI GIAN ƯỚC TÍNH: 20-27 ngày làm việc (4-5 tuần)**

---

## 5. KẾ HOẠCH TEST (TDD-first)

### 5.1. Backend tests (target: +34 tests, tổng 195+)
```
backend/src/dashboard/__tests__/
├── employee-dashboard.service.spec.ts    (refactor: 5-7 tests, đã có logic cũ)
├── pm-dashboard.service.spec.ts          (MỚI: 8-10 tests)
│   ├── PM sees only their projects
│   ├── Team workload correctly aggregated
│   ├── Sprint health calculates burndown
│   ├── Risks filter excludes resolved tasks
│   ├── Empty state when no active projects
│   └── ...
├── hr-dashboard.service.spec.ts          (MỚI: 8-10 tests)
│   ├── Attendance distribution sums correctly
│   ├── Late heatmap aggregates by department
│   ├── Leave usage excludes pending requests
│   ├── Compliance alerts identify repeat offenders
│   └── ...
└── admin-dashboard.service.spec.ts       (MỚI: 6-8 tests)
    ├── System health counts active users
    ├── API latency calculation
    ├── Error logs limited to last 24h
    └── ...
backend/src/attendance/__tests__/
├── attendance-team.spec.ts               (MỚI: 4-5 tests)
└── attendance-company.spec.ts            (MỚI: 3-4 tests)
```

### 5.2. Frontend tests (target: +60 tests)
```
frontend/src/components/layout/
├── PermissionGuard.spec.tsx              (4 tests)
frontend/src/features/dashboard/components/widgets/
├── RoleAwareWidget.spec.tsx              (3 tests)
├── SprintBurndownChart.spec.tsx          (3 tests)
├── TeamWorkloadCard.spec.tsx             (3 tests)
├── AttendanceDistributionDonut.spec.tsx  (3 tests)
├── LeaveUsageChart.spec.tsx              (3 tests)
├── HeadcountTrendChart.spec.tsx          (3 tests)
├── SystemHealthGauges.spec.tsx           (3 tests)
├── ApiLatencyChart.spec.tsx              (3 tests)
└── ErrorLogsFeed.spec.tsx                (3 tests)
frontend/src/features/attendance/components/
├── AttendanceTable.spec.tsx              (4 tests)
├── AttendanceFilters.spec.tsx            (4 tests)
├── AttendanceEditModal.spec.tsx          (4 tests)
└── PermissionGuard.attendance.spec.tsx   (3 tests)
```

### 5.3. Manual E2E checklist
- [ ] Login as EMPLOYEE → Dashboard shows only personal widgets
- [ ] Login as PM → Dashboard shows team widgets, no admin/HR widgets
- [ ] Login as HR → Dashboard shows company-wide widgets
- [ ] Login as ADMIN → Dashboard shows system health
- [ ] Sidebar menu items differ across 4 roles
- [ ] Direct URL `/attendance/settings` as EMPLOYEE → redirects to `/attendance/my`
- [ ] Direct URL `/dashboard/admin` as HR → redirects to `/dashboard`
- [ ] HR edit attendance → backend audit log records
- [ ] PM team attendance shows only their projects' members
- [ ] Admin config page persists to SystemConfig table

---

## 6. RISKS & MITIGATIONS

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| R1 | Phá vỡ 161 tests đang pass | 🔴 Critical | Refactor từng phần, mỗi step chạy full test suite; dùng feature flag nếu cần |
| R2 | Performance khi load 4 layout (route switch) | 🟡 Medium | Lazy load layout component bằng `React.lazy()` + `<Suspense>` |
| R3 | PermissionGuard bypass được nếu chỉ check frontend | 🔴 Critical | Backend vẫn giữ RBAC guards, frontend guard chỉ là UX (ẩn UI, không ủy quyền bảo mật) |
| R4 | Widget visibility matrix quá phức tạp | 🟡 Medium | Tạo `widgetVisibility.ts` config file dễ đọc, test riêng |
| R5 | Bilingual VN/EN thiếu nhất quán | 🟡 Medium | Test cuối cùng: grep tất cả hardcoded string trong widget mới |
| R6 | HR cần data nhạy cảm (lương?) — out of scope | 🟡 Medium | Giới hạn scope M12: chỉ attendance + leave, KHÔNG xử lý lương |
| R7 | Sprint Burndown chart cần sprint history | 🟡 Medium | Tận dụng `Sprint` model có sẵn, chỉ compute 7-day burndown từ tasks |
| R8 | API Latency / Error Logs cần middleware tracking | 🟡 Medium | Phase 1 chỉ trả mock data (constant), Phase 2+ tích hợp observability |

---

## 7. VỊ TRÍ TRIỂN KHAI TRONG ROADMAP

### Roadmap hiện tại (từ `99-PROGRESS-LOG.md`)
```
✅ M0: Docs & Setup
✅ M1: Auth + User
✅ M2: Attendance          ← vừa có GD1+2 enhancement
✅ M3: Project & Task
✅ M4: Kanban Board
🔄 M5: Meetings + WebRTC  ← Next Up theo progress log
⬜ M6: Documents
⬜ M7: AI Integration
✅ M8: Reports & Dashboard (đánh completed)
⬜ M9: Notification System
⬜ M10: Testing & Polish
⬜ M11: Deploy
```

### Phân tích vị trí M12

**Option 1: Làm M12 TRƯỚC M5** (Khuyến nghị mạnh)
- ✅ M8 đã đánh "Completed" nhưng thực tế chưa đúng nghiệp vụ
- ✅ M5 (Meetings) sẽ phụ thuộc vào sidebar/permission của M12
- ✅ M5 cần dashboard "Upcoming Meetings" — M12 tạo pattern cho widget tương tự
- ✅ M6 (Documents) cũng sẽ cần permission guard
- ❌ Làm user chờ thêm 4-5 tuần trước khi thấy module mới

**Option 2: Làm M12 SAU M5+M6** (Chấp nhận được)
- ✅ User thấy module mới (Meetings, Documents) nhanh hơn
- ❌ Phải refactor 2 lần: 1 cho M5+M6 (quick), 1 cho M12 (proper)
- ❌ Dashboard "Upcoming Meetings" tạm thời chỉ work cho Employee

**Option 3: Làm M5 + M12 song song (2 sub-teams)**
- ✅ Tận dụng resources
- ❌ Phức tạp coordination, conflict risk
- ❌ Workspace quá nhỏ để chia team

### **KHUYẾN NGHỊ: Option 1 — Làm M12 ngay sau M2 enhancement, trước M5**

**Lý do chi tiết**:
1. M2 Attendance đã có Dashboard integration (Today widget), M12 sẽ tận dụng
2. M12 giải quyết **nợ kỹ thuật UX** từ M8 (đánh completed không chính xác)
3. M5/M6/M9/M10 đều sẽ được hưởng lợi từ pattern `RoleAwareWidget` + `PermissionGuard`
4. Estimated 4-5 tuần — hợp lý để làm 1 sprint hoàn chỉnh

### Roadmap đề xuất (updated)
```
✅ M0  — Docs & Setup
✅ M1  — Auth + User
✅ M2  — Attendance (vừa enhance GD1+2)
✅ M3  — Project & Task
✅ M4  — Kanban Board
✅ M8  — Reports & Dashboard (basic) ← vẫn giữ ✅
🔄 M12 — Role-Based UI Refactor   ← MỚI, LÀM TIẾP THEO (4-5 tuần)
🔄 M5  — Meetings + WebRTC
⬜ M6  — Documents
⬜ M7  — AI Integration
⬜ M9  — Notification System
⬜ M10 — Testing & Polish
⬜ M11 — Deploy
```

---

## 8. CHECKLIST TRIỂN KHAI (dùng để theo dõi)

### Phase 1: Backend Dashboard Services
- [ ] 1.1 Tách `EmployeeDashboardService`
- [ ] 1.2 Tạo `SharedDashboardService`
- [ ] 1.3 Tạo `PmDashboardService` (TDD)
- [ ] 1.4 Tạo `HrDashboardService` (TDD)
- [ ] 1.5 Tạo `AdminDashboardService` (TDD)
- [ ] 1.6 Update DTO + Controller
- [ ] 1.7 Thêm `getTeamAttendance` + `getCompanyAttendance`
- [ ] 1.8 Update Attendance controller
- [ ] 1.9 Build + Tests verify (target 195+)

### Phase 2: Frontend Role-Aware Infrastructure
- [ ] 2.1 Tạo `PermissionGuard`
- [ ] 2.2 Update `auth.store.ts`
- [ ] 2.3 Refactor `Sidebar.tsx`
- [ ] 2.4 Refactor `TopBar.tsx`
- [ ] 2.5 Tests

### Phase 3: Frontend 4 Dashboard Layouts
- [ ] 3.1 Refactor `DashboardPage.tsx`
- [ ] 3.2 `EmployeeDashboardLayout`
- [ ] 3.3 `PmDashboardLayout` + 4 widgets
- [ ] 3.4 `HrDashboardLayout` + 3 widgets
- [ ] 3.5 `AdminDashboardLayout` + 3 widgets
- [ ] 3.6 Tests widgets
- [ ] 3.7 Tests layouts

### Phase 4: Frontend 4 Attendance Views
- [ ] 4.1 Refactor `AttendancePage.tsx`
- [ ] 4.2 `AttendanceMyView`
- [ ] 4.3 `AttendanceTeamView` + Table + Filters
- [ ] 4.4 `AttendanceCompanyView`
- [ ] 4.5 `AttendanceSettingsView`
- [ ] 4.6 `AttendanceEditModal`
- [ ] 4.7 Tests

### Phase 5: Bilingual & Polish
- [ ] 5.1 Cập nhật `vi.json` + `en.json`
- [ ] 5.2 Verify design tokens
- [ ] 5.3 Accessibility (ARIA, keyboard)
- [ ] 5.4 Responsive (tablet + mobile)
- [ ] 5.5 Loading skeletons + error states
- [ ] 5.6 Visual regression test

### Phase 6: Integration & E2E
- [ ] 6.1 Manual test 4 roles
- [ ] 6.2 Permission guard verification
- [ ] 6.3 Backend RBAC verification
- [ ] 6.4 E2E HR approve WFH
- [ ] 6.5 Performance check

---

## 9. ĐỊNH NGHĨA HOÀN THÀNH (Definition of Done)

M12 hoàn thành khi:
- ✅ 4 role có dashboard **thực sự khác biệt** (không phải 1 layout ẩn widget)
- ✅ 4 role có attendance view phù hợp nghiệp vụ
- ✅ Sidebar filter đúng theo role
- ✅ Permission guard hoạt động cả frontend (UX) + backend (security)
- ✅ 100% giữ nguyên design language Bauhaus + Modern Enterprise SaaS
- ✅ 100% Bilingual VN/EN
- ✅ 195+ backend tests pass, 0 lỗi
- ✅ Frontend + Backend build 0 lỗi
- ✅ Manual E2E test 4 role đều pass
- ✅ Không phá vỡ 161 tests hiện tại

---

## 10. LIÊN KẾT VỚI TÀI LIỆU KHÁC

- **PRD**: `docs/00-PRD.md` §1.3 (Roles) + §2 (F7 Dashboard) — đã có scope
- **Features**: `docs/01-FEATURES.md` §F7 (Dashboard) — đã liệt kê 4 endpoint
- **API Contract**: `docs/02-API-CONTRACT.md` — đã có 4 endpoint dashboard
- **Database**: `docs/03-DATABASE.md` — schema User, Project, Sprint, Task đã đủ
- **Design**: `DESIGN.md` + `docs/04-DESIGN-LINKS.md` — design language đã chốt
- **Style Guide**: `docs/06-STYLE-GUIDE.md` — coding conventions
- **Plan này KHÔNG sửa** bất kỳ file nào ở trên

---

**Trạng thái**: ⏳ Chờ user duyệt
**Người duyệt**: User (Long Võ)
**Sau khi duyệt**: Bắt đầu Phase 1 ngay
