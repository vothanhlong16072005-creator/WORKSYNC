# 04 — Frontend React 19: Kiến Trúc & Pattern

> **Nguồn:** đọc trực tiếp `frontend/src/` — `App.tsx`, `stores/`, `lib/`, `i18n/`, `components/layout/`.

---

## 1. Tại Sao React 19 + Vite?

| Công nghệ | Vấn đề giải quyết |
|------------|-------------------|
| **React 19** | Component hóa UI, có `use()` hook, Actions, `useOptimistic` |
| **Vite 8** | HMR tức thời (chỉ ~50ms), build bằng Rollup + esbuild |
| **TypeScript strict** | Bắt lỗi trước khi chạy |
| **Zustand** | State toàn cục nhẹ hơn Redux 10×, không cần Provider |
| **TailwindCSS** | Utility-first → không cần viết CSS riêng, token nhất quán |
| **i18next** | Đa ngôn ngữ không reload trang |

---

## 2. Cấu Trúc Thư Mục — Quy Ước Feature-Based

```
frontend/src/
├── App.tsx              # Router — điểm vào duy nhất
├── layouts/
│   └── DashboardLayout.tsx    # Shell: Header + Sidebar + <Outlet/>
├── components/
│   ├── ui/              # Component tái sử dụng (Button, Input, Modal...)
│   ├── layout/          # Header, Sidebar, PermissionGuard
│   └── AiFormattedContent.tsx
├── features/            # ⭐ MỖI TÍNH NĂNG 1 FOLDER
│   └── <tên-module>/
│       ├── pages/       # Route components
│       ├── components/  # Component nội bộ module
│       ├── api/         # Hàm gọi API (xxx.api.ts)
│       ├── stores/      # Zustand store riêng (nếu cần)
│       ├── hooks/       # Custom hooks
│       ├── types/       # TypeScript types
│       ├── utils/
│       └── __tests__/   # Unit test
├── stores/              # Zustand store dùng chung (auth, task, project)
├── lib/                 # api-client, api-schemas, utils
├── i18n/                # i18n.ts + locales/vi.json, en.json
└── index.css            # Tailwind + design tokens
```

> **Điểm tốt:** Thêm tính năng mới = thêm 1 folder trong `features/`, **không đụng** file cũ. Giảm rủi ro regression.

---

## 3. Routing — `App.tsx`

### 3.1 22 Route

```tsx
function App() {
  return (
    <BrowserRouter>
      {/* ⭐ Mount ở cấp CAO NHẤT — ngoài mọi route */}
      <PersistentCallManager />

      <Toaster position="top-right" closeButton expand={false} toastOptions={{...}} />

      <Routes>
        {/* Public */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Standalone — Full screen, KHÔNG có shell */}
        <Route path="/meetings/:id" element={<PreMeetingPage />} />
        <Route path="/meetings/:id/prepare" element={<PreMeetingPage />} />
        <Route path="/meetings/:id/room" element={<MeetingRoomPage />} />

        {/* Protected — có shell DashboardLayout */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/projects" element={<ProjectListPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/tasks" element={<KanbanPage />} />
          <Route path="/documents" element={<DocumentListPage />} />
          <Route path="/calendar" element={<WorkCalendarPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/meetings" element={<MeetingsListPage />} />
          <Route path="/quick-tasks" element={<QuickTasksPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />

          {/* ⭐ Guard theo role */}
          <Route path="/admin" element={
            <PermissionGuard allowedRoles={['ADMIN']}>
              <AdminControlCenterPage />
            </PermissionGuard>
          } />
        </Route>

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
```

### 3.2 2 Kiểu Layout

| Kiểu | Route | Đặc điểm |
|------|-------|-----------|
| **Standalone** | `/login`, `/meetings/:id/room` | Full screen, không Header/Sidebar |
| **Protected** | Trong `<DashboardLayout>` | Có Header + Sidebar + `<Outlet/>` |

`DashboardLayout` là layout component của React Router v6+ — dùng `<Outlet />` để render route con.

