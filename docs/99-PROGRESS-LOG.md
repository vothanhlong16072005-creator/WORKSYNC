# 📓 Nhật Ký Tiến Độ Dự Án Toàn Diện (Full Progress Log) — WorkSync
> **Dự án:** WorkSync — Smart Workforce & Enterprise Project Management Platform  
> **Repository:** `vothanhlong16072005-creator/WORKSYNC`  
> **Cập nhật lần cuối:** 21/10/2026  
> **Ghi chú:** Lưu trữ trọn vẹn 100% nhật ký công việc từ ngày khởi động dự án đến hiện tại phục vụ viết Báo cáo thực tập & Đồ án tốt nghiệp.

---

## 📌 Bảng Tổng Hợp Trạng Thái Các Mốc Phát Triển (Milestone Tracker)

| Milestone | Target | Status | Notes |
| :--- | :---: | :---: | :--- |
| **M0: Docs & Setup** | Week 1 | ✅ Hoàn thành | Monorepo NestJS 10 + React 19 Vite + PostgreSQL 16 + Prisma 5 |
| **M1: Auth & User** | Week 2 | ✅ Hoàn thành | JWT, Google OAuth, 5 Roles (`ADMIN`, `HR`, `DEPT_HEAD`, `PM`, `EMPLOYEE`) |
| **M2: Attendance** | Week 3 | ✅ Hoàn thành | GPS Geofence FPT 3 chi nhánh, WFH, Quỹ phép, Về sớm, OT, Bảng nhiệt 365 ngày |
| **M3: Project & Task** | Week 4-5 | ✅ Hoàn thành | Quản lý dự án, Task details chuẩn Linear/Jira, Story points, Giao việc |
| **M4: Kanban Board** | Week 5-6 | ✅ Hoàn thành | Kanban kéo thả atomic, Board read-only bảo vệ dữ liệu, Personal vs Team tasks |
| **M3.5: Dept Head & QuickTask** | Week 6 | ✅ Hoàn thành | Dashboard Trưởng phòng, QuickTask giao việc 1-chạm, 4 workflow types |
| **M3.6: Sprints & Backlog (Jira)**| Week 6.5 | ✅ Hoàn thành | Modal drill-down, PM swap, Burndown Chart, Jira-style Sprint Planning Hub |
| **M5: Meetings & WebRTC** | Week 7 | 🟡 Code Complete (Chờ UAT) | Phòng họp trực tuyến WebRTC, chia sẻ màn hình, nạp dữ liệu biên bản |
| **M5.1: Live STT & Gemini AI** | Week 7.5 | 🟡 Code Complete (Chờ UAT) | Nhận diện giọng nói tiếng Việt, Gemini 1.5 Flash meeting intelligence |
| **M5.2: Google Meet & Reports** | Week 7.8 | 🟡 Code Complete (Chờ UAT) | Trải nghiệm Google Meet, Xuất biên bản Word (.doc), Xuất số liệu CSV |
| **M6: Document Management System** | Week 8 | 🟡 Code Complete (Chờ UAT) | Specs, Deliverables, Kho tài liệu, Quy chế công ty, Tiptap editor |
| **M8: Work Calendar** | Week 8.5 | ✅ Hoàn thành | Timeline hợp nhất 6 nguồn, Phát hiện xung đột, Kéo thả dời lịch, Xuất `.ics` |
| **M9: Real-time Chat** | Week 9 | ✅ Hoàn thành | Socket.IO native 1-1, Nhóm dự án, Nhóm phòng ban, Emoji, Web Push VAPID |
| **Typography & Bilingual Polish** | 21/10/2026 | ✅ Hoàn thành | Google Fonts Plus Jakarta Sans / Inter, Song ngữ Kanban, PM gán Assignee |

---

## 2026-10-04 — Khởi Động Dự Án & Thiết Lập Bộ Tài Liệu Ban Đầu

### ✅ Hoàn thành
- [x] Tạo file mô tả dự án `MO_TA_DU_AN.md` — đầy đủ 6 sections bối cảnh thực tế FPT Software Đà Nẵng.
- [x] Tạo bộ docs khởi tạo đầy đủ trong `docs/`:
  - `docs/00-PRD.md` — Product Requirements Document ban đầu.
  - `docs/01-FEATURES.md` — Feature list MVP vs Phase 2.
  - `docs/02-API-CONTRACT.md` — API Contract sơ bộ các modules.
  - `docs/03-DATABASE.md` — Database schema 28 tables + ERD ban đầu.
  - `docs/04-DESIGN-LINKS.md` — Design tokens, wireframes ASCII, UI guidelines.
  - `docs/05-TECH-STACK.md` — Tech decisions + project structure.
  - `docs/06-STYLE-GUIDE.md` — Coding conventions cho team + AI agents.
  - `docs/99-PROGRESS-LOG.md` — File nhật ký tiến độ này.
  - `.cursor/rules/project.mdc` — AI development rules.

---

## 2026-10-10 — Phân Định Personal Kanban & Project Kanban

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

