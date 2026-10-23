# 10 — Feature M8: Lịch Làm Việc Toàn Doanh Nghiệp (Work Calendar)

> **Module:** `backend/src/calendar/` — 8 file
> **Frontend:** `frontend/src/features/calendar/` — 22 file
> **Mô phởng:** Google Calendar + Asana Timeline, gộp 6 loại sự kiện vào 1 timeline.

---

## 1. Bối Cảnh

Nhân viên muốn 1 màn hình duy nhất thấy: task nào đến hạn, họp gì, ngày nghỉ phép, WFH, OT, sprint nào đang chạy. Nhưng dữ liệu này nằm rải rác ở 6 bảng DB khác nhau với cấu trúc thời gian khác nhau (`dueDate`, `startTime/endTime`, `startDate/endDate`).

**Mục tiêu:** aggregate 6 nguồn → 1 timeline, tự phát hiện xung đột, cho phép kéo-thả đổi lịch có kiểm soát RBAC.

---

## 2. 6 Loại Sự Kiện — Discriminated Union

```typescript
// backend/src/calendar/types/timeline.types.ts
export type ItemKind = 'task' | 'sprint' | 'meeting' | 'leave' | 'wfh' | 'overtime';
```

Mỗi loại có **interface riêng** mở rộng `BaseTimelineItem`:

```typescript
export interface BaseTimelineItem {
  kind: ItemKind;
  id: string;
  startAt: string;      // ISO
  endAt: string;        // ISO
  title: string;
  canReschedule: boolean;
  creatorName: string;
  creatorId: string;
  userId?: string;
  description?: string | null;
}

export interface TaskTimelineItem extends BaseTimelineItem {
  kind: 'task';
  projectId: string;
  projectName: string;
  status: TaskStatus;
  priority: Priority;
  assigneeId: string;
  assigneeName: string;
  isOverdue?: boolean;
}
```

**Tại sao dùng union thay vì 1 interface lớn?**
- TypeScript thu hẹp được `kind` → `if (item.kind === 'task')` thì `item.assigneeId` **có kiểu string**, không phải `string | undefined`
- `isOverdue` chỉ tồn tại ở task → không có `undefined` thừa ở 5 loại khác
- `leaveType` chỉ có ở leave → bắt buộc phải xử lý đúng chỗ

---

## 3. Chuẩn Hóa Thời Gian — `startAt`/`endAt`

**Bài toán:** 6 bảng có 6 kiểu thời gian khác nhau:

| Loại | Cột thời gian DB | Ghi chú |
|------|-----------------|---------|
| Task | `dueDate DateTime?` | 1 điểm thời gian |
| Sprint | `startDate` / `endDate` | khoảng |
| Meeting | `startTime` / `endTime` | khoảng |
| Leave | `startDate` / `endDate` (`@db.Date`) | nhiều ngày |
| WFH | `startDate` / `endDate` | nhiều ngày |
| Overtime | `date` | 1 ngày |

**Chuẩn hóa:** mọi loại đều map về `startAt`/`endAt` ISO string.

```typescript
// calendar.service.ts
const tasks = await this.prisma.task.findMany({
  where: { ...baseWhere, dueDate: { gte: rangeStart, lte: rangeEnd } },
  include: { project: {...}, assignee: {...}, createdBy: {...} },
});

for (const t of tasks) {
  items.push({
    kind: 'task',
    id: t.id,
    startAt: t.dueDate!.toISOString(),
    endAt: t.dueDate!.toISOString(),     // ← task là 1 điểm thời gian
    title: t.title,
    canReschedule: false,               // ← tính lại ở bước permission
    ...
  });
}
```

**Vì sao task có `startAt === endAt`?** Vì task chỉ có 1 mốc thời gian (`dueDate`). Kéo task trên timeline = dời deadline. Biểu diễn thành đoạn zero-length cho uniform.

---

## 4. 3 Scope Xem Lịch

```typescript
export type CalendarScope = 'mine' | 'department' | 'company';
```

| Scope | Ai xem được |
|-------|-------------|
| `mine` | Chỉ của tôi (task được giao + leave/WFH/OT của tôi + họp tôi tham dự) |
| `department` | Phòng ban của tôi |
| `company` | Tất cả |