### 3.3 `PersistentCallManager` — Ghi chú kiến trúc quan trọng

```tsx
<BrowserRouter>
  <PersistentCallManager />   {/* ← NGOÀI <Routes> */}
  ...
```

**Tại sao mount ở đây?** Nhờ vậy khi user **thu nhỏ cuộc họp** (điều hướng sang `/dashboard`), widget vẫn hiển thị vì nó không nằm trong route nào.

```tsx
// PersistentCallManager.tsx
export const PersistentCallManager: React.FC = () => {
  const { activeMeeting, clearActiveMeeting } = useActiveCallStore();
  const location = useLocation();
  const navigate = useNavigate();

  if (!activeMeeting) return null;

  // Không float khi đang ở trang báo cáo
  if (location.pathname.startsWith(`/meetings/${activeMeeting.id}/report`)) return null;

  const isFullRoomRoute = location.pathname === `/meetings/${activeMeeting.id}/room`;

  return (
    <ActiveCallSession
      meeting={activeMeeting}
      isFullView={isFullRoomRoute}
      onMinimize={() => navigate('/dashboard')}
      onMaximize={() => navigate(`/meetings/${activeMeeting.id}/room`)}
      onLeave={() => { clearActiveMeeting(); navigate('/meetings'); }}
      onMeetingEnded={() => { clearActiveMeeting(); navigate(`/meetings/${activeMeeting.id}/report`); }}
    />
  );
};
```

**Pattern "Portal to nowhere":** một component ở cấp App nhưng vẫn biết route hiện tại qua `useLocation()` → quyết định hiển thị full-view hay floating widget.

---

## 4. Zustand — State Management

### 4.1 Tại sao Zustand chứ không phải Redux / Context?

| Tiêu chí | Redux | React Context | **Zustand** |
|-----------|-------|---------------|-------------|
| Boilerplate | Nhiều (action, reducer, types) | Ít | **Cực ít** |
| Re-render | Toàn bộ subscribers | Toàn bộ consumers | **Chỉ component dùng selector** |
| DevTools | Cần setup | Không có | Có sẵn |
| Bundle | ~8KB | 0 | **~1.2KB** |
| Test | Phức tạp | Phức tạp | Dễ |

### 4.2 Store cơ bản — `stores/auth.store.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, accessToken: string) => void;
  logout: () => void;
  hasRole: (role: UserRole) => boolean;
  hasAnyRole: (roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => set({ user, accessToken }),
      logout: () => {
        set({ user: null, accessToken: null });
        localStorage.removeItem('worksync-auth');
      },
      hasRole: (role) => get().user?.role === role,
      hasAnyRole: (roles) => {
        const current = get().user?.role;
        return current ? roles.includes(current as UserRole) : false;
      },
    }),
    { name: 'worksync-auth' }     // ← key trong localStorage
  )
);
```

**Điểm quan trọng về `persist` middleware:**
- Tự động lưu state vào `localStorage` mỗi khi thay đổi
- Tự động hydrate khi load trang → **user không bị logout khi F5**
- `name: 'worksync-auth'` = key trong localStorage

**`useAuthStore.getState()`** — đọc state **bên ngoài React** (không cần hook). Dùng trong Axios interceptor:

```typescript
// lib/api-client.ts
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;   // ← ngoài component
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

> Nếu dùng `useAuthStore()` (hook) trong interceptor sẽ lỗi vì interceptor chạy ngoài render tree. Đây là lý do Zustand cần cả 2 API.

### 4.3 State Machine + Optimistic Update — `stores/task.store.ts`

Đây là file frontend **đáng học nhất** về mô hình xử lý state.

