# 📐 Quy Chuẩn Kỹ Thuật & Thiết Kế (Engineering & UI Style Guide) — WorkSync
> **Phiên bản:** 2.0 (Full Comprehensive Edition) | **Ngày cập nhật:** 21/10/2026  
> **Áp dụng:** Toàn bộ thành viên phát triển và AI coding agents. Bắt buộc tuân thủ 100%.

---

## 1. Tiêu Chuẩn TypeScript Nghiêm Ngặt (Strict TypeScript)

### 1.1. Cấu hình Bắt buộc (`tsconfig.json`)
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 1.2. Quy tắc cốt lõi
- **CẤM TUYỆT ĐỐI dùng `any`**: Sử dụng `unknown` kết hợp type guard narrowing hoặc Zod schema validation.
- **Dùng `interface`** cho object types có thể kế thừa/mở rộng, dùng `type` cho Discriminated Unions và Mapped Types.
- **Discriminated unions** thay vì cờ boolean rời rạc:
```typescript
// ✅ ĐÚNG: State Machine chuẩn
type AsyncState<T> =
  | { status: 'idle'; data: null; error: null }
  | { status: 'loading'; data: T | null; error: null }
  | { status: 'ready'; data: T; error: null }
  | { status: 'error'; data: T | null; error: string };

// ❌ SAI
interface BadState {
  isLoading: boolean;
  isError: boolean;
  data: any;
}
```
- **Branded types** cho các khóa ID:
```typescript
type UserId = string & { __brand: 'UserId' };
type ProjectId = string & { __brand: 'ProjectId' };
type TaskId = string & { __brand: 'TaskId' };
```

---

## 2. Quy Chuẩn Đặt Tên (Naming Conventions)

| Hạng mục | Quy ước | Ví dụ minh họa |
| :--- | :--- | :--- |
| **Files (TS/TSX)** | `kebab-case` | `task-card.tsx`, `use-tasks.ts`, `api-client.ts` |
| **Components** | `PascalCase` | `TaskCard`, `KanbanBoard`, `AttendanceHub` |
| **Custom Hooks** | `camelCase` + prefix `use` | `useTaskList`, `useAttendance`, `useChatSocket` |
| **Stores (Zustand)** | `camelCase` + suffix `Store` | `useAuthStore`, `useTaskStore`, `useProjectStore` |
| **Constants** | `UPPER_SNAKE_CASE` | `MAX_RETRY_COUNT`, `DEFAULT_PAGE_SIZE`, `GEOFENCE_RADIUS` |
| **Enums** | `PascalCase` (Enum) + `UPPER` value | `TaskStatus.IN_PROGRESS`, `Role.DEPARTMENT_HEAD` |
| **DB Tables (Prisma)** | `PascalCase` model, `snake_case` DB | `model AttendanceRecord` -> `attendance_records` |
| **API Endpoints** | `kebab-case` | `/api/attendance/check-in`, `/api/projects/swap-pm` |
| **NestJS Modules** | `kebab-case` thư mục | `src/quick-tasks/`, `src/attendance/` |
| **NestJS Classes** | `PascalCase` + hậu tố vai trò | `TasksService`, `TasksController`, `CreateTaskDto` |

---

## 3. Quy Chuẩn Giao Diện & Trải Nghiệm (Bauhaus Enterprise UI/UX)

### 3.1. Cấm Tuyệt Đối Sử Dụng Emoji Trên Nút Bấm
- **Quy tắc:** Nghiêm cấm đặt biểu tượng emoji (như ➕, 🚀, 📋, ⚡, 🔴, ⏰) trên nhãn nút bấm của ứng dụng.
- **Tiêu chuẩn:** 100% các nút hành động sử dụng biểu tượng vector **`lucide-react`** SVG có kích thước 14px – 18px (`w-4 h-4` hoặc `w-4.5 h-4.5`).

```tsx
// ✅ ĐÚNG: Nút bấm chuẩn Bauhaus Enterprise
<Button className="h-10 px-4 gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm">
  <Plus className="w-4 h-4" />
  <span>{t('kanban.create_task', 'Tạo công việc')}</span>
</Button>

// ❌ SAI
<button className="btn">➕ Tạo công việc mới 🚀</button>
```

### 3.2. Quy Chuẩn Phông Chữ Tiếng Việt (Typography)
- **Tiêu đề & Nhãn thẻ**: Sử dụng Google Font **`Plus Jakarta Sans`** với `font-weight: 700 - 800`, chữ thường tự nhiên, khoảng cách chữ âm `-0.025em` (`tracking-tight`).
- **Nội dung & Số liệu**: Sử dụng Google Font **`Inter`** với `font-weight: 400 - 600`, line-height cân đối.
- Cấm dùng phông chữ hẹp thiếu dấu thanh (`Impact`, `Haettenschweiler`) gây vỡ và méo chữ tiếng Việt.

### 3.3. Quy Chuẩn Đa Ngôn Ngữ (i18n)
- 100% chuỗi văn bản trên giao diện phải bọc qua hàm `t('namespace.key', 'Fallback')` từ hook `useTranslation()`.
- Bắt buộc khai báo song song trong cả 2 tệp từ điển:
  - `frontend/src/i18n/locales/vi.json`
  - `frontend/src/i18n/locales/en.json`
- Mọi hàm format ngày tháng (`formatDate`, `getDeadlineInfo`) phải nhận tham số `i18n.language` để hiển thị định dạng tương ứng.

---

## 4. Quy Chuẩn Backend & Cơ Sở Dữ Liệu (NestJS & Prisma)

