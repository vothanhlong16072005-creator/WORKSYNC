---
name: Work Calendar Timeline
overview: Triá»ƒn khai tĂ­nh nÄƒng Work Calendar (Timeline M8) há»£p nháº¥t Tasks, Meetings, Sprints, Nghá»‰ phĂ©p, WFH, Overtime vĂ o 1 timeline duy nháº¥t vá»›i 3 gĂ³c nhĂ¬n (CĂ¡ nhĂ¢n / PhĂ²ng ban / ToĂ n cĂ´ng ty), zoom Day/Week/Month, filter, vĂ  drag-drop reschedule cĂ³ phĂ¢n quyá»n (chá»‰ creator má»›i kĂ©o Ä‘Æ°á»£c, ngÆ°á»£c láº¡i hiá»ƒn thá»‹ toast "LiĂªn há»‡ ngÆ°á»i táº¡o").
todos:
  - id: confirm_scope
    content: "Confirm scope: Work Calendar toàn công ty với 3 view + drag-drop RBAC"
    status: completed
  - id: approve_plan
    content: Review & approve plan (ready for handoff)
    status: completed
  - id: phase_a_backend
    content: "Phase A: Backend Calendar module + tests"
    status: completed
  - id: phase_b_frontend_skeleton
    content: "Phase B: Frontend page skeleton + API + store + types"
    status: completed
  - id: phase_c_ui
    content: "Phase C: Frontend UI components (Timeline grid, filters, popover)"
    status: completed
  - id: phase_d_dragdrop
    content: "Phase D: Drag-drop reschedule + RBAC message"
    status: completed
  - id: phase_e_polish
    content: "Phase E: ICS export + i18n + tests + bundle size check"
    status: completed
isProject: false
---

# Plan: Work Calendar (Timeline M8)

> **Audience for this plan**: an Ng/coding agent (or another engineer) who will pick this up and implement end-to-end (UI -> state -> API -> tests). The plan is intentionally **self-contained**: contains wireframes, design tokens, type signatures, Zod schemas, seed data, verification commands. No further design questions should be needed.

---

## 1. Má»¥c tiĂªu & Definition of Done

Há»£p nháº¥t **6 nguá»“n dá»¯ liá»‡u** (Tasks + Sprints + Meetings + Leaves + WFH + Overtime) vĂ o **má»™t Calendar Timeline duy nháº¥t** vá»›i 3 gĂ³c nhĂ¬n (CĂ¡ nhĂ¢n / PhĂ²ng ban / ToĂ n cĂ´ng ty). Cho phĂ©p zoom Day/Week/Month, filter theo project/assignee/status/priority, vĂ  drag-drop reschedule vá»›i phĂ¢n quyá»n nghiĂªm ngáº·t.

**DoD**:
- Backend: `npm run build` xanh, `npm test` >= 295/295 tests pass (271 hiá»‡n táº¡i + ~24 má»›i), TypeScript strict 0 errors.
- Frontend: `npm run build` xanh, 0 TS errors, táº¥t cáº£ spec má»›i pass.
- Bundle delta: dÆ°á»›i +50KB (gzip).
- Táº¥t cáº£ acceptance criteria á»Ÿ má»¥c 12 pass khi run manual.

---

## 2. Pháº¡m vi chá»©c nÄƒng

### 2.1. Items hiá»ƒn thá»‹ trĂªn Timeline

| Item Kind | MĂ u (hex) | Tailwind class | Icon (lucide) | Source DB | Filter báº¯t buá»™c |
|-----------|-----------|----------------|----------------|-----------|-----------------|
| `task` | `#3B82F6` | `bg-blue-500` | `ListTodo` | `Task.dueDate` IS NOT NULL | `deletedAt IS NULL` |
| `sprint` | `#6366F1` | `bg-indigo-500` | `Flag` | `Sprint.startDate..endDate` | `status != CANCELLED` |
| `meeting` | `#A855F7` | `bg-purple-500` | `Video` | `Meeting.startTime..endTime` | `deletedAt IS NULL` |
| `leave` | `#F59E0B` | `bg-amber-500` | `PlaneTakeoff` | `LeaveRequest.startDate..endDate` | `status = APPROVED` |
| `wfh` | `#10B981` | `bg-emerald-500` | `Home` | `WfhRequest.date` | `status = APPROVED` |
| `overtime` | `#F43F5E` | `bg-rose-500` | `Clock4` | `OvertimeRequest.startTime..endTime` | `status = APPROVED` |

### 2.2. 3 gĂ³c nhĂ¬n (Scope)

| Scope | URL param | Default cho role | Items |
|-------|-----------|------------------|-------|
| `mine` | `?scope=mine` | EMPLOYEE, PM, HR, DEPT_HEAD | task assignee=me; meeting attendee=me; leave/wfh/overtime userId=me; sprint náº¿u tĂ´i lĂ  PM |
| `department` | `?scope=department` | PM, DEPT_HEAD, HR (cĂ¹ng dept) | táº¥t cáº£ items cá»§a users trong `myDepartmentId` |
| `company` | `?scope=company` | ADMIN only | táº¥t cáº£ items cá»§a má»i user |

### 2.3. 3 View modes (Zoom)

| View | Range | Slot width | Hiá»ƒn thá»‹ |
|------|-------|------------|----------|
| `day` | 1 ngĂ y | 24 giá» dá»c (1h = 32px) | Task Ä‘áº§u ngĂ y, Meeting theo giá» |
| `week` | 7 ngĂ y (Mon-Sun theo VN) | 7 cá»™t ngang (1 ngĂ y â‰ˆ 160px) | Táº¥t cáº£ items |
| `month` | 30 ngĂ y | 30 cá»™t ngang (1 ngĂ y â‰ˆ 38px) | Items cĂ³ endAt - startAt >= 1 ngĂ y; items 1 ngĂ y hiá»ƒn thá»‹ dáº¡ng dot |

### 2.4. Filter

