# 12 — Feature M10: Dashboard Doanh Nghiệp & Báo Cáo Ngày

> **Module:** `backend/src/dashboard/` — 5 file · `backend/src/daily-reports/` — 9 file
> **Frontend:** `frontend/src/features/dashboard/` — 47 file · `frontend/src/features/daily-reports/` — 3 file

---

# PHẦN A — DASHBOARD 5 LAYOUT THEO VAI TRÒ

## 1. Bối Cảnh

Một dashboard "cho tất cả" sẽ hoặc quá rốn (nhân viên thấy metric hệ thống không liên quan), hoặc quá rỗng (Admin không thấy được gì). Giải pháp: **5 layout riêng**, mỗi vai trò thấy đúng thứ liên quan tới họ.

```
DashboardPage.tsx
  ├─ DEPARTMENT_HEAD → DepartmentHeadDashboardLayout  (data riêng, fetch riêng)
  ├─ PM              → PmDashboardLayout
  ├─ HR              → HrDashboardLayout
  ├─ ADMIN           → AdminDashboardLayout
  └─ EMPLOYEE        → EmployeeDashboardLayout
```

```typescript
// frontend/src/features/dashboard/components/DashboardPage.tsx
export function DashboardPage() {
  const { user } = useAuthStore();
  const { state, fetchDashboard, reset } = useDashboardStore();

  useEffect(() => {
    fetchDashboard('me');
    return () => reset();
  }, [fetchDashboard, reset]);

  // Department Head has dedicated layout
  if (user?.role === 'DEPARTMENT_HEAD') {
    const initialData = state.status === 'success' ? (state.data as any) : null;
    return (
      <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1520px] mx-auto">
        <DepartmentHeadDashboardLayout
          userName={user.name ?? 'Trưởng phòng'}
          initialData={initialData}
        />
      </div>
    );
  }

  if (state.status === 'loading') { /* spinner */ }
  if (state.status === 'error')   { /* error card + nút Thử lại */ }
  if (state.status !== 'success') return null;

  const { data } = state;
  const role = user?.role;

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1520px] mx-auto">
      {role === 'PM'    && <PmDashboardLayout data={data as PmDashboardData} userName={userName} />}
      {role === 'HR'    && <HrDashboardLayout data={data as HrDashboardData} userName={userName} />}
      {role === 'ADMIN' && <AdminDashboardLayout data={data as AdminDashboardData} userName={userName} />}
      {(!role || role === 'EMPLOYEE') && (
        <EmployeeDashboardLayout data={data as EmployeeDashboardData} userName={userName} />
      )}
    </div>
  );
}
```

**Điểm hay:** `DEPARTMENT_HEAD` được xử lý **trước** (return sớm) vì layout của họ fetch dữ liệu riêng (`initialData` có thể null → component tự fetch). Các role còn lại dùng chung 1 endpoint `/dashboard/me` và chỉ khác phần render.

---

## 2. Cấu Trúc DTO — Kế Thừa

```typescript
// backend/src/dashboard/dto/dashboard-response.dto.ts
export class EmployeeDashboardDto {
  taskSummary!: TaskSummaryDto;
  urgentTasks!: UrgentTaskDto[];
  upcomingTasks!: UrgentTaskDto[];
  myWeeklyDone!: number;
  weeklyVelocity!: WeeklyVelocityPointDto[];
  projectProgress!: ProjectProgressDto[];
  statusDistribution!: DistributionItemDto[];
  priorityDistribution!: DistributionItemDto[];
  recentActivities!: RecentActivityDto[];
  teamWorkload!: TeamMemberWorkloadDto[];
  activeSprint!: ActiveSprintSummaryDto | null;
  upcomingMeetings!: UpcomingMeetingDto[];
  recentDocuments!: RecentDocumentDto[];
  weeklySchedule?: DailyShiftDto[];
}

// --- PM Specific ---
export class PmDashboardDto extends EmployeeDashboardDto {
  pmKpi!: PmKpiRibbonDto;
  sprintBurndown!: SprintBurndownPointDto[];
  risks!: RiskAlertDto[];
  aiSprintInsight?: AiSprintInsightDto;
  teamCapacity?: TeamCapacityDto;
  scopeCreep?: SprintScopeCreepDto;
}

// --- HR Specific ---
export class HrDashboardDto extends EmployeeDashboardDto {
  workforceSummary!: WorkforceSummaryDto;
  attendanceKpi!: AttendanceKpiDto;
  attendanceDistribution!: AttendanceDistributionDto;
  lateArrivalsByDepartment!: DepartmentMetricDto[];
  leaveUsageByDepartment!: DepartmentMetricDto[];
  pendingApprovals!: PendingApprovalsSummaryDto;
  complianceAlerts!: ComplianceAlertDto[];
  quickApprovals!: QuickApprovalItemDto[];
  headcountTrend!: HeadcountTrendPointDto[];
  cultureEvents!: CultureEventDto[];
}

// --- Admin Specific ---
export class AdminDashboardDto extends EmployeeDashboardDto {
  systemHealth!: SystemHealthDto;
  platformHealth!: PlatformHealthDto;
  systemGauges!: SystemGaugesDto;
  apiLatency!: ApiLatencyDto;
  errorLogs!: ErrorLogEntryDto[];
  configStatus!: {
    officeName: string;
    gpsRadiusMeters: number;
    ipRangesCount: number;
    workHours: string;
  };
}
```

**Kế thừa DTO (composition thay vì copy-paste):**
- Mọi vai trò đều cần: task summary, urgent tasks, upcoming, velocity, project progress → ở base
- Mỗi vai trò thêm phần riêng: PM thêm burndown/risk/AI, HR thêm attendance KPIs, Admin thêm system health

**`extends` trong TypeScript class = kế thừa cấu trúc.** `PmDashboardDto` có **mọi** field của `EmployeeDashboardDto` + 6 field riêng. Frontend nhận 1 payload duy nhất.

