# 13 — Hướng Dẫn Triển Khai, Kiểm Thử & Vận Hành

> Dùng để trả lời các câu hỏi về: "Làm sao chạy dự án?", "Có test không?", "Deploy thế nào?", "Bảo mật ra sao?"

---

## 1. 3 Tầng Môi Trường

| Tầng | Mục đích | Công cụ |
|------|---------|---------|
| **Development** | Code, hot-reload | Docker (PG + Redis) + Nest `--watch` + Vite HMR |
| **Testing** | Unit + integration | Vitest + jsdom + Testing Library |
| **Production** | Deploy thật | Neon (PG cloud) + Render (backend) + Vercel (frontend) |

---

## 2. Docker Compose — 2 Dịch Vụ

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    container_name: worksync_db_v2
    environment:
      POSTGRES_USER: worksync
      POSTGRES_PASSWORD: worksync
      POSTGRES_DB: worksync_db
    ports:
      - "5433:5432"          # ★ host 5433 → container 5432
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: worksync_redis_v2
    ports:
      - "6380:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
```

### 2.1 Vì Sao Đổi Port (5433, 6380)?

**Tránh xung đột với PostgreSQL/Redis đã cài sẵn trên máy.** Port chuẩn 5432/6379 đã bị chiếm → đổi sang 5433/6380 → chạy song song được.

### 2.2 Named Volume — Dữ Liệu Sống Khi Restart

```yaml
volumes:
  postgres_data:
```

**Named volume** (không phải bind mount) → dữ liệu nằm trong volume do Docker quản lý → `docker compose down` **không** xoá dữ liệu. Chỉ `docker compose down -v` mới xoá.

### 2.3 `restart: unless-stopped`

Container tự khởi động lại khi Docker Desktop khởi động lại máy → không phải chạy `docker compose up -d` mỗi lần.

---

## 3. Chạy Dự Án

### 3.1 1-Click (Windows)

```
start-dev.bat  →  bật container + mở 2 terminal (backend :4000, frontend :5173)
```

### 3.2 Thủ Công

```powershell
# Bước 1: Database
docker compose up -d

# Bước 2: Backend (port 4000)
cd backend
npm install
npx prisma generate
npm run start:dev

# Bước 3: Frontend (port 5173)
cd frontend
npm install
npm run dev
```

### 3.3 Port Map

| Service | Port | Ghi chú |
|---------|------|---------|
| Backend API | 4000 | `http://localhost:4000/api` |
| Frontend | 5173 | Vite tự nhảy 5174 nếu bận |
| PostgreSQL | 5433 | Docker |
| Redis | 6380 | Docker |

---

## 4. Biến Môi Trường

```bash
# backend/.env.example
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/worksync_v2?schema=public"
JWT_SECRET=super_secret_jwt_key_worksync
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback

# Google Gemini API (AI Summary cho Documents & Meetings)
# Lấy key miễn phí tại: https://aistudio.google.com/app/apikey
# Free tier: 15 req/min, 1M tokens/day
GEMINI_API_KEY=your_gemini_api_key_here_paste_here
```

### 4.1 Bảng Đầy Đủ Biến Môi Trường

| Biến | Dùng cho | Bắt buộc? |
|------|----------|-----------|
| `DATABASE_URL` | Prisma kết nối PG | ✅ |
| `JWT_SECRET` | Xác thực JWT | ✅ |
| `PORT` | Cổng backend | ✅ |
| `GOOGLE_CLIENT_ID` / `_SECRET` / `_CALLBACK_URL` | OAuth 2.0 | ❌ (bỏ qua nếu thiếu) |
| `GEMINI_API_KEY` | AI tóm tắt meeting/tài liệu | ❌ (fallback heuristics) |
| `VAPID_PUBLIC_KEY` / `_PRIVATE_KEY` / `_EMAIL` | Web Push | ❌ (bỏ qua push) |
| `CORS_ORIGIN` | Danh sách origin | ❌ (mặc định `*`) |
| `VITE_API_URL` / `VITE_WS_URL` | Frontend gọi API/WS | ✅ (frontend) |