| Filter | Type | Default | UI Component |
|--------|------|---------|--------------|
| `projectId` | string \| null | null | `<select>` projects cá»§a user |
| `assigneeId` | string \| null | null | `<select>` users trong scope |
| `status` | string[] | `['TODO','IN_PROGRESS','IN_REVIEW','BLOCKED']` | multi-select chips |
| `priority` | string[] | `[]` (all) | multi-select chips |
| `types` | ItemKind[] | `['task','sprint','meeting','leave','wfh','overtime']` | toggle pills |
| `query` | string \| null | null | search input (title contains) |

### 2.5. Conflict Detection (cháº¡y server-side)

| Conflict Type | PhĂ¡t hiá»‡n | UI |
|---------------|-----------|-----|
| `meeting_overlap` | User U cĂ³ 2 meeting overlap thá»i gian | `ConflictBadge` Ä‘á» trĂªn 2 meeting bar |
| `overdue_overload` | User U cĂ³ >= 3 task overdue cĂ¹ng 1 ngĂ y | `ConflictBadge` trĂªn Ă´ ngĂ y Ä‘Ă³ + row trĂªn header |
| `leave_during_meeting` | User U approved leave mĂ  váº«n cĂ³ meeting cĂ¹ng ngĂ y | Warning toast + `ConflictBadge` |

### 2.6. Drag-drop RBAC Rules (Ä‘Ă£ chá»‘t vá»›i user)

| Actor relationship vá»›i item | ÄÆ°á»£c kĂ©o? | HĂ nh vi |
|------------------------------|-----------|---------|
| `Task`: actor lĂ  `assigneeId` (mĂ¬nh Ä‘Æ°á»£c giao) | **YES** | Optimistic update dueDate â†’ gá»i API |
| `Task`: actor lĂ  `createdById` (mĂ¬nh táº¡o task cho ngÆ°á»i khĂ¡c) | **YES** | Optimistic update dueDate â†’ gá»i API |
| `Task`: actor lĂ  PM/ADMIN cá»§a project | **YES** | Optimistic update dueDate â†’ gá»i API |
| `Task`: actor cĂ²n láº¡i (dev khĂ¡c xem task ngÆ°á»i ta) | **NO** | Toast: "Chá»‰ ngÆ°á»i táº¡o hoáº·c assignee má»›i Ä‘á»•i lá»‹ch. LiĂªn há»‡ {creatorName}" |
| `Meeting`: actor lĂ  `createdById` | **YES** | Optimistic update â†’ gá»i API |
| `Meeting`: actor lĂ  ADMIN | **YES** | Optimistic update â†’ gá»i API |
| `Meeting`: actor khĂ¡c (attendee bĂ¬nh thÆ°á»ng) | **NO** | Toast: "Chá»‰ ngÆ°á»i táº¡o cuá»™c há»p má»›i Ä‘á»•i lá»‹ch. LiĂªn há»‡ {creatorName}" |
| `Leave/WFH/Overtime` | **NO** (luĂ´n) | Toast: "KhĂ´ng thá»ƒ tá»± Ă½ Ä‘á»•i. Vui lĂ²ng gá»­i yĂªu cáº§u má»›i tá»›i HR." |
| `Sprint`: actor lĂ  PM cá»§a project hoáº·c ADMIN | **YES** | Optimistic update â†’ gá»i API |
| `Sprint`: actor khĂ¡c | **NO** | Toast tÆ°Æ¡ng tá»± |

**Tailwind hint cho cursor**: dĂ¹ng `cursor-grab` máº·c Ä‘á»‹nh, `cursor-not-allowed` + `opacity-50` cho items locked.

---

## 3. Wireframes (ASCII)

### 3.1. WorkCalendarPage â€” Desktop 1440px

```
+--------------------------------------------------------------------------+
| TOP BAR (h-16, bg-white border-b)                                        |
| [Logo WorkSync] [Search ...]               [Bell] [Lang VI] [Avatar Long] |
+--------------------------------------------------------------------------+
| SIDEBAR (w-60) | MAIN CONTENT                                            |
| - Dashboard     | +--------------------------------------------------------+|
| - Projects      | | HEADER STRIP (h-20, bg-white border-b)                 ||
| - Tasks         | | [Work Calendar]   [Mine][Dept][Company]                ||
| - Sprints       | |              [Day][Week][Month]    [Filter] [Export]   ||
| - Quick Tasks   | +--------------------------------------------------------+|
| - Meetings      | | KPI STRIP (h-20, grid-cols-5, gap-4)                  ||
| - Documents     | | [Total:42] [Tasks:18] [Meetings:6] [Leave:3] [OT:2]   ||
| - Attendance    | +--------------------------------------------------------+|
| - Calendar â—€----| | TIMELINE CANVAS (flex-1, overflow-auto)               ||
| - Notifications | | +--------------------------------------------------+ ||
| - Settings      | | | Filter Pills Bar (h-12)                          | ||
|                 | | | [All Types][Tasks][Meetings][Sprints]...        | ||
|                 | | +--------------------------------------------------+ ||
|                 | | +--------------------------------------------------+ ||
|                 | | | HEADER ROW (Mon 20 Tue 21 Wed 22 ... Sun 26)     | ||
|                 | | +--------------------------------------------------+ ||
|                 | | |                                                  | ||
|                 | | |  Row User A:                                     | ||
| |                | | |  [â–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆâ–ˆ] Sprint 14 (Oct 18-25)              | ||
| |                | | |      [â–ˆâ–ˆ] Meeting Daily (Oct 20 09:00-09:30)  | ||
| |                | | |         [â–ˆâ–ˆâ–ˆ] Task TASK-101 due Oct 22         | ||
| |                | | |  Row User B:                                    | ||
| |                | | |         [â–ˆâ–ˆâ–ˆâ–ˆâ–ˆ] Leave 22-26 (yellow)           | ||
| |                | | |  Row User C:                                   | ||
| |                | | |         [â–ˆâ–ˆ] WFH Oct 22 (1 day dot)            | ||
| |                | | |                                                  | ||
| |                | | +--------------------------------------------------+ ||
|                 | +--------------------------------------------------------+|
|                 |                                                            |
+--------------------------------------------------------------------------+
| FOOTER (h-8, text-xs, text-slate-500) Â© 2026 WorkSync                    |
+--------------------------------------------------------------------------+
```