```typescript
interface TaskStoreState {
  tasks: BoardTask[];
  status: 'idle' | 'loading' | 'ready' | 'error';   // ← state machine
  error: string | null;
  currentScope: TaskScope | null;
  loadBoard: (scope: TaskScope) => Promise<void>;
  moveTask: (taskId: string, input: MoveTaskInput) => Promise<void>;
  retry: () => Promise<void>;
}

let activeRequestId = 0;   // ← module-level, dùng để chặn race condition

export const useTaskStore = create<TaskStoreState>((set, get) => ({
  tasks: [], status: 'idle', error: null, currentScope: null,

  loadBoard: async (scope: TaskScope) => {
    const requestId = ++activeRequestId;
    set({ status: 'loading', currentScope: scope, error: null });

    try {
      const tasks = await api.fetchBoardTasks(scope);
      // ★ Chỉ apply nếu đây là request MỚI NHẤT
      if (requestId === activeRequestId) {
        set({ tasks, status: 'ready', error: null });
      }
    } catch (err) {
      if (requestId === activeRequestId) {
        set({ status: 'error', error: err instanceof Error ? err.message : '...' });
      }
    }
  },

  moveTask: async (taskId: string, input: MoveTaskInput) => {
    const previousTasks = get().tasks;          // ← 1. Lưu snapshot để rollback
    const movingTask = previousTasks.find((t) => t.id === taskId);
    if (!movingTask) return;

    // 2. OPTIMISTIC UPDATE — cập nhật UI ngay, không chờ server
    const updatedTask: BoardTask = { ...movingTask, status: input.status };
    const targetCol = previousTasks.filter((t) => t.id !== taskId && t.status === input.status);
    const insertIdx = Math.min(Math.max(0, input.destinationIndex), targetCol.length);
    targetCol.splice(insertIdx, 0, updatedTask);
    const otherTasks = previousTasks.filter((t) => t.id !== taskId && t.status !== input.status);
    set({ tasks: [...otherTasks, ...targetCol] });

    try {
      // 3. Gọi API
      const savedTask = await api.moveTaskOnBoard(taskId, input);
      // 4. Reconcile với dữ liệu server (có thể khác do conflict)
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === taskId ? savedTask : t)),
      }));
      useProjectStore.getState().refreshTaskCounts();   // ← refresh badge sidebar
    } catch (err) {
      // 5. ROLLBACK — khôi phục state cũ
      set({ tasks: previousTasks, error: err instanceof Error ? err.message : '...' });
      throw err;
    }
  },
}));
```

#### 4 kỹ thuật quan trọng được minh họa:

**① State machine rõ ràng**
```
idle → loading → ready
                ↘ error → (retry) → loading
```
UI render theo `status` → không bao giờ hiển thị trạng thái trung gian mơ hồ.

**② Optimistic Update + Rollback**
```
1. Chụp snapshot        → previousTasks
2. Sửa UI ngay          → user thấy task nhảy tức thì (không lag 300ms)
3. Gọi API
4a. Thành công → reconcile (server có thể đã sort lại)
4b. Thất bại  → rollback về previousTasks + báo lỗi
```

**③ Chống race condition bằng requestId**
```typescript
let activeRequestId = 0;
const requestId = ++activeRequestId;
// ...
if (requestId === activeRequestId) { /* apply */ }
```
> User đổi scope liên tục (mine → project → mine) → 3 request chạy song song. Nếu request cũ về sau nó sẽ **ghi đè** dữ liệu mới. `requestId` đảm bảo chỉ request mới nhất được apply.

**④ Cross-store communication**
```typescript
useProjectStore.getState().refreshTaskCounts();
```
`task.store` gọi `project.store` (không phải component gọi cả 2) → giữ logic tập trung.

### 4.4 14 Store trong dự án

| Store | Dòng | Quản lý |
|-------|------|---------|
| `auth.store.ts` | 48 | User + token (persist) |
| `task.store.ts` | 91 | Kanban tasks + optimistic move |
| `project.store.ts` | 33 | Danh sách dự án + badge count |
| `active-call.store.ts` | 12 | Cuộc họp đang diễn ra (persist) |
| `attendance.store.ts` | 180 | Chấm công + đơn từ |
| `calendar.store.ts` | 224 | Timeline items + filter |
| `chat.store.ts` | 433 | Conversations + messages + socket |
| `document.store.ts` | 231 | Tài liệu + version |
| `meetings.store.ts` | 163 | Danh sách cuộc họp + RSVP |
| `notifications.store.ts` | 168 | Thông báo + unread count |
| `quick-task.store.ts` | 101 | QuickTask |
| `sprint.store.ts` | 140 | Sprint + burndown |
| `dashboard.store.ts` | 25 | KPI dashboard |