### 4.2 Nguyên Tắc "Optional Feature Fail-Safe"

Có 2 kiểu xử lý khi thiếu config:

| Loại | Ví dụ | Xử lý | Lý do |
|------|-------|--------|-------|
| **Bắt buộc** | `JWT_SECRET` | Chặn request / báo lỗi ngay | Thiếu = không xác thực được = không an toàn |
| **Tuỳ chọn** | `GEMINI_API_KEY`, `VAPID_*` | Log warn + bỏ qua tính năng | Thiếu = mất tiện ích nhưng hệ thống vẫn chạy |

```typescript
// web-push.service.ts — fail-safe
if (publicKey && privateKey) {
  try {
    webpush.setVapidDetails(...);
    this.isConfigured = true;
  } catch (err) {
    this.logger.error('Failed to configure VAPID details', err);
  }
} else {
  this.logger.warn('VAPID keys not configured; Web Push notifications will be skipped');
}
```

**Không bao giờ** để thiếu config tuỳ chọn làm sập toàn hệ thống.

### 4.3 `JWT_SECRET` Mặc Định — Rủi Ro Cần Nói

```typescript
const decoded = this.jwtService.verify<JwtPayload>(token, {
  secret: process.env.JWT_SECRET || 'super_secret_jwt_key_worksync',
});
```

**Có fallback hardcode** → tiện cho dev nhưng là **rủi ro bảo mật** nếu deploy mà quên set env. Đây là điểm cần **nói thẳng** với giáo viên và nêu hướng khắc phục: production **phải** fail nếu thiếu `JWT_SECRET`.

---

## 5. Database Migrations & Seed

```bash
# Áp dụng migration
npx prisma migrate deploy        # production (chỉ apply, không tạo mới)
npx prisma migrate dev           # development (tạo + apply)
npx prisma db push               # đồng bộ schema nhanh (không có migration file)

# Generate Prisma Client (sau khi sửa schema)
npx prisma generate
```

### 5.1 4 Script Seed

```json
"seed:all": "node --experimental-strip-types prisma/seed-enterprise-full.ts && node --experimental-strip-types prisma/seed-meetings.ts && node --experimental-strip-types prisma/seed-calendar.ts && node --experimental-strip-types prisma/seed-chat.ts",
"seed:enterprise": "node --experimental-strip-types prisma/seed-enterprise-full.ts",
"seed:meetings": "node --experimental-strip-types prisma/seed-meetings.ts",
"seed:calendar": "node --experimental-strip-types prisma/seed-calendar.ts",
"seed:chat": "node --experimental-strip-types prisma/seed-chat.ts"
```

| Script | Nội dung |
|--------|----------|
| `seed:enterprise` | Users, phòng ban, dự án, task, sprint, attendance |
| `seed:meetings` | Cuộc họp + attendees |
| `seed:calendar` | Leave/WFH/OT để timeline & conflict engine có dữ liệu |
| `seed:chat` | Conversations + messages + reactions |

**Tách 4 script** thay vì 1 file lớn → seed nhanh hơn khi chỉ cần 1 phần, và dễ debug.

**`--experimental-strip-types`** — Node chạy trực tiếp file TypeScript bằng type-stripping (Node 22+), không cần `tsx`/`ts-node`.

### 5.2 `postinstall` Hook

```json
"postinstall": "prisma generate"
```

**Tự động generate Prisma Client** sau mỗi `npm install` → không bao giờ gặp lỗi "PrismaClient chưa được generate".

---

## 6. Hệ Thống Kiểm Thử — Vitest

### 6.1 Backend — 38 File Spec

```typescript
// backend/vitest.config.ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
  },
});
```

**`vite-tsconfig-paths`** — resolve path alias (`@/...`) giống hệt runtime. Không có plugin này, mọi import alias trong test sẽ fail.

