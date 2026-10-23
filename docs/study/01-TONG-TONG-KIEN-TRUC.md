# 01 — Tổng Quan Kiến Trúc WorkSync

> **Mục đích:** Nắm vững "bức tranh toàn cảnh" để trả lời các câu hỏi mở đầu: dự án làm gì, kiến trúc ra sao, chạy thế nào, code nằm ở đâu.

---

## 1. WorkSync Là Gì?

**WorkSync** — Nền tảng quản lý công việc, dự án & điểm danh thông minh, xây dựng dựa trên bối cảnh vận hành thực tế tại **FPT Software Đà Nẵng**.

**Bài toán giải quyết:** doanh nghiệp phần mềm đang dùng nhiều công cụ rời rạc (máy chấm công vân tay, Jira, Google Meet, Google Docs, Zalo). WorkSync gộp về một nơi:

| Vấn đề cũ | Giải pháp WorkSync |
|-----------|-------------------|
| Máy chấm công vân tay, xếp hàng | Check-in 1-click, tự xác thực GPS + IP Wifi |
| Jira rời rạc, không theo dõi được cá nhân | Kanban + Sprint + Backlog, tách Personal vs Team |
| Google Meet không có biên bản AI | Phòng họp WebRTC + Live STT + Gemini 1.5 Flash tự tóm tắt |
| Google Docs không kiểm soát quyền | ClickUp Docs-style, 5 phân loại, versioning, RBAC theo scope |
| 6 lịch rời rạc (task/sprint/họp/phép/WFH/OT) | Work Calendar hợp nhất + conflict detection |
| Zalo/email rời rạc cho trao đổi | Chat Socket.IO native, 3 loại hội thoại, Web Push |

---

## 2. Kiến Trúc Tổng Thể

### 2.1 Mô hình Monorepo

```
Ver2/
├── backend/     → NestJS 12 :4000   (REST API + WebSocket Gateway)
├── frontend/    → React 19 + Vite 8 :5173  (SPA)
├── docs/        → Tài liệu (PRD, API, DB, study folder)
└── docker-compose.yml → PostgreSQL 16 :5433 + Redis 7 :6380
```

**Điểm quan trọng:** frontend và backend **tách rời hoàn toàn**, giao tiếp qua HTTP/REST và WebSocket. Không có monorepo build dùng chung.

### 2.2 Sơ đồ tổng thể

```mermaid
graph TB
    subgraph Client["🖥️ Frontend — React 19 SPA :5173"]
        UI[Pages & Components<br/>184 file .tsx]
        ZS[Zustand Stores<br/>auth/task/project/chat/...]
        AX[Axios apiClient<br/>+ Zod validation]
        IO[i18next VI/EN<br/>TailwindCSS tokens]
    end

    subgraph Backend["⚙️ Backend — NestJS 12 :4000"]
        CTRL[Controllers<br/>REST + Guards]
        SVC[Services<br/>business logic]
        GW[Socket.IO Gateways<br/>/chat /meetings /notifications]
        PRISMA[PrismaService]
    end

    subgraph Data["🗄️ Data Layer"]
        PG[(PostgreSQL 16<br/>37 models)]
        REDIS[(Redis 7<br/>cache & counter)]
        FS[(Local FS / MinIO<br/>uploads)]
    end

    subgraph External["☁️ External"]
        GEMINI[Google Gemini 1.5 Flash]
        GOOGLE[Google OAuth 2.0]
        PUSH[Web Push VAPID]
        SMTP[SMTP Email]
    end

    UI --> ZS --> AX
    AX -->|"/api/*"| CTRL
    UI <-->|"Socket.IO"| GW
    CTRL --> SVC --> PRISMA
    GW --> SVC
    PRISMA --> PG
    SVC --> REDIS
    SVC --> FS
    SVC --> GEMINI
    CTRL --> GOOGLE
    SVC --> PUSH
    SVC --> SMTP
```

### 2.3 Ba namespace WebSocket

NestJS chạy **3 gateway độc lập**, mỗi namespace một miền nghiệp vụ:

| Namespace | File | Mục đích |
|-----------|------|----------|
| `/chat` | `backend/src/chat/chat.gateway.ts` | Chat realtime, presence, typing indicator |
| `/meetings` | `backend/src/meetings/meetings.gateway.ts` | WebRTC signaling, live STT, chat trong phòng họp |
| `/notifications` | `backend/src/notifications/notifications.gateway.ts` | Đẩy thông báo real-time |

**Tại sao tách namespace?** Socket.IO chỉ định tuyến theo namespace, nên client chat không nhận event của phòng họp → giảm nhiễu, dễ scale riêng, dễ đặt policy bảo mật khác nhau (chat có JWT auth bắt buộc, meetings thì đang để `origin: '*'` — đây là điểm cần nhắc khi bảo mật).

---

## 3. Tổng Quan 10 Phân Hệ Tính Năng

| Mã | Phân hệ | Route chính | Module backend |
|----|----------|-------------|----------------|
| **M1** | Xác thực & RBAC | `/login`, `/register` | `auth/` |
| **M2** | Điểm danh thông minh | `/attendance` | `attendance/` (39 file) |
| **M3** | Dự án & Kanban | `/projects`, `/tasks` | `projects/`, `tasks/` |
| **M3.5** | Trưởng phòng & QuickTask | `/quick-tasks` | `quick-tasks/` |
| **M3.6** | Sprint & Backlog (Jira) | `/projects/:id/sprints/:sprintId` | `sprints/` |
| **M5** | Họp trực tuyến & AI | `/meetings`, `/meetings/:id/room` | `meetings/` (14 file) |
| **M6** | Quản lý tài liệu | `/documents` | `documents/` (18 file) |
| **M8** | Work Calendar | `/calendar` | `calendar/` |
| **M9** | Chat & Thông báo | `/chat`, `/notifications` | `chat/`, `notifications/` |
| **M10** | Báo cáo cuối ngày | (modal) | `daily-reports/` |
| **M12** | Admin Control Center | `/admin` | `admin/` |

Chi tiết từng phân hệ: file `05-` đến `12-` trong folder này.

---

## 4. Ma Trận 5 Vai Trò (RBAC)

Đây là câu hỏi **gần như chắc chắn** giáo viên sẽ hỏi. Hãy nắm bảng này:

```
                    ADMIN    HR    DEPT_HEAD    PM    EMPLOYEE
                    ─────    ──    ──────────    ──    ─────────
Toàn quyền hệ thống   ✔       ✔        ✔        ✔        ✘
Xem toàn bộ công ty    ✔       ✔        ✔        ✘        ✘
Tạo dự án nhóm        ✔       ✘        ✔        ✘        ✘
Giao việc cho người khác ✔     ✔        ✔        ✔        ✘
Quản lý Sprint        ✔       ✘        ✘        ✔        ✘
Duyệt nghỉ phép       ✔       ✔        ✔        ✘        ✘
Duyệt WFH/OT          ✔       ✔        ✔        ✔        ✘
Hoán đổi PM (swap-pm)  ✔       ✘        ✔        ✘        ✘
Kanban cá nhân        ✔       ✔        ✔        ✔        ✔ (100%)
Họp trực tuyến        ✔       ✔        ✔        ✔        ✔ (tham gia)
Tạo cuộc họp          ✔       ✔        ✔        ✔        ✘
AI tóm tắt cuộc họp   ✔       ✔        ✔        ✔        ✘
```

**Enum Role trong Prisma** (`backend/prisma/schema.prisma`):
```
ADMIN | HR | DEPARTMENT_HEAD | PM | EMPLOYEE
```

### 4.1 Phân quyền 2 lớp — điểm cần nhấn mạnh

```
┌─────────────────────────────────────────────────┐
│  LỚP 1 — BACKEND (bắt buộc)                     │
│  JwtAuthGuard → xác thực token                   │
│  RolesGuard   → @Roles(ADMIN, HR)                │
│  Service      → kiểm tra quyền sở hữu (IDOR)     │
│  ⇒ Đây là lớp BẢO MẬT thật sự                   │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│  LỚP 2 — FRONTEND (tiện ích UX)                │
│  PermissionGuard → ẩn/hiện UI theo role        │
│  ⇒ Chỉ để trải nghiệm tốt, KHÔNG phải bảo mật │
└─────────────────────────────────────────────────┘
```