---

## 5. Axios + Zod — Type-Safe End-to-End

### 5.1 2 tầng validation

```
Backend response (JSON)
    ↓
[ZOD SCHEMA]  ← runtime validation — parse lại dữ liệu thật
    ↓
TypeScript type ← compile-time type, suy ra từ schema
    ↓
Component    ← tự động type-safe, không cần `any`
```

### 5.2 Định nghĩa Schema (`lib/api-schemas.ts`)

```typescript
import { z } from 'zod';

export const TaskStatusSchema = z.enum(['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE']);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const BoardTaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  status: TaskStatusSchema,
  priority: PrioritySchema,
  projectId: z.string(),
  position: z.number(),
  labels: z.array(z.string()).default([]),      // ← .default(): có giá trị mặc định
  dueDate: z.string().nullable().optional(),
  assignee: TaskAssigneeSchema.nullable().optional(),
  sprint: z.object({ id: z.string(), name: z.string() }).nullable().optional(),
});
export type BoardTask = z.infer<typeof BoardTaskSchema>;
```

**Kỹ thuật Zod đáng chú ý:**

| API | Ý nghĩa |
|-----|---------|
| `z.infer<typeof Schema>` | Suy ra TS type từ schema — **1 nguồn sự thật** |
| `.default([])` | Field thiếu → dùng giá trị mặc định, không throw |
| `.nullable().optional()` | Cho phép `null` hoặc `undefined` |
| `z.enum([...])` | Validate enum — sai thì throw ngay |

### 5.3 Áp dụng trong API client (`lib/api-client.ts`)

```typescript
export const api = {
  async fetchBoardTasks(scopeConfig: TaskScope): Promise<BoardTask[]> {
    const params: Record<string, string> = { scope: scopeConfig.scope };
    if (scopeConfig.projectId) params.projectId = scopeConfig.projectId;

    const res = await apiClient.get('/tasks', { params });
    return z.array(BoardTaskSchema).parse(res.data);   // ← parse = validate runtime
  },

  async moveTaskOnBoard(taskId: string, input: MoveTaskInput): Promise<BoardTask> {
    const res = await apiClient.patch(`/tasks/${taskId}/board-position`, input);
    return BoardTaskSchema.parse(res.data);
  },
};
```

### 5.4 Tại sao cần Zod parse?

```typescript
// Nếu backend đổi field "dueDate" → "due_date", hoặc status trả về "DONE " (có space)
// mà không có Zod → TypeScript KHÔNG bắt được (vì TS chỉ check lúc compile)
//
// Với Zod:
const res = await apiClient.get('/tasks');
return z.array(BoardTaskSchema).parse(res.data);
// ↑ ZodError: expected 'TODO' | 'IN_PROGRESS' | ... received 'DONE '
//   → lỗi rõ ràng NGAY LÚC CHẠY, không phải lúc debug UI
```

**Đây là "runtime type safety"** — thứ TypeScript đơn thuần không làm được.

### 5.5 Base URL — xử lý cả 2 dạng env

```typescript
const rawApiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
export const API_BASE_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl.replace(/\/$/, '')}/api`;
export const BACKEND_URL = API_BASE_URL.replace(/\/api$/, '');
```

Chấp nhận cả `http://localhost:4000` lẫn `http://localhost:4000/api` → tránh lỗi `/api/api/...`.

---

## 6. i18n — Đa Ngôn Ngữ Song Ngữ

### 6.1 Khởi tạo (`i18n/i18n.ts`)

