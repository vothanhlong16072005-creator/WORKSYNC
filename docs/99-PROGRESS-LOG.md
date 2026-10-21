# 📓 Nhật Ký Tiến Độ Dự Án (Progress Log) — WorkSync
> **Dự án:** WorkSync — Smart Workforce & Enterprise Project Management Platform  
> **Repository:** `vothanhlong16072005-creator/WORKSYNC`  
> **Cập nhật lần cuối:** 21/10/2026

---

## 📌 Bảng Tổng Hợp Trạng Thái Các Mốc Phát Triển (Milestone Tracker)

| Phân hệ (Milestone) | Mục tiêu | Trạng thái kỹ thuật | Ghi chú vận hành thực tế |
| :--- | :---: | :---: | :--- |
| **M0: Setup & Docs** | Week 1 | ✅ Hoàn thành | Monorepo NestJS 10 + React 19 Vite + PostgreSQL 16 + Prisma 5 |
| **M1: Auth & RBAC** | Week 2 | ✅ Hoàn thành | JWT, Google OAuth, 5 Roles (`ADMIN`, `HR`, `DEPT_HEAD`, `PM`, `EMPLOYEE`) |
| **M2: Smart Attendance** | Week 3 | ✅ Hoàn thành | Geofencing 3 cơ sở FPT (500m), WFH, Phép, Về sớm, OT, Bảng nhiệt 365 ngày |
| **M3: Projects & Tasks** | Week 4-5 | ✅ Hoàn thành | Quản lý dự án, Task modal 2 cột Linear, phân định Việc cá nhân vs Dự án |
| **M4: Kanban Board** | Week 5-6 | ✅ Hoàn thành | Bảng Kanban kéo thả atomic, bảo vệ dữ liệu IDOR, Song ngữ VI/EN 100% |
| **M3.5: Dept Head & QuickTask** | Week 6 | ✅ Hoàn thành | Dashboard Trưởng phòng, Nút giao việc nhanh ⚡ QuickTask 1-chạm |
| **M3.6: Sprints Planning (Jira)**| Week 6.5 | ✅ Hoàn thành | Chu kỳ Sprint, Backlog, Biểu đồ Burndown Recharts, Hoán đổi PM (`swap-pm`) |
| **M5: Meetings & WebRTC** | Week 7 | 🟡 Code Complete (Chờ UAT) | Phòng họp WebRTC, Chia sẻ màn hình, Chế độ PiP, Gác máy cho tất cả |
| **M5.1: Live STT & Gemini AI** | Week 7.5 | 🟡 Code Complete (Chờ UAT) | Nhận diện giọng nói tiếng Việt, Gemini 1.5 Flash tóm tắt & tạo Action Items |
| **M5.2: Google Meet & Reports** | Week 7.8 | 🟡 Code Complete (Chờ UAT) | Giao diện Google Meet, Xuất biên bản Word (.doc), Xuất số liệu CSV |
| **M6: ClickUp Docs** | Week 8 | 🟡 Code Complete (Chờ UAT) | 5 Use cases tài liệu, Rich-text Tiptap, Quản lý phiên bản, Đính kèm 25MB |
| **M8: Work Calendar** | Week 8.5 | ✅ Hoàn thành | Lịch hợp nhất 6 nguồn, Phát hiện xung đột, Kéo thả dời lịch, Xuất `.ics` |
| **M9: Real-Time Chat** | Week 9 | ✅ Hoàn thành | Socket.IO native 1-1, Nhóm dự án, Nhóm phòng ban, Emoji, Web Push VAPID |
| **Polish & Typography** | 21/10/2026 | ✅ Hoàn thành | Khắc phục phông Plus Jakarta Sans, Song ngữ Kanban, PM gán Assignee |

---

## 📅 Lịch Sử Chi Tiết Các Mốc Phát Triển Gần Nhất

### 2026-10-21 — Sửa Lỗi Phông Chữ Tiếng Việt, Song Ngữ Toàn Diện & Giao Việc PM
- **Khắc phục lỗi phông chữ "VIỆC CỦA TÔI"**:
  - Gỡ bỏ `--font-display` chứa các phông hẹp thiếu Unicode dấu tiếng Việt (`Haettenschweiler`, `Impact`).
  - Nhúng Google Fonts quốc tế `Plus Jakarta Sans` và `Inter` có subset `vietnamese`.
  - Tinh chỉnh `.kanban-title` chuẩn Bauhaus Enterprise thanh lịch, 100% không vỡ chữ.
