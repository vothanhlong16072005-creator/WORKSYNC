# 07 — Feature M3/M3.5/M3.6: Dự Án, Kanban, Sprint & Giao Việc Nhanh

> **Module:** `backend/src/projects/` (10 file) + `tasks/` (10 file) + `sprints/` (7 file) + `quick-tasks/` (6 file)
> **Frontend:** `frontend/src/features/projects/` (21) + `tasks/` (2) + `sprints/` (11) + `quick-tasks/` (9)

---

## 1. Quyết Định Kiến Trúc Quan Trọng Nhất — Tách Cá Nhân vs Nhóm

### 1.1 Vấn đề

Nhân viên vừa có task cá nhân (viết tài liệu, học kỹ năng), vừa có task dự án (tính năng X cho khách hàng). Nếu gộp chung 1 bảng → bảng cá nhân lẫn lộn task dự án → không biết cái nào là việc thật.

### 1.2 Giải pháp — 1 bảng `Project`, phân biệt bằng `kind`

```prisma
enum ProjectKind { TEAM  PERSONAL }

model Project {
  kind            ProjectKind          @default(TEAM)
  personalOwnerId String?              @unique    // ← unique: 1 user chỉ có 1 personal project
  personalOwner   User?                @relation("PersonalProjectOwner", ...)
  pmId            String?              // ← PM chính (M3.5)
  departmentId    String?              // ← phòng ban quản lý (M3.5)
  workflowType    ProjectWorkflowType  @default(KANBAN)
  // ...
}
```

### 1.3 Tại sao dùng `kind` thay vì 2 bảng `PersonalProject` + `TeamProject`?

| Tiêu chí | 1 bảng + enum | 2 bảng riêng |
|-----------|---------------|---------------|
| Số lần code query | 1 | 2 (duplicate logic) |
| Thêm field chung (color, icon, tags) | 1 chỗ | 2 chỗ |
| Query "task của tôi ở cả 2 loại" | 1 query | 2 query + merge |
| Ràng buộc DB (1 personal/user) | `@unique` | Phải check ở app |

**Đánh đổi:** không có ràng buộc DB buộc `kind=PERSONAL` phải có `personalOwnerId`. Được xử lý ở Service layer:

```typescript
if (project.kind === ProjectKind.PERSONAL) {
  if (project.personalOwnerId !== userId) {
    throw new ForbiddenException('Bạn không có quyền tạo công việc trên bảng cá nhân của người khác');
  }
}
```

### 1.4 Idempotent Provisioning — Tự tạo project cá nhân

Khi đăng ký → `createWithPersonalProject()` tạo User + Project(PERSONAL) + ProjectMember **trong transaction**.

Ngoài ra `projects.service.ts` có **self-healing**: nếu user nào thiếu personal project (VD dữ liệu cũ) → tự tạo khi gọi `/projects/mine`.

---

## 2. 4 Loại Workflow — `ProjectWorkflowType`

```prisma
enum ProjectWorkflowType { SCRUM  KANBAN  DAILY  SIMPLE }
```

| Workflow | Dùng khi | Đặc điểm |
|----------|-----------|-----------|
| `SCRUM` | Agile chuẩn | Có Sprint, Story Points, Burndown |
| `KANBAN` | Luồng liên tục | Không sprint, kéo thả tự do |
| `DAILY` | Họp daily 15 phút | Task nhỏ, đánh giá nhanh |
| `SIMPLE` | Task đơn giản | To-do list |

Hiển thị qua `WorkflowTypeBadge.tsx`.

---

## 3. Bảng Kanban — 5 Cột & Kéo Thả Nguyên Bộ

### 3.1 5 trạng thái (`TaskStatus`)

```
TODO  →  IN_PROGRESS  →  IN_REVIEW  →  DONE
           ↓
        BLOCKED
```

| Status | Ý nghĩa |
|--------|---------|
| `TODO` | Cần làm |
| `IN_PROGRESS` | Đang làm |
| `IN_REVIEW` | Đánh giá |
| `BLOCKED` | Bị chặn |
| `DONE` | Hoàn thành |