**`AdminDashboardDto.configStatus`** — hiển thị cấu hình hệ thống: tên văn phòng, bán kính GPS, số IP range, giờ làm việc. Admin tự kiểm tra được cấu hình đúng mà không cần đọc code.

---

## 3. Employee Dashboard — 5 Nhóm Nội Dung

```typescript
// frontend/src/features/dashboard/components/layouts/EmployeeDashboardLayout.tsx
<div className="space-y-6">
  <HeroBanner userName={userName} />
  <QuickAttendanceCard />

  <KpiRibbon summary={data.taskSummary} />

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

  <WeeklyShiftScheduleWidget schedule={data.weeklySchedule} />

  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
    <div className="lg:col-span-7 flex flex-col gap-6">
      <CoreTasksChecklist urgentTasks={data.urgentTasks ?? []} upcomingTasks={data.upcomingTasks ?? []} />
      <DeepWorkTrackerWidget urgentTasks={data.urgentTasks ?? []} />
    </div>
    <div className="lg:col-span-5 flex flex-col gap-6">
      <ActiveSprintCard activeSprint={data.activeSprint} />
      <UpcomingMeetingsCard meetings={data.upcomingMeetings ?? []} />
      <ProjectPortfolioCard />
      <TaskDonutChart />
      <RecentDocumentsHub />
      <RecentActivityFeed />
      <EnterpriseFooter />
    </div>
  </div>
</div>
```

**Layout 12 cột (Tailwind Grid)** — `col-span-7` / `col-span-5` → tỉ lệ 7/5 cho cột chính/phụ. `items-stretch` để 2 cột cao bằng nhau.

**`?? []` xuyên suốt** — mọi field có thể `null` từ server → dùng `?? []` để component luôn nhận mảng, không cần `if (!data) return null` mỗi chỗ.

---

## 4. Task Summary — 7 Query Song Song

```typescript
// backend/src/dashboard/dashboard.service.ts
const [total, todo, inProgress, inReview, blocked, done, overdueCount] = await Promise.all([
  this.prisma.task.count({ where: { assigneeId: userId, deletedAt: null } }),
  this.prisma.task.count({ where: { assigneeId: userId, status: 'TODO', deletedAt: null } }),
  this.prisma.task.count({ where: { assigneeId: userId, status: 'IN_PROGRESS', deletedAt: null } }),
  this.prisma.task.count({ where: { assigneeId: userId, status: 'IN_REVIEW', deletedAt: null } }),
  this.prisma.task.count({ where: { assigneeId: userId, status: 'BLOCKED', deletedAt: null } }),
  this.prisma.task.count({ where: { assigneeId: userId, status: 'DONE', deletedAt: null } }),
  this.prisma.task.count({
    where: {
      assigneeId: userId,
      deletedAt: null,
      status: { not: 'DONE' },
      dueDate: { lt: now },
    },
  }),
]);
```

### 4.1 `Promise.all` — Tuyệt Đối Song Song

7 truy vấn độc lập → chạy **cùng lúc** thay vì tuần tự.

| Cách | Thời gian (giả sử mỗi query 50ms) |
|------|-----------------------------------|
| Tuần tự (`await` từng cái) | 7 × 50 = **350ms** |
| **Song song (`Promise.all`)** | max(50) = **~50ms** |

**7× nhanh hơn** chỉ bằng 1 từ khoá. Đây là bài học quan trọng nhất về hiệu năng query trong NestJS.

**Trade-off:** `Promise.all` fail nếu 1 promise reject → cả batch fail. Với các `count` độc lập thì chấp nhận được (lỗi DB là lỗi hệ thống). Với các tác vụ không liên quan cần độc lập → dùng `Promise.allSettled`.

### 4.2 Aggregate Story Points

```typescript
const aggregate = await this.prisma.task.aggregate({
  where: { assigneeId: userId, deletedAt: null },
  _sum: {
    storyPoints: true,
    timeEstimate: true,
    timeTracked: true,
  },
});

const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
```

**`aggregate` 1 lần thay vì 3 `sum` riêng** → 1 round-trip thay vì 3.

**Chống chia 0:** `total > 0 ? ... : 0` — không có task thì completionRate = 0%, không phải `NaN`.

---

## 5. Weekly Velocity — 7 Điểm Dữ Liệu

```typescript
// backend/src/dashboard/dashboard.service.ts
const velocityDays = 7;
const weeklyVelocity: WeeklyVelocityPointDto[] = [];
const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

for (let i = velocityDays - 1; i >= 0; i--) {
  const dayStart = new Date(now);
  dayStart.setDate(dayStart.getDate() - i);
  dayStart.setHours(0, 0, 0, 0);

  const dayEnd = new Date(dayStart);
  dayEnd.setHours(23, 59, 59, 999);

  const [doneCount, createdCount] = await Promise.all([
    this.prisma.task.count({
      where: { assigneeId: userId, status: 'DONE', updatedAt: { gte: dayStart, lte: dayEnd }, deletedAt: null },
    }),
    this.prisma.task.count({
      where: { assigneeId: userId, createdAt: { gte: dayStart, lte: dayEnd }, deletedAt: null },
    }),
  ]);

  weeklyVelocity.push({ date: dayStart.toISOString(), dayName: dayNames[dayStart.getDay()], doneCount, createdCount });
}
```

**Vòng lặp từ `i = 6` xuống 0** → đi từ 6 ngày trước về hôm nay → **thứ tự thời gian tăng dần** (chart đúng chiều).

**`dayStart.setHours(0,0,0,0)` + `dayEnd.setHours(23,59,59,999)`** → ranh giới ngày chính xác, tránh lệch do múi giờ.

**2 count song song** trong mỗi vòng → tối đa 14 query nhưng chạy song song 2-2.

---

## 6. Urgent Tasks — Điều Kiện Hỗn Hợp