## 2026-10-11 — Thiết Kế Task Detail Linear, Khung Ưu Tiên & Đa Ngôn Ngữ (i18n)

### ✅ Hoàn thành
- [x] Gỡ bỏ hardcoded CSS border, tạo hệ thống 4 lớp CSS màu khung viền thể hiện rõ mức độ ưu tiên (`URGENT` đỏ rực rỡ, `HIGH` cam đậm, `MEDIUM` xanh sky, `LOW` xám trang nhã).
- [x] Lột xác Modal Chi tiết Task thành giao diện 2 cột chuẩn Enterprise SaaS (Linear / Jira Cloud), dải tiến trình trạng thái tương tác nhanh 5 bước, bảng thuộc tính tinh tế (Assignee, Reporter, Deadline cảnh báo, Giờ ước tính, Giờ thực tế, Story Points, Dự án, Sprint).
- [x] Tích hợp hệ thống Đa ngôn ngữ (i18n) với `i18next` + `react-i18next`, chuẩn bị sẵn từ điển `vi.json` và `en.json`, hỗ trợ nút chuyển đổi 1-click (🇻🇳 VI / 🇬🇧 EN) tức thì trên thanh Header mà không cần reload trang.
- [x] Cập nhật `.agents/memory/ACTIVE_CONTEXT.md` và `.agents/memory/DECISION_LOG.md` (ADR-002, ADR-003).
- [x] Toàn bộ hệ thống frontend và backend kiểm tra kiểu nghiêm ngặt và build xanh 100%.

---

## 2026-10-11 & 2026-10-12 — Executive Dashboard, Design System v2 & Chấm Công M2

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

## 2026-10-14 — Chấm Công Nâng Cao (Giai Đoạn 2), Đa Chi Nhánh & Seed Data

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

---

## 2026-10-17 — Module M3.5: Trưởng Phòng Ban & Giao Việc Nhanh (QuickTask)
- [x] **Database & Prisma Schema**: Thêm role `DEPARTMENT_HEAD`, bổ sung trường `pmId` và `workflowType` (SCRUM/KANBAN/DAILY/SIMPLE) vào `Project`, mở rộng `Sprint` và tạo model `QuickTask`.
- [x] **Backend**: Tạo module `QuickTaskModule` (6 REST endpoints), phương thức `UsersService.findByDepartmentOrMine()` và siết chặt phân quyền RBAC cho Trưởng phòng.
- [x] **Frontend**: Nút ⚡ `QuickTaskButton` trên header, modal giao việc nhanh `QuickTaskModal`, trang `/quick-tasks`, và layout dashboard riêng biệt cho Trưởng phòng `DepartmentHeadDashboardLayout`.
- [x] **Kiểm thử**: 24 test files backend (187 tests pass) và 5 test files frontend (47 tests pass).

---

## 2026-10-18 — Module M3.6: Kế Hoạch Sprint Chuẩn Jira, Backlog & Hoán Đổi PM
- [x] **Department Head Dashboard Drill-Down & PM Swap**:
  - Backend: Endpoint `PATCH /api/projects/:id/swap-pm` cho phép Trưởng phòng đổi PM trong transaction atomic an toàn; bộ 3 API drill-down `/dept-head/project/:id`, `/dept-head/sprint/:id`, `/dept-head/member/:id`.
  - Frontend: Bộ modal in-place chuẩn Bauhaus: `ProjectDetailModal`, `SwapPmModal`, `SprintManagementModal` (biểu đồ Burndown Recharts + bảng đóng góp thành viên), `DeptHeadMemberProfileModal`, `QuickTaskDetailModal`.
- [x] **Project Sprints & Task Planning Hub (Jira-style)**:
  - Khắc phục lỗi React Hook order violation trong `ProjectDetailPage.tsx`.
  - Xây dựng component `ProjectSprintsView`: Thẻ Sprint dạng khối theo chu kỳ, thanh tiến độ % và SP, bảng danh sách công việc bên dưới với checkbox hoàn thành một chạm, người được giao, độ ưu tiên, hạn chót báo đỏ khi quá hạn, điểm Story Points.
  - Tích hợp nút `+ Tạo Sprint Mới` và `+ Thêm Công Việc` trực tiếp tại từng Sprint.
  - Bổ sung khối `Product Backlog` cho các task chưa phân bổ kèm dropdown gán việc tức thì.

---

## 2026-10-19 — Module M5.1 & M6: Nhận Diện Giọng Nói STT, Gemini AI & Quản Trị Tài Liệu
- [x] **M5.1 (Live Speech Streaming & Gemini 1.5 Flash Meeting Intelligence)**:
  - Kiến trúc Live Speech: Web Speech API (`vi-VN`) kết hợp Watchdog auto-restart stream câu thoại qua Socket.IO lên backend.
  - Lưu trữ phân mảnh độc lập (`MeetingTranscriptChunk`) loại bỏ race condition khi nhiều người nói cùng lúc.
  - Participant Attribution: Đưa danh sách Attendees vào prompt Gemini 1.5 Flash để trích xuất chính xác `assigneeId` cho từng Action Item.
  - Cơ chế Multi-Model Fallback tự động chống quá tải dịch vụ.
