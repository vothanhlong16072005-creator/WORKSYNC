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

## 2026-10-11 & 2026-10-12 — Executive Dashboard, Design System v2 & Smart Attendance (M2)

### ✅ Hoàn thành
- [x] **Executive Dashboard (M8)**: Thiết kế chuẩn Modern Enterprise SaaS + Bauhaus Accents (Linear/Stripe/Apple Pro), Hero illustration, 6 thẻ KPI Ribbon, Checklist tác vụ lõi, Recharts 7-day velocity, Active Sprint, Upcoming Meetings, Recent Documents, Recent Activities và Mega-footer.
- [x] **Design System v2**: Đồng bộ token màu Bauhaus tinh tế, loại bỏ viền đen thô, chuyển sang `rounded-2xl`, bóng mờ tinh tế và priority color stripes 4px.
- [x] **Smart Attendance Module (M2)**: 15 endpoints backend NestJS, 7 services (`AttendanceService`, `WfhService`, `LeaveService`, `IpValidationService`, `GeoValidationService`, `LeaveBalanceService`, `AutoApproveService`).
- [x] **Frontend Attendance Hub (`/attendance`)**: Tab Hôm nay (Today Banner ticking, Leave balance, Geofence map FPT 4K), Tab Lịch sử (MyHistory), Tab Đơn của tôi (MyRequests), Tab Hàng đợi duyệt (ApprovalQueue cho HR/PM/Admin).
- [x] **Khắc phục 15/15 lỗi Logic Nghiệp vụ (QA Audit)**:
  - 8 lỗi P0: Zero `any` (`ts-strict-engineering`), chống gian lận `dayCount`, tính cả đơn pending vào quỹ phép, transaction chống race condition, timezone WFH auto-approve an toàn (`Asia/Ho_Chi_Minh`), upsert `ABSENT_APPROVED` cho toàn bộ ngày phép, chặn check-in ngoài khung giờ (06:00-12:00), bổ sung 8 unit tests chuyên sâu.
  - 4 lỗi P1: Public IP fallback (`usePublicIp` qua api.ipify.org), timezone try-catch fallback, chặn WFH ngày quá khứ, kiểm tra overlap đơn phép.
  - 3 lỗi P2: Trạng thái WFH PENDING rõ ràng, cảnh báo check-in MANUAL ngoài văn phòng, validate thứ tự giờ WFH.
- [x] **Verification**: 15/15 test suites backend (75/75 tests pass 100%), frontend + backend build thành công 0 lỗi. Kiểm thử E2E qua browser subagent.

---

## 2026-10-14 — Attendance Enhancement (Giai đoạn 1 & 2), Đa chi nhánh & Nạp Dữ Liệu Thực Tế

### ✅ Hoàn thành
- [x] **Hỗ trợ Đa chi nhánh (Multi-Office Presets)**:
  - Cập nhật FPT Complex Đà Nẵng làm văn phòng mặc định (`15.968600, 108.260800`).
  - Hỗ trợ thêm FPT Software Tower Hà Nội và FPT Tân Thuận TP.HCM, tự động nhận diện chi nhánh gần nhất qua GPS (`findNearestOffice`).
  - Tích hợp bản đồ tương tác OpenStreetMap Leaflet với Geofence 500m, avatar marker, animated polyline và custom building SVG icons.
- [x] **Today Timeline (Live-ticking)**: Dải tiến trình trực quan hôm nay (giờ check-in, vị trí hiện tại đập nhịp `animate-pulse`, highlight giờ ăn trưa 12:00-13:00, 4 thẻ thống kê Working, Late, Lunch, OT).
- [x] **Calendar Heatmap (365 ngày)**: Bảng nhiệt chuyên cần 52 tuần kiểu GitHub, mã màu 9 trạng thái và tooltip chi tiết.
- [x] **Thống kê chuyên cần (Stats)**: 4 thẻ KPI + Biểu đồ cột Recharts số giờ 30 ngày gần nhất + Biểu đồ tròn Donut phân bổ trạng thái.
- [x] **Xuất báo cáo (Export Excel & PDF)**: Nút xuất file `.xlsx` và `.pdf` trực tiếp từ bảng lịch sử.
- [x] **Tính năng mới Giai đoạn 2**:
  - Đăng ký & Duyệt Về sớm (`EarlyLeaveRequest`): Check-out sớm < 17:30 tự động gắn cờ `EARLY_LEAVE_APPROVED` hoặc `EARLY_LEAVE_UNAPPROVED`.
  - Đăng ký & Duyệt Làm thêm giờ (`OvertimeRequest`): Chuẩn HRM `actualHours = min(registered, checkOut - 17:30)`.
  - Theo dõi ra ngoài (`BreakLog`): Tự động trừ giờ trưa và hỗ trợ log nghỉ tạm thời.
- [x] **Nạp Dữ liệu Thực tế (Seed Data)**:
  - Nạp 203 bản ghi lịch sử điểm danh đầy đủ từ 01/2026 đến 10/2026 cho `Long Võ` (`vothanhlong1704@gmail.com`).
  - Nạp 5 đơn WFH, 5 đơn nghỉ phép, 2 đơn về sớm, 3 đơn OT, 1 log nghỉ trưa và 6 đơn chờ duyệt từ đồng nghiệp.
- [x] **Verification**: 161/161 tests backend pass 100%, frontend & backend build 0 lỗi.

### 📋 Kế hoạch ngày mai
1. Test và nghiệm thu toàn diện các chức năng Attendance trên giao diện.
2. Bắt đầu triển khai **Module M5: Cuộc họp trực tuyến & Biên bản AI (Meetings)**.

---

## Milestone Tracker

| Milestone | Target | Status | Notes |
|-----------|--------|--------|-------|
| **M0: Docs & Setup** | Week 1 | ✅ Completed | Monorepo scaffolded |
| **M1: Auth + User** | Week 2 | ✅ Completed | JWT, Google OAuth, Personal Project provisioning |
| **M2: Attendance** | Week 3 | ✅ Completed | Geofence GPS FPT Tower, IP CIDR, WFH, Quỹ phép, 75/75 tests pass |
| **M3: Project & Task (CRUD)** | Week 4-5 | ✅ Completed | Scoped reads, project access control, board-position PATCH |
| **M4: Kanban Board (UI)** | Week 5-6 | ✅ Completed | Modern SaaS UI, @hello-pangea/dnd, badge counts, optimistic update |
| **M5: Meetings + WebRTC** | Week 6-7 | 🔄 Next Up (Kế hoạch sáng mai) | WebRTC video room, screen share, AI summary |
| **M6: Documents (ClickUp Docs)** | Week 7-8 | ⬜ Not started | Tiptap editor, cây phân cấp tài liệu |
| **M7: AI Integration (Gemini)** | Week 8-9 | ⬜ Not started | Summary meetings & tasks |
| **M8: Reports & Dashboard** | Week 9-10 | ✅ Completed (Dashboard) | Modern Enterprise SaaS, Real KPI, Recharts, Sprint |
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