```typescript
const urgentTasksRaw = await this.prisma.task.findMany({
  where: {
    assigneeId: userId,
    deletedAt: null,
    status: { not: 'DONE' },
    OR: [
      { priority: { in: ['URGENT', 'HIGH'] } },     // ưu tiên cao
      { dueDate: { lte: threeDaysLater } },         // hoặc sắp đến hạn
    ],
  },
  include: { project: { select: { name: true, color: true } } },
  orderBy: [
    { priority: 'desc' },      // ưu tiên cao trước
    { dueDate: 'asc' },        // rồi đến hạn sớm trước
  ],
  take: 12,
});
```

**`OR` = "gấp" hoặc "sắp hạn"** → 1 query duy nhất thay vì 2 query rồi merge ở JS.

**`orderBy` nhiều key** = multi-level sort: ưu tiên `priority desc` trước, cùng ưu tiên thì `dueDate asc`.

**`take: 12`** — giới hạn số lượng. Dashboard không hiển thị 500 task.

**`include: { project: { select: {...} } }`** — chỉ lấy 2 field của project, không lấy cả bản ghi → giảm tải payload.

---

## 7. Widget PM — Burndown, Risk, AI Insight

### 7.1 `SprintBurndownPointDto`

```typescript
export class SprintBurndownPointDto {
  day!: string;
  ideal!: number;      // ← đường lý tưởng
  actual!: number;     // ← đường thực tế
}
```

**2 đường trên 1 chart** → so sánh "nếu hoàn thành đều" với "thực tế". Nếu actual > ideal → trễ tiến độ.

### 7.2 `RiskAlertDto` — 4 Loại Rủi Ro

```typescript
export class RiskAlertDto {
  id!: string;
  type!: 'BLOCKED_TASK' | 'OVERDUE' | 'LATE_ASSIGNEE';
  severity!: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title!: string;
  description!: string;
  link?: string;
}
```

**`severity` 4 mức** → màu sắc badge (xanh/vàng/cam/đỏ). PM ưu tiên xử lý CRITICAL.

**`link`** → deep-link tới task bị rủi ro.

### 7.3 `AiSprintInsightDto` — AI Đọc Sprint

```typescript
export class AiSprintInsightDto {
  sprintName!: string;
  completionRate!: number;
  blockedTaskTitle?: string;
  blockedTaskId?: string;
  blockedDays?: number;
  recommendation!: string;
  suggestedAction!: string;
  releaseDate?: string;
}
```

**AI không chỉ "nói"** mà gợi ý **hành động cụ thể** (`suggestedAction`) và link tới task bị block (`blockedTaskId`).

### 7.4 `TeamCapacityDto` — Năng Lực Team

```typescript
export class TeamCapacityDto {
  totalMembers!: number;
  inOfficeToday!: number;
  wfhToday!: number;
  onLeaveToday!: number;
  totalAvailableHoursWeek!: number;
  maxCapacityHoursWeek!: number;
  capacityPercent!: number;
  membersSummary!: TeamMemberAvailabilityDto[];
}
```

**Tính năng lý giải:** PM xem "tuần này team có 3 người nghỉ, capacity còn 70%" → điều phối sprint.

### 7.5 `SprintScopeCreepDto` — Phát Hiện Scope Creep

```typescript
export class SprintScopeCreepDto {
  sprintId!: string;
  sprintName!: string;
  initialStoryPoints!: number;
  addedStoryPoints!: number;
  currentStoryPoints!: number;
  initialTasksCount!: number;
  addedTasksCount!: number;
  addedTasksList!: Array<{ id: string; title: string; storyPoints: number; addedAt: string }>;
  creepPercent!: number;
}
```

**Đây là widget giá trị cao nhất của PM dashboard.**

**Scope creep** = sprint bị thêm việc giữa chừng → deadline không còn khả thi.

Công thức: `creepPercent = addedStoryPoints / initialStoryPoints * 100`.

**Lưu `addedTasksList`** chi tiết → PM thấy chính xác task nào được thêm, khi nào, bao nhiêu story point → quyết định cắt scope hợp lý.

---

## 8. Widget HR — Chấm Công & Nhân Sự

```typescript
export class WorkforceSummaryDto {
  totalEmployees!: number;
  activeToday!: number;
  onLeave!: number;
  wfhToday!: number;
  absentUnapproved!: number;      // ★ vắng mặt chưa phép
}

export class AttendanceKpiDto {
  attendanceRate!: number;
  onTimeRate!: number;
  lateRate!: number;
  avgWorkHours!: number;
}

export class AttendanceDistributionDto {
  onTime!: number;
  late!: number;
  veryLate!: number;
  wfh!: number;
  absentApproved!: number;
  absentUnapproved!: number;
}
```

### 8.1 `absentUnapproved` — Chỉ Số Nhạy Cảm Nhất

**"Vắng mặt chưa phép"** = ngày làm việc mà không có bản ghi chấm công VÀ không có đơn nghỉ phép/WFH được duyệt.

Đây là chỉ số HR cần theo dõi sát. Tách riêng `absentApproved` (có đơn) vs `absentUnapproved` (không đơn) → chính xác, không nhầm lẫn với người xin phép.

### 8.2 `DepartmentMetricDto` — Theo Phòng Ban

```typescript
export class DepartmentMetricDto {
  departmentName!: string;
  totalMembers!: number;
  presentCount!: number;
  lateCount!: number;
  lateRate!: number;
  onLeaveCount!: number;
}
```

**Cùng 1 DTO dùng cho 2 widget:** `lateArrivalsByDepartment` và `leaveUsageByDepartment`. Không cần 2 DTO giống nhau.

### 8.3 `QuickApprovalItemDto` — Duyệt Nhanh

```typescript
export class QuickApprovalItemDto {
  id!: string;
  type!: 'WFH' | 'LEAVE';
  userId!: string;
  userName!: string;
  userAvatar!: string | null;
  departmentName!: string;
  dateOrRange!: string;
  reason!: string;
  createdAt!: string;
  urgentLevel!: 'NORMAL' | 'HIGH' | 'CRITICAL';
}
```