- **Bản địa hóa Song ngữ (i18n) hoàn chỉnh cho Kanban**:
  - Bổ sung hơn 40 keys dịch thuật trong `vi.json` và `en.json`.
  - Toàn bộ Header, Kicker, KPI cards, Toolbar tìm kiếm, Sort dropdown, Table view headers, Quick status, Board columns và Task cards tự động chuyển ngữ khi chọn `VI` hoặc `EN`.
  - Định dạng ngày tháng (`formatDate`, `getDeadlineInfo`) theo chuẩn quốc tế tương ứng.
- **Khởi tạo và ưu tiên Mục "Việc cá nhân"**:
  - Chạy script idempotent `ensure-personal-projects.ts` cấp phát dự án `PERSONAL` cho 19 tài khoản database.
  - Cập nhật `projects.service.ts` hàm `findMine` tự động tạo dự án cá nhân nếu chưa có (self-healing).
  - Khi mở modal tạo việc tại `/tasks`, hệ thống tự động đưa và chọn "Việc cá nhân" lên đầu tiên.
- **Tính năng chọn Người phụ trách (Assignee) cho PM**:
  - Mở rộng `api-client.ts` nhận `assigneeId`, `dueDate`, `storyPoints`, `timeEstimate`.
  - Modal tạo việc hỗ trợ dropdown chọn bất kỳ thành viên nào trong dự án nhóm đối với PM/Admin/Trưởng phòng; khóa ở chế độ "Tôi" khi tạo việc cá nhân.
- **Kiểm thử**: Backend 311/311 tests pass (100%), Frontend 106/106 tests pass (100%), Build production 0 lỗi.

---

### 2026-10-20 — Phân Hệ Trò Chuyện Trực Tuyến Native Socket.IO (Module M9)
- **Kiến trúc Native PostgreSQL + Socket.IO**:
  - Vận hành nội bộ độc lập không phụ thuộc Firebase, bảo mật 100% dữ liệu doanh nghiệp.
  - Các bảng CSDL mới: `Conversation`, `ConversationMember`, `ChatMessage`, `ChatMessageReaction`.
  - Hỗ trợ 3 phân loại hội thoại: Trực tiếp 1-1 (`DIRECT`), Nhóm theo dự án (`PROJECT`), Nhóm theo phòng ban (`DEPARTMENT`).
- **Trải nghiệm tương tác cao**:
  - Chỉ báo đang gõ (`typing indicator`), trạng thái trực tuyến (`online/offline presence`), đánh dấu đã đọc (`read receipt`).
  - Tải lên tệp đính kèm an toàn lưu trữ trên ổ đĩa nội bộ (`/uploads/chat`), giới hạn 25MB, hỗ trợ xem trước ảnh Lightbox.
  - Thả cảm xúc emoji tương tác (`ChatMessageReaction`) với các biểu tượng phổ biến (👍, ❤️, 😂, 🎉, 🚀).
  - Ghim hội thoại quan trọng lên đầu (`togglePin`) và Bật/tắt thông báo cuộc trò chuyện (`toggleMute`).
- **Menu chuột phải nhanh trên Avatar toàn hệ thống (`ChatContextMenu`)**:
  - Cho phép nhấp chuột phải vào bất kỳ avatar người dùng nào trên bảng Kanban, dự án hoặc tài liệu để mở nhanh cuộc trò chuyện.
- **Giao diện chuẩn Bauhaus**: Khung chat 2 cột responsive, hỗ trợ Drawer trên di động, đa ngôn ngữ VI/EN 100%.

---

### 2026-10-20 — Lịch Làm Việc Doanh Nghiệp Hợp Nhất (Module M8 Work Calendar)
- **Hợp nhất 6 nguồn dữ liệu**: Tasks, Sprints, Meetings, LeaveRequests (Phép năm), WfhRequests, OvertimeRequests vào 1 timeline duy nhất.
- **3 Chế độ xem & 3 Scopes**: Xem Ngày (Day), Tuần (Week), Tháng (Month). Scopes: Cá nhân (`mine`), Phòng ban (`department`), Toàn công ty (`company`).
- **Bộ máy phát hiện xung đột (`Conflict Detection Engine`)**: Tự động phát hiện trùng giờ họp, dồn ứ task quá hạn và họp trong ngày nghỉ phép; hiển thị thanh Alert banner đỏ nhấp nháy.
- **Kéo thả dời lịch (Drag-drop Reschedule) & RBAC**: Kéo thả trực tiếp trên timeline HTML5 native; chỉ Người tạo hoặc Assignee/PM/Admin mới có quyền dời lịch; modal xác nhận lưu lý do dời lịch.
- **Xuất lịch RFC 5545 iCalendar (`.ics`)**: Hỗ trợ tải file `.ics` tương thích Google Calendar, Apple Calendar, Outlook.