```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import vi from './locales/vi.json';
import en from './locales/en.json';

const savedLanguage = localStorage.getItem('app_language') || 'vi';

i18n.use(initReactI18next).init({
  resources: {
    vi: { translation: vi },
    en: { translation: en },
  },
  lng: savedLanguage,
  fallbackLng: 'vi',
  interpolation: { escapeValue: false },   // ← KHÔNG escape, React đã escape sẵn
});

export const changeLanguage = (lng: 'vi' | 'en') => {
  localStorage.setItem('app_language', lng);
  i18n.changeLanguage(lng);      // ← đổi ngay, KHÔNG reload trang
};
```

**`interpolation: { escapeValue: false }`** — i18next mặc định escape HTML (`&` → `&amp;`). React đã tự escape khi render → escape 2 lần sẽ hiển thị sai ký tự (VD `&amp;` thay vì `&`).

### 6.2 11 Namespace

| Namespace | Dùng cho |
|-----------|----------|
| `nav` | Menu điều hướng |
| `kanban` | Bảng Kanban |
| `taskDetail` | Modal chi tiết task |
| `createModal` | Modal tạo task/project |
| `dashboard` | Dashboard widgets |
| `projects` | Quản lý dự án |
| `meeting_room` | Phòng họp |
| `meetings` | Danh sách cuộc họp |
| `calendar` | Work Calendar |
| `chat` | Chat |
| `meeting_prepare` | Màn hình chờ vào phòng (thêm trong M5.3) |

### 6.3 Sử dụng trong component

```tsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation('meeting_room');   // ← namespace cụ thể

  return <h1>{t('title', 'Tiêu đề mặc định')}</h1>;
}
```

**`t(key, defaultValue)`** — tham số 2 là fallback nếu key chưa có trong file JSON → **app không crash** khi thiếu key.

### 6.4 Đổi ngôn ngữ 1-click

```tsx
// Header.tsx
const { i18n } = useTranslation();
const toggle = () => changeLanguage(i18n.language.startsWith('vi') ? 'en' : 'vi');
```

`i18n.changeLanguage()` kích hoạt re-render toàn bộ component dùng `useTranslation` → **không cần reload trang**.

---

## 7. `PermissionGuard` — RBAC ở Frontend

```tsx
export function PermissionGuard({
  allowedRoles,
  redirectOnDeny = true,
  redirectTo = '/dashboard',
  fallback,
  children,
}: PermissionGuardProps) {
  const { user } = useAuthStore();
  const location = useLocation();
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  // Chưa đăng nhập → luôn về login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const hasAccess = allowedRoles.includes(user.role as UserRole);

  if (!hasAccess) {
    if (redirectOnDeny) {
      return <Navigate to={redirectTo} state={{ from: location, denied: true }} replace />;
    }
    if (fallback !== undefined) return <>{fallback}</>;
    return <AccessDeniedCard allowedRoles={allowedRoles} />;   // ← UI 403
  }

  return <>{children}</>;
}
```

**2 chế độ sử dụng:**

```tsx
// ① Route-level — chuyển hướng
<Route path="/admin" element={
  <PermissionGuard allowedRoles={['ADMIN']}>
    <AdminControlCenterPage />
  </PermissionGuard>
} />

// ② Component-level — hiện UI thay thế
<PermissionGuard
  allowedRoles={['HR']}
  redirectOnDeny={false}
  fallback={<EmptyState />}
>
  <SensitiveStats />
</PermissionGuard>
```

**`state={{ from: location }}`** — lưu lại URL user định truy cập → sau khi login có thể redirect về đúng chỗ (dù chưa implement).

> **⚠️ Nhắc lại:** `PermissionGuard` là **tiện ích UX**, KHÔNG phải bảo mật. Nếu không có guard ở backend, user vẫn gọi API trực tiếp được. Đây là điểm cần nói rõ với giáo viên — nhiều ứng viên nhầm ở đây.

---

## 8. TailwindCSS & Design Tokens

### 8.1 Triết lý: Utility-first