**`urgentLevel`** → sort đơn cần duyệt gấp lên đầu. HR xử lý hàng chục đơn/ngày → UX quyết định hiệu quả.

### 8.4 `CultureEventDto` — Văn Hoá Doanh Nghiệp

```typescript
export class CultureEventDto {
  id!: string;
  userId!: string;
  userName!: string;
  type!: 'BIRTHDAY' | 'WORK_ANNIVERSARY_1Y' | 'WORK_ANNIVERSARY_3Y' | 'WORK_ANNIVERSARY_5Y';
  title!: string;
  dateDesc!: string;
  badgeText!: string;
}
```

**Chi tiết ấm áp:** nhân viên có sinh nhật, kỷ niệm 1/3/5 năm làm việc. Đây là yếu tố "con người" — thể hiện sản phẩm là doanh nghiệp thật, không chỉ là bảng công việc. Cũng là điểm cộng khi demo cho giáo viên.

### 8.5 `HeadcountTrendPointDto`

```typescript
export class HeadcountTrendPointDto {
  month!: string;
  headcount!: number;
  newHires!: number;
  retentionRate!: number;
}
```

**`retentionRate`** = tỉ lệ giữ người → chỉ số quan trọng nhất về HR, đo hiệu quả chính sách đãi ngộ.

---

## 9. Widget Admin — Sức Khoẻ Hệ Thống

```typescript
export class PlatformHealthDto {
  activeUsers!: number;
  activeUsersNow!: number;
  apiRequestsToday!: number;
  errorRateToday!: number;
  dbSize!: string;
  uptime!: string;
}

export class SystemGaugesDto {
  cpuUsagePercent!: number;
  memoryUsagePercent!: number;
  dbConnectionsActive!: number;
  dbConnectionsMax!: number;
  storageUsedGb!: number;
  storageMaxGb!: number;
}

export class ApiLatencyDto {
  p50!: number;
  p95!: number;
  p99!: number;
}
```

### 9.1 Tại Sao Dùng Percentile Thay Vì Trung Bình

**Đừng dùng `average` cho latency!** Vì 1 request chậm 10s kéo trung bình lên, che mất 99% request bình thường là 50ms.

| Metric | Ý nghĩa | Dùng để |
|--------|---------|---------|
| **p50** | 50% request dưới ngưỡng này | Trải nghiệm điển hình |
| **p95** | 95% request dưới ngưỡng này | Phát hiện hầu hết issue |
| **p99** | 99% request dưới ngưỡng này | Phát hiện tail latency (timeout, GC pause) |

**SLA thường dựa trên p95/p99**, không phải trung bình.

### 9.2 `configStatus` — Tự Kiểm Tra Cấu Hình

```typescript
configStatus!: {
  officeName: string;
  gpsRadiusMeters: number;
  ipRangesCount: number;
  workHours: string;
};
```

Admin thấy ngay: "GPS radius đang là 100m, có 3 IP range, giờ làm việc 8:30-17:30" → biết hệ thống đang chạy đúng config mong muốn **mà không cần đọc file .env**.

---

## 10. Bảng Tổng Hợp 5 Layout

| Layout | Widget chính | Dữ liệu đặc thù |
|--------|-------------|-----------------|
| **Employee** | Hero, QuickAttendance, KPI Ribbon, Velocity, Donut, Shift, Tasks, Sprint, Meetings, Portfolio, Docs, Activity | Task cá nhân |
| **PM** | + KPI Ribbon dự án, Burndown, Risk Alerts, AI Sprint Insight, Team Capacity, Scope Creep | Sprint & tốc độ |
| **HR** | + Workforce, Attendance KPI, Distribution, Dept Analytics, Quick Approvals, Compliance, Headcount, Culture | Chấm công & nhân sự |
| **ADMIN** | + Platform Health, System Gauges, API Latency, Error Logs, Config Status | Hạ tầng |
| **DEPT_HEAD** | Riêng (fetch dữ liệu riêng) | Phòng ban |

---

# PHẦN B — BÁO CÁO NGÀY (DAILY REPORT)

## 11. Bối Cảnh

Mỗi cuối ngày, nhân viên phải báo cáo: hôm nay làm gì, gặp vướng gì, mai làm gì. Viết tay → tốn thời gian, quên, không ai đọc. Hệ thống: **tự động gợi ý nội dung** từ dữ liệu đã có, nhân viên chỉ cần chỉnh sửa + bổ sung.

---

## 12. 6 Nguồn Dữ Liệu Cho Báo Cáo