**`globals: true`** → không cần import `describe`, `it`, `expect` ở đầu mỗi file.

### 6.2 Script Test

```json
"test": "vitest run",
"test:watch": "vitest",
"test:cov": "vitest run --coverage",
"test:debug": "vitest --inspect-brk --no-file-parallelism",
"test:e2e": "vitest run --config ./vitest.config.e2e.ts"
```

**`--no-file-parallelism`** trong `test:debug` → chạy tuần tự để debug breakpoint không bị nhảy.

### 6.3 Frontend — 28 File Spec

```json
"test": "vitest run",
"test:watch": "vitest"
```

**Frontend dùng `jsdom`** (`jsdom: ^25.0.1`) + `@testing-library/react` + `@testing-library/user-event` + `@testing-library/jest-dom`.

---

## 7. Chiến Lược Kiểm Thử — 3 Tầng

### 7.1 Tầng 1: Unit Test Cho Hàm Thuần (Nhiều nhất)

**Đặc điểm:** không đụng DB, không đụng network → **nhanh, ổn định, chạy hàng ngàn case**.

#### Ví dụ 1 — Logic trừ giờ ăn trưa

```typescript
// backend/src/attendance/utils/time-calculator.spec.ts
import { describe, expect, it } from 'vitest';
import { set } from 'date-fns';
import {
  calculateWorkHours,
  getLunchOverlapMinutes,
  calculateEarlyMinutes,
  calculateActualOTHours,
  DEFAULT_LUNCH_CONFIG,
} from './time-calculator.js';

const today = set(new Date(), { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });

function at(hour: number, minute: number = 0): Date {
  return set(today, { hours: hour, minutes: minute });
}

describe('time-calculator', () => {
  describe('getLunchOverlapMinutes', () => {
    it('returns 60 when work spans full lunch (08:30 → 17:30)', () => {
      const overlap = getLunchOverlapMinutes(at(8, 30), at(17, 30));
      expect(overlap).toBe(60);
    });

    it('returns 0 when work is in the morning (08:30 → 12:00)', () => {
      const overlap = getLunchOverlapMinutes(at(8, 30), at(12, 0));
      expect(overlap).toBe(0);
    });

    it('returns 30 when work partially overlaps lunch (11:30 → 12:30)', () => {
      const overlap = getLunchOverlapMinutes(at(11, 30), at(12, 30));
      expect(overlap).toBe(30);
    });

    it('returns 0 when checkOut <= checkIn', () => {
      const overlap = getLunchOverlapMinutes(at(12, 0), at(8, 0));
      expect(overlap).toBe(0);
    });

    it('respects custom lunch config (e.g., 11:30-12:30)', () => {
      const customConfig = { lunchStartHour: 11, lunchEndHour: 12, lunchDurationMinutes: 60 };
      const overlap = getLunchOverlapMinutes(at(11, 0), at(13, 0), customConfig);
      expect(overlap).toBe(60);
    });
  });

  describe('calculateWorkHours', () => {
    it('returns 8.0 for full day 08:30 → 17:30 (subtracts 1h lunch)', () => {
      const hours = calculateWorkHours(at(8, 30), at(17, 30));
      expect(hours).toBe(8.0);
    });
  });
});
```

**5 case cho 1 hàm** → cover: trường hợp chuẩn, biên (không overlap), chồng lấn một phần, đảo ngược thời gian, config tùy chỉnh.

#### Ví dụ 2 — Ma Trận Phân Quyền