### 3.2. ItemDetailPopover â€” Click 1 bar

```
+--------------------------------------------------+
| [purple] Daily Standup Mobile App    [X]         |
| Status: SCHEDULED                                |
| Time: 09:00 - 09:30 (30 phĂºt)                    |
| Scope: PROJECT (proj-mobile-app)                 |
| Creator: PM HĂ  Tran                              |
| +------------------------------------------------+|
| | [Join meeting]  [Open detail]  [Reschedule]    ||  (chá»‰ hiá»‡n náº¿u cĂ³ quyá»n)
| +------------------------------------------------+|
| Attendees (4): PM HĂ , Dev Dat, Lead Dev Long     |
| RSVP: 3 ACCEPTED, 1 PENDING                      |
+--------------------------------------------------+
```

### 3.3. RescheduleConfirmModal

```
+----------------------------------------------+
|  XĂ¡c nháº­n Ä‘á»•i lá»‹ch                          |
|                                              |
|  "Daily Standup Mobile App"                  |
|  Tá»«: Mon 20/10 09:00 -> 09:30                |
|  Äáº¿n: Tue 21/10 09:00 -> 09:30               |
|                                              |
|  LĂ½ do (tuá»³ chá»n): [textarea]                |
|                                              |
|  [Huá»·]  [XĂ¡c nháº­n Ä‘á»•i lá»‹ch]                  |
+----------------------------------------------+
```

---

## 4. Design Tokens (tá»« codebase hiá»‡n cĂ³)

Äá»c tá»« `frontend/src/lib/utils.ts` (clsx + tailwind-merge) vĂ  Tailwind config.

```typescript
// Use these tokens - DO NOT hardcode hex
const COLORS = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white',
  danger: 'bg-rose-500 text-white',
  warning: 'bg-amber-500 text-white',
  success: 'bg-emerald-500 text-white',
  // Item kinds
  task: 'bg-blue-500/90 hover:bg-blue-600 border-blue-700',
  sprint: 'bg-indigo-500/90 hover:bg-indigo-600 border-indigo-700',
  meeting: 'bg-purple-500/90 hover:bg-purple-600 border-purple-700',
  leave: 'bg-amber-500/90 hover:bg-amber-600 border-amber-700',
  wfh: 'bg-emerald-500/90 hover:bg-emerald-600 border-emerald-700',
  overtime: 'bg-rose-500/90 hover:bg-rose-600 border-rose-700',
} as const;

const SIZES = {
  barHeight: 'h-7',           // bar máº·c Ä‘á»‹nh
  barHeightCompact: 'h-4',    // bar trong month view
  rowHeight: 'h-12',          // 1 row trong canvas
  dotSize: 'w-2 h-2 rounded-full',
} as const;
```

**Typography**: dĂ¹ng Tailwind máº·c Ä‘á»‹nh (`text-sm`, `font-medium`, `text-slate-700`). KHĂ”NG tá»± thĂªm font.

**Animation**: dĂ¹ng `framer-motion` Ä‘Ă£ cĂ³ sáºµn trong package.json:
```typescript
import { motion } from 'framer-motion';
// Fade-in bar
<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }} />
```

---

## 5. Kiáº¿n trĂºc Backend

### 5.1. Module má»›i: `calendar`

**KhĂ´ng thĂªm dependency má»›i vĂ o package.json** â€” chá»‰ dĂ¹ng `@nestjs/common`, `@nestjs/jwt` (Ä‘Ă£ cĂ³), `date-fns` (chÆ°a cĂ³ â†’ sáº½ thĂªm), `zod` (Ä‘Ă£ cĂ³).

**File structure**:
```
backend/src/calendar/
  calendar.module.ts
  calendar.controller.ts
  calendar.service.ts
  dto/
      calendar-query.dto.ts        # Zod schema + ParseZodPipe
      reschedule.dto.ts           # Zod schema
  __tests__/
      calendar.service.spec.ts
```

### 5.2. `calendar.module.ts`

```typescript
@Module({
  imports: [
    PrismaModule,         // for PrismaService
    JwtModule,            // for guards
    AuthModule,           // for JwtAuthGuard
  ],
  controllers: [CalendarController],
  providers: [CalendarService],
  exports: [CalendarService],
})
export class CalendarModule {}
```

### 5.3. `calendar.controller.ts` signatures

```typescript
@Controller('api/calendar')
@UseGuards(JwtAuthGuard)
export class CalendarController {
  @Get('timeline')
  async getTimeline(@Query() query: CalendarQueryDto, @CurrentUser() user): Promise<TimelineResponse>;

  @Patch('items/:kind/:id/reschedule')
  async rescheduleItem(
    @Param('kind') kind: ItemKind,
    @Param('id') id: string,
    @Body() body: RescheduleDto,
    @CurrentUser() user,
  ): Promise<RescheduleResult>;

  @Get('export')
  @Header('Content-Type', 'text/calendar; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="worksync-calendar.ics"')
  async exportIcs(@Query() query: CalendarQueryDto, @CurrentUser() user): Promise<string>;
}
```

### 5.4. `calendar.service.ts` signatures

```typescript
@Injectable()
export class CalendarService {
  constructor(private prisma: PrismaService) {}

  async getTimeline(query: CalendarQueryDto, user: AuthUser): Promise<TimelineResponse>;
  async rescheduleItem(kind: ItemKind, id: string, dto: RescheduleDto, user: AuthUser): Promise<RescheduleResult>;
  async exportIcs(query: CalendarQueryDto, user: AuthUser): Promise<string>;
  async detectConflicts(items: TimelineItem[], users: AuthUser[]): Promise<Conflict[]>;
}
```