### 3.2 Quyền kéo thả theo vai trò (`docs/01-FEATURES.md`)

| Từ | Sang | Ai được làm |
|-----|------|-------------|
| TODO | IN_PROGRESS | Assignee |
| IN_PROGRESS | IN_REVIEW | Assignee |
| IN_PROGRESS | BLOCKED | Assignee |
| BLOCKED | IN_PROGRESS | PM |
| IN_REVIEW | DONE | PM |
| IN_REVIEW | IN_PROGRESS | PM (kèm comment) |
| Bất kỳ | TODO | PM (reopen) |

**Member không có quyền → board ở chế độ read-only.**

### 3.3 Thuật toán tính `position` — Sparse Integer

```typescript
// tasks/tasks.service.ts — moveOnBoard
const result = await this.prisma.$transaction(async (tx) => {
  const task = await tx.task.findFirst({ where: { id: taskId, deletedAt: null } });
  if (!task) throw new NotFoundException('Task not found');

  oldStatus = task.status;
  const destIndex = Math.max(0, dto.destinationIndex);

  // Lấy các task đang ở cột đích (trừ chính task đang kéo)
  const columnTasks = await tx.task.findMany({
    where: {
      projectId,
      status: targetStatus,
      deletedAt: null,
      id: { not: taskId },              // ← loại task đang kéo ra khỏi danh sách
    },
    orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
  });

  const insertIndex = Math.min(destIndex, columnTasks.length);
  const orderedTasks = [...columnTasks];
  orderedTasks.splice(insertIndex, 0, task);   // ← chèn vào vị trí mới

  // ★ Gán lại position với bước nhảy 1024
  for (let i = 0; i < orderedTasks.length; i++) {
    const item = orderedTasks[i];
    const newPos = (i + 1) * 1024;             // 1024, 2048, 3072, ...
    if (item.id === taskId) {
      const isDone = targetStatus === TaskStatus.DONE;
      await tx.task.update({
        where: { id: taskId },
        data: {
          status: targetStatus,
          position: newPos,
          completedAt: isDone ? (task.completedAt || new Date()) : null,
          completedById: isDone ? (task.completedById || actor.id) : null,
        },
      });
    } else if (item.position !== newPos) {
      // Chỉ update những task thực sự đổi vị trí
      await tx.task.update({ where: { id: item.id }, data: { position: newPos } });
    }
  }
  // ...
});
```

### 3.4 Vì sao bước nhảy 1024?

**Kỹ thuật "sparse integer"** — không dùng `position = 1, 2, 3...` vì khi chèn giữa 2 task phải update **tất cả** task phía sau (O(n) writes).

Với bước nhảy 1024:
```
Task A: 1024
Task B: 2048
Task C: 3072
```
Chèn X giữa A và B → X lấy `position = 1536` → **chỉ 1 write**:
```
A: 1024
X: 1536   ← giữa A và B
B: 2048
C: 3072
```

**Trade-off:** sau N lần chèn cùng vị trí, khoảng cách có thể về 0 → phải rebalance. Code hiện rebalance toàn cột khi chèn (đơn giản, an toàn, và số task trong 1 cột thường < 50 nên chấp nhận được).

### 3.5 Vì sao Transaction Bắt Buộc?

```typescript
await this.prisma.$transaction(async (tx) => { ... });
```

**Kịch bản lỗi nếu không có transaction:**
1. Task X được update `status` → đã sang cột mới
2. Crash trước khi update lại `position` của các task còn lại
3. → Board hiển thị **lộn xộn thứ tự**, task có thể trùng position

Transaction = all-or-nothing. Lỗi → rollback toàn bộ, board giữ nguyên trạng thái cũ.

**`tx` callback form** (không phải array form) cho phép logic phức tạp hơn trong 1 transaction.

### 3.6 Optimistic Update ở Frontend

Đã phân tích ở file `04-FRONTEND-REACT.md` §4.3. Tóm tắt flow:

```
User kéo task
  ↓
Frontend: set({ tasks: [...newOrder] })   ← UI nhảy NGAY (không đợi server)
  ↓
POST/PATCH /tasks/:id/board-position
  ↓
  ├─ OK  → set({ tasks: map(savedTask) })   ← reconcile
  └─ Lỗi → set({ tasks: previousTasks })     ← rollback + toast error
```

**Cảm giác "instant"** dù server cần 100ms.

---

## 4. `ProjectAccessService` — Chống IDOR Toàn Dự Án

```typescript
// backend/src/projects/project-access.service.ts
export interface CurrentActor {
  id: string;
  role: Role;
  departmentId?: string | null;
}
```

**Các method chính:**

| Method | Kiểm tra |
|--------|----------|
| `requireReadableProject(projectId, actor)` | Đọc: member, PM, DEPT_HEAD cùng phòng, ADMIN, HR |
| `requireTaskMovePermission(taskId, actor)` | Kéo thả: Assignee, Creator, PM, ADMIN |
| `isProjectPM(projectId, userId)` | Có phải PM của dự án không |

**Điểm mấu chốt:** Service này là **nguồn quyền duy nhất** cho mọi thao tác liên quan dự án. Controller không tự kiểm tra → không có chỗ sót.

---

## 5. Trưởng Phòng & QuickTask (M3.5)

### 5.1 Vấn đề giải quyết

Trưởng phòng cần giao việc gấp cho nhân viên nhưng: tạo task trong dự án nhóm cần biết dự án nào, cần thêm vào thành viên, cần chọn Sprint... → quá nhiều bước cho 1 việc gấp.

### 5.2 Giải pháp — QuickTask ⚡

```prisma
model QuickTask {
  title        String
  description  String?
  projectId    String?     // ← null = cá nhân, không thuộc dự án nào
  assigneeId   String
  assignedById String
  dueDate      DateTime
  priority     Priority   @default(MEDIUM)
  status       TaskStatus @default(TODO)
  completedAt  DateTime?
}
```

**Khác `Task`:** không cần `sprintId`, `epicId`, `storyPoints`, không bắt buộc thuộc dự án → tạo được trong **1 modal**.

### 5.3 Giao diện

| Thành phần | File |
|-------------|------|
| Nút ⚡ trên Header | `quick-tasks/components/QuickTaskButton.tsx` |
| Modal giao việc | `QuickTaskModal.tsx` |
| Trang danh sách | `quick-tasks/components/QuickTasksPage.tsx` (route `/quick-tasks`) |
| Card hiển thị | `QuickTaskCard.tsx` |

### 5.4 Hoán Đổi PM — `swap-pm`

```typescript
// PATCH /api/projects/:id/swap-pm
// DEPT_HEAD + ADMIN
```

**Quy trình an toàn:**
```typescript
await this.prisma.$transaction([
  this.prisma.project.update({
    where: { id: projectId },
    data: { pmId: newPmId },
  }),
  this.prisma.notification.createMany({
    data: [
      { userId: oldPmId, type: 'SYSTEM', title: 'Bạn không còn là PM của dự án X' },
      { userId: newPmId, type: 'SYSTEM', title: 'Bạn được bàn giao vị trí PM dự án X' },
    ],
  }),
]);
```

**Cả 2 người đều nhận notification** trong cùng transaction → không có trạng thái "PM đổi nhưng người cũ không biết".

**Lý do cần transaction:** nếu đổi `pmId` thành công nhưng notification lỗi → PM cũ không biết mình mất quyền → gây hiểu nhầm khiến nhiệm vụ.

---

## 6. Sprint Agile (M3.6) — Chuẩn Jira

### 6.1 Vòng đời Sprint

```
PLANNING  ──(start)──►  ACTIVE  ──(complete)──►  COMPLETED
    │                      │
    │                      └─ task chưa xong → tự động về TODO (Backlog)
    └─ Định nghĩa goal, duration (mặc định 14 ngày)
```

```prisma
model Sprint {
  status       SprintStatus @default(PLANNING)
  durationDays Int          @default(14)     // ← 2 tuần chuẩn Agile
  completedAt  DateTime?
  goal         String?
  startDate    DateTime?
  endDate      DateTime?
}
```