- [x] **M6 (Document Management System — ClickUp Docs)**:
  - 5 use cases: Spec đính kèm task, Deliverables nộp sản phẩm nghiệm thu, Tài liệu dự án, Biên bản họp đồng bộ từ M5, Quy chế công ty (`/documents/company`).
  - Hỗ trợ tải tệp đính kèm đa định dạng tới 25MB và quản lý phiên bản tài liệu (`DocumentVersion`).

---

## 2026-10-20 — M5.2, M8 & M9: Google Meet UI, Lịch Hợp Nhất & Chat Real-Time Socket.IO
- [x] **M5.2 (Trải nghiệm Google Meet & Báo Cáo Chuyên Cần)**:
  - Khắc phục triệt để chia sẻ màn hình: Tách riêng `localScreenVideoRef` và `localVideoRef`, gắn vào khung spotlight `object-contain bg-slate-950`; dừng media tracks khi rời họp.
  - Sửa lỗi nút kết thúc cuộc gọi trên Mini Floating Call widget qua `createPortal`.
  - Nâng cấp Báo cáo cuộc họp: Bổ sung nút **Tải file Word (.doc)** chuẩn văn bản hành chính; nâng cấp xuất **CSV / Excel** có UTF-8 BOM.
- [x] **M8 (Work Calendar Timeline Hợp Nhất 6 Nguồn)**:
  - Hợp nhất 6 nguồn: Tasks, Sprints, Meetings, Nghỉ phép, WFH, Làm thêm giờ (OT).
  - 3 Chế độ xem: Ngày, Tuần, Tháng. Scopes: Cá nhân, Phòng ban, Toàn công ty.
  - Bộ máy phát hiện xung đột (`Conflict Detection Engine`): Trùng giờ họp, dồn task quá hạn, họp trong ngày nghỉ phép.
  - Kéo thả dời lịch có RBAC bảo vệ và xuất lịch chuẩn **RFC 5545 iCalendar (`.ics`)**.
- [x] **M9 (Trò Chuyện Trực Tuyến Native Socket.IO)**:
  - Vận hành nội bộ trên nền PostgreSQL và NestJS Socket.IO: Hội thoại 1-1, Nhóm dự án, Nhóm phòng ban.
  - Typing indicator, presence tracking, read receipts, đính kèm file 25MB, emoji reactions (👍, ❤️, 😂, 🎉, 🚀), reply quote, ghim và tắt thông báo.
  - Menu chuột phải trên Avatar toàn hệ thống (`ChatContextMenu`).

---

## 2026-10-21 — Sửa Lỗi Phông Chữ Tiếng Việt, Song Ngữ Toàn Diện & Phân Quyền PM Giao Việc
- [x] **Khắc phục lỗi phông chữ "VIỆC CỦA TÔI"**:
  - Gỡ bỏ `--font-display` chứa `Haettenschweiler` và `Impact` thiếu glyph dấu tiếng Việt.
  - Nhúng Google Fonts quốc tế `Plus Jakarta Sans` (weights 500-800) và `Inter` (weights 400-700) có subset `vietnamese`.
  - Tinh chỉnh `.kanban-title` chuẩn Bauhaus Enterprise hiện đại, loại bỏ hoàn toàn hiện tượng vỡ chữ.
- [x] **Bản địa hóa Song ngữ (i18n) hoàn chỉnh cho Kanban**:
  - Bổ sung hơn 40 keys dịch thuật trong `vi.json` và `en.json`.
  - Header, Kicker, KPI cards, Toolbar, Sắp xếp, Table view, Cột Board và Task cards đồng bộ song ngữ 100%.
  - Tự động bản địa hóa ngày tháng và thời hạn (`formatDate`, `getDeadlineInfo`) theo ngôn ngữ hiện hành.
- [x] **Đồng bộ Mục "Việc cá nhân"**:
  - Chạy script idempotent `ensure-personal-projects.ts` cấp phát dự án `PERSONAL` cho 19 tài khoản database.
  - Hàm `findMine` tự động tạo dự án cá nhân nếu chưa có (self-healing chống null).
  - Mặc định ưu tiên chọn "Việc cá nhân" khi tạo việc tại `/tasks`.
- [x] **Phân quyền Giao việc (Assignee) cho PM**:
  - Mở rộng `api-client.ts` nhận `assigneeId`, `dueDate`, `storyPoints`, `timeEstimate`.
  - Modal tạo việc hỗ trợ dropdown chọn thành viên đội ngũ đối với PM/Admin/Trưởng phòng.
- [x] **Kiểm thử tự động & Đóng gói**:
  - Backend: 35 test files, 311/311 tests pass 100%.
  - Frontend: 27 test files, 106/106 tests pass 100%.
  - TypeScript build hoàn tất 0 lỗi trong 4.68s.