### 5.5. Zod Schemas (DTOs)

```typescript
// calendar-query.dto.ts
export const CalendarQuerySchema = z.object({
  from: z.string().refine(d => !isNaN(Date.parse(d))),
  to: z.string().refine(d => !isNaN(Date.parse(d))),
  scope: z.enum(['mine', 'department', 'company']).default('mine'),
  projectId: z.string().optional(),
  assigneeId: z.string().optional(),
  types: z.array(z.enum(['task','sprint','meeting','leave','wfh','overtime'])).optional(),
  status: z.array(z.string()).optional(),
  priority: z.array(z.enum(['LOW','MEDIUM','HIGH','URGENT'])).optional(),
  query: z.string().optional(),
});

// reschedule.dto.ts
export const RescheduleSchema = z.object({
  newStart: z.string().refine(d => !isNaN(Date.parse(d))),
  newEnd: z.string().refine(d => !isNaN(Date.parse(d))).optional(),
  reason: z.string().max(500).optional(),
});
```

### 5.6. Permission helper (trong service)

```typescript
// File: backend/src/calendar/calendar.permissions.ts
type ItemKind = 'task' | 'sprint' | 'meeting' | 'leave' | 'wfh' | 'overtime';

interface AuthUser { id: string; role: Role; departmentId: string | null; }

export function canReschedule(
  kind: ItemKind,
  item: { createdById: string; assigneeId?: string; projectId?: string; userId?: string },
  user: AuthUser,
): { allowed: true } | { allowed: false; reason: string; creatorName?: string } {
  // Logic theo RBAC matrix má»¥c 2.6
}
```

### 5.7. Response Types

```typescript
// backend/src/calendar/types/timeline.types.ts
export type TimelineItem =
  | TaskTimelineItem
  | SprintTimelineItem
  | MeetingTimelineItem
  | LeaveTimelineItem
  | WfhTimelineItem
  | OvertimeTimelineItem;

interface BaseTimelineItem {
  kind: ItemKind;
  id: string;
  startAt: string;   // ISO
  endAt: string;     // ISO
  title: string;
  canReschedule: boolean;
  creatorName: string;
  creatorId: string;
}

interface TaskTimelineItem extends BaseTimelineItem {
  kind: 'task';
  projectId: string;
  projectName: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId: string;
  assigneeName: string;
}

interface MeetingTimelineItem extends BaseTimelineItem {
  kind: 'meeting';
  scope: MeetingScope;
  projectId: string | null;
  departmentId: string | null;
  attendeeCount: number;
}

interface LeaveTimelineItem extends BaseTimelineItem {
  kind: 'leave';
  userId: string;
  userName: string;
  leaveType: LeaveType;
}

interface WfhTimelineItem extends BaseTimelineItem {
  kind: 'wfh';
  userId: string;
  userName: string;
}

interface OvertimeTimelineItem extends BaseTimelineItem {
  kind: 'overtime';
  userId: string;
  userName: string;
}

interface SprintTimelineItem extends BaseTimelineItem {
  kind: 'sprint';
  projectId: string;
  projectName: string;
  status: SprintStatus;
}

export interface Conflict {
  userId: string;
  userName: string;
  type: 'meeting_overlap' | 'overdue_overload' | 'leave_during_meeting';
  message: string;
  involvedItemIds: string[];
}

export interface TimelineResponse {
  range: { from: string; to: string };
  scope: 'mine' | 'department' | 'company';
  items: TimelineItem[];
  conflicts: Conflict[];
}
```

### 5.8. Wire backend â†’ app.module.ts

```typescript
// backend/src/app.module.ts
imports: [
  // ... existing
  CalendarModule,  // ADD at the end
]
```

---

## 6. Kiáº¿n trĂºc Frontend

### 6.1. File structure

```
frontend/src/features/calendar/
  pages/
      WorkCalendarPage.tsx
  api/
      calendar.api.ts
  stores/
      calendar.store.ts
  types/
      calendar.types.ts
  utils/
      date-ranges.ts       # helpers: getDayRange, getWeekRange, getMonthRange
      ics-export.ts        # build ICS string
  components/
      WorkCalendarHeader.tsx       # scope + view switcher + filter + export
      TimelineCanvas.tsx           # main grid
      TimelineHeaderRow.tsx        # day/week column headers
      TimelineRow.tsx              # 1 user row
      TimelineItemBar.tsx          # 1 colored bar
      TimelineFilters.tsx          # filter popover
      ScopeSwitcher.tsx            # Mine/Dept/Company
      ViewSwitcher.tsx             # Day/Week/Month
      ConflictBadge.tsx
      ItemDetailPopover.tsx
      RescheduleConfirmModal.tsx
  hooks/
      useTimelineData.ts
      useDragDrop.ts
      useConflictDetection.ts
  __tests__/
      WorkCalendarPage.spec.tsx
      TimelineCanvas.spec.tsx
      TimelineItemBar.spec.tsx
      calendar.store.spec.ts
      ics-export.spec.ts
```

### 6.2. Route + Sidebar wiring

```typescript
// frontend/src/App.tsx
import { WorkCalendarPage } from './features/calendar/pages/WorkCalendarPage';
// thĂªm route:
<Route path="/calendar" element={<WorkCalendarPage />} />

// frontend/src/components/layout/Sidebar.tsx (hoáº·c tĂªn tÆ°Æ¡ng Ä‘Æ°Æ¡ng)
// thĂªm menu item:
{ to: '/calendar', icon: CalendarRange, label: 'Lá»‹ch lĂ m viá»‡c' }
```

### 6.3. TypeScript types (mirror backend, discriminated union)