### 6.2 Tạo Sprint — RBAC chặt

```typescript
async create(dto: CreateSprintDto, actor: CurrentActor) {
  await this.projectAccessService.requireReadableProject(dto.projectId, actor);

  const isPM = await this.projectAccessService.isProjectPM(dto.projectId, actor.id);
  if (!isPM && actor.role !== Role.ADMIN) {
    throw new ForbiddenException('Chỉ PM của dự án hoặc Admin mới có quyền tạo Sprint');
  }

  const durationDays = dto.durationDays || 14;
  const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
  const endDate = dto.endDate
    ? new Date(dto.endDate)
    : new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

  return this.prisma.sprint.create({
    data: {
      projectId: dto.projectId,
      name: dto.name,
      goal: dto.goal || null,
      durationDays, startDate, endDate,
      status: SprintStatus.PLANNING,
      createdById: actor.id,
    },
  });
}
```

**Đọc (view-only) rộng hơn ghi:** mọi member dự án, DEPT_HEAD phòng, HR, Admin đều xem được Sprint; nhưng chỉ PM/Admin mới tạo/sửa.

### 6.3 Tính Progress

```typescript
const totalTasks = sprint.tasks.length;
const doneTasks = sprint.tasks.filter((t) => t.status === TaskStatus.DONE).length;
const totalStoryPoints = sprint.tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
const completedStoryPoints = sprint.tasks
  .filter((t) => t.status === TaskStatus.DONE)
  .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

const percent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

return {
  ...sprint,
  progress: { totalTasks, doneTasks, totalStoryPoints, completedStoryPoints, percent },
};
```

### 6.4 Burndown Chart — Thuật toán

```typescript
async getBurndown(id: string, actor: CurrentActor): Promise<SprintBurndownResponse> {
  const sprint = await this.prisma.sprint.findFirst({
    where: { id, deletedAt: null },
    include: {
      tasks: {
        where: { deletedAt: null },
        select: { id: true, status: true, storyPoints: true, updatedAt: true, createdAt: true },
      },
    },
  });

  await this.projectAccessService.requireReadableProject(sprint.projectId, actor);

  // ★ Fallback: nếu chưa gắn SP → mỗi task = 1 SP
  let totalStoryPoints = sprint.tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
  if (totalStoryPoints === 0 && sprint.tasks.length > 0) {
    totalStoryPoints = sprint.tasks.length;
  }

  const doneTasks = sprint.tasks.filter((t) => t.status === TaskStatus.DONE);
  let completedStoryPoints = doneTasks.reduce(
    (sum, t) => sum + (t.storyPoints || (totalStoryPoints === sprint.tasks.length ? 1 : 0)), 0);

  const remainingStoryPoints = Math.max(0, totalStoryPoints - completedStoryPoints);

  const startDate = sprint.startDate ? new Date(sprint.startDate) : new Date(sprint.createdAt);
  const durationDays = sprint.durationDays || 14;
  const endDate = sprint.endDate
    ? new Date(sprint.endDate)
    : new Date(startDate.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const totalDays = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)));
  const today = new Date();

  const dailyData: BurndownDayPoint[] = [];

  for (let i = 0; i <= totalDays; i++) {
    const dayDate = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = dayDate.toISOString().split('T')[0];

    // ★ Đường lý tưởng: giảm tuyến tính từ total → 0
    const ideal = Math.max(0, Math.round((totalStoryPoints - (totalStoryPoints / totalDays) * i) * 10) / 10);

    // ★ Đường thực tế
    let actual = totalStoryPoints;
    if (dayDate <= today || sprint.status === SprintStatus.COMPLETED) {
      // Ngày đã qua: đếm SP hoàn thành TÍNH ĐẾN ngày đó
      const finishedPoints = doneTasks
        .filter((t) => new Date(t.updatedAt) <= new Date(dayDate.getTime() + 24 * 60 * 60 * 1000))
        .reduce((sum, t) => sum + (t.storyPoints || (totalStoryPoints === sprint.tasks.length ? 1 : 0)), 0);

      actual = Math.max(0, totalStoryPoints - finishedPoints);
    } else {
      // Ngày tương lai: giữ nguyên mức hiện tại
      actual = remainingStoryPoints;
    }

    dailyData.push({ date: dateStr, ideal, actual });
  }

  return { sprintId, sprintName, status, startDate, endDate,
           totalStoryPoints, completedStoryPoints, remainingStoryPoints, dailyData };
}
```