> **Câu hỏi kinh điển:** *"Người dùng sửa role thành ADMIN trong DevTools thì sao?"*
> **Trả lời:** Được — nhưng API backend vẫn chặn vì `@Roles()` guard đọc role từ **JWT payload đã ký**, không đọc từ request body. Muốn đổi role phải qua `PATCH /api/users/:id/role` cần `ADMIN`.

---

## 5. Cấu Trúc Thư Mục Chi Tiết

### 5.1 Backend

```
backend/
├── prisma/
│   ├── schema.prisma          # 37 model, 26 enum
│   ├── migrations/            # lịch sử migration
│   ├── seed-enterprise-full.ts# 19 tài khoản mẫu
│   ├── seed-meetings.ts       # 10 cuộc họp mẫu
│   ├── seed-calendar.ts
│   └── seed-chat.ts
├── src/
│   ├── main.ts                # bootstrap, global prefix /api
│   ├── app.module.ts
│   ├── auth/                  # 9 file — JWT, OAuth, guards, strategies
│   ├── users/                 # 5 file — CRUD, phân quyền role
│   ├── attendance/            # 39 file — 7 services + controller
│   ├── projects/              # 10 file — dự án, access service
│   ├── tasks/                 # 10 file — Kanban CRUD
│   ├── sprints/               # 7 file — Sprint + Burndown
│   ├── quick-tasks/           # 6 file — giao việc nhanh
│   ├── meetings/              # 14 file — gateway, AI service
│   ├── documents/             # 18 file — Tiptap, versioning
│   ├── calendar/              # 8 file — timeline aggregator
│   ├── chat/                  # 7 file — gateway + service
│   ├── notifications/         # 14 file — gateway, cron, web-push
│   ├── daily-reports/         # 9 file — AI draft
│   ├── dashboard/             # 5 file — thống kê
│   ├── admin/                 # 4 file — control center
│   ├── common/                # 3 file — interceptor, filter, DTO
│   ├── prisma/                # 2 file — PrismaService
│   └── test/                  # test helpers
└── test/                      # integration test suites
```

### 5.2 Frontend

```
frontend/src/
├── App.tsx                    # 22 route — điểm vào duy nhất
├── layouts/
│   └── DashboardLayout.tsx    # shell có Header + Sidebar
├── components/
│   ├── ui/                    # Button, Input, Label, Modal, UserAvatar...
│   ├── layout/                # Header, PermissionGuard, Sidebar
│   └── AiFormattedContent.tsx
├── features/                  # 14 module × (pages|components|api|stores|hooks|types)
│   ├── auth/pages/            # LoginPage, RegisterPage
│   ├── attendance/            # 29 file — heatmap, geofence map, approval queue
│   ├── projects/              # 21 file — kanban board, sprints view, modals
│   ├── tasks/                 # 2 file — KanbanPage, TaskDetailModal
│   ├── sprints/               # 11 file — BurndownChart
│   ├── quick-tasks/           # 9 file — QuickTaskButton ⚡
│   ├── meetings/              # 29 file — PersistentCallManager, WebRTC hooks
│   ├── documents/             # 14 file — TiptapEditor, version history
│   ├── calendar/              # 22 file — TimelineCanvas
│   ├── chat/                  # 15 file — ChatContextMenu, MessageList
│   ├── notifications/         # 10 file — NotificationBell, push hooks
│   ├── dashboard/             # 51 file — 5 layout theo role + widgets
│   ├── daily-reports/         # 5 file
│   └── admin/                 # 3 file
├── stores/                    # auth, task, project (Zustand)
├── lib/                       # api-client (Axios+Zod), api-schemas
├── i18n/                      # i18n.ts + locales/vi.json, en.json
└── index.css                  # Tailwind + design tokens
```

---

## 6. Đường Đi của Một Request (Trace End-to-End)

Ví dụ: nhân viên bấm nút "Check-in".