---

## 5. Conflict Detection Engine

### 5.1 Kiến trúc

```
items[]  →  detectConflicts(items)  →  Conflict[]
                    │
                    ├── ① meeting_overlap
                    ├── ② overdue_overload
                    └── ③ leave_during_meeting
```

### 5.2 ① `meeting_overlap` — Trùng giờ họp

```typescript
// calendar.service.ts
for (let i = 0; i < meetingItems.length; i++) {
  for (let j = i + 1; j < meetingItems.length; j++) {
    const m1 = meetingItems[i];
    const m2 = meetingItems[j];

    const start1 = new Date(m1.startAt).getTime();
    const end1 = new Date(m1.endAt).getTime();
    const start2 = new Date(m2.startAt).getTime();
    const end2 = new Date(m2.endAt).getTime();

    // ★ Time overlap check: start1 < end2 && end1 > start2
    if (start1 < end2 && end1 > start2) {
      const atts1 = meetingAttendeesMap.get(m1.id) || [];
      const atts2 = meetingAttendeesMap.get(m2.id) || [];

      const commonAttendees = atts1.filter((a1) => atts2.some((a2) => a2.id === a1.id));
      for (const common of commonAttendees) {
        conflicts.push({
          userId: common.id,
          userName: common.name,
          type: 'meeting_overlap',
          message: `${common.name} có 2 cuộc họp trùng giờ ("${m1.title}" và "${m2.title}")`,
          involvedItemIds: [m1.id, m2.id],
        });
      }
    }
  }
}
```

**O(n²) pair-comparison** — chấp nhận được vì số cuộc họp trong 1 tuần ≤ vài chục. Nếu scale lên thì chuyển sang sweep-line algorithm.

**Overlap formula** `start1 < end2 && end1 > start2` là chuẩn interval overlap — tránh false positive khi 2 cuộc họp liền kề (`end1 == start2` thì **không** trùng).

### 5.3 ② `overdue_overload` — Quá tải quá hạn

```typescript
const userOverdueTasks = new Map<string, { user: {...}; tasks: TaskTimelineItem[] }>();

for (const t of taskItems) {
  if (t.isOverdue && t.assigneeId) {
    const entry = userOverdueTasks.get(t.assigneeId) || {
      user: { id: t.assigneeId, name: t.assigneeName },
      tasks: [],
    };
    entry.tasks.push(t);
    userOverdueTasks.set(t.assigneeId, entry);
  }
}

for (const [, entry] of userOverdueTasks) {
  if (entry.tasks.length >= 3) {              // ★ ngưỡng 3 task quá hạn
    conflicts.push({
      userId: entry.user.id,
      userName: entry.user.name,
      type: 'overdue_overload',
      message: `${entry.user.name} có ${entry.tasks.length} công việc quá hạn cần xử lý`,
      involvedItemIds: entry.tasks.map((t) => t.id),
    });
  }
}
```

**Ý nghĩa:** 3 task trở lên quá hạn cùng lúc → tín hiệu quá tải, cần phân bổ lại. Ngưỡng 3 là **rule nghiệp vụ** (magic number có chủ đích).

### 5.4 ③ `leave_during_meeting` — Nghỉ phép nhưng vẫn có họp

```typescript
for (const l of leaveItems) {
  const leaveStart = new Date(l.startAt).getTime();
  const leaveEnd = new Date(l.endAt).getTime();

  for (const m of meetingItems) {
    const mStart = new Date(m.startAt).getTime();
    const mEnd = new Date(m.endAt).getTime();

    if (mStart <= leaveEnd && mEnd >= leaveStart) {     // ← overlap bao hàm
      const atts = meetingAttendeesMap.get(m.id) || [];
      const isAttendee = atts.some((a) => a.id === l.userId);
      if (isAttendee) {
        conflicts.push({
          userId: l.userId,
          userName: l.userName,
          type: 'leave_during_meeting',
          message: `${l.userName} đang nghỉ phép nhưng có lịch họp ("${m.title}")`,
          involvedItemIds: [l.id, m.id],
        });
      }
    }
  }
}
```