```typescript
// frontend/src/features/calendar/types/calendar.types.ts
export type ItemKind = 'task' | 'sprint' | 'meeting' | 'leave' | 'wfh' | 'overtime';

export type TimelineItem = TaskTimelineItem | SprintTimelineItem | MeetingTimelineItem | LeaveTimelineItem | WfhTimelineItem | OvertimeTimelineItem;
// ... interface definitions mirror backend
```

### 6.4. Zustand store shape

```typescript
// frontend/src/features/calendar/stores/calendar.store.ts
interface CalendarState {
  // View
  view: 'day' | 'week' | 'month';
  scope: 'mine' | 'department' | 'company';
  rangeStart: Date;
  rangeEnd: Date;

  // Filters
  filters: {
    projectId: string | null;
    assigneeId: string | null;
    types: ItemKind[];
    status: string[];
    priority: string[];
    query: string;
  };

  // Data
  items: TimelineItem[];
  conflicts: Conflict[];
  isLoading: boolean;
  error: string | null;

  // Actions
  setView: (v: 'day' | 'week' | 'month') => void;
  setScope: (s: 'mine' | 'department' | 'company') => void;
  setRange: (start: Date, end: Date) => void;
  setFilter: (key: keyof CalendarState['filters'], value: any) => void;
  resetFilters: () => void;
  fetchItems: () => Promise<void>;
  rescheduleItem: (kind: ItemKind, id: string, newStart: Date, newEnd?: Date, reason?: string) => Promise<{ success: boolean; error?: string }>;
  exportIcs: () => Promise<void>;
}
```

### 6.5. API client signatures

```typescript
// frontend/src/features/calendar/api/calendar.api.ts
export const calendarApi = {
  getTimeline: async (params: TimelineQueryParams): Promise<TimelineResponse> => { ... },
  rescheduleItem: async (kind: ItemKind, id: string, dto: RescheduleDto): Promise<RescheduleResult> => { ... },
  exportIcs: async (params: TimelineQueryParams): Promise<Blob> => { ... },
};
```

### 6.6. Drag-drop helper (HTML5 native, NO new lib)

```typescript
// frontend/src/features/calendar/hooks/useDragDrop.ts
export function useTimelineDragDrop({
  items,
  onReschedule,
}: {
  items: TimelineItem[];
  onReschedule: (kind: ItemKind, id: string, newStart: Date, newEnd?: Date) => Promise<void>;
}) {
  // onDragStart: set dataTransfer.setData('application/x-timeline-item', JSON.stringify({id, kind}))
  // onDragOver: e.preventDefault() Ä‘á»ƒ cho phĂ©p drop
  // onDrop: parse dataTransfer, calculate new date from drop X position, call onReschedule
  // Permission check TRÆ¯á»C khi kĂ©o: náº¿u !canReschedule â†’ khĂ´ng set draggable, hiá»‡n toast ngay khi user cá»‘ grab
}
```

### 6.7. ICS export utility

```typescript
// frontend/src/features/calendar/utils/ics-export.ts
export function buildIcs(items: TimelineItem[]): string {
  // RFC 5545 format:
  // BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//WorkSync//EN\n
  // BEGIN:VEVENT\nUID:task-123@worksync\nDTSTART:20261022T090000Z\nDTEND:...\nSUMMARY:Sprint 14\nDESCRIPTION:...\nEND:VEVENT\n
  // END:VCALENDAR
}
```

---

## 7. Mock/Seed Data (cho test)

Táº¡o `backend/prisma/seed-calendar.ts` Ä‘á»ƒ generate data máº«u cho Calendar ngay cáº£ khi user chÆ°a táº¡o items.

```typescript
// Seed:
// - 5 tasks vá»›i dueDate trong tuáº§n tá»›i (1-2 overdue)
// - 2 sprints (1 active, 1 planning)
// - 5 meetings (2 SCHEDULED trong tuáº§n, 1 IN_PROGRESS hĂ´m nay, 2 COMPLETED tuáº§n trÆ°á»›c)
// - 3 leaves APPROVED
// - 2 WFH APPROVED
// - 1 overtime APPROVED
// - Äáº£m báº£o cĂ³ 1 conflict: 2 meeting overlap cá»§a cĂ¹ng user
```

---

## 8. i18n Keys

ThĂªm vĂ o `frontend/src/lib/i18n/locales/vi.json` vĂ  `en.json`:

```json
{
  "calendar": {
    "title": "Lá»‹ch lĂ m viá»‡c",
    "scope": {
      "mine": "Cá»§a tĂ´i",
      "department": "PhĂ²ng ban",
      "company": "ToĂ n cĂ´ng ty"
    },
    "view": {
      "day": "NgĂ y",
      "week": "Tuáº§n",
      "month": "ThĂ¡ng"
    },
    "kpi": {
      "total": "Tá»•ng",
      "tasks": "Tasks",
      "meetings": "Cuá»™c há»p",
      "leave": "Nghá»‰ phĂ©p",
      "overtime": "TÄƒng ca"
    },
    "filter": {
      "title": "Bá»™ lá»c",
      "project": "Dá»± Ă¡n",
      "assignee": "NgÆ°á»i thá»±c hiá»‡n",
      "types": "Loáº¡i",
      "status": "Tráº¡ng thĂ¡i",
      "priority": "Äá»™ Æ°u tiĂªn",
      "search": "TĂ¬m kiáº¿m",
      "reset": "Äáº·t láº¡i"
    },
    "export": "Xuáº¥t .ics",
    "item": {
      "openDetail": "Má»Ÿ chi tiáº¿t",
      "joinMeeting": "VĂ o phĂ²ng há»p",
      "reschedule": "Äá»•i lá»‹ch",
      "creator": "NgÆ°á»i táº¡o",
      "assignee": "NgÆ°á»i thá»±c hiá»‡n"
    },
    "permission": {
      "cannotRescheduleTitle": "KhĂ´ng thá»ƒ Ä‘á»•i lá»‹ch",
      "cannotRescheduleGeneric": "Vui lĂ²ng liĂªn há»‡ ngÆ°á»i táº¡o Ä‘á»ƒ thay Ä‘á»•i lá»‹ch.",
      "cannotRescheduleLeave": "KhĂ´ng thá»ƒ tá»± Ă½ Ä‘á»•i lá»‹ch nghá»‰ phĂ©p. Vui lĂ²ng gá»­i yĂªu cáº§u má»›i tá»›i HR.",
      "cannotRescheduleTask": "Chá»‰ ngÆ°á»i táº¡o task hoáº·c assignee má»›i Ä‘á»•i Ä‘Æ°á»£c. LiĂªn há»‡ {{creatorName}}.",
      "cannotRescheduleMeeting": "Chá»‰ ngÆ°á»i táº¡o cuá»™c há»p má»›i Ä‘á»•i Ä‘Æ°á»£c. LiĂªn há»‡ {{creatorName}}."
    },
    "rescheduleModal": {
      "title": "XĂ¡c nháº­n Ä‘á»•i lá»‹ch",
      "from": "Tá»«",
      "to": "Äáº¿n",
      "reason": "LĂ½ do (tuá»³ chá»n)",
      "confirm": "XĂ¡c nháº­n",
      "cancel": "Huá»·"
    },
    "conflict": {
      "meetingOverlap": "{{userName}} cĂ³ 2 cuá»™c há»p trĂ¹ng giá»",
      "overdueOverload": "{{userName}} cĂ³ {{count}} task trá»… háº¡n trong ngĂ y",
      "leaveDuringMeeting": "{{userName}} nghá»‰ phĂ©p nhÆ°ng cĂ³ cuá»™c há»p cĂ¹ng ngĂ y"
    },
    "empty": "KhĂ´ng cĂ³ sá»± kiá»‡n nĂ o trong khoáº£ng thá»i gian nĂ y."
  }
}
```

---

## 9. Implementation Phases (chi tiáº¿t)

### Phase A: Backend Module (1.5 ngĂ y)

1. `backend/src/calendar/calendar.module.ts` â€” module skeleton.
2. `backend/src/calendar/dto/calendar-query.dto.ts` â€” Zod schemas.
3. `backend/src/calendar/types/timeline.types.ts` â€” type defs.
4. `backend/src/calendar/calendar.permissions.ts` â€” `canReschedule` helper.
5. `backend/src/calendar/calendar.service.ts`:
   - `getTimeline`: query 6 Prisma tables, apply scope filter, apply optional filters, run `detectConflicts`.
   - `rescheduleItem`: lookup item â†’ check `canReschedule` â†’ update DB â†’ trigger notification.
   - `exportIcs`: build RFC 5545 string from items.
6. `backend/src/calendar/calendar.controller.ts` â€” 3 endpoints.
7. `backend/src/app.module.ts` â€” import CalendarModule.
8. **Tests** trong `__tests__/calendar.service.spec.ts` (24 test cases):
   - getTimeline: 6 (mine/dept/company Ă— happy path + RBAC tá»« chá»‘i)
   - reschedule: 7 (4 kinds Ă— success/failure + 1 leave blocked)
   - exportIcs: 3 (empty, populated, multi-kind)
   - detectConflicts: 5 (meeting overlap, overdue overload, leave during meeting, no conflict)
   - canReschedule: 3 (task assignee OK, meeting non-creator BLOCKED, sprint non-PM BLOCKED)

### Phase B: Frontend Skeleton (1 ngĂ y)

9. `frontend/src/features/calendar/types/calendar.types.ts`.
10. `frontend/src/features/calendar/api/calendar.api.ts`.
11. `frontend/src/features/calendar/stores/calendar.store.ts`.
12. `frontend/src/features/calendar/utils/date-ranges.ts`.
13. `frontend/src/features/calendar/pages/WorkCalendarPage.tsx` â€” page skeleton, chá»‰ render `<WorkCalendarHeader />` + `<TimelineCanvas />` placeholder.
14. `frontend/src/App.tsx` â€” add route.
15. Sidebar â€” add menu.

### Phase C: UI Components (2.5 ngĂ y)

16. `ScopeSwitcher.tsx` â€” 3 tab pills vá»›i permission check (Company tab disabled náº¿u role !== ADMIN).
17. `ViewSwitcher.tsx` â€” 3 tab pills.
18. `TimelineFilters.tsx` â€” popover vá»›i selects + chips.
19. `WorkCalendarHeader.tsx` â€” compose 3 components + Export button.
20. `TimelineCanvas.tsx`:
    - Grid layout: header row + N row users.
    - Scrollbar ngang.
    - Render dá»±a theo `view`.
    - Empty state náº¿u `items.length === 0`.
21. `TimelineHeaderRow.tsx` â€” render cá»™t ngĂ y theo view.
22. `TimelineRow.tsx` â€” 1 user row vá»›i avatar + name + items.
23. `TimelineItemBar.tsx`:
    - Color theo kind.
    - Position absolute theo startAt, width theo duration.
    - Click â†’ `setSelectedItem`.
    - Permission: `canReschedule` â†’ `cursor-grab`, ngÆ°á»£c láº¡i `cursor-not-allowed`.
    - Tooltip vá»›i title + time.
    - `ConflictBadge` náº¿u cĂ³ conflict.
24. `ConflictBadge.tsx` â€” dot Ä‘á» + tooltip message.
25. `ItemDetailPopover.tsx` â€” modal hiá»‡n khi click bar.
26. `RescheduleConfirmModal.tsx` â€” modal confirm trÆ°á»›c khi drop.

### Phase D: Drag-drop + RBAC (1.5 ngĂ y)

27. `useDragDrop.ts` hook:
    - `onDragStart`: set dataTransfer.
    - `onDragOver`: e.preventDefault().
    - `onDrop`: parse, calc new date, call `onReschedule`.
    - Permission pre-check: náº¿u !canReschedule â†’ KHĂ”NG set draggable=true; náº¿u user cá»‘ grab (mousedown) â†’ show toast.
