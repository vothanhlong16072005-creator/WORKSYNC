# 📓 Progress Log — WorkSync
> Nhật ký tiến độ dự án. Cập nhật sau mỗi milestone hoặc cuối ngày làm việc.

---

## Template cập nhật

```
## [YYYY-MM-DD] — Sprint X / Week Y

### ✅ Hoàn thành
- [Task/Feature đã xong]

### 🔄 Đang làm
- [Task đang trong tiến trình]

### 🚧 Blockers
- [Vấn đề gặp phải + cách giải quyết dự kiến]

### 📋 Kế hoạch ngày mai / tuần tới
- [Việc sẽ làm tiếp theo]
```

---

## 2026-10-04 — Khởi động dự án

### ✅ Hoàn thành
- [x] Tạo file mô tả dự án `MO_TA_DU_AN.md` — đầy đủ 6 sections
- [x] Tạo bộ docs khởi tạo đầy đủ trong `docs/`:
  - `docs/00-PRD.md` — Product Requirements Document
  - `docs/01-FEATURES.md` — Feature list MVP vs Phase 2
  - `docs/02-API-CONTRACT.md` — API Contract sơ bộ tất cả modules
  - `docs/03-DATABASE.md` — Database schema 28 tables + ERD
  - `docs/04-DESIGN-LINKS.md` — Design tokens, wireframes, UI guidelines
  - `docs/05-TECH-STACK.md` — Tech decisions + project structure
  - `docs/06-STYLE-GUIDE.md` — Coding conventions cho team + AI agents
  - `docs/99-PROGRESS-LOG.md` — File nhật ký này
  - `.cursor/rules/project.mdc` — Cursor AI rules

### 🔄 Đang chuẩn bị
- [ ] Scaffold project (monorepo: backend + frontend)
- [ ] Setup Prisma schema theo `docs/03-DATABASE.md`

### 📋 Kế hoạch tiếp theo (Bước 2 theo cẩm nang)
1. Init monorepo với `backend/` (NestJS 10) và `frontend/` (React 18 + Vite 5)
2. Setup `docker-compose.yml` cho PostgreSQL 16 + Redis 7
3. Cấu hình Prisma schema đầy đủ theo `docs/03-DATABASE.md`
4. Run migration đầu tiên: `npx prisma migrate dev --name init`
5. Verify: `docker compose up -d` → backend starts → Swagger UI tại `localhost:4000/api/docs`

---

## 2026-10-10 — Personal Kanban & Project Kanban Feature Delivery

### ✅ Hoàn thành
- [x] Thêm enum `ProjectKind` (TEAM, PERSONAL) và quan hệ owner duy nhất trong schema Prisma.
- [x] Tự động provision personal project khi đăng ký thường và đăng nhập Google lần đầu trong một transaction.
- [x] Viết migration và backfill personal project cho các tài khoản cũ.
- [x] Tạo `ProjectAccessService` kiểm soát quyền đọc dự án và quyền di chuyển task chặt chẽ (IDOR protection).
- [x] Triển khai API `GET /api/projects/mine` kèm `openAssignedTaskCount` phục vụ hiển thị badge.
- [x] Triển khai API `GET /api/tasks?scope=mine|project` và `PATCH /api/tasks/:id/board-position` cập nhật vị trí kéo thả trong transaction nguyên tử.
- [x] Viết unit tests đầy đủ cho backend services và controllers (25/25 tests pass).
- [x] Xây dựng typed API client với Axios và Zod boundary validation ở frontend.
- [x] Cập nhật Zustand `project.store.ts` và `task.store.ts` (state machine `idle`/`loading`/`ready`/`error`, optimistic update, rollback khi lỗi).
- [x] Backend và frontend build xanh 100%.

---

## 2026-10-11 — Task Detail Linear Redesign, Priority Frames & Bilingual (i18n) Engine