```typescript
// backend/src/daily-reports/daily-reports.draft.service.ts
async buildDraft(userId: string, date?: Date): Promise<DraftPayload> {
  const targetDate = date ?? this.getDateOnly();
  const nextDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);

  // ① Chấm công & giờ làm việc
  const [attendance, breaks] = await Promise.all([
    this.prisma.attendanceRecord.findUnique({
      where: { userId_date: { userId, date: targetDate } },
    }),
    this.prisma.breakLog.findMany({ where: { userId, date: targetDate } }),
  ]);

  // ② Task thông thường hoàn thành hôm nay
  const completedTasks = await this.prisma.task.findMany({
    where: {
      assigneeId: userId,
      status: 'DONE',
      completedAt: { gte: targetDate, lt: nextDate },   // ★ khoảng [hôm nay, ngày mai)
      deletedAt: null,
    },
    select: {
      id: true, title: true, status: true, completedAt: true,
      project: { select: { name: true } },
      workLogs: {
        select: { id: true, duration: true, description: true },
        where: { logDate: targetDate },
      },
    },
    orderBy: { completedAt: 'asc' },
  });

  // ③ QuickTask hoàn thành hôm nay
  const completedQuickTasks = await this.prisma.quickTask.findMany({
    where: {
      assigneeId: userId,
      status: 'DONE',
      completedAt: { gte: targetDate, lt: nextDate },
    },
    select: { id: true, title: true, status: true, completedAt: true, project: { select: { name: true } } },
    orderBy: { completedAt: 'asc' },
  });

  // ④ Nhật ký công việc (WorkLogs)
  const workLogs = await this.prisma.workLog.findMany({
    where: { userId, logDate: targetDate },
    select: {
      id: true, duration: true, description: true, logDate: true,
      task: { select: { id: true, title: true } },
    },
    orderBy: { logDate: 'asc' },
  });

  // ⑤ Cuộc họp đã tham dự
  const attendedAttendees = await this.prisma.meetingAttendee.findMany({
    where: { userId, joinedAt: { gte: targetDate, lt: nextDate } },
    select: {
      joinedAt: true,
      meeting: { select: { id: true, title: true, startTime: true, endTime: true, roomCode: true } },
    },
  });

  // ⑥ Task quá hạn / tồn đọng
  const overdueTasksRaw = await this.prisma.task.findMany({
    where: {
      assigneeId: userId,
      status: { notIn: ['DONE'] },
      dueDate: { lt: now },
      deletedAt: null,
    },
    select: { id: true, title: true, dueDate: true, priority: true, project: { select: { name: true } } },
    orderBy: { dueDate: 'asc' },
    take: 20,
  });
```

### 12.1 Bảng Tổng Hợp 6 Nguồn

| # | Nguồn | Bảng DB | Dùng để viết |
|---|-------|---------|---------------|
| ① | Chấm công + giờ nghỉ | `attendanceRecord`, `breakLog` | Giờ làm việc thực tế |
| ② | Task hoàn thành | `task` (completedAt) | "Đã làm gì" |
| ③ | QuickTask hoàn thành | `quickTask` | Việc nhanh gấp |
| ④ | Nhật ký thời gian | `workLog` | Chi tiết phân bổ giờ |
| ⑤ | Cuộc họp đã họp | `meetingAttendee` | "Đã họp gì" |
| ⑥ | Task quá hạn | `task` (dueDate) | "Vướng gì" + "mai làm gì" |

**Điểm mấu chốt:** dữ liệu **đã tồn tại sẵn** từ các module khác (task, meeting, attendance, worklog). Báo cáo ngày không cần bảng mới — chỉ **tổng hợp lại**. Đây là ví dụ đẹp của **composition over duplication**.

### 12.2 Khoảng Thời Gian `[gte, lt)` — Bán Mở

```typescript
completedAt: { gte: targetDate, lt: nextDate }
```

**Vì sao không dùng `lt: endOfDay`?**
Vì `endOfDay` = 23:59:59.999 → giá trị này **không bao giờ xuất hiện** trong DB (timestamp có millisecond thực). Một task hoàn thành đúng 23:59:59.9995 sẽ bị bỏ sót.

**`lt: nextDate` (nửa khoảng mở)** = `>= 00:00 hôm nay` VÀ `< 00:00 ngày mai` → **luôn đúng**, không sót, không trùng.

**Áp dụng đồng nhất** cho cả 5 query có filter ngày → nhất quán, dễ kiểm chứng.

---

## 13. Xử Lý Múi Giờ — `getDateOnly`

```typescript
private getDateOnly(date = new Date(), timezone = 'Asia/Ho_Chi_Minh'): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return new Date(`${formatter.format(date)}T00:00:00.000Z`);
}
```

### 13.1 Vì Sao `en-CA`?

`Intl.DateTimeFormat` với locale `'en-CA'` trả về định dạng **`YYYY-MM-DD`** — chính là ISO date, có thể nối thẳng vào chuỗi.

```typescript
new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
// → "2026-10-24"

new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
// → "10/24/2026"   ← không parse được trực tiếp
```

**`en-US` không dùng được** vì thứ tự MM/DD/YYYY gây nhập nhằng.

### 13.2 Vì Sao `T00:00:00.000Z`?

Cột `date` trong DB là kiểu `@db.Date` (chỉ ngày, không giờ). Prisma yêu cầu truyền `Date` object → ta tạo Date ở **nửa đêm UTC** để khớp với cách Postgres lưu date-only.

**Không dùng `new Date(y, m, d)`** (nửa đêm local) vì server có thể chạy ở UTC → lệch 7 tiếng so với VN → sang ngày khác.

---

## 14. Tự Động Sinh Nội Dung Gợi Ý

### 14.1 `buildSuggestedContent`

```typescript
private buildSuggestedContent(params: {
  completedTasks: DraftTaskItem[];
  completedQuickTasks: DraftTaskItem[];
  workLogs: { task: { title: string }; duration: number; description: string | null }[];
  attendedMeetings: DraftMeetingItem[];
  totalWorkMinutes: number;
}): string {
  const lines: string[] = ['### Công việc đã hoàn thành hôm nay:'];

  if (params.completedTasks.length === 0 && params.completedQuickTasks.length === 0) {
    lines.push('- Đang tập trung xử lý các hạng mục công việc trong tiến trình sprint.');
  } else {
    for (const t of params.completedTasks) {
      lines.push(`- [x] **${t.title}** (${t.projectName})`);
    }
    for (const q of params.completedQuickTasks) {
      lines.push(`- [x] [Việc nhanh] **${q.title}**`);
    }
  }

  if (params.workLogs.length > 0) {
    lines.push('\n### Nhật ký thời gian (Work Logs):');
    for (const wl of params.workLogs) {
      const hours = (wl.duration / 60).toFixed(1);
      lines.push(`- ${wl.task.title}: ${hours}h ${wl.description ? `(${wl.description})` : ''}`);
    }
  }

  if (params.attendedMeetings.length > 0) {
    lines.push('\n### Cuộc họp đã tham dự:');
    for (const m of params.attendedMeetings) {
      lines.push(`- 👥 ${m.title} (${m.durationMinutes} phút)`);
    }
  }

  return lines.join('\n');
}
```