**Khác biệt với ①:** ① so 2 cuộc họp với nhau; ③ so **nghỉ phép với họp** (bao hàm — meeting nằm **trong** khoảng nghỉ phép).

### 5.5 Bảng Tóm Tắt

| Type | Điều kiện | Mức độ |
|------|-----------|--------|
| `meeting_overlap` | 1 user trong 2 họp trùng giờ | Trung bình |
| `overdue_overload` | ≥ 3 task quá hạn cùng lúc | Cao |
| `leave_during_meeting` | Nghỉ phép nhưng có lịch họp | Trung bình |

### 5.6 Frontend hiển thị xung đột

```typescript
// frontend/src/features/calendar/components/ConflictBadge.tsx
// Badge đính lên item bị xung đột, dùng involvedItemIds để tra ngược
```

`involvedItemIds` là mảng id → frontend map ngược từ item → conflict để gắn badge đỏ/cam vào thanh timeline.

---

## 6. RBAC Kéo-Thả Đổi Lịch — `canReschedule`

File: `backend/src/calendar/calendar.permissions.ts` — **hàm thuần**, không phụ thuộc DB, dễ test.

```typescript
export type PermissionCheckResult =
  | { allowed: true }
  | { allowed: false; reason: string; creatorName?: string };

export function canReschedule(
  kind: ItemKind,
  item: PermissionCheckItem,
  user: AuthActor,
): PermissionCheckResult {
  const creatorId = item.createdById || item.creatorId || '';
  const creatorName = item.creatorName || 'người tạo';

  // ① Leave, WFH, Overtime: KHÔNG BAO GIỜ kéo-thả trực tiếp
  if (kind === 'leave' || kind === 'wfh' || kind === 'overtime') {
    return {
      allowed: false,
      reason: 'Không thể tự ý đổi lịch yêu cầu nhân sự. Vui lòng gửi yêu cầu mới tới HR.',
    };
  }

  // ② Sprint: chỉ PM của dự án hoặc ADMIN
  if (kind === 'sprint') {
    if (user.role === Role.ADMIN || item.isProjectPm) return { allowed: true };
    return {
      allowed: false,
      reason: 'Chỉ Quản trị viên hoặc PM của dự án mới có quyền đổi lịch Sprint.',
      creatorName,
    };
  }

  // ③ Meeting: chỉ người tạo hoặc ADMIN
  if (kind === 'meeting') {
    if (user.role === Role.ADMIN || creatorId === user.id) return { allowed: true };
    return {
      allowed: false,
      reason: `Chỉ người tạo cuộc họp mới đổi được lịch. Liên hệ ${creatorName}`,
      creatorName,
    };
  }

  // ④ Task: assignee, creator, PM của dự án, hoặc ADMIN
  if (kind === 'task') {
    const isAssignee = item.assigneeId === user.id;
    const isCreator = creatorId === user.id;
    const isProjectPm = item.isProjectPm;
    const isAdmin = user.role === Role.ADMIN;

    if (isAssignee || isCreator || isProjectPm || isAdmin) return { allowed: true };
    return {
      allowed: false,
      reason: `Chỉ người tạo task hoặc người được giao mới đổi được lịch. Liên hệ ${creatorName}`,
      creatorName,
    };
  }

  return { allowed: false, reason: 'Không có quyền thay đổi lịch.' };
}
```

**Điểm thiết kế hay:** hàm trả về **lý do** (`reason`) bằng tiếng Việt thân thiện kèm tên người liên quan → hiển thị trực tiếp lên modal xác nhận, user biết chính xác phải liên hệ ai.

**Quy tắc nghiệp vụ quan trọng:** leave / WFH / OT là **yêu cầu nhân sự** → không ai được tự ý kéo-thả. Muốn đổi phải gửi yêu cầu mới qua quy trình HR. Đây là ranh giới giữa "lịch cá nhân" và "quy trình phê duyệt".

---

## 7. Reschedule — Giữ Nguyên Duration

### 7.1 Backend

