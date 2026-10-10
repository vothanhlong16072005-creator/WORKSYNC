# 📐 Style Guide — WorkSync
> Quy ước code cho toàn dự án. AI agents PHẢI đọc file này trước khi code.

---

## 1. TypeScript

### Strict Mode — BẮT BUỘC
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### Quy tắc
- **CẤMM dùng `any`** — dùng `unknown` + type guard hoặc `Record<string, unknown>`
- **Dùng `interface` cho object types** có thể extend, `type` cho union/intersection
- **Discriminated unions** thay vì boolean flags
- **Branded types** cho ID: `type UserId = string & { __brand: 'UserId' }`
- **Zod schema** cho validation ở cả frontend lẫn backend

```typescript
// ✅ ĐÚNG
interface TaskUpdatePayload {
  title?: string;
  status?: TaskStatus;
  assigneeId?: UserId;
}

// ❌ SAI
function updateTask(data: any) { ... }
```

---

## 2. Đặt tên (Naming Conventions)

| Thứ | Convention | Ví dụ |
|-----|-----------|-------|
| Files (TS/TSX) | kebab-case | `task-card.tsx`, `use-tasks.ts` |
| Components | PascalCase | `TaskCard`, `KanbanBoard` |
| Hooks | camelCase + `use` prefix | `useTaskList`, `useAttendance` |
| Stores (Zustand) | camelCase + `Store` | `useAuthStore`, `useTaskStore` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY`, `DEFAULT_PAGE_SIZE` |
| Enums | PascalCase (enum) + UPPER value | `TaskStatus.IN_PROGRESS` |
| DB tables | snake_case + plural | `attendance_records`, `work_logs` |
| API routes | kebab-case | `/api/v1/attendance/check-in` |
| NestJS module folder | kebab-case | `task-dependency/` |
| NestJS class | PascalCase + role | `TasksService`, `TasksController`, `CreateTaskDto` |

---

## 3. Backend — NestJS Structure

### Cấu trúc module (BẮTBUỘC)
```
modules/tasks/
├── tasks.module.ts
├── tasks.controller.ts
├── tasks.service.ts
├── dto/
│   ├── create-task.dto.ts
│   ├── update-task.dto.ts
│   └── task-filter.dto.ts
├── entities/
│   └── task.entity.ts        # (optional — Prisma đã có type)
├── tasks.gateway.ts          # (nếu có WebSocket)
└── tasks.service.spec.ts     # Unit test
```

### DTO — Bắt buộc class-validator + Swagger
```typescript
import { IsString, IsOptional, IsEnum, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTaskDto {
  @ApiProperty({ description: 'Tiêu đề task', example: 'Implement JWT auth' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiPropertyOptional({ enum: Priority })
  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;
}
```

### Response format — BẮT BUỘC
```typescript
// Mọi API phải trả theo format chuẩn này
return {
  success: true,
  data: result,
  meta: { total, page, limit, totalPages }, // Nếu là list
};

// Lỗi — dùng NestJS exceptions
throw new NotFoundException('Task không tồn tại');
throw new ForbiddenException('Không có quyền thực hiện');
throw new ConflictException('Email đã tồn tại');
```

### Service pattern
```typescript
@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, userId: string): Promise<Task> {
    const task = await this.prisma.task.findUnique({
      where: { id, deletedAt: null },
      include: { assignee: true, comments: true },
    });
    if (!task) throw new NotFoundException(`Task ${id} không tìm thấy`);
    return task;
  }
}
```

---

## 4. Frontend — React Structure

### Feature-based structure
```
features/tasks/
├── components/
│   ├── TaskCard.tsx
│   ├── TaskDetail.tsx
│   └── CreateTaskForm.tsx
├── hooks/
│   ├── useTaskList.ts
│   └── useTaskMutation.ts
├── pages/
│   ├── TasksPage.tsx
│   └── TaskDetailPage.tsx
├── types/
│   └── task.types.ts
└── api/
    └── tasks.api.ts
```

### TanStack Query — chuẩn
```typescript
// hooks/useTaskList.ts
export function useTaskList(filters: TaskFilters) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => tasksApi.getList(filters),
    staleTime: 1000 * 30, // 30 seconds
  });
}

// hooks/useTaskMutation.ts
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
      tasksApi.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Cập nhật trạng thái thành công');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });
}
```

### Component — Rules
```typescript
// ✅ ĐÚNG — Props type rõ ràng, không dùng FC
interface TaskCardProps {
  task: Task;
  onStatusChange: (status: TaskStatus) => void;
  className?: string;
}