```
[1] FRONTEND
    frontend/src/features/attendance/api/attendance.api.ts
      → apiClient.post('/attendance/check-in', { latitude, longitude, ipAddress })
      → interceptor tự gắn header Authorization: Bearer <token>

[2] HTTP → localhost:4000/api/attendance/check-in

[3] BACKEND — Controller
    backend/src/attendance/attendance.controller.ts
      @Post('check-in')
      @UseGuards(JwtAuthGuard)
      async checkIn(@CurrentUser() user, @Body() dto: CheckInDto) {
        return this.attendanceService.checkIn(user.id, dto);
      }
      → Global ValidationPipe đã validate DTO (class-validator) trước khi vào controller

[4] BACKEND — Service (business logic)
    backend/src/attendance/attendance.service.ts
      a) IpValidationService.isOfficeIp(ip)         → có phải IP Wifi văn phòng?
      b) GeoValidationService.isWithinRadius(...)    → Haversine ≤ bán kính?
      c) Kiểm tra khung giờ check-in (06:00–12:00)
      d) Tính status: ON_TIME / LATE / VERY_LATE
      e) prisma.attendanceRecord.create(...)

[5] DATABASE
    PostgreSQL INSERT INTO "AttendanceRecord"

[6] RESPONSE → frontend → toast "Chào Long Võ, 08:14 — Đúng giờ"
```

**Điểm cần nhấn:** Bước 3 có **3 lớp kiểm tra trước khi tới Service**: JWT guard → role guard → DTO validation. Đây là hàng rào tiêu chuẩn của NestJS.

---

## 7. Công Nghệ Sử Dụng — Bảng Chi Tiết

### 7.1 Frontend

| Công nghệ | Phiên bản | Vai trò trong dự án | Tại sao chọn |
|------------|-----------|----------------------|--------------|
| **React** | 19.2 | Thư viện giao diện | Component hóa, ecosystem lớn |
| **Vite** | 8.3 | Dev server + bundler | HMR tức thời, build nhanh |
| **TypeScript** | 6.0 (strict) | Ngôn ngữ | Zero `any`, bắt lỗi compile-time |
| **TailwindCSS** | 3.4 | Styling utility-first | Token nhất quán, không cần CSS riêng |
| **Zustand** | 5.0 | State management | Nhẹ hơn Redux, không boilerplate |
| **Axios** | 1.20 | HTTP client | Interceptor, timeout, cancel |
| **Zod** | 3.25 | Runtime validation | Validate response API ở boundary → type-safe end-to-end |
| **React Router** | 7.18 | Routing | Nested routes, guard |
| **i18next** | 26.4 | Đa ngôn ngữ | VI/EN, đổi 1-click không reload |
| **Lucide React** | 1.52 | Icon | SVG vector nhất quán, không emoji |
| **@hello-pangea/dnd** | 18.0 | Drag & drop Kanban | Tương thích React 19 StrictMode |
| **Recharts** | 3.10 | Biểu đồ | Burndown, velocity, donut |
| **Tiptap** | 3.32 | Rich-text editor | ProseMirror-based, mở rộng dễ |
| **Leaflet** | 1.9 | Bản đồ | Nhẹ, OpenStreetMap miễn phí, không cần key |
| **Socket.IO Client** | 4.8 | Realtime | Auto-reconnect, namespace, room |
| **Framer Motion** | 14.0 | Animation | Micro-interaction mượt |
| **Sonner** | 2.0 | Toast | Nhẹ, đẹp |
| **react-hook-form** | 7.89 | Form | Uncontrolled, ít re-render |
| **Zod resolver** | 5.9 | Validate form | Dùng chung schema với API |
| **simple-peer** | 9.11 | WebRTC | *(có trong deps, code hiện dùng API native)* |
| **xlsx** | 0.18 | Export Excel | |
| **jspdf** | 4.2 | Export PDF | |

### 7.2 Backend