```typescript
// calendar.service.ts — rescheduleItem()
if (kind === 'meeting') {
  const meeting = await this.prisma.meeting.findUnique({
    where: { id },
    include: { createdBy: { select: { id: true, name: true } }, attendees: true },
  });

  const perm = canReschedule('meeting', {
    createdById: meeting.createdById,
    creatorName: meeting.createdBy.name,
  }, actor);

  if (!perm.allowed) throw new ForbiddenException(perm.reason);

  // ★ Giữ nguyên thời lượng
  const durationMs = meeting.endTime.getTime() - meeting.startTime.getTime();
  const calculatedEnd = newEnd || new Date(newStart.getTime() + durationMs);

  const updated = await this.prisma.meeting.update({
    where: { id },
    data: { startTime: newStart, endTime: calculatedEnd },
    ...
  });
}
```

**Guard chung cho mọi kind:**

```typescript
if (newEnd && newStart > newEnd) {
  throw new BadRequestException('Thời gian bắt đầu mới không được lớn hơn thời gian kết thúc');
}
```

### 7.2 Frontend — Optimistic Update + Rollback

```typescript
// frontend/src/features/calendar/stores/calendar.store.ts
confirmReschedule: async (reason?: string): Promise<boolean> => {
  const { pendingReschedule, items } = get();
  if (!pendingReschedule) return false;

  const { item, newStart, newEnd } = pendingReschedule;
  const previousItems = [...items];                       // ← ảnh chụp để rollback

  // Optimistic update
  const updatedItems = items.map((it) => {
    if (it.id === item.id && it.kind === item.kind) {
      return {
        ...it,
        startAt: newStart.toISOString(),
        endAt: (newEnd || newStart).toISOString(),
      };
    }
    return it;
  });
  set({ items: updatedItems, pendingReschedule: null });

  try {
    await calendarApi.rescheduleItem(item.kind, item.id, {
      newStart: newStart.toISOString(),
      newEnd: newEnd?.toISOString(),
      reason,
    });
    toast.success(`Đã đổi lịch cho ${item.title}`);
    get().fetchItems();      // ← refresh để tính lại conflicts
    return true;
  } catch (err: any) {
    set({ items: previousItems });                        // ← ROLLBACK
    const errorMsg = err?.response?.data?.message || err?.message || 'Không thể đổi lịch sự kiện';
    toast.error(errorMsg);
    return false;
  }
},
```

**Điểm quan trọng:** sau khi reschedule thành công, store **fetch lại** chứ không chỉ giữ optimistic state → vì `conflicts` phụ thuộc vị trí mới, phải tính lại ở server.

---

## 8. Kéo-Thả HTML5 — Timeline Canvas

### 8.1 Chuẩn hóa vị trí khi drop

```typescript
// frontend/src/features/calendar/components/TimelineCanvas.tsx
const handleDropOnDate = (
  itemData: { id: string; kind: string; title: string },
  targetDate: Date,
) => {
  const found = items.find((i) => i.id === itemData.id && i.kind === itemData.kind);
  if (!found) return;

  // ★ Giữ duration gốc
  const origStart = new Date(found.startAt);
  const origEnd = new Date(found.endAt);
  const durationMs = origEnd.getTime() - origStart.getTime();

  const newStart = new Date(targetDate);
  // ★ Giữ giờ/phút gốc (drop vào ngày, không đổi khung giờ)
  newStart.setHours(origStart.getHours(), origStart.getMinutes(), 0, 0);

  const newEnd = new Date(newStart.getTime() + durationMs);

  setPendingReschedule({ item: found, newStart, newEnd });
};
```

**2 quy tắc khi drop:**
1. Giữ **duration** (họp 1h vẫn 1h sau khi dời)
2. Giữ **khung giờ** (task 9:00 thì kéo sang ngày khác vẫn 9:00)

→ Kéo-thả chỉ đổi **ngày**, không đổi giờ. Đúng trực giác người dùng.

### 8.2 Vùng drop

```typescript
// frontend/src/features/calendar/components/TimelineRow.tsx
const handleDrop = (e: React.DragEvent, targetDate: Date) => {
  e.preventDefault();
  setDragOverIndex(null);
  try {
    const dataStr = e.dataTransfer.getData('application/x-timeline-item');
    if (dataStr) {
      const parsed = JSON.parse(dataStr);
      onDropOnDate(parsed, targetDate);
    }
  } catch (err) {
    console.error('Failed to parse dropped timeline item:', err);
  }
};
```