### 14.2 Markdown Checkbox — Tương Thích Tiptap

`- [x]` và `- [ ]` → **task list** trong Markdown. Nội dung báo cáo hiển thị bằng Tiptap → dùng đúng cú pháp Markdown là hiển thị checkbox thật.

**`[x]` = đã làm, `[ ]` = kế hoạch mai** → phân biệt trực quan giữa "đã hoàn thành" và "sẽ làm".

### 14.3 `buildSuggestedBlockers` — Vướng Mắc Từ Task Quá Hạn

```typescript
private buildSuggestedBlockers(overdueTasks: OverdueTaskItem[]): string {
  if (overdueTasks.length === 0) {
    return 'Không có khó khăn hay vướng mắc đáng kể. Tiến độ công việc ổn định.';
  }
  const lines = ['Các đầu việc đang bị chậm hoặc cần hỗ trợ:'];
  for (const t of overdueTasks.slice(0, 5)) {       // ★ chỉ lấy 5 cái đầu
    lines.push(`- ⚠️ **${t.title}** (Quá hạn ${t.daysOverdue} ngày - Ưu tiên ${t.priority})`);
  }
  return lines.join('\n');
}
```

**Case 0 task quá hạn** → trả về câu tích cực. **Không để trống** → báo cáo luôn có nội dung hoàn chỉnh.

**`slice(0, 5)`** — chỉ 5 task quá hạn đầu. 20 task quá hạn sẽ làm báo cáo không đọc nổi.

### 14.4 `buildSuggestedTomorrow` — Kế Hoạch Mai

```typescript
private buildSuggestedTomorrow(overdueTasks: OverdueTaskItem[]): string {
  const lines = ['Kế hoạch thực hiện ngày mai:'];
  if (overdueTasks.length > 0) {
    for (const t of overdueTasks.slice(0, 3)) {     // ★ chỉ 3 cái
      lines.push(`- [ ] Ưu tiên giải quyết dứt điểm: **${t.title}**`);
    }
  }
  lines.push('- [ ] Tiếp tục triển khai các task tiếp theo trong Sprint hiện tại.');
  lines.push('- [ ] Tham gia các cuộc họp và cập nhật tiến độ công việc.');
  return lines.join('\n');
}
```

**Logic nghiệp vụ:** task quá hạn hôm nay → ưu tiên xử lý dứt điểm ngày mai. 3 task quá hạn đầu = ưu tiên cao nhất.

### 14.5 Tính Giờ Làm Việc

```typescript
const totalWorkMinutes = workLogs.reduce((sum, wl) => sum + wl.duration, 0);
const breakMinutes = breaks.reduce((sum, b) => {
  if (!b.endTime) return sum;                        // ★ break chưa kết thúc → bỏ qua
  return sum + Math.round((b.endTime.getTime() - b.startTime.getTime()) / 60000);
}, 0);

const checkIn = attendance?.checkInTime ?? null;
const checkOut = attendance?.checkOutTime ?? null;
const workHours =
  checkIn && checkOut
    ? Math.round(((checkOut.getTime() - checkIn.getTime()) / 3600000) * 100) / 100
    : null;                                          // ★ null nếu chưa check-out
```

**`Math.round(x * 100) / 100`** → làm tròn 2 chữ số số thập phân (7.333333 → 7.33).

**`workHours = null` khi chưa check-out** → hiển thị "—" thay vì 0 (0 sẽ gây hiểu nhầm "làm 0 giờ").

---

## 15. Khoá Báo Cáo Sau Nửa Đêm

### 15.1 Cơ Chế Khoá

```typescript
// backend/src/daily-reports/daily-reports.service.ts
async lockMidnightReports(): Promise<number> {
  const today = this.parseDateOnly();
  const result = await this.prisma.dailyReport.updateMany({
    where: {
      date: { lt: today },     // ★ mọi ngày trước hôm nay
      isLocked: false,         // ★ chỉ khoá cái chưa khoá
    },
    data: { isLocked: true },
  });
  this.logger.log(`Locked ${result.count} past daily reports.`);
  return result.count;
}
```

**`updateMany` + điều kiện `isLocked: false`** → idempotent, chạy lại nhiều lần cũng không sao.

### 15.2 Kiểm Tra Khi Nộp

```typescript
const existing = await this.prisma.dailyReport.findUnique({
  where: { userId_date: { userId: targetUserId, date: reportDate } },
});

if (existing && existing.isLocked) {
  throw new ForbiddenException(
    'Báo cáo của ngày này đã bị khoá sau nửa đêm, không thể ghi đè hoặc nộp lại',
  );
}
```

### 15.3 Vì Sao Cần Khoá?

| Vấn đề nếu không khoá | Hậu quả |
|----------------------|---------|
| Nhân viên sửa báo cáo cũ 3 tháng trước | Lịch sử không đáng tin |
| PM duyệt báo cáo tháng 3 rồi nhân viên đổi | Mất ý nghĩa phê duyệt |
| HR tổng hợp KPI theo tháng | Số liệu thay đổi liên tục |

**Nguyên tắc: dữ liệu đã qua phải bất biến (immutable).** Khoá sau nửa đêm = ranh giới rõ ràng giữa "hôm nay đang làm" và "lịch sử".

### 15.4 `lateSubmission` — Nộp Muộn Vẫn Ghi Nhận

```typescript
const isPastDate = reportDate.getTime() < today.getTime();

const report = await this.prisma.dailyReport.upsert({
  where: { userId_date: { userId: targetUserId, date: reportDate } },
  create: { ..., lateSubmission: isPastDate, submittedAt: now, submittedById },
  update: { ..., lateSubmission: isPastDate, submittedAt: now, submittedById },
});
```

**Không chặn nộp muộn** — chỉ **ghi nhận** cờ `lateSubmission` để HR theo dõi. Nộp cho hôm qua vẫn được, nhưng có dấu vết.