### 4.1. Cấu Trúc Module Chuẩn (Bắt buộc)
```
src/tasks/
├── tasks.module.ts
├── tasks.controller.ts
├── tasks.service.ts
├── dto/
│   ├── create-task.dto.ts
│   ├── update-task.dto.ts
│   └── task-filter.dto.ts
├── tasks.service.spec.ts     # Unit tests bắt buộc
└── tasks.controller.spec.ts
```

### 4.2. DTO — Bắt buộc class-validator
```typescript
import { IsString, IsOptional, IsEnum, MinLength, IsNumber } from 'class-validator';
import { Priority, TaskStatus } from '@prisma/client';

export class CreateTaskDto {
  @IsString()
  @MinLength(3, { message: 'Tiêu đề công việc phải có ít nhất 3 ký tự' })
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsString()
  assigneeId?: string;

  @IsOptional()
  @IsNumber()
  storyPoints?: number;
}
```

### 4.3. Cấu Trúc Phản Hồi Chuẩn (Standard Response Format)
```typescript
// Thành công danh sách có phân trang
return {
  success: true,
  data: result,
  meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
};

// Thành công chi tiết
return {
  success: true,
  data: entity,
};

// Lỗi: Bắt buộc dùng NestJS built-in exceptions
throw new NotFoundException('Công việc không tồn tại');
throw new ForbiddenException('Bạn không có quyền thực hiện thao tác này');
throw new ConflictException('Tài khoản email đã tồn tại trên hệ thống');
```

### 4.4. Giao Dịch Cơ Sở Dữ Liệu Nguyên Tử (Database Transactions)
Bất kỳ thao tác nào ghi từ 2 bản ghi liên quan trở lên đều bắt buộc sử dụng `prisma.$transaction`:
```typescript
await this.prisma.$transaction(async (tx) => {
  const updatedRequest = await tx.leaveRequest.update({
    where: { id: requestId },
    data: { status: RequestStatus.APPROVED, approvedBy: reviewerId, approvedAt: new Date() },
  });
  await tx.attendanceRecord.createMany({ data: attendanceRecords });
  return updatedRequest;
});
```

---

## 5. Quy Chuẩn Frontend (React 19 & TailwindCSS)

### 5.1. Cấu Trúc Feature-Based
```
features/tasks/
├── components/
│   ├── TaskCard.tsx
│   ├── TaskDetailDrawer.tsx
│   └── CreateTaskModal.tsx
├── hooks/
│   ├── useTaskList.ts
│   └── useTaskMutation.ts
├── pages/
│   └── KanbanPage.tsx
├── types/
│   └── task.types.ts
└── api/
    └── tasks.api.ts
```

### 5.2. Định Nghĩa Props Rõ Ràng (Cấm React.FC)
```typescript
// ✅ ĐÚNG: Interface tường minh
interface TaskCardProps {
  task: TaskItem;
  onSelect: (taskId: string) => void;
  className?: string;
}

export function TaskCard({ task, onSelect, className }: TaskCardProps) {
  return (
    <article onClick={() => onSelect(task.id)} className={className}>
      <h3>{task.title}</h3>
    </article>
  );
}

// ❌ SAI: Dùng React.FC với any
export const TaskCard: React.FC<any> = (props) => { ... }
```

### 5.3. Zustand Store Với State Machine
```typescript
interface TaskState {
  tasks: TaskItem[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  loadTasks: (scope: string) => Promise<void>;
  updateTaskPositionOptimistic: (taskId: string, newStatus: TaskStatus) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  status: 'idle',
  error: null,
  loadTasks: async (scope) => {
    set({ status: 'loading' });
    try {
      const data = await taskApi.getTasks(scope);
      set({ tasks: data, status: 'ready', error: null });
    } catch (err) {
      set({ status: 'error', error: (err as Error).message });
    }
  },
  updateTaskPositionOptimistic: (taskId, newStatus) => {
    const prev = get().tasks;
    set({
      tasks: prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)),
    });
  },
}));
```

---

## 6. Quy Chuẩn Git & Cam Kết Mã Nguồn (Conventional Commits)

### 6.1. Quy ước đặt tên nhánh (Branch Naming)
- `feature/<module>-<name>`: Ví dụ `feature/chat-socket-io`, `feature/calendar-reschedule`.
- `fix/<module>-<name>`: Ví dụ `fix/tasks-vietnamese-font`, `fix/meetings-screen-share`.
- `docs/<name>`: Ví dụ `docs/update-enterprise-specs`.

### 6.2. Tiêu chuẩn Commit Message
- `feat(<scope>): <mô tả tính năng mới>`
- `fix(<scope>): <mô tả sửa lỗi cụ thể>`
- `docs(<scope>): <mô tả cập nhật tài liệu>`
- `test(<scope>): <mô tả bổ sung bài kiểm thử>`
- `refactor(<scope>): <mô tả tái cấu trúc mã>`

Ví dụ:
```bash
git commit -m "fix(tasks): fix Vietnamese typography with Plus Jakarta Sans and support bilingual kanban"
```

---

## 7. Tiêu Chuẩn Kiểm Thử Trước Khi Nghiệm Thu (Quality Gate)
- **100% Unit Tests Pass**:
  - Chạy `npm test` trong thư mục `backend` (311 tests pass).
  - Chạy `npm test` trong thư mục `frontend` (106 tests pass).
- **TypeScript Zero Errors**: Chạy `npm run build` trong `frontend` hoàn tất mà không phát sinh lỗi kiểu nào.