---

### 2026-10-19 & 2026-10-20 — Cuộc Họp Trực Tuyến Chuẩn Google Meet & AI Summary (M5, M5.1, M5.2)
- **Trải nghiệm Google Meet nâng cao**:
  - Tách riêng stream webcam và chia sẻ màn hình, spotlight người trình chiếu, dừng toàn bộ tracks (`.stop()`) khi rời họp.
  - Chế độ cửa sổ nổi Picture-in-Picture (PiP) và Chế độ thu nhỏ nội bộ (`isMinimized`).
  - Hộp thoại kết thúc cuộc họp cho tất cả người tham gia (`HostEndMeetingModal`).
- **Live Speech-to-Text & Gemini 1.5 Flash AI**:
  - Web Speech API với bộ đệm câu thông minh (`Smart Sentence Buffer`) gom câu hoàn chỉnh theo ngữ nghĩa tiếng Việt.
  - Phân mảnh lưu trữ độc lập (`MeetingTranscriptChunk`) loại bỏ race condition khi nhiều người nói cùng lúc.
  - Prompt Gemini 1.5 Flash trích xuất: Tóm tắt tổng quan, Quyết định đạt được, Bảng Action Items (kèm nút tạo Task 1-click lên Kanban), Phân tích rủi ro.
- **Báo cáo chuyên cần & Xuất bản**:
  - Nút tải **file Word (.doc)** định dạng văn bản hành chính đầy đủ chữ ký xác nhận của Thư ký / Chủ tọa.
  - Nút xuất **file CSV / Excel** số liệu chuyên cần có UTF-8 BOM.
  - Tự động xuất biên bản sang hệ thống tài liệu ClickUp Docs.

---

### 2026-10-18 — Kế Hoạch Sprint Chuẩn Jira, Backlog & Trưởng Phòng (M3.5, M3.6)
- **Quản lý Sprint Agile chuẩn Jira (`ProjectSprintsView`)**:
  - Thẻ Sprint theo chu kỳ, thanh tiến độ % và Story Points.
  - Checkbox hoàn thành công việc một chạm, cảnh báo đỏ khi quá hạn.
  - Khối Product Backlog cho các task chưa phân bổ kèm dropdown gán việc tức thì.
- **Trưởng phòng ban & Hoán đổi PM (`swap-pm`)**:
  - Dashboard Trưởng phòng: Drill-down dự án, sprint, nhân sự và rủi ro phòng ban.
  - Endpoint `PATCH /api/projects/:id/swap-pm` đổi PM dự án nguyên tử trong transaction.
  - Nút giao việc nhanh ⚡ `QuickTaskButton`: Giao việc 1-chạm không cần qua bước tạo dự án phức tạp.

---

### 2026-10-11 đến 2026-10-14 — Điểm Danh Thông Minh & Bảng Nhiệt 365 Ngày (M2)
- Tích hợp Geofencing 500m với 3 chi nhánh thực tế FPT Software (Đà Nẵng, Hà Nội, TP.HCM), tự động phát hiện chi nhánh gần nhất.
- Bản đồ tương tác Leaflet OpenStreetMap hiển thị vùng Geofence, avatar marker và animated polyline.
- Khai báo và xét duyệt: WFH (tự động duyệt sau 9:30), Nghỉ phép (trừ quỹ phép), Về sớm trước 17:30, Làm thêm giờ (OT), Nghỉ trưa.
- Bảng nhiệt chuyên cần 365 ngày (Calendar Heatmap) GitHub-style, biểu đồ thống kê Recharts và nút xuất file Excel/PDF.

---

## 🎯 Tổng Kết Chỉ Số Chất Lượng Hiện Tại (Quality Metrics)
- **Tổng số bài test tự động**: **417 tests pass 100%** (311 tests Backend + 106 tests Frontend).
- **TypeScript Compilation**: Hoàn tất 0 lỗi, 0 cảnh báo (`tsc -b && vite build` hoàn tất trong 4.68s).
- **Cơ sở dữ liệu**: 37 models, 26 enums được định nghĩa toàn vẹn trong Prisma Schema.
- **Git Repository**: Đã đồng bộ mã nguồn sạch sẽ trên nhánh `main`.