### 15.5 `upsert` — 1 Lệnh, 2 Đường

```typescript
const report = await this.prisma.dailyReport.upsert({
  where: { userId_date: { userId: targetUserId, date: reportDate } },
  create: { userId: targetUserId, date: reportDate, content: dto.content, ... },
  update: { content: dto.content, ... },
});
```

**`upsert`** = INSERT nếu chưa có, UPDATE nếu có. `@@unique([userId, date])` làm khoá định danh.

**Không dùng `findUnique` → `create`/`update` 2 lệnh** → race condition: 2 request cùng lúc có thể cùng `create` → 1 trong 2 bị lỗi unique constraint.

---

## 16. Phân Quyền Báo Cáo — 3 Hàm Thuần

```typescript
// backend/src/daily-reports/daily-reports.permissions.ts
export function canViewReportsOf(
  actor: ActorContext,
  targetUserId: string,
  context: { sameDepartment: boolean; isProjectMember: boolean },
): boolean {
  if (actor.id === targetUserId) return true;                       // ① chính mình
  if (actor.role === Role.ADMIN || actor.role === Role.HR) return true;  // ② toàn quyền
  if (actor.role === Role.DEPARTMENT_HEAD && context.sameDepartment) return true;  // ③ cùng phòng
  if (actor.role === Role.PM && context.isProjectMember) return true;  // ④ thành viên dự án
  return false;
}

export function canSubmitOnBehalf(
  actor: ActorContext,
  context: { sameDepartment: boolean; isProjectMember: boolean },
): boolean {
  if (actor.role === Role.ADMIN) return true;
  if (actor.role === Role.DEPARTMENT_HEAD && context.sameDepartment) return true;
  if (actor.role === Role.PM && context.isProjectMember) return true;
  return false;
}

export function canEditReport(
  actor: ActorContext,
  report: { userId: string; isLocked: boolean },
): boolean {
  if (report.isLocked) return false;       // ★ đã khoá → KHÔNG AI sửa được
  if (report.userId === actor.id) return true;
  if (actor.role === Role.ADMIN) return true;
  return false;
}
```

### 16.1 3 Bảng Phân Quyền

| Hàm | ADMIN | HR | DEPT_HEAD | PM | EMPLOYEE |
|-----|-------|----|-----------|-----|----------|
| `canViewReportsOf` | ✅ | ✅ | ✅ cùng phòng | ✅ thành viên dự án | ✅ chính mình |
| `canSubmitOnBehalf` | ✅ | ❌ | ✅ cùng phòng | ✅ thành viên dự án | ❌ |
| `canEditReport` | ✅ (nếu chưa khoá) | ❌ | ❌ | ❌ | ✅ chính mình (nếu chưa khoá) |

**Lưu ý:** `canSubmitOnBehalf` **không có HR** — HR là người duyệt, không nộp hộ (tránh xung đột lợi ích).

**`canEditReport` kiểm tra `isLocked` TRƯỚC** → khoá là tuyệt đối, kể cả Admin cũng không sửa được. Đúng nguyên tắc audit trail.

### 16.2 `context` — Dữ Liệu Phụ Thuộc Bối Cảnh

```typescript
context: { sameDepartment: boolean; isProjectMember: boolean }
```

**2 quyền phụ thuộc quan hệ** được tính sẵn ở service rồi truyền vào → hàm phân quyền **thuần túy, không cần DB** → dễ unit test.

```typescript
// daily-reports.service.ts
const isProjectMember = await this.checkIsProjectMember(actor.id, targetUser.id);
const sameDepartment = Boolean(
  actor.departmentId && actor.departmentId === targetUser.departmentId,
);

const hasPermission = canSubmitOnBehalf(actor, { sameDepartment, isProjectMember });
if (!hasPermission) {
  throw new ForbiddenException('Bạn không có quyền nộp báo cáo hộ nhân sự này');
}
```

### 16.3 `submittedById` — Truy Vết Nộp Hộ

```typescript
let targetUserId = actor.id;
let submittedById: string | null = null;

if (dto.targetUserId && dto.targetUserId !== actor.id) {
  // ...kiểm tra quyền...
  targetUserId = targetUser.id;
  submittedById = actor.id;    // ★ ghi lại ai thực sự bấm nút
}
```

**Phân biệt "ai sở hữu báo cáo" và "ai đã nộp"** — quan trọng khi PM nộp hộ nhân viên vắng mặt.

---

## 17. Ma Trận Báo Cáo Theo Tuần

```typescript
export interface WeekDaySummary {
  date: string;
  dayOfWeek: number;      // 0=Sun, 1=Mon, ..., 6=Sat
  isSubmitted: boolean;
  isLocked: boolean;
  reportId?: string;
  summaryText?: string;
}

export interface MemberWeekSummary {
  userId: string;
  userName: string;
  userEmail: string;
  userAvatar: string | null;
  departmentName?: string;
  submittedCount: number;
  days: WeekDaySummary[];
}
```

**Ma trận (matrix) = người × ngày.** PM nhìn 1 lần biết ai nộp, ai chưa, ai bị khoá.

```typescript
isLocked: new Date(day.dateStr).getTime() < startOfWeek.getTime(),
```

**Ngày trước tuần hiện tại → coi như đã khoá** → hiển thị readonly.

---

## 18. Endpoint Dashboard & Báo Cáo

```
# Dashboard
GET /api/dashboard/me              ALL → trả DTO theo role
GET /api/dashboard/pm               PM, ADMIN
GET /api/dashboard/hr               HR, ADMIN
GET /api/dashboard/admin            ADMIN
GET /api/dashboard/department       DEPT_HEAD

# Daily Report
GET  /api/daily-reports/draft/today  ALL → DraftPayload (gợi ý nội dung)
POST /api/daily-reports              ALL → nộp (có thể nộp hộ)
GET  /api/daily-reports/mine         ALL → danh sách cá nhân
GET  /api/daily-reports/team/weekly  PM, DEPT_HEAD, ADMIN → ma trận tuần
GET  /api/daily-reports/team/daily   PM, DEPT_HEAD, ADMIN → theo ngày
GET  /api/daily-reports/:id          ALL (check canViewReportsOf)
PATCH /api/daily-reports/:id         ALL (check canEditReport)
```