28. Wire vĂ o `TimelineItemBar.tsx`: thĂªm `draggable={canReschedule}` vĂ  `onDragStart/onDragOver/onDrop`.
29. Wire vĂ o `TimelineCanvas.tsx`: `onDrop` handler á»Ÿ row, dispatch action vĂ o store.
30. Reschedule modal má»Ÿ trÆ°á»›c khi gá»i API.
31. Optimistic UI: update local items ngay, rollback náº¿u API fail.
32. Toast: success "ÄĂ£ Ä‘á»•i lá»‹ch thĂ nh cĂ´ng" / error "KhĂ´ng thá»ƒ Ä‘á»•i lá»‹ch: <reason>".

### Phase E: Export + Tests + Polish (0.5 ngĂ y)

33. `ics-export.ts` â€” build RFC 5545.
34. Wire vĂ o Export button: gá»i `exportIcs()` â†’ táº¡o Blob URL â†’ trigger download.
35. `seed-calendar.ts` â€” seed data máº«u.
36. Tests:
    - `WorkCalendarPage.spec.tsx` (render smoke test).
    - `TimelineCanvas.spec.tsx` (render items correctly).
    - `TimelineItemBar.spec.tsx` (color theo kind, click handler).
    - `calendar.store.spec.ts` (actions update state correctly).
    - `ics-export.spec.ts` (output matches RFC 5545).
37. i18n: thĂªm `calendar.*` keys vĂ o vi.json + en.json.
38. README section ngáº¯n trong [docs/M8-WORK-CALENDAR.md](docs/M8-WORK-CALENDAR.md).

---

## 10. Files táº¡o má»›i / sá»­a

### Táº¡o má»›i (24 files)

**Backend** (7):
- `backend/src/calendar/calendar.module.ts`
- `backend/src/calendar/calendar.controller.ts`
- `backend/src/calendar/calendar.service.ts`
- `backend/src/calendar/calendar.permissions.ts`
- `backend/src/calendar/dto/calendar-query.dto.ts`
- `backend/src/calendar/dto/reschedule.dto.ts`
- `backend/src/calendar/types/timeline.types.ts`
- `backend/src/calendar/__tests__/calendar.service.spec.ts`
- `backend/prisma/seed-calendar.ts`

**Frontend** (15):
- `frontend/src/features/calendar/pages/WorkCalendarPage.tsx`
- `frontend/src/features/calendar/api/calendar.api.ts`
- `frontend/src/features/calendar/stores/calendar.store.ts`
- `frontend/src/features/calendar/types/calendar.types.ts`
- `frontend/src/features/calendar/utils/date-ranges.ts`
- `frontend/src/features/calendar/utils/ics-export.ts`
- `frontend/src/features/calendar/components/WorkCalendarHeader.tsx`
- `frontend/src/features/calendar/components/TimelineCanvas.tsx`
- `frontend/src/features/calendar/components/TimelineHeaderRow.tsx`
- `frontend/src/features/calendar/components/TimelineRow.tsx`
- `frontend/src/features/calendar/components/TimelineItemBar.tsx`
- `frontend/src/features/calendar/components/TimelineFilters.tsx`
- `frontend/src/features/calendar/components/ScopeSwitcher.tsx`
- `frontend/src/features/calendar/components/ViewSwitcher.tsx`
- `frontend/src/features/calendar/components/ConflictBadge.tsx`
- `frontend/src/features/calendar/components/ItemDetailPopover.tsx`
- `frontend/src/features/calendar/components/RescheduleConfirmModal.tsx`
- `frontend/src/features/calendar/hooks/useTimelineData.ts`
- `frontend/src/features/calendar/hooks/useDragDrop.ts`
- `frontend/src/features/calendar/hooks/useConflictDetection.ts`
- `frontend/src/features/calendar/__tests__/WorkCalendarPage.spec.tsx`
- `frontend/src/features/calendar/__tests__/TimelineCanvas.spec.tsx`
- `frontend/src/features/calendar/__tests__/TimelineItemBar.spec.tsx`
- `frontend/src/features/calendar/__tests__/calendar.store.spec.ts`
- `frontend/src/features/calendar/__tests__/ics-export.spec.ts`

**Docs** (1):
- `docs/M8-WORK-CALENDAR.md`

### Sá»­a (6 files)

- `backend/package.json` â€” thĂªm `date-fns` dependency.
- `backend/src/app.module.ts` â€” import `CalendarModule`.
- `frontend/src/App.tsx` â€” route `/calendar`.
- `frontend/src/components/layout/Sidebar.tsx` (hoáº·c tÆ°Æ¡ng Ä‘Æ°Æ¡ng) â€” menu item.
- `frontend/src/lib/i18n/locales/vi.json` â€” thĂªm `calendar.*` keys.
- `frontend/src/lib/i18n/locales/en.json` â€” thĂªm `calendar.*` keys.

---

## 11. Verification Commands

Cháº¡y sau khi code xong:

```bash
# Backend
cd backend
npx tsc --noEmit                          # 0 errors
npm test                                   # >= 295 passed
npm run build                              # exit 0

# Frontend
cd ../frontend
npx tsc --noEmit -b                        # 0 errors
npm run test                               # táº¥t cáº£ pass
npm run build                              # exit 0, dist size delta < +50KB

# Bundle size check
ls -la backend/dist/calendar/              # pháº£i cĂ³ .js + .d.ts files
du -sh frontend/dist/assets/*.js          # so vá»›i baseline ~2.9MB
```

---

## 12. Acceptance Criteria (Definition of Done cho QA)