```tsx
// ❌ Không dùng — tạo file CSS riêng cho mỗi component
.task-card { border: 1px solid #e2e8f0; border-radius: 16px; padding: 16px; }

// ✅ Tailwind — style inline, tái sử dụng qua @apply hoặc component
<div className="border border-slate-200/80 rounded-2xl p-4 bg-white shadow-sm">
```

**Lợi ích:** không cần đặt tên class (không có "CSS bloat"), style nằm cạnh markup → dễ review, dễ xóa.

### 8.2 Design system "Bauhaus Enterprise Modern"

Từ `docs/00-PRD.md` §4.3:

| Token | Giá trị | Ý nghĩa |
|-------|---------|---------|
| Bo góc | `rounded-2xl` (16px) | Mềm mại, hiện đại |
| Viền | `border-slate-200/80` | Nhẹ, không phải viền đen thô |
| Nền | `bg-slate-50` / `bg-white` | Sáng, thanh lịch |
| Font tiêu đề | **Plus Jakarta Sans** (500–800) | Hiện đại, có glyph tiếng Việt |
| Font nội dung | **Inter** (400–700) | Đọc tốt, số liệu rõ |
| Icon | Lucide SVG | Vector, không emoji |
| Shadow | `shadow-sm` / `shadow-lg` mờ | Mềm, không gắt |

### 8.3 Ưu tiên màu — 4 cấp độ

```tsx
// docs/99-PROGRESS-LOG.md 2026-10-11
URGENT → border đỏ rực rỡ
HIGH   → border cam đậm
MEDIUM → border xanh sky
LOW    → border xám trang nhã
```

Mỗi mức 1 class border 4px → nhận diện nhanh bằng mắt khi scan board.

### 8.4 Vấn đề phông tiếng Việt (đã sửa)

```css
/* ❌ Trước — font không có glyph tiếng Việt → vỡ chữ */
--font-display: 'Haettenschweiler', 'Impact';

/* ✅ Sau — Google Fonts có subset vietnamese */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500..800&family=Inter:wght@400..700&display=swap');
```

> **Bài học:** khi dùng font custom, **luôn kiểm tra hỗ trợ tiếng Việt**. `Haettenschweiler`/`Impact` không có dấu thanh → chữ vỡ. Đây là lỗi thực tế đã xảy ra và được ghi nhận trong progress log.

---

## 9. Component Pattern — 3 Loại

### 9.1 Page Component (route)

```tsx
// features/tasks/pages/KanbanPage.tsx
export default function KanbanPage() {
  const { tasks, status, loadBoard, moveTask } = useTaskStore();
  useEffect(() => { loadBoard({ scope: 'mine' }); }, [loadBoard]);

  if (status === 'loading') return <BoardSkeleton />;
  if (status === 'error') return <ErrorState onRetry={retry} />;

  return <Board tasks={tasks} onDragEnd={handleDragEnd} />;
}
```

### 9.2 Feature Component (tái sử dụng trong feature)

```tsx
// features/projects/components/ProjectCard.tsx
export const ProjectCard: React.FC<{ project: ProjectSummary }> = ({ project }) => {
  return (
    <div className="rounded-2xl border border-slate-200/80 p-4 hover:shadow-md transition-shadow">
      <h3>{project.name}</h3>
      <span>{project.openAssignedTaskCount}</span>
    </div>
  );
};
```

### 9.3 UI Component (dùng chung nhiều feature)

```tsx
// components/ui/button.tsx — dùng class-variance-authority
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-xl font-semibold transition-colors',
  {
    variants: {
      variant: {
        primary: 'bg-blue-600 text-white hover:bg-blue-700',
        ghost: 'text-slate-600 hover:bg-slate-100',
        danger: 'bg-rose-600 text-white hover:bg-rose-700',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-10 px-4 text-sm',
        lg: 'h-11 px-6 text-sm',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);
```

**`cva` (class-variance-authority)** giải quyết bài toán "1 component, nhiều biến thể" mà không nhân bản code. Kết hợp `tailwind-merge` (`cn()`) để class sau ghi đè class trước.

---

## 10. Custom Hook Pattern

### 10.1 Hook gọi API (`features/attendance/hooks/usePublicIp.ts`)