#### 4 kỹ thuật đáng chú ý

**① Đường lý tưởng giảm tuyến tính**

```
ideal[i] = total - (total / totalDays) × i
```
VD total=65, totalDays=14:
- Ngày 0: 65
- Ngày 7: 32.5
- Ngày 14: 0

**② Đường thực tế dùng `updatedAt` làm mốc hoàn thành**

```typescript
.filter((t) => new Date(t.updatedAt) <= new Date(dayDate.getTime() + 24 * 60 * 60 * 1000))
```
Task `DONE` mà `updatedAt` là 25/10 → ngày 20/10 vẫn tính là chưa xong. Đây là cách tái dựng lịch sử burndown từ dữ liệu hiện tại (không cần bảng snapshot riêng).

**③ Ngày tương lai giữ nguyên `remainingStoryPoints`**

```typescript
actual = remainingStoryPoints;
```
Chưa tới ngày → chưa biết sẽ xong bao nhiêu → hiển thị mức hiện tại (đường thẳng ngang).

**④ Fallback 1 SP/task**

```typescript
if (totalStoryPoints === 0 && sprint.tasks.length > 0) {
  totalStoryPoints = sprint.tasks.length;
}
```
Nếu team chưa gắn Story Points → coi mỗi task = 1 SP để biểu đồ vẫn vẽ được thay vì toàn 0.

### 6.5 Frontend Burndown — `BurndownChart.tsx` (Recharts)

```tsx
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={dailyData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="date" />
    <YAxis domain={[0, totalStoryPoints]} />
    <Tooltip />
    <Legend />
    <Line type="monotone" dataKey="ideal" stroke="#94A3B8" strokeDasharray="5 5" name="Lý tưởng" />
    <Line type="monotone" dataKey="actual" stroke="#3B82F6" strokeWidth={2} name="Thực tế" />
  </LineChart>
</ResponsiveContainer>
```

**Đường lý tưởng vẽ nét đứt xám, đường thực tế vẽ nét liền xanh** → nhìn là biết team có trễ tiến độ hay không.

### 6.6 Đóng Sprint — Trả task dở dang về Backlog

```typescript
// PATCH /api/sprints/:id/complete
await this.prisma.$transaction([
  this.prisma.sprint.update({
    where: { id },
    data: { status: SprintStatus.COMPLETED, completedAt: new Date() },
  }),
  // Task chưa DONE → về TODO (về Backlog)
  this.prisma.task.updateMany({
    where: { sprintId: id, status: { not: TaskStatus.DONE }, deletedAt: null },
    data: { status: TaskStatus.TODO, sprintId: null },
  }),
]);
```

**Task chưa xong bị gỡ khỏi Sprint** → xuất hiện trong **Product Backlog** để kéo vào Sprint sau. Đúng nghiệp vụ Agile.

---

## 7. Epic & Backlog — Cấu trúc Jira

```
Project
├── Epic 1: "Authentication"
│   ├── Task: "Thiết kế màn hình đăng nhập" [SP 3]
│   └── Task: "API đăng nhập JWT"           [SP 5]
├── Epic 2: "Dashboard"
│   └── Task: "Dashboard Admin"              [SP 8]
├── Sprint 1 (ACTIVE)
│   └── Task: "Fix bug login"                [SP 2]
└── Product Backlog
    └── Task: "Chưa gán Sprint"              [SP 13]
```

**`Epic`** = nhóm task lớn theo chủ đề (Jira Epic).
**`ProjectSprintsView.tsx`** = UI hiển thị kiểu Jira: khối Sprint dạng chu kỳ, thanh tiến độ %/SP, checklist task 1-click, dropdown gán task vào Sprint đang chạy.