### ✅ Hoàn thành
- [x] Gỡ bỏ hardcoded CSS border, tạo hệ thống 4 lớp CSS màu khung viền thể hiện rõ mức độ ưu tiên (`URGENT` đỏ rực rỡ, `HIGH` cam đậm, `MEDIUM` xanh sky, `LOW` xám trang nhã).
- [x] Lột xác Modal Chi tiết Task thành giao diện 2 cột chuẩn Enterprise SaaS (Linear / Jira Cloud), dải tiến trình trạng thái tương tác nhanh 5 bước, bảng thuộc tính tinh tế (Assignee, Reporter, Deadline cảnh báo, Giờ ước tính, Giờ thực tế, Story Points, Dự án, Sprint).
- [x] Tích hợp hệ thống Đa ngôn ngữ (i18n) với `i18next` + `react-i18next`, chuẩn bị sẵn từ điển `vi.json` và `en.json`, hỗ trợ nút chuyển đổi 1-click (🇻🇳 VI / 🇬🇧 EN) tức thì trên thanh Header mà không cần reload trang.
- [x] Cập nhật `.agents/memory/ACTIVE_CONTEXT.md` và `.agents/memory/DECISION_LOG.md` (ADR-002, ADR-003).
- [x] Toàn bộ hệ thống frontend và backend kiểm tra kiểu nghiêm ngặt và build xanh 100%.

---

## Milestone Tracker

| Milestone | Target | Status | Notes |
|-----------|--------|--------|-------|
| **M0: Docs & Setup** | Week 1 | ✅ Completed | Monorepo scaffolded |
| **M1: Auth + User** | Week 2 | ✅ Completed | JWT, Google OAuth, Personal Project provisioning |
| **M2: Attendance** | Week 3 | ⬜ Not started | IP/GPS logic |
| **M3: Project & Task (CRUD)** | Week 4-5 | ✅ Completed | Scoped reads, project access control, board-position PATCH |
| **M4: Kanban Board (UI)** | Week 5-6 | ✅ Completed | Bauhaus UI, @hello-pangea/dnd, badge counts, optimistic update |
| **M5: Meetings + WebRTC** | Week 6-7 | ⬜ Not started | Phức tạp nhất |
| **M6: Documents (ClickUp Docs)** | Week 7-8 | ⬜ Not started | Tiptap editor |
| **M7: AI Integration (Gemini)** | Week 8-9 | ⬜ Not started | Summary features |
| **M8: Reports & Dashboard** | Week 9-10 | ⬜ Not started | Charts |
| **M9: Notification System** | Week 10 | ⬜ Not started | Socket.IO |
| **M10: Testing & Polish** | Week 11 | ⬜ Not started | E2E, accessibility |
| **M11: Deploy** | Week 12 | ⬜ Not started | Docker + VPS |

---

## Quyết định kỹ thuật (Decision Log)

| Ngày | Quyết định | Lý do |
|------|-----------|-------|
| 2026-10-04 | Dùng Vite+React thay Next.js | Internal tool không cần SSR, team quen React |
| 2026-10-04 | Dùng WebRTC + simple-peer cho video call | Tránh chi phí Agora/Twilio, đủ cho MVP |
| 2026-10-04 | Dùng Tiptap cho rich text editor | Feature-rich, tương tự ClickUp Docs |
| 2026-10-04 | Bỏ role Viewer | Simplify permissions, không có use case thực tế |
| 2026-10-04 | Bull + Redis cho job queue | Tránh AWS SQS dependency, Redis đã có |
| 2026-10-04 | Gemini 1.5 Flash cho AI | Nhanh + rẻ hơn GPT-4, đủ cho summary task |

---

## Known Issues / Technical Debt

| # | Issue | Priority | Assigned | Status |
|---|-------|----------|---------|--------|
| - | - | - | - | - |

> *Cập nhật khi phát hiện issue trong quá trình dev*

---

## Tài nguyên hữu ích

- 📖 [PRD](./00-PRD.md) — Product requirements
- ✅ [Features](./01-FEATURES.md) — Feature list
- 🔌 [API Contract](./02-API-CONTRACT.md) — Endpoints
- 🗄️ [Database](./03-DATABASE.md) — Schema & ERD
- 🎨 [Design](./04-DESIGN-LINKS.md) — UI guidelines
- 🛠️ [Tech Stack](./05-TECH-STACK.md) — Technology decisions
- 📐 [Style Guide](./06-STYLE-GUIDE.md) — Coding conventions
- 📋 [Cẩm nang AI](../CAM_NANG_BUILD_WEBAPP_VOI_AI.md) — Workflow guide
