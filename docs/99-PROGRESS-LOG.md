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

## 2026-10-17 — Module M3.5: Trưởng phòng & Giao việc nhanh (QuickTask)
- [x] **Database & Prisma Schema**: Thêm role `DEPARTMENT_HEAD`, bổ sung trường `pmId` và `workflowType` (SCRUM/KANBAN/DAILY/SIMPLE) vào `Project`, mở rộng `Sprint` và tạo model `QuickTask`.
- [x] **Backend**: Tạo module `QuickTaskModule` (6 REST endpoints), phương thức `UsersService.findByDepartmentOrMine()` và siết chặt phân quyền RBAC cho Trưởng phòng.
- [x] **Frontend**: Nút ⚡ `QuickTaskButton` trên header, modal giao việc nhanh `QuickTaskModal`, trang `/quick-tasks`, và layout dashboard riêng biệt cho Trưởng phòng `DepartmentHeadDashboardLayout`.
- [x] **Kiểm thử**: 24 test files backend (187 tests pass) và 5 test files frontend (47 tests pass).

---

## 2026-10-18 & 2026-10-19 — M3.6, M5.1, M6 & M9: Trưởng phòng, Quản lý Sprint Jira & Tài liệu
- [x] **M3.6 (Department Head Dashboard Drill-Down & PM Swap)**:
  - Backend: Endpoint `PATCH /api/projects/:id/swap-pm` cho phép Trưởng phòng đổi PM trong transaction atomic an toàn; bộ 3 API drill-down `/dept-head/project/:id`, `/dept-head/sprint/:id`, `/dept-head/member/:id`.
  - Frontend: Bộ modal in-place chuẩn Bauhaus (không chuyển trang): `ProjectDetailModal` (4 tab + cảnh báo rủi ro), `SwapPmModal`, `SprintManagementModal` (biểu đồ Burndown Recharts + bảng đóng góp thành viên), `DeptHeadMemberProfileModal` (kèm dải chấm công 7 ngày), `QuickTaskDetailModal`.
- [x] **M3.6 Phase 3 (Project Sprints & Task Planning Hub - Chuẩn Jira)**:
  - Khắc phục triệt để lỗi React Hook order violation trong `ProjectDetailPage.tsx` (loại bỏ màn hình trắng).
  - Xây dựng component [`ProjectSprintsView`](../frontend/src/features/projects/components/ProjectSprintsView.tsx): Thẻ Sprint dạng khối theo chu kỳ, thanh tiến độ % và SP, bảng danh sách công việc bên dưới với checkbox hoàn thành một chạm, người được giao, độ ưu tiên, hạn chót báo đỏ khi quá hạn, điểm Story Points.
  - Tích hợp nút `+ Tạo Sprint Mới` và `+ Thêm Công Việc` trực tiếp tại từng Sprint (tự động chọn Sprint).
  - Bổ sung khối `Product Backlog` cho các task chưa phân bổ kèm dropdown gán việc tức thì.
- [x] **M6 (Document Management System)**:
  - 5 use cases: Spec đính kèm task, Deliverables nộp sản phẩm nghiệm thu, Tài liệu dự án, Biên bản họp đồng bộ từ M5, Quy chế công ty (`/documents/company`).
  - Hỗ trợ tải tệp đính kèm đa định dạng tới 25MB và quản lý phiên bản tài liệu.
- [x] **M9 (Real-time Notifications & Web Push)**:
  - Thông báo thời gian thực qua Socket.IO và Web Push (VAPID).
  - Chuẩn hóa tiêu đề chuyên nghiệp, loại bỏ hoàn toàn emoji rườm rà.
- [x] **M5.1 (Meeting AI Summary với Gemini 1.5 Flash)**:
  - Backend core: `MeetingAiService`, migration Prisma lưu 7 trường dữ liệu phân tích AI (summary, action items, decisions, key discussions, risks, questions, sentiment).
- [x] **Kiểm thử**: 269 backend tests pass 100%, 85 frontend tests pass 100%, production build 0 lỗi trong 5.48s.

---

## Milestone Tracker & Lộ Trình Phát Triển