---

## 8. Task Detail Modal — Chuẩn Linear / Jira Cloud

Component: `frontend/src/features/tasks/components/TaskDetailModal.tsx`

**2 cột:**
```
┌─────────────────────────────┬──────────────────────┐
│  Tên task                   │  Assignee    👤      │
│  [Mô tả rich text]          │  Reporter    👤      │
│                             │  Deadline    📅      │
│  ─────────────────────────  │  Estimate    ⏱      │
│  ▶ TODO ─ IN_PROGRESS ─     │  Tracked     ⏱      │
│    IN_REVIEW ─ DONE         │  Story Points 🔢     │
│  (dải tiến trình 5 bước)   │  Project    📁      │
│                             │  Sprint     🏃      │
└─────────────────────────────┴──────────────────────┘
```

**Dải tiến trình 5 bước** = click để đổi status nhanh (thay vì dropdown).

**Hệ thống viền ưu tiên 4 cấp:**

| Priority | Viền |
|----------|------|
| `URGENT` | đỏ rực rỡ |
| `HIGH` | cam đậm |
| `MEDIUM` | xanh sky |
| `LOW` | xám trang nhã |

→ Nhận diện mức ưu tiên bằng mắt khi scan board, không cần đọc chữ.

---

## 9. Endpoint Chính

### 9.1 Projects

```
GET    /api/projects/mine              ALL      — dự án cá nhân + dự án nhóm
POST   /api/projects                   DEPT_HEAD, ADMIN
GET    /api/projects/:id               Member
PATCH  /api/projects/:id               PM, DEPT_HEAD, ADMIN
PATCH  /api/projects/:id/swap-pm       DEPT_HEAD, ADMIN     ← transaction
POST   /api/projects/:id/members       PM, DEPT_HEAD, ADMIN
DELETE /api/projects/:id/members/:uid  PM, DEPT_HEAD, ADMIN
GET    /api/projects/:id/backlog       Member
CRUD   /api/projects/:id/epics         PM, ADMIN
```

### 9.2 Sprints

```
GET    /api/sprints/project/:projectId     Member (read-only rộng)
POST   /api/sprints                       PM, ADMIN
PATCH  /api/sprints/:id/start              PM, ADMIN
PATCH  /api/sprints/:id/complete           PM, ADMIN
GET    /api/sprints/:id/burndown           Member
```

### 9.3 Tasks

```
GET    /api/tasks?scope=mine                        ALL
GET    /api/tasks?scope=project&projectId=...       Member
POST   /api/tasks                                   ALL (giới hạn theo role)
PATCH  /api/tasks/:id/board-position                Assignee, PM, Creator  ← transaction
PATCH  /api/tasks/:id/status                        Assignee, PM, Creator
GET    /api/tasks/:id                               ALL
PATCH  /api/tasks/:id                               Assignee, PM, Creator
DELETE /api/tasks/:id                               PM, Creator, ADMIN  ← soft delete
POST   /api/tasks/:id/work-logs                     Assignee
GET    /api/tasks/:id/work-logs                     Member
GET/POST /api/tasks/:id/comments                    Member
```

### 9.4 QuickTasks

```
GET  /api/quick-tasks                ALL
POST /api/quick-tasks                DEPT_HEAD, PM, ADMIN
PATCH /api/quick-tasks/:id/status    Assignee, Assigner
```

---

## 10. Frontend — Kanban Board

### 10.1 Thư viện kéo thả — `@hello-pangea/dnd`

```tsx
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
```

**Vì sao không `@dnd-kit`?** `@hello-pangea/dnd` là fork bảo trì của `react-beautiful-dnd`, **tương thích React 19 StrictMode**. `react-beautiful-dnd` gốc đã ngừng hỗ trợ React 19 (lỗi StrictMode double-render).

### 10.2 Flow kéo thả