export function TaskCard({ task, onStatusChange, className }: TaskCardProps) {
  // ...
}

// ❌ SAI
export const TaskCard: React.FC<any> = (props) => { ... }
```

### Zustand store
```typescript
// stores/auth.store.ts
interface AuthState {
  user: User | null;
  accessToken: string | null;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setUser: (user) => set({ user }),
  setToken: (accessToken) => set({ accessToken }),
  logout: () => set({ user: null, accessToken: null }),
}));
```

---

## 5. CSS / Tailwind

### Quy tắc cứng
- **CẤM hard-code hex**: `bg-[#3b82f6]` → dùng `bg-blue-500`
- **CẤM arbitrary pixel**: `p-[13px]` → dùng scale chuẩn
- **Chỉ dùng spacing**: xs(4px) sm(8px) md(12px) lg(16px) xl(24px) 2xl(32px)
- **Chỉ dùng 4 button variants**: primary / secondary / outline / ghost
- **Icons**: lucide-react, size-4 (16px) inline, size-5 (20px) button

### Màu sắc priority (ClickUp style)
```typescript
export const PRIORITY_COLORS = {
  URGENT: 'text-red-600 bg-red-50 border-red-200',
  HIGH: 'text-orange-600 bg-orange-50 border-orange-200',
  MEDIUM: 'text-blue-600 bg-blue-50 border-blue-200',
  LOW: 'text-gray-500 bg-gray-50 border-gray-200',
} as const;
```

---

## 6. Git & Commit Convention

### Branch naming
```
feature/task-kanban-board
fix/attendance-ip-validation
chore/update-prisma-schema
docs/api-contract-update
```

### Commit message (Conventional Commits)
```
feat(tasks): add kanban drag and drop with @dnd-kit
fix(auth): resolve refresh token expiry edge case
chore(deps): upgrade prisma to 5.20.0
docs(api): add meeting endpoints contract
test(attendance): add unit tests for IP validation logic
```

### PR rules
- PR title = commit message format
- PR mô tả: What/Why/How + screenshots nếu có UI
- Phải pass: lint + typecheck + test trước khi merge
- Yêu cầu ít nhất 1 reviewer approve

---

## 7. Error Handling

### Backend
```typescript
// Custom exceptions
throw new NotFoundException('Task ${id} không tìm thấy');
throw new BadRequestException('Trạng thái chuyển không hợp lệ: DONE -> TODO');
throw new ForbiddenException('Chỉ PM mới có thể approve task');

// KHÔNG throw Error thuần
throw new Error('Something went wrong'); // ❌
```

### Frontend
```typescript
// Luôn handle error trong useMutation
onError: (error: AxiosError<ApiError>) => {
  const message = error.response?.data?.error?.message ?? 'Đã có lỗi xảy ra';
  toast.error(message);
}

// Error boundary cho mỗi page
<ErrorBoundary fallback={<ErrorState onRetry={refetch} />}>
  <TasksPage />
</ErrorBoundary>
```

---

## 8. Testing (sau khi code chạy)

### Backend
```bash
# Unit test service
npm run test -- --testPathPattern=tasks.service

# Coverage
npm run test:cov

# Target coverage: > 70% cho service core (auth, tasks, attendance)
```

### Frontend
```bash
# Component test với React Testing Library
npm run test

# E2E test (Playwright) — chỉ cho flow quan trọng
npx playwright test
```

### Test naming
```typescript
describe('AttendanceService', () => {
  describe('checkIn', () => {
    it('should return ON_TIME when IP matches and before 9:00', async () => { ... });
    it('should return LATE when check-in at 9:15', async () => { ... });
    it('should throw ALREADY_CHECKED_IN when checked in today', async () => { ... });
  });
});
```

---

## 9. Quy tắc BẮT BUỘC (AI phải tuân thủ)

1. **Đọc file này trước** khi tạo bất kỳ file code nào
2. **Đọc `docs/02-API-CONTRACT.md`** trước khi tạo API mới
3. **Đọc `docs/03-DATABASE.md`** trước khi tạo migration
4. **Không commit** `.env`, `node_modules`, `dist`, `*.log`, file debug
5. **Mỗi PR** phải pass `npm run lint && npm run typecheck`
6. **Soft delete** — KHÔNG dùng hard DELETE, luôn set `deletedAt`
7. **Pagination** — Mọi list endpoint phải có `?page&limit` query
8. **Swagger** — Mọi endpoint phải có `@ApiOperation`, `@ApiResponse`
9. **DTO** — Mọi body request phải có DTO với class-validator
10. **Loading state** — Mọi data-fetching component phải có skeleton state