**Custom MIME type** `application/x-timeline-item` — tránh xung đột với drag mặc định của trình duyệt (text/uri-list).

### 8.3 Xác định item có được kéo không

```typescript
// TimelineItemBar.tsx — draggable={item.canReschedule}
```

`canReschedule` được backend tính sẵn → frontend chỉ việc disable drag. **Không** duplicate logic RBAC ở client.

---

## 9. Export `.ics` — RFC 5545

### 9.1 Backend

```typescript
// calendar.service.ts — exportIcs()
'BEGIN:VCALENDAR',
'VERSION:2.0',
'PRODID:-//WorkSync//Enterprise Work Calendar//VI',
'CALSCALE:GREGORIAN',
'METHOD:PUBLISH',
'X-WR-CALNAME:WorkSync Calendar',
```

```typescript
// calendar.controller.ts
@Get('export')
@Header('Content-Type', 'text/calendar; charset=utf-8')
@Header('Content-Disposition', 'attachment; filename="worksync-calendar.ics"')
async exportIcs(@Query() rawQuery: unknown, @CurrentUser() actor: AuthActor): Promise<string> {
  const query = parseOrThrow(CalendarQuerySchema, rawQuery);
  return this.calendarService.exportIcs(query, actor);
}
```

### 9.2 Frontend — Fallback tạo file local

```typescript
// frontend/src/features/calendar/utils/ics-export.ts
export function buildClientIcs(items: TimelineItem[]): string {
  const formatIcsDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const escapeIcs = (str: string): string => {
    return (str || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//WorkSync//Client Work Calendar//VI',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:WorkSync Calendar',
  ];

  for (const item of items) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${item.kind}-${item.id}@worksync.vn`,      // ★ UID duy nhất
      `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
      `DTSTART:${formatIcsDate(item.startAt)}`,
      `DTEND:${formatIcsDate(item.endAt)}`,
      `SUMMARY:${escapeIcs(`[${item.kind.toUpperCase()}] ${item.title}`)}`,
      `DESCRIPTION:${escapeIcs(item.description || item.title)}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');          // ★ CRLF theo RFC 5545
}
```

### 9.3 4 Quy tắc RFC 5545 Được Áp Dụng

| Quy tắc | Cách thực hiện |
|---------|----------------|
| Ngày giờ format `YYYYMMDDTHHMMSSZ` | `.replace(/[-:]/g,'').replace(/\.\d{3}/,'')` |
| Escape `\` `;` `,` và newline | `escapeIcs()` |
| Line separator = CRLF | `lines.join('\r\n')` |
| `UID` duy nhất mỗi event | `${kind}-${id}@worksync.vn` |

**`escapeIcs` là bắt buộc** — tiêu đề task tiếng Việt có dấu phẩy hoặc dấu chấm phẩy sẽ làm file `.ics` hỏng nếu không escape.

### 9.4 2 đường export

```
exportIcs() trong store
  ├─→ calendarApi.exportIcs()  → server trả string .ics
  └─→ downloadBlob(blob, 'worksync-calendar-${scope}.ics')
```

```typescript
export function downloadBlob(blob: Blob, filename = 'worksync-calendar.ics') {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);   // ← dọn memory leak
  }, 100);
}
```

**`revokeObjectURL` sau 100ms** — cần chờ trình duyệt bắt đầu download rồi mới giải phóng blob URL.

---

## 10. Query Validation — Zod

```typescript
// backend/src/calendar/dto/calendar-query.dto.ts
const parseArrayOrSingle = (val: unknown) => {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    return val.includes(',') ? val.split(',').map((s) => s.trim()) : [val.trim()];
  }
  return undefined;
};