| Công nghệ | Phiên bản | Vai trò |
|------------|-----------|---------|
| **NestJS** | 12.x | Framework: DI, module, guard, interceptor |
| **Prisma** | 5.22 | ORM type-safe, migration, `$transaction` |
| **PostgreSQL** | 16-alpine | CSDL chính (port 5433) — 37 model |
| **Redis** | 7-alpine | Cache, counter (port 6380) |
| **Socket.IO** | 4.8 | Realtime, 3 namespace |
| **Passport JWT** | 0.7 / 4.0 | Xác thực token |
| **passport-google-oauth20** | 2.0 | OAuth 2.0 |
| **bcrypt** | 6.0 | Hash mật khẩu (cost 10) |
| **@google/generative-ai** | 0.24 | Gemini 1.5 Flash |
| **class-validator** | 0.15 | Validate DTO |
| **Zod** | 4.6 | Schema validation (backend) |
| **web-push** | 3.6 | Web Push VAPID |
| **jspdf / jspdf-autotable** | 4.2 / 5.0 | Export PDF |
| **docx** | 9.12 | Export Word biên bản |
| **xlsx** | 0.18 | Export Excel/CSV |
| **multer** | 2.4 | Upload file 25MB |
| **minio** | 8.0 | S3-compatible storage |
| **ip-range-check** | 0.2 | Kiểm tra IP trong dải mạng |
| **date-fns** | 4.4 | Xử lý ngày giờ, timezone |
| **@nestjs/schedule** | 12.0 | Cron job (auto-approve, nhắc báo cáo) |
| **Vitest** | 4.1 | Unit test |
| **oxlint** | 1.58 | Lint nhanh |

---

## 8. Cách Chạy Dự Án

### 8.1 Yêu cầu môi trường

```env
# backend/.env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/worksync?schema=public"
REDIS_URL="redis://localhost:6380"
JWT_SECRET="super_secret_jwt_key_worksync"
GEMINI_API_KEY="AIza..."          # ← BẮT BUỘC cho AI summary
```

```env
# frontend/.env
VITE_API_URL="http://localhost:4000/api"
```

### 8.2 Lệnh chạy

```bash
# 1. Hạ DB container
docker compose up -d

# 2. Backend
cd backend
npm install
npm run db:push          # sync schema
npm run seed:all         # nạp dữ liệu mẫu
npm run start:dev        # → http://localhost:4000

# 3. Frontend (terminal mới)
cd frontend
npm install
npm run dev              # → http://localhost:5173
```

**Script tiện ích:**

| Script | Tác dụng |
|--------|----------|
| `npm run seed:all` | Nạp toàn bộ: enterprise + meetings + calendar + chat |
| `npm run seed:meetings` | Chỉ 10 cuộc họp mẫu |
| `npm run test` | Backend unit test |
| `npm run test:cov` | Test + coverage |
| `npm run build` | Compile production |
| `npm run lint` | oxlint |
| `start-dev.bat` | Chạy cả 2 cùng lúc ở root |

### 8.3 Tài khoản mẫu (từ `seed-enterprise-full.ts`)

19 tài khoản mô phỏng doanh nghiệp FPT, phủ đủ 5 role. Xem trong `backend/prisma/seed-enterprise-full.ts` để biết email/mật khẩu.

---

## 9. Nguyên Tắc Thiết Kế — Điều Giáo Viên Hay Hỏi

### 9.1 5 nguyên tắc từ `docs/00-PRD.md` §4

| Nguyên tắc | Thể hiện trong code |
|------------|---------------------|
| **Mobile-first** | Check-in 1 nút, Kanban responsive, PWA-ready |
| **Real-time** | 3 namespace Socket.IO; task đổi trạng thái → push ngay |
| **AI-augmented** | Gemini tóm tắt/điền draft, **người dùng review & sửa** — AI không tự quyết |
| **Offline-capable** | PWA cache cơ bản |
| **Audit trail** | `createdAt`/`updatedAt`/`deletedAt` mọi entity, `WorkLog` ghi giờ |

### 9.2 3 cơ chế phòng chống lỗi (từ `docs/05-TECH-STACK.md` §4)

**a) Transaction nguyên tử — chống race condition**

```typescript
// Ví dụ: đổi vị trí Kanban, 2 người kéo cùng lúc
await this.prisma.$transaction([
  this.prisma.task.update({ where: { id }, data: { status, boardOrder } }),
  this.prisma.workLog.create({ data: { taskId, duration } }),
]);
```

Áp dụng cho: trừ quỹ ngày phép, tạo dự án cá nhân khi đăng ký, đổi vị trí Kanban, hoán đổi PM.

**b) Multi-Model Fallback cho Gemini**