```typescript
// backend/src/daily-reports/__tests__/daily-reports.permissions.spec.ts
import { describe, expect, it } from 'vitest';
import { Role } from '@prisma/client';
import { canViewReportsOf, canSubmitOnBehalf, canEditReport } from '../daily-reports.permissions.js';

describe('DailyReports Permissions', () => {
  const adminActor = { id: 'u-admin', role: Role.ADMIN, departmentId: 'dept-1' };
  const hrActor = { id: 'u-hr', role: Role.HR, departmentId: 'dept-1' };
  const deptHeadActor = { id: 'u-dh', role: Role.DEPARTMENT_HEAD, departmentId: 'dept-1' };
  const pmActor = { id: 'u-pm', role: Role.PM, departmentId: 'dept-1' };
  const employeeActor = { id: 'u-emp', role: Role.EMPLOYEE, departmentId: 'dept-1' };

  describe('canViewReportsOf', () => {
    it('1. User can always view their own report', () => {
      expect(
        canViewReportsOf(employeeActor, 'u-emp', { sameDepartment: false, isProjectMember: false }),
      ).toBe(true);
    });

    it('3. DEPARTMENT_HEAD can view report if in same department', () => {
      expect(
        canViewReportsOf(deptHeadActor, 'u-target', { sameDepartment: true, isProjectMember: false }),
      ).toBe(true);
      expect(
        canViewReportsOf(deptHeadActor, 'u-target', { sameDepartment: false, isProjectMember: false }),
      ).toBe(false);
    });

    it('5. Regular EMPLOYEE cannot view others report', () => {
      expect(
        canViewReportsOf(employeeActor, 'u-other', { sameDepartment: true, isProjectMember: true }),
      ).toBe(false);
    });
  });
});
```

**Mẫu test phân quyền tốt:** test **cả 2 chiều** — `true` khi đủ điều kiện, `false` khi không. Chỉ test `true` là test không đủ (có thể hàm luôn trả `true` cũng pass).

**`context` giả lập trực tiếp** (`sameDepartment: true/false`) → không cần mock DB. Đây là lý do thiết kế hàm phân quyền thuần rất quan trọng.

### 7.2 Tầng 2: Service Test Với Mock Prisma

```typescript
// pattern: backend/src/chat/__tests__/chat.service.spec.ts
const mockPrisma = {
  conversation: {
    findFirst: vi.fn(),
    create: vi.fn(),
    findUnique: vi.fn(),
  },
  conversationMember: {
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
  // ...
};

const module = await import('../chat.service.js');
const service = new module.ChatService(mockPrisma as any);
```

**Mock PrismaService** → kiểm thử logic service mà không cần DB thật.

**Trạng thái mock được thiết lập theo từng test** (`mockPrisma.x.findUnique.mockResolvedValue({...})`) → kiểm soát chính xác nhánh code được test.

### 7.3 Tầng 3: Component Test (Frontend)

```typescript
// pattern: frontend/src/features/calendar/__tests__/TimelineCanvas.spec.tsx
// hoặc
// frontend/src/components/layout/PermissionGuard.spec.tsx
```

Render component với `@testing-library/react`, mock API/store, kiểm tra UI hiển thị đúng.

**File test frontend tiêu biểu:**
| File | Test gì |
|------|---------|
| `PermissionGuard.spec.tsx` | Phân quyền hiển thị UI |
| `auth.store.spec.ts` | Zustand auth store |
| `chat.store.spec.ts` | Chat store + socket events |
| `calendar.store.spec.ts` | Calendar store + optimistic update |
| `ics-export.spec.ts` | Hàm export .ics thuần |
| `TimelineCanvas.spec.tsx` | Timeline render + drop |
| `dashboard-layouts.spec.tsx` | 5 layout theo role |
| `useWebRTCPeer.spec.ts` | WebRTC peer connection |

### 7.4 Bảng Tổng Hợp

| Tầng | Đơn vị | Công cụ | Số lượng |
|------|--------|---------|---------|
| Unit — logic thuần | Hàm | Vitest | Hàng trăm case |
| Service | Service + mock Prisma | Vitest + vi.fn() | ~38 file backend |
| Component | React component | Vitest + Testing Library + jsdom | ~28 file frontend |
| E2E | API thật | Vitest + supertest | `vitest.config.e2e.ts` |

---

## 8. Dockerfile — Multi-Stage Build