```
[1] User kéo thẻ task
     ↓
[2] onDragEnd(result) → { source, destination, reason }
     ↓
[3] Nếu reason === 'DROP' → gọi moveTask(taskId, { status, destinationIndex })
     ↓
[4] Zustand optimistic update → UI nhảy ngay
     ↓
[5] PATCH /api/tasks/:id/board-position
     ↓
[6] Server transaction → trả task đã lưu → reconcile
```

### 10.3 Table List View — Song song với Board

`ProjectTasksTableView.tsx` — chế độ bảng với bộ lọc nâng cao: theo nhãn, ưu tiên, thành viên, tìm kiếm từ khóa, ẩn task đã xong.

**2 chế độ** giúp:
- Kanban → quan sát tổng thể, kéo thả nhanh
- Table → tìm kiếm, lọc, xử lý hàng loạt

---

## 11. Câu Hỏi Thường Gặp

**Q: Vì sao tách Personal vs Team Project thay vì cờ `isPersonal` trên Task?**
> Vì cá nhân vs nhóm là khác biệt ở **cấp quyền và vòng đời**, không chỉ 1 field. Personal project có 1 owner duy nhất, không có Sprint, không có thành viên, không cần PM. Nếu để cờ trên Task thì logic kiểm tra sẽ rối ở mọi query. Model hóa đúng giúp truy vấn đơn giản (`kind = 'PERSONAL'`).

**Q: Tại sao `position` dùng bước nhảy 1024 thay vì số thứ tự liên tục?**
> Vì kéo thả xảy ra liên tục. Nếu dùng 1,2,3... thì chèn 1 task giữa cột phải update **tất cả** task phía sau (O(n) writes, dễ lỗi race). Với bước nhảy 1024, chèn giữa 2 task chỉ cần 1 write. Đánh đổi là cần rebalance định kỳ.

**Q: Transaction bắt buộc ở đâu trong Kanban?**
> `moveOnBoard` — vì nó update nhiều bản ghi `Task` trong 1 lần (task được kéo + các task đổi position). Không có transaction → crash giữa chừng để board lộn xộn. Ngoài ra `swap-pm` (Project + Notification) và duyệt nghỉ phép (3 bảng) cũng bắt buộc.

**Q: Burndown tính từ dữ liệu hiện tại hay lưu snapshot từng ngày?**
> Tính từ `Task.updatedAt` hiện tại. Ưu điểm: không cần bảng snapshot, không cần cron job. Nhược điểm: nếu task bị sửa `updatedAt` sau khi hoàn thành thì lịch sử burndown bị lệch. Giải pháp chuẩn hơn: bảng `SprintSnapshot` ghi mỗi ngày — là **hướng mở rộng** đáng nói.

**Q: Velocity khác Burndown thế nào?**
> **Velocity** = số Story Points team hoàn thành mỗi Sprint (để dự báo capacity Sprint sau). **Burndown** = tiến độ trong 1 Sprint (còn bao nhiêu SP còn lại). Frontend có `WeeklyVelocityChart.tsx` + `VelocityBarChart.tsx` cho velocity.

**Q: Trưởng phòng tạo task trong dự án nhóm được không? Có cần là PM không?**
> Được, **không cần là PM** — nhưng chỉ trong dự án mà họ tạo, là PM, hoặc thuộc phòng ban của họ:
```typescript
const isDeptHead = actor.role === Role.DEPARTMENT_HEAD && (
  project.createdById === userId || project.pmId === userId ||
  (!!actor.departmentId && project.departmentId === actor.departmentId));
```
Đây là điểm khác biệt so với PM (PM chỉ được trong dự án mình quản lý).

**Q: Task đã xong có thể kéo lại TODO không?**
> Được nếu là PM (reopen). Code giữ `completedAt`/`completedById` nếu task đã DONE trước đó — không mất lịch sử khi mở lại.

**Q: Vì sao có cả `Task.notified24h` và `notified1h`?**
> Để chống gửi trùng notification "task sắp đến hạn". Cron job check các task sắp hết hạn → nếu `notified24h = false` thì gửi rồi set `true`. Không có cờ này, user bị spam mỗi phút.