```typescript
// meeting-ai.service.ts
try {
  result = await this.callGemini(apiKey, content, opts);
} catch (error) {
  // gemini-1.5-flash lỗi 503 → thử model backup
  result = await this.callGeminiFallback(apiKey, content, opts);
}
```

**c) Chống IDOR — kiểm tra quyền sở hữu ở Service layer**

```typescript
// tasks.service.ts — không tin client gửi userId
const task = await this.prisma.task.findUnique({ where: { id } });
const canEdit = task.assigneeId === actor.id
            || task.createdById === actor.id
            || isProjectPM || actor.role === Role.ADMIN;
if (!canEdit) throw new ForbiddenException(...);
```

---

## 10. Câu Hỏi Thường Gặp & Cách Trả Lời

**Q: Tại sao chọn PostgreSQL mà không phải MySQL/MongoDB?**
> PostgreSQL có **JSONB** (dùng cho nội dung Tiptap, action items AI), **transaction ACID mạnh** (cần cho quy trình duyệt/phạt phép), và hỗ trợ **full-text search** cho module Tài liệu. MongoDB không có transaction đa document mạnh — không phù hợp với nghiệp vụ phê duyệt.

**Q: Tại sao dùng Prisma thay vì TypeORM?**
> Prisma **type-safe end-to-end**: `schema.prisma` sinh TypeScript types, lỗi đổi tên field bị bắt lúc compile. Có `$transaction` API rõ ràng và migration tooling tốt hơn.

**Q: Socket.IO thay vì WebSocket thuần?**
> Socket.IO có **auto-reconnect**, **fallback polling** khi WebSocket bị chặn, **room/namespace**, và **ack callback**. WebSocket thuần phải tự viết lại tất cả — mất thời gian không đáng.

**Q: Vì sao có cả REST lẫn WebSocket?**
> REST cho **CRUD dữ liệu** (nền tảng, cache được, dễ test). WebSocket cho **cập nhật thời gian thực** (chat, signaling, notification). Dùng Socket.IO cho cả hai sẽ khó phân quyền và khó scale.

**Q: Mô hình P2P mesh WebRTC có giới hạn không?**
> Có. Mỗi peer tải N-1 stream → tổng băng thông ~O(N²). Giới hạn thực tế ~5 người/phòng. Giải pháp mở rộng là **SFU** (mediasoup, LiveKit) — đã ghi trong plan M5.3 mục rủi ro.

**Q: Code này còn dead code không?**
> Đã rà soát: `VideoCallRoom.tsx` là **dead code** (không file nào import) — đã lên kế hoạch xóa trong `docs/M5.3-WEBRTC-FIX-PLAN.md` §4.6.

---

## 11. Bảng Điều Hướng Nhanh

| Cần tìm hiểu | Đọc file study |
|---------------|---------------|
| Cấu trúc DB, quan hệ bảng | `02-DU-LIEU-HE-THONG-DATABASE.md` |
| NestJS pattern, guards, DI | `03-BACKEND-NESTJS.md` |
| Zustand, Axios+Zod, i18n, Tailwind | `04-FRONTEND-REACT.md` |
| JWT, OAuth, RBAC 2 lớp | `05-FEATURE-AUTH-RBAC.md` |
| GPS Haversine, IP, quy trình duyệt | `06-FEATURE-ATTENDANCE.md` |
| Kanban kéo thả, Sprint, Burndown | `07-FEATURE-PROJECTS-SPRINTS.md` |
| WebRTC signaling, STT, Gemini | `08-FEATURE-MEETINGS-WEBRTC-AI.md` |
| Tiptap, versioning, RBAC scope | `09-FEATURE-DOCUMENTS.md` |
| Timeline 6 nguồn, conflict, ICS | `10-FEATURE-CALENDAR.md` |
| Chat realtime, presence, Web Push | `11-FEATURE-CHAT-NOTIFICATIONS.md` |
| 5 dashboard layout, AI draft | `12-FEATURE-DASHBOARD-DAILY-REPORT.md` |
| Test, deploy, mở rộng | `13-HUONG-DAN-TRIEN-KHAI.md` |
| Tra nhanh khi thi | `99-CHEAT-SHEET-THI.md` |