export const CalendarQuerySchema = z.object({
  from: z.string().refine((d) => !isNaN(Date.parse(d)), { message: 'Invalid from date' }),
  to: z.string().refine((d) => !isNaN(Date.parse(d)), { message: 'Invalid to date' }),
  scope: z.enum(['mine', 'department', 'company']).default('mine'),
  projectId: z.string().optional(),
  assigneeId: z.string().optional(),
  types: z.preprocess(
    parseArrayOrSingle,
    z.array(z.enum(['task', 'sprint', 'meeting', 'leave', 'wfh', 'overtime'])).optional(),
  ),
  status: z.preprocess(parseArrayOrSingle, z.array(z.string()).optional()),
  priority: z.preprocess(
    parseArrayOrSingle,
    z.array(z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])).optional(),
  ),
  query: z.string().optional(),
});
```

**`parseArrayOrSingle`** — chấp nhận cả `?types=task,sprint` lẫn `?types=task&types=sprint`. Frontend gửi mảng (Axios serialize thành `types[]=task`), nhưng người dùng gõ URL tay thì dùng dấu phẩy.

**`z.preprocess`** chạy **trước** khi validate → biến string thành array rồi mới check enum.

---

## 11. Frontend — 3 View + Date Range

```typescript
// frontend/src/features/calendar/utils/date-ranges.ts
export function getWeekRange(referenceDate: Date = new Date()): { start: Date; end: Date } {
  const current = new Date(referenceDate);
  const day = current.getDay();
  // ★ VN: Monday is day 1, Sunday is day 7
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const start = new Date(current);
  start.setDate(current.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}
```

**Xử lý Sunday đặc biệt:** `getDay()` trả 0 cho Chủ nhật → `diffToMonday = -6` (lùi 6 ngày về thứ 2). Nếu dùng `1 - day` cho Sunday = 1 → đi về ngày mai (thứ 2 tuần sau) — sai.

**3 view:**
| View | Range |
|------|-------|
| `day` | 00:00:00 → 23:59:59.999 cùng ngày |
| `week` | Thứ 2 → Chủ nhật |
| `month` | Ngày 1 → ngày cuối tháng (`new Date(y, m+1, 0)`) |

---

## 12. Component Tree

```
WorkCalendarPage.tsx
├── WorkCalendarHeader.tsx        ← nút điều hướng, hôm nay, view switcher
├── ScopeSwitcher.tsx             ← mine / department / company
├── TimelineFilters.tsx           ← project, assignee, type, status, priority, query
├── TimelineCanvas.tsx            ★ điều phối grouping + drop handler
│   ├── TimelineHeaderRow.tsx     ← header các ngày
│   └── TimelineRow.tsx           ← 1 dòng = 1 user / 1 project
│       └── TimelineItemBar.tsx   ← 1 thanh item (draggable, conflict badge)
├── ConflictBadge.tsx             ← badge cảnh báo xung đột
├── ItemDetailPopover.tsx         ← popup chi tiết khi click item
└── RescheduleConfirmModal.tsx    ← xác nhận đổi lịch + nhập lý do
```

### 12.1 Grouping — Gom theo "dòng"

```typescript
// TimelineCanvas.tsx
const groupedRows = useMemo(() => {
  const groups = new Map<string, { label: string; subLabel?: string; items: TimelineItem[] }>();

  for (const item of items) {
    let key = 'general';
    let label = 'Dự án & Sprints';
    let subLabel = 'Toàn nhóm';

    if (item.kind === 'task') {
      key = item.assigneeId || item.creatorId || 'unassigned';
      label = item.assigneeName || item.creatorName || 'Chưa giao';
      subLabel = 'Công việc';
    } else if (item.kind === 'leave' || item.kind === 'wfh' || item.kind === 'overtime') {
      key = item.userId || item.creatorId;
      label = (item as any).userName || item.creatorName;
      subLabel = 'Nhân sự & Chấm công';
    } else if (item.kind === 'meeting') {
      key = item.creatorId || 'meeting-general';
      label = item.creatorName || 'Cuộc họp';
      subLabel = 'Chủ tọa';
    } else if (item.kind === 'sprint') {
      key = `project-${item.projectId}`;
      label = item.projectName;
      subLabel = 'Chu kỳ Sprint';
    }

    const existing = groups.get(key) || { label, subLabel, items: [] };
    existing.items.push(item);
    groups.set(key, existing);
  }

  return Array.from(groups.values());
}, [items]);
```

**Mô hình "dòng theo người" (row-per-user)** — khác Google Calendar (lưới theo giờ). Chọn mô hình này vì:
- Task/Sprint/Leave gắn với **người**, không gắn với khung giờ tuyệt đối
- Dễ thấy "ai quá tải" (task của 1 người gom 1 dòng)
- Conflict detection là **so sánh giữa các item của cùng người** → nhóm theo user là tự nhiên nhất

---

## 13. Endpoint

```
GET   /api/calendar/timeline?from&to&scope&types&...   ALL
PATCH /api/calendar/items/:kind/:id/reschedule          ALL (check canReschedule)
GET   /api/calendar/export?from&to&scope               ALL → text/calendar
```

**3 endpoint duy nhất** — gọn, dễ cache, dễ kiểm thử.

---

## 14. Câu Hỏi Thường Gặp

**Q: Vì sao Task có `startAt === endAt`?**
> Task chỉ có 1 mốc thời gian (`dueDate`), không có khoảng. Biểu diễn thành đoạn zero-length để mọi loại item có cùng interface → `TimelineCanvas` xử lý 1 cách duy nhất. Kéo task = dời deadline.

**Q: Vì sao dùng `canReschedule` là hàm thuần thay vì decorator `@Roles()`?**
> Vì quyền ở đây phụ thuộc **quan hệ với item cụ thể** (có phải assignee không, có phải PM dự án không), không phụ thuộc role đơn thuần. `@Roles()` chỉ giải quyết được phần "role có đủ quyền loại này không". Hàm thuần → dễ unit test, dễ tái sử dụng, trả về cả lý do cụ thể để hiển thị.

**Q: Tại sao leave/WFH/OT không cho kéo-thả?**
> Vì đó là **yêu cầu nhân sự** đã qua quy trình phê duyệt (HR duyệt nghỉ phép, DEPT_HEAD duyệt OT). Nếu cho kéo-thả tự do thì ai đó sẽ dời ngày nghỉ đã được duyệt → mất hiệu lực phê duyệt, và số ngày nghỉ phép vẫn bị trừ → dữ liệu lệch. Đúng cách là gửi yêu cầu mới.

**Q: Conflict detection chạy ở đâu?**
> Ở **server**, trong `getTimeline()` sau khi gom items. Lý do: cần dữ liệu `meetingAttendee` (người tham dự) mà frontend không có; và client không đáng tin (có thể bị giả mạo request). Client chỉ nhận `conflicts[]` và gắn badge.

**Q: Có thể scale Conflict Detection không?**
> `meeting_overlap` hiện O(n²). Với vài chục cuộc họp/tuần thì không sao. Nếu lên tới hàng nghìn item thì chuyển `meeting_overlap` sang sweep-line (sort theo start, duyệt 1 lần). `overdue_overload` đã là O(n) vì dùng `Map` nhóm.

**Q: File `.ics` export ở cả server và client — khác nhau gì?**
> Server export theo đúng query/filter và scope đã được server kiểm tra phân quyền. Client `buildClientIcs` là fallback khi gọi API export lỗi — dùng `items` đang có sẵn trong store. Cả hai đều tuân thủ RFC 5545 (CRLF, escape, UID).

**Q: `canReschedule` được gọi ở đâu — frontend hay backend?**
> **Cả hai, nhưng khác vai trò.** Backend là nguồn chân lý: `canReschedule` được gọi trong `rescheduleItem()` và ném `ForbiddenException` nếu không đủ quyền. Frontend dùng cờ `canReschedule` trả về từ API để **disable drag** — chỉ để UX tốt, không phải bảo mật. Client có thể bị bypass, nên server check là bắt buộc.

**Q: Tại sao dùng HTML5 drag-and-drop thay vì thư viện?**
> Timeline dạng lưới ngày đơn giản, HTML5 DnD đủ dùng: không thêm dependency, hỗ trợ mobile cần polyfill nhưng chấp nhận được. Với Kanban (M3.5) thì cần `@hello-pangea/dnd` vì cần reordering theo thứ tự, đó là bài toán khó hơn nhiều.