```typescript
export function usePublicIp() {
  const [ip, setIp] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    fetch('https://api.ipify.org?format=json')
      .then((r) => r.json())
      .then((d) => { if (!cancelled) setIp(d.ip); })
      .catch(() => { if (!cancelled) setIp(null); });
    return () => { cancelled = true; };   // ← cleanup flag tránh setState sau unmount
  }, []);
  return ip;
}
```

**`cancelled` flag** — pattern chuẩn để tránh "set state on unmounted component" (React 18+ đã bỏ warning nhưng vẫn là memory leak logic).

### 10.2 Hook WebRTC (`features/meetings/hooks/useWebRTCPeer.ts`)

```typescript
export const CAM_STREAM_PREFIX = 'worksync-cam';
export const SCREEN_STREAM_PREFIX = 'worksync-screen';

export function useWebRTCPeer({
  socket, meetingId, self, localCamStream, localScreenStream,
}: UseWebRTCPeerOptions) {
  const [peers, setPeers] = useState<Map<string, RemotePeer>>(new Map());
  const peersRef = useRef<Map<string, RemotePeer>>(new Map());
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const pcCacheRef = useRef<Map<string, string>>(new Map());   // socketId → userId

  const setPeersBoth = useCallback((next) => {
    // ★ setState + đồng bộ ref TRONG 1 lần
    if (typeof next === 'function') {
      setPeers((prev) => { const evaluated = next(prev); peersRef.current = evaluated; return evaluated; });
    } else {
      peersRef.current = next;
      setPeers(next);
    }
  }, []);

  const ensurePeer = useCallback((remoteSocketId, meta): RTCPeerConnection => {
    // ★ Reuse nếu đã có — tránh tạo 2 PC cho 1 peer
    const existingPc = pcsRef.current.get(remoteSocketId);
    if (existingPc && existingPc.connectionState !== 'closed') return existingPc;

    const pc = new RTCPeerConnection({ iceServers: [...] });
    pcsRef.current.set(remoteSocketId, pc);

    // ★ Tách track camera và screen thành 2 stream RIÊNG
    if (localCamStream) {
      const camTrack = localCamStream.getVideoTracks()[0];
      const micTrack = localCamStream.getAudioTracks()[0];
      if (camTrack) {
        const camStream = new MediaStream([camTrack]);
        try {
          Object.defineProperty(camStream, 'id', { value: `${CAM_STREAM_PREFIX}-${self.id}` });
        } catch { /* fallback */ }
        pc.addTrack(camTrack, camStream);
      }
      if (micTrack) pc.addTrack(micTrack, localCamStream);
    }
    // ...
  }, [localCamStream, self.id]);

  return { peers, ensurePeer, /* ... */ };
}
```

**3 bài học từ hook này:**

**① Dùng song song `useState` + `useRef`**
- `useState` → trigger re-render (UI cần)
- `useRef` → đọc giá trị mới nhất trong callback async mà **không** gây re-render hay stale closure

**② Prefix cho `MediaStream.id`**
```typescript
Object.defineProperty(camStream, 'id', { value: `worksync-cam-${self.id}` });
```
`MediaStream.id` là read-only → dùng `Object.defineProperty` để ghi đè. Prefix giúp phân biệt **camera stream** vs **screen stream** khi render — đây chính là fix cho BUG-3 (share màn hình không hiện với người khác).

**③ `ensurePeer` là nguồn sự thật duy nhất**
```typescript
const existingPc = pcsRef.current.get(remoteSocketId);
if (existingPc && existingPc.connectionState !== 'closed') return existingPc;
```
Tránh tạo 2 `RTCPeerConnection` cho cùng 1 peer — nguyên nhân gốc của BUG-1 (late joiner không thấy camera).

---

## 11. React Hook Rules — Lỗi Đã Gặp

Progress log ghi nhận: *"Khắc phục lỗi React Hook order violation trong `ProjectDetailPage.tsx`"*.

**Luật:** Hook phải gọi ở **cùng thứ tự** mọi lần render.