```dockerfile
# backend/Dockerfile
FROM node:22-alpine AS builder
WORKDIR /app

# ★ openssl cho Prisma engine, libc6-compat cho Alpine
RUN apk add --no-cache openssl libc6-compat

COPY package*.json ./
COPY prisma ./prisma/
RUN npm install

COPY . .
RUN npm run build

# Production Runner
FROM node:22-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV=production
ENV PORT=10000

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/dist ./dist

RUN mkdir -p uploads/chat uploads/documents

EXPOSE 10000

CMD ["sh", "-c", "npx prisma db push && (npm run seed:all || true) && node dist/main"]
```

### 8.1 Tại Sao Multi-Stage?

| | Builder | Runner |
|---|---------|--------|
| Chứa source `.ts` | ✅ | ❌ |
| Chứa devDependencies | ✅ | ❌ |
| Kích thước image | ~1GB | **~300MB** |

**Chỉ copy `dist` + `node_modules` + `prisma`** → image nhỏ hơn 3×, ít bề mặt tấn công.

### 8.2 `openssl` + `libc6-compat` — Bắt Buộc Với Alpine

```dockerfile
RUN apk add --no-cache openssl libc6-compat
```

Prisma engine dùng OpenSSL. Alpine dùng **musl libc** (không phải glibc) → thiếu `libc6-compat` → Prisma crash với `error loading shared library: libssl.so.1.1`.

**Đây là lỗi kinh điển khi deploy NestJS + Prisma trên Alpine.** Phải cài **cả 2** gói.

### 8.3 CMD Với Fallback

```dockerfile
CMD ["sh", "-c", "npx prisma db push && (npm run seed:all || true) && node dist/main"]
```

**`(npm run seed:all || true)`** → nếu seed lỗi (DB đã có dữ liệu) → `|| true` nuốt lỗi → **app vẫn khởi động**. Không để 1 lỗi seed làm sập toàn hệ thống.

---

## 9. Deploy Production — Kiến Trúc Miễn Phí 100%

```
[Neon.tech PostgreSQL] ←→ [Render.com Backend NestJS + WS] ←→ [Vercel Frontend]
        Singapore              Singapore                        CDN toàn cầu
```

### 9.1 Render — Backend

| Trường | Giá trị |
|--------|---------|
| Root Directory | `backend` |
| Build Command | `npm install && npm run build` |
| Start Command | `npx prisma db push && npm run seed:all && node dist/main` |
| Instance Type | Free ($0) |

**Biến môi trường trên Render:**
```
DATABASE_URL=postgresql://...@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=<secret mạnh>
NODE_ENV=production
PORT=10000
CORS_ORIGIN=*
GEMINI_API_KEY=<key>
VAPID_PUBLIC_KEY=<key>
VAPID_PRIVATE_KEY=<key>
VAPID_EMAIL=admin@worksync.com
```

### 9.2 Vercel — Frontend

| Trường | Giá trị |
|--------|---------|
| Framework Preset | Vite |
| Root Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

**Biến môi trường:**
```
VITE_API_URL=https://worksync-backend.onrender.com/api
VITE_WS_URL=https://worksync-backend.onrender.com
```

### 9.3 Vì Sao Tách `VITE_API_URL` và `VITE_WS_URL`?

```typescript
// frontend/src/features/chat/stores/chat.store.ts
const backendUrl =
  import.meta.env.VITE_WS_URL ||
  import.meta.env.VITE_API_URL?.replace(/\/api$/, '') ||
  'http://localhost:4000';

const socket = io(`${backendUrl}/chat`, { ... });
```

| Biến | Giá trị | Dùng cho |
|------|---------|----------|
| `VITE_API_URL` | `.../api` | REST (Axios) |
| `VITE_WS_URL` | `...` (không `/api`) | Socket.IO |

**Socket.IO không dùng prefix `/api`** → phải có 2 biến riêng. Fallback `.replace(/\/api$/, '')` tự suy ra nếu chỉ set 1 biến.

### 9.4 Region Singapore