---

## 19. Frontend Component Tree

```
features/daily-reports/
├── DailyReportModal.tsx          ← modal nộp báo cáo (có nút "Gợi ý AI")
├── MyDailyReportsList.tsx        ← lịch sử cá nhân
└── DailyReportTeamView.tsx       ← ma trận tuần cho PM/DEPT_HEAD

features/dashboard/
├── components/DashboardPage.tsx  ← router theo role
├── layouts/                      ← 5 layout
│   ├── EmployeeDashboardLayout.tsx
│   ├── PmDashboardLayout.tsx
│   ├── HrDashboardLayout.tsx
│   ├── AdminDashboardLayout.tsx
│   └── DepartmentHeadDashboardLayout.tsx
└── widgets/                      ← 30+ widget
    ├── HeroBanner, QuickAttendanceCard, KpiRibbon, CoreTasksChecklist
    ├── VelocityBarChart, TaskDonutChart, WeeklyShiftScheduleWidget
    ├── ActiveSprintCard, UpcomingMeetingsCard, ProjectPortfolioCard
    ├── RecentDocumentsHub, RecentActivityFeed, DeepWorkTrackerWidget
    ├── ScopeCreepWidget, TeamCapacityWidget, AiSprintHealthWidget
    ├── QuickApprovalWidget, HeadcountTrendWidget, CompanyCultureCard
    └── DepartmentAnalyticsCharts, EnterpriseFooter
```

---

## 20. Câu Hỏi Thường Gặp

**Q: Vì sao dùng `Promise.all` cho 7 query count thay vì 1 query `groupBy`?**
> `groupBy` trả 1 bảng gọn hơn nhưng phải `COUNT` trên toàn bảng rồi filter lại ở JS, hoặc viết SQL raw. 7 `count` với index trên `assigneeId` + `status` rất nhanh, và `Promise.all` chạy song song nên tổng thời gian ≈ 1 query. Code rõ ràng hơn nhiều, đánh đổi rất nhỏ.

**Q: Tại sao `completionRate` chia bằng `total` chứ không phải `done + inReview`?**
> `done` là trạng thái cuối cùng. `inReview` chưa xong — tính vào hoàn thành sẽ phóng đại. Rate = done/total là chuẩn nghiệp vụ.

**Q: Dashboard có bị chậm không?**
> Nhờ `Promise.all` các query độc lập chạy song song. Nhưng dashboard PM/HR/Admin vẫn là **nhiều query**. Ở quy mô thực tế (vài trăm người dùng) vẫn dưới 500ms. Nếu lớn hơn → thêm **cache Redis** theo key `dashboard:{userId}` TTL 60s, và cân nhắc materialized view.

**Q: Vì sao DTO dùng `extends` thay vì interface riêng biệt?**
> Class inheritance cho phép `PmDashboardDto extends EmployeeDashboardDto` — mọi field base đều có sẵn, thêm field riêng. Giảm code lặp và đảm bảo **shape thống nhất** cho mọi vai trò → frontend dùng chung được component (vd `KpiRibbon` nhận `data.taskSummary` của cả 5 layout).

**Q: Vì sao dùng p50/p95/p99 thay vì trung bình latency?**
> Trung bình bị 1 request chậm chi phối → che mất 99% request bình thường nhanh. Percentile cho biết "bao nhiêu % request dưới ngưỡng". SLA thực tế dựa trên p95/p99.

**Q: Vì sao `lateSubmission` không chặn nộp muộn?**
> Mục tiêu là **dữ liệu đầy đủ**, không phải trừng phạt. Nếu chặn, nhân viên quên nộp → mất dữ liệu, HR không biết ai chưa nộp. Ghi cờ `lateSubmission` giữ dữ liệu + vẫn đo được mức độ kỷ luật.

**Q: Vì sao khoá báo cáo sau nửa đêm?**
> Để lịch sử **bất biến**. Nếu ai cũng sửa báo cáo cũ thì số liệu tổng hợp theo tháng của HR mất ý nghĩa, và việc PM duyệt cũng vô nghĩa. Khoá = ranh giới thời gian rõ ràng.

**Q: `lockMidnightReports` chạy khi nào?**
> Được thiết kế như method của service, được gọi từ cron job (`@nestjs/schedule`) vào 00:05 mỗi ngày. Method dùng `updateMany` với điều kiện `isLocked: false` nên **idempotent** — chạy lại nhiều lần cũng an toàn.

**Q: Vì sao `upsert` thay vì `findUnique` + `create/update`?**
> `findUnique` → `create` là 2 round-trip và có **race condition** (2 request đồng thời cùng thấy chưa có → cùng `create` → 1 lỗi unique constraint). `upsert` là 1 câu lệnh atomic trong DB.

**Q: Vì sao filter ngày dùng `lt: nextDate` thay vì `lt: endOfDay`?**
> `endOfDay` = 23:59:59.999 — giá trị này **không bao giờ có** trong DB vì timestamp có millisecond thực. Task hoàn thành đúng 23:59:59.9995 sẽ bị sót. Khoảng `[gte 00:00 hôm nay, lt 00:00 ngày mai)` luôn đúng.

**Q: Vì sao `getDateOnly` dùng `en-CA` + `T00:00:00.000Z`?**
> `en-CA` là locale duy nhất cho ra định dạng `YYYY-MM-DD` (chuẩn ISO, parse trực tiếp). `en-US` ra `MM/DD/YYYY` → nhập nhằng. Và `T00:00:00.000Z` khớp cách Postgres lưu cột `@db.Date`, tránh lệch múi giờ nếu server chạy UTC.