- [x] AC1: User login â†’ vĂ o `/calendar` â†’ máº·c Ä‘á»‹nh tab "Cá»§a tĂ´i", view "Tuáº§n", hĂ´m nay lĂ  1 cá»™t.
- [x] AC2: Items hiá»ƒn thá»‹ Ä‘áº§y Ä‘á»§ 6 kinds (task, sprint, meeting, leave, wfh, overtime) vá»›i mĂ u + icon Ä‘Ăºng.
- [x] AC3: Switch "PhĂ²ng ban" â†’ PM Tuáº¥n tháº¥y cĂ¡c members cá»§a dept-prod (6 users).
- [x] AC4: Switch "ToĂ n cĂ´ng ty" â†’ EMPLOYEE tháº¥y disabled (toast: "Chá»‰ ADMIN má»›i cĂ³ quyá»n").
- [x] AC5: Filter theo project â†’ chá»‰ hiá»ƒn thá»‹ items thuá»™c project Ä‘Ă³.
- [x] AC6: View "NgĂ y" â†’ chá»‰ 1 cá»™t, items stretch full height.
- [x] AC7: View "ThĂ¡ng" â†’ 30 cá»™t nhá», items 1 ngĂ y hiá»ƒn thá»‹ dot.
- [x] AC8: Drag 1 task cá»§a mĂ¬nh (assignee) â†’ cáº­p nháº­t dueDate, toast "ÄĂ£ Ä‘á»•i lá»‹ch".
- [x] AC9: Drag 1 task cá»§a ngÆ°á»i khĂ¡c (khĂ´ng pháº£i creator, khĂ´ng pháº£i assignee) â†’ toast "LiĂªn há»‡ PM Tuáº¥n".
- [x] AC10: Drag 1 meeting mĂ¬nh khĂ´ng táº¡o â†’ toast "LiĂªn há»‡ {creatorName}".
- [x] AC11: Drag 1 leave â†’ toast "Vui lĂ²ng gá»­i yĂªu cáº§u má»›i tá»›i HR".
- [x] AC12: Conflict badge hiá»ƒn thá»‹ khi 2 meeting trĂ¹ng giá» (visible tá»« seed-calendar).
- [x] AC13: Export .ics â†’ download file `worksync-calendar.ics` â†’ import vĂ o Google Calendar tháº¥y Ä‘Ăºng events.
- [x] AC14: Click 1 bar task â†’ popover má»Ÿ vá»›i nĂºt "Má»Ÿ chi tiáº¿t" â†’ route sang TaskDetailModal.
- [x] AC15: Click 1 bar meeting â†’ popover má»Ÿ vá»›i nĂºt "VĂ o phĂ²ng há»p" (náº¿u scheduled hoáº·c ongoing).
- [x] AC16: RescheduleConfirmModal hiá»‡n khi drag-drop â†’ confirm â†’ API call â†’ optimistic update.
- [x] AC17: All 295 backend tests pass (271 cÅ© + 24 má»›i).
- [x] AC18: All frontend tests pass (sá»‘ hiá»‡n táº¡i + 5 má»›i).
- [x] AC19: i18n VI/EN Ä‘áº§y Ä‘á»§, switch language lĂ m page re-render vá»›i text má»›i.
- [x] AC20: Bundle delta < +50KB (gzip).

---

## 13. Risks & Mitigations (cáº­p nháº­t)

| Risk | Severity | Mitigation |
|------|----------|------------|
| Bundle size tÄƒng do drag-drop | Low | DĂ¹ng HTML5 native, khĂ´ng thĂªm lib |
| 1000+ items â†’ lag | Medium | Virtualization vá»›i `react-window` (chá»‰ add náº¿u AC fail) |
| Timezone VN confusion | Medium | DĂ¹ng `date-fns-tz` cho ICS export, ISO strings everywhere |
| Race condition reschedule | Medium | Optimistic locking `updatedAt` check trong service |
| i18n typo â†’ page trá»‘ng | Low | Test `vi.json` + `en.json` parse OK |
| `date-fns` khĂ´ng cĂ³ sáºµn | Resolved | Cáº§n install (xem Files sá»­a) |

---

## 14. Out of Scope (lĂ m sau)

- Recurring events (weekly standup auto-repeat).
- Real-time collaboration cursors (2 users cĂ¹ng xem).
- Mobile native calendar sync.
- iCal feed subscription URL (chá»‰ export 1 láº§n).
- Color customization per user.
- Dark mode (chÆ°a cĂ³ trong codebase hiá»‡n táº¡i).

---

## 15. Handoff Notes (cho agent káº¿ tiáº¿p)

1. **Äá»c trÆ°á»›c**: [docs/M3.6-DEPT-HEAD-DASHBOARD.md](docs/M3.6-DEPT-HEAD-DASHBOARD.md) Ä‘á»ƒ hiá»ƒu convention viáº¿t dashboard + RBAC cá»§a codebase.
2. **Stack nháº¥t quĂ¡n**:
   - Tailwind classes (KHĂ”NG inline style).
   - `framer-motion` cho animations.
   - `lucide-react` cho icons.
   - `sonner` cho toast.
   - Zustand cho state, axios cho API.
3. **KhĂ´ng cáº§n há»i láº¡i** â€” táº¥t cáº£ design decisions Ä‘Ă£ chá»‘t trong plan nĂ y. Náº¿u cáº§n tweak, cáº­p nháº­t plan trÆ°á»›c rá»“i má»›i code.
4. **Test trÆ°á»›c khi commit**:
   - `cd backend && npm test` xanh.
   - `cd frontend && npm run build` xanh.
   - Manual test theo AC1-AC20.
5. **Commit message convention** (xem git log hiá»‡n táº¡i):
   - `feat(calendar): Phase A backend timeline`
   - `feat(calendar): Phase B frontend skeleton`
   - `feat(calendar): Phase C UI components`
   - `feat(calendar): Phase D drag-drop RBAC`
   - `feat(calendar): Phase E export + tests`
6. **PR review checklist**: paste AC1-AC20 vĂ o PR description.

---

**Estimated effort: 7 working days** (Phase A 1.5d + Phase B 1d + Phase C 2.5d + Phase D 1.5d + Phase E 0.5d)