| Milestone | Target | Status | Notes |
|-----------|--------|--------|-------|
| **M0: Docs & Setup** | Week 1 | ✅ Completed | Monorepo NestJS + React Vite + PostgreSQL + Prisma |
| **M1: Auth + User** | Week 2 | ✅ Completed | JWT, Google OAuth, RBAC đa vai trò (ADMIN, HR, PM, EMPLOYEE, DEPT_HEAD) |
| **M2: Attendance** | Week 3 | ✅ Completed | GPS Geofence FPT, Multi-office, WFH, Quỹ phép, 365-day Heatmap, Export Excel/PDF |
| **M3: Project & Task** | Week 4-5 | ✅ Completed | Quản lý dự án, Task details chuẩn Linear/Jira, Story points, Giao việc |
| **M4: Kanban Board** | Week 5-6 | ✅ Completed | Kanban kéo thả phân quyền, Board read-only bảo vệ dữ liệu, Personal vs Team tasks |
| **M3.5: Dept Head + Quick Task** | Week 6 | ✅ Completed | Dashboard Trưởng phòng, QuickTask giao việc 1-chạm, 4 workflow types |
| **M3.6: Sprints & Project Hub (Jira)**| Week 6.5 | ✅ Completed | Modal drill-down, PM swap, Burndown Chart, Jira-style Sprint & Task Planning Hub |
| **M5: Meetings & WebRTC** | Week 7 | 🟡 Code Complete (Chờ UAT) | Phòng họp trực tuyến WebRTC, chia sẻ màn hình, nạp dữ liệu biên bản |
| **M5.1: Meeting AI Summary (Gemini)**| Week 7.5 | 🔄 In Progress | Backend core hoàn thành 100%. Tiếp theo: Ráp bộ 4 UI components vào `MeetingReportPage` |
| **M6: Document Management System** | Week 8 | 🟡 Code Complete (Chờ UAT) | Specs, Deliverables, Kho tài liệu, Quy chế công ty, Tiptap editor |
| **M9: Notification & Web Push** | Week 8.5 | 🟡 Code Complete (Chờ UAT) | Socket.IO real-time, VAPID Web Push native, Notification center |
| **M7: Advanced Analytics & Reports** | Week 9-10 | 📋 Kế hoạch tiếp theo | Báo cáo chuyên sâu phòng ban, Heatmap tải công việc, Velocity metrics, Xuất file doanh nghiệp |
| **M10: Testing, UAT & Polish** | Week 11 | 📋 Kế hoạch tiếp theo | UAT nghiệm thu thực tế M5/M6/M9, E2E testing, Tối ưu accessibility WCAG AA |
| **M11: Deployment & Production** | Week 12 | 📋 Kế hoạch tiếp theo | Dockerized deployment, Nginx reverse proxy, CI/CD pipeline |

---

## 🚀 Lộ Trình Phát Triển Còn Lại (Remaining Roadmap)

### 1. Giai đoạn Ưu tiên Ngay (Immediate Next Steps)
- **Module M5.1 (Hoàn thiện Giao diện AI Summary với Gemini 1.5 Flash)**:
  - Triển khai 4 components frontend: `MeetingAiSummaryPanel`, `ActionItemList` (kèm nút tạo Task 1-click), `DecisionList`, `RisksAndQuestionsPanel`.
  - Tích hợp vào `MeetingReportPage` và luồng tự động tạo biên bản họp sau khi kết thúc cuộc họp.
- **Nghiệm thu Thực tế & Hardening (UAT Verification)**:
  - Thử nghiệm thực tế luồng Cuộc họp trực tuyến (M5), Quản lý tài liệu & đính kèm (M6), Thông báo Web Push (M9) cùng người dùng để chốt nghiệm thu kỹ thuật.

### 2. Giai đoạn Mở Rộng Tính Năng (Upcoming Features)
- **Module M7 (Báo cáo & Phân tích chuyên sâu - Advanced Analytics & Reporting)**:
  - Biểu đồ năng suất (Team Velocity & Burnup), Heatmap phân bổ tải công việc toàn phòng ban.
  - Bộ công cụ xuất báo cáo tiến độ Sprint và tổng hợp chấm công định dạng PDF/Excel chuẩn doanh nghiệp.
- **Phase 2 (Mở rộng dài hạn)**:
  - Mobile PWA tối ưu trải nghiệm thiết bị di động.
  - Đồng bộ Google Calendar 2 chiều cho lịch họp.
  - Live Audio Transcription (chuyển giọng nói thành văn bản thời gian thực trong cuộc họp).
  - Multi-tenant enterprise organization.

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