**Neon: `ap-southeast-1`** + **Render: `Singapore`** → đều gần Việt Nam → độ trễ thấp nhất trong các nền tảng miễn phí.

### 9.5 Lưu Ý Về WebSocket Trên Render Free

Render Free **sleep** sau 15 phút không có request → WebSocket bị ngắt. Client dùng `reconnectionAttempts: 5, reconnectionDelay: 1500` → tự kết nối lại.

**Hạn chế đã biết** cần nói khi demo: sau 15 phút idle, cần "đánh thức" server (~30s).

---

## 10. Kiểm Tra An Toàn (Security Audit)

### 10.1 6 Lớp Phòng Thủ

```
① Mật khẩu: bcrypt cost 10 — không bao giờ lưu plaintext
② Xác thực: JWT + JwtAuthGuard mọi route trừ public
③ Phân quyền: RolesGuard (@Roles) + Service-level ownership check
④ Validation: Zod/ValidationPipe whitelist + transform
⑤ Truy vấn: Prisma parameterized — không nối chuỗi SQL
⑥ File upload: giới hạn 25MB + kiểm tra mimeType
```

### 10.2 Các Lỗi Đã Sửa (Bài Học)

| Lỗi | Nguyên nhân | Cách sửa |
|-----|-----------|----------|
| IDOR — đọc task của project khác | Chỉ check role, không check thành viên | `ProjectAccessService` kiểm tra ownership ở service layer |
| IP bypass bằng IPv4-mapped IPv6 | Không normalize `::ffff:` prefix | Normalize trước khi check `ip-range-check` |
| SQL injection ở search | Nối chuỗi query | Dùng Prisma `contains` (parameterized) |
| XSS trong nội dung task | Render HTML trực tiếp | Escape + sanitize trước khi hiển thị |
| WebSocket không xác thực | Chỉ tin `client.data` từ client | Verify JWT trong `handleConnection` |

### 10.3 Rate Limiting

```typescript
// @nestjs/throttler — giới hạn request theo IP
```

**Hiện tại:** các endpoint nhạy cảm (login, register) nên có rate limit. Đây là hạn chế đã biết cần nêu.

### 10.4 Danh Sách Env Không Commit

```gitignore
backend/.env
frontend/.env
```

`.env.example` **được** commit (chỉ chứa giá trị mẫu) → người mới clone có template để điền.

---

## 11. Checklist Trước Khi Bảo Vệ

### 11.1 Kỹ Thuật
- [ ] `npm run build` chạy sạch (backend + frontend)
- [ ] `npm test` pass hết
- [ ] `npm run lint` không có error (oxlint)
- [ ] `docker compose up -d` + `npx prisma migrate deploy` + `npm run seed:all` → dữ liệu mẫu đầy đủ
- [ ] Đăng nhập được 5 role khác nhau
- [ ] WebSocket hoạt động (chat, meeting)

### 11.2 Demo
- [ ] Check-in GPS ngoài văn phòng → bị chặn
- [ ] Check-in trong văn phòng (100m) → thành công
- [ ] Tạo task → kéo thả Kanban → refresh → vị trí giữ nguyên (sparse integer)
- [ ] Mở 2 tab → nhắn tin → tin nhắn tới ngay ở tab 2
- [ ] Họp 2 máy → video + audio 2 chiều
- [ ] AI tóm tắt biên bản họp → tạo action item → 1 click tạo task
- [ ] Kéo task trên Calendar → bị chặn nếu không phải assignee/PM
- [ ] Mở Dashboard với 4 role khác nhau → layout khác nhau

### 11.3 Tài Liệu
- [ ] Link demo online (Vercel + Render + Neon)
- [ ] QR code trên slide trình bày
- [ ] Tài liệu `docs/study/` đọc lại lần cuối

---

## 12. Câu Hỏi Thường Gặp