```tsx
// ❌ SAI — return sớm trước khi gọi hết hook
function Component({ meetingId }) {
  const [a, setA] = useState();
  if (!meetingId) return null;      // ← hook phía sau không được gọi
  const [b, setB] = useState();     // ← LỖI
}

// ✅ ĐÚNG — gọi hết hook trước, return sau
function Component({ meetingId }) {
  const [a, setA] = useState();
  const [b, setB] = useState();
  if (!meetingId) return null;
}
```

**Cách phát hiện:** ESLint rule `react-hooks/rules-of-hooks` báo lỗi lúc lint.

---

## 12. Testing Frontend

### 12.1 Cấu trúc

```
frontend/src/**/__tests__/*.spec.tsx     → 28 test file
```

### 12.2 Pattern mock component

```tsx
// features/dashboard/components/layouts/dashboard-layouts.spec.tsx
vi.mock('@/stores/auth.store', () => ({
  useAuthStore: vi.fn(),
}));

beforeEach(() => {
  (useAuthStore as unknown as Mock).mockReturnValue({
    user: { id: 'u1', name: 'Long Võ', role: 'DEPARTMENT_HEAD' },
  });
});
```

**Pattern chuẩn:** `vi.mock()` ở top-level để thay thế module, `mockReturnValue` set giá trị cho từng test.

### 12.3 Lệnh chạy

```bash
npm test              # vitest run
npm run test:watch    # watch mode
npm run build         # tsc -b && vite build  ← kiểm tra type trước khi build
```

> `npm run build` chạy `tsc -b` trước → **TypeScript sai là fail build**, không lên production.

---

## 13. Câu Hỏi Thường Gặp

**Q: Zustand vs Redux Toolkit?**
> Zustand ít boilerplate hơn nhiều (không cần action/reducer/middleware chain), bundle nhỏ hơn, và hỗ trợ selector để chỉ re-render component cần. Redux Toolkit tốt hơn khi cần middleware phức tạp, devtools nâng cao, hay luồng state phức tạp. Với app này Zustand đủ và gọn hơn.

**Q: `persist` middleware có rủi ro bảo mật không?**
> Có — token trong `localStorage` chịu XSS. Giải pháp production: access token trong memory, refresh token trong **HttpOnly cookie** (JS không đọc được). `docs/00-PRD.md` mô tả mô hình này nhưng `auth.service.ts` hiện **chỉ trả `accessToken`** — refresh token chưa được triển khai đầy đủ. **Đây là điểm nên nhận ra và nói "đang phát triển" khi giáo viên hỏi.**

**Q: Tại sao dùng Zod khi đã có TypeScript?**
> TypeScript chỉ check **compile-time** — dữ liệu từ API là runtime, không được kiểm tra. Zod parse dữ liệu thật ở runtime. Kết hợp: Zod định nghĩa schema, `z.infer` sinh type → **1 nguồn sự thật** cho cả 2 tầng.

**Q: `useState` + `useRef` cùng giữ 1 giá trị — có dư không?**
> Không dư, mục đích khác nhau:
> - `useState` → React theo dõi → re-render khi đổi (cho UI)
> - `useRef` → **không** re-render, nhưng đọc được giá trị mới nhất trong callback async (tránh stale closure)
>
> Dùng `useRef` thay `useState` ở nơi cần đọc trong async callback mà không muốn re-render.

**Q: Component nào lớn nhất trong frontend?**
> `PersistentCallManager.tsx` — 1.148 dòng, chứa toàn bộ WebRTC logic. Đây là **nợ kỹ thuật** đang được xử lý trong `docs/M5.3-WEBRTC-FIX-PLAN.md` (tách phần signaling ra hook `useWebRTCPeer.ts`).

**Q: `React.lazy` / code splitting có dùng không?**
> Chưa — tất cả page được import trực tiếp trong `App.tsx`. Với 184 file `.tsx`, bundle có thể lớn. Đây là **cơ hội tối ưu** nếu giáo viên hỏi về performance.