**Q: Dự án có test không? Bao nhiêu?**
> Có **66 file test** (38 backend + 28 frontend) dùng **Vitest** thống nhất cả 2 phía. Chiến lược: unit test cho hàm thuần (logic giờ, phân quyền, export .ics), service test với mock Prisma, component test với Testing Library + jsdom. Test file riêng cho `vitest.config.e2e.ts`.

**Q: Vì sao chọn Vitest mà không phải Jest?**
> (1) Tương thích native ESM — dự án dùng `"type": "module"`; Jest cần config phức tạp. (2) **Cùng hệ sinh thái Vite** → frontend không cần thêm config riêng. (3) `vite-tsconfig-paths` resolve alias giống hệt runtime. (4) API gần giống Jest nên không tốn thời gian chuyển đổi.

**Q: Docker Compose dùng để làm gì?**
> Cung cấp PostgreSQL 16 + Redis 7 dưới dạng container, đúng version production. Không cần cài PostgreSQL trên máy Windows. Named volume giữ dữ liệu giữa các lần restart.

**Q: Vì sao đổi port 5433/6380?**
> Tránh xung đột với dịch vụ đã cài sẵn trên máy dev. Docker vẫn expose 5432/6379 bên trong, chỉ map sang port host khác.

**Q: Multi-stage Dockerfile giải quyết vấn đề gì?**
> Giảm image size từ ~1GB xuống ~300MB (không copy source + devDependencies). Giảm bề mặt tấn công. Runner chỉ chứa code đã compile.

**Q: Vì sao cần `openssl` và `libc6-compat` trong Dockerfile?**
> Prisma engine cần OpenSSL; Alpine dùng musl libc nên thiếu `libc6-compat` → crash `libssl.so.1.1 not found`. Đây là lỗi phổ biến nhất khi deploy NestJS+Prisma trên Alpine.

**Q: Deploy miễn phí thế nào?**
> Neon (PostgreSQL cloud) + Render (backend + WebSocket) + Vercel (frontend) — tất cả đều có free tier. Tổng chi phí $0. Điểm cần lưu ý: Render Free sleep sau 15 phút idle.

**Q: WebSocket có hoạt động trên môi trường production không?**
> Có — Render hỗ trợ WebSocket. Nhưng Render Free ngắt connection sau idle → client có `reconnectionAttempts: 5` tự reconnect. Với traffic thật thì dùng Render Starter ($7/tháng) hoặc set `alwaysOn`.

**Q: Có rate limiting không?**
> Hiện tại chưa áp dụng rộng — đây là hạn chế đã biết cần nói. `@nestjs/throttler` đã có thể tích hợp cho các endpoint auth. Ngoài ra cần HTTPS (Vercel/Render đã cấp sẵn), JWT expiry ngắn + refresh token, rate limit theo IP.

**Q: `JWT_SECRET` hardcode mặc định có an toàn không?**
> **Không** — đây là rủi ro đã biết. Có fallback để dev tiện, nhưng production **phải** set `JWT_SECRET`. Hướng khắc phục: đổi thành throw error khi `NODE_ENV === 'production'` mà thiếu secret → fail-closed.

**Q: Database có bị mất dữ liệu khi restart không?**
> Không — dùng **named volume** `postgres_data`. `docker compose down` giữ nguyên volume. Chỉ `docker compose down -v` mới xoá.

**Q: `npm run db:push` khác `migrate deploy` thế nào?**
> `db push` đồng bộ schema trực tiếp (nhanh, **không tạo file migration** — phù hợp prototype/demo). `migrate deploy` apply các file migration đã tạo (có lịch sử, phù hợp production). Dự án dùng `db push` cho dev và deploy, `migrate deploy` khi cần kiểm soát chặt.

**Q: Nếu seed lỗi thì app có chạy không?**
> Có — CMD dùng `(npm run seed:all || true)` → lỗi seed bị nuốt, app vẫn khởi động. Đây là nguyên tắc **fail-safe cho tính năng phụ**: thiếu dữ liệu mẫu không nên làm sập hệ thống.
