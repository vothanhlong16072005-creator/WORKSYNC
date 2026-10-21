# ✅ Danh Mục Tính Năng Chi Tiết (Feature List) — WorkSync
> **Phiên bản:** 2.0 (Enterprise Comprehensive) | **Ngày cập nhật:** 21/10/2026  
> **Cấu trúc:** Phân loại theo 5 vai trò (`ADMIN`, `HR`, `DEPARTMENT_HEAD`, `PM`, `EMPLOYEE`) và 9 phân hệ chức năng thực tế.

---

## 👥 Ma Trận Phân Quyền Vai Trò Tổng Quan (RBAC Matrix)

| Phân hệ chức năng | ADMIN | HR | DEPARTMENT_HEAD | PM | EMPLOYEE |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Xác thực & Hồ sơ cá nhân** | Toàn quyền | Toàn quyền | Toàn quyền | Toàn quyền | Toàn quyền |
| **Quản trị người dùng & Phòng ban** | Toàn quyền | Xem/Sửa cơ bản | Xem phòng ban mình | Xem thành viên dự án | Xem hồ sơ công khai |
| **Điểm danh 1-Click (GPS & IP)** | Toàn quyền | Toàn quyền | Tự chấm công | Tự chấm công | Tự chấm công |
| **Phê duyệt WFH / Nghỉ phép / Về sớm / OT** | Toàn quyền | Toàn quyền công ty | Phê duyệt phòng ban | Phê duyệt team dự án | Gửi đơn cá nhân |
| **Tạo dự án nhóm mới** | Có quyền | Không có quyền | **Có quyền** | Không có quyền (chỉ PM lead) | Không có quyền |
| **Hoán đổi PM dự án (`swap-pm`)** | Có quyền | Không có quyền | **Toàn quyền phòng ban** | Không có quyền | Không có quyền |
| **Giao việc nhanh ⚡ QuickTask** | Có quyền | Không có quyền | **Toàn quyền phòng ban** | Giao việc dự án | Nhận việc |
| **Lập kế hoạch Sprint & Backlog (Jira)** | Toàn quyền | Không có quyền | Xem drill-down | **Toàn quyền dự án** | Tham gia thực hiện |
| **Tạo task dự án & Gán Assignee** | Toàn quyền | Không có quyền | **Toàn quyền phòng ban** | **Toàn quyền dự án** | Chỉ tạo task cá nhân |
| **Kéo thả bảng Kanban nhóm** | Có quyền | Không có quyền | Có quyền | Có quyền (Assignee/PM) | Chỉ kéo task của mình |
| **Bảng Kanban cá nhân (`/tasks`)** | Toàn quyền | Toàn quyền | Toàn quyền | Toàn quyền | **Tự do 100%** |
| **Họp trực tuyến WebRTC & Gemini AI** | Toàn quyền | Họp toàn cty/HR | Họp phòng ban | Chủ tọa họp dự án | Tham gia họp |
| **Quản lý Tài liệu ClickUp Docs** | Toàn quyền | Quản lý quy chế | Quản lý tài liệu phòng | Quản lý tài liệu dự án | Xem/Nộp deliverables |
| **Work Calendar (Dời lịch & ICS)** | Toàn quyền | Dời lịch nhân sự | Dời lịch phòng ban | Dời lịch dự án | Dời việc cá nhân / xem |
| **Chat thời gian thực (Socket.IO)** | Toàn hệ thống | Chat toàn hệ thống | Chat 1-1 / Dept / Dự án | Chat 1-1 / Dự án | Chat 1-1 / Team |

---

## 📌 Danh Mục Checklist Chi Tiết Từng Module

### 🔐 F1. Xác Thực & Phân Quyền (Auth & RBAC)
- [x] `POST /api/auth/register` — Đăng ký tài khoản mới kèm tự động tạo dự án cá nhân `PERSONAL` (ALL)
- [x] `POST /api/auth/login` — Đăng nhập trả về JWT Access Token + Refresh Token HttpOnly (ALL)
- [x] `POST /api/auth/google` — Đăng nhập / Đăng ký 1-click với Google OAuth 2.0 (ALL)
- [x] `POST /api/auth/refresh` — Làm mới Access Token ngầm tự động (Silent Refresh) (ALL)
- [x] `POST /api/auth/logout` — Hủy phiên làm việc và xóa cookie (ALL)
- [x] `GET /api/auth/me` — Lấy thông tin tài khoản và quyền hạn hiện tại (ALL)
- [x] `PATCH /api/auth/change-password` — Đổi mật khẩu cá nhân (ALL)

---

### 👤 F2. Quản Lý Người Dùng & Phòng Ban (Users & Departments)

**Quản trị viên (Admin):**
- [x] `GET /api/users` — Danh sách người dùng hệ thống (tìm kiếm, phân trang, lọc phòng ban) (ADMIN, HR, DEPT_HEAD)
- [x] `POST /api/users` — Tạo tài khoản nhân sự mới (ADMIN)
- [x] `GET /api/users/:id` — Chi tiết hồ sơ nhân sự (ALL)
- [x] `PATCH /api/users/:id` — Cập nhật thông tin nhân sự (ADMIN, HR)
- [x] `PATCH /api/users/:id/role` — Cấp phát / Điều chỉnh 5 vai trò hệ thống (ADMIN)
- [x] `PATCH /api/users/:id/status` — Kích hoạt hoặc tạm khóa tài khoản (ADMIN, HR)
- [x] `DELETE /api/users/:id` — Xóa mềm tài khoản (`deletedAt`) (ADMIN)
- [x] `CRUD /api/departments` — Quản trị danh mục phòng ban (ADMIN)

**Nhân viên tự quản:**
- [x] `GET /api/users/profile` — Xem thông tin hồ sơ của chính mình (ALL)
- [x] `PATCH /api/users/profile` — Cập nhật họ tên, vị trí, ảnh đại diện avatar (ALL)
- [x] `PATCH /api/users/language` — Thay đổi ngôn ngữ giao diện `VI` hoặc `EN` (ALL)
- [x] `GET /api/users/assignable` — Lấy danh sách thành viên có thể giao việc (ALL)

---

### ⏰ F3. Điểm Danh Thông Minh & Quản Trị Chuyên Cần (Smart Attendance)

**Điểm danh Check-in / Check-out:**
- [x] `POST /api/attendance/check-in` — Check-in 1-Click: Thẩm định IP Wifi + GPS Geofencing 500m (3 chi nhánh FPT) (ALL)
- [x] `POST /api/attendance/check-out` — Check-out: Tính tổng giờ làm việc và phát hiện về sớm (ALL)
- [x] `GET /api/attendance/today` — Trạng thái chuyên cần hôm nay kèm dải tiến trình Live-ticking (ALL)
- [x] `GET /api/attendance/history` — Lịch sử chấm công cá nhân kèm Bảng nhiệt 365 ngày (ALL)
- [x] `GET /api/attendance/office-presets` — Tọa độ và bán kính các văn phòng FPT Đà Nẵng, Hà Nội, TP.HCM (ALL)

**Đăng ký & Đơn từ:**
- [x] `POST /api/attendance/wfh` — Đăng ký làm việc từ xa (WFH) (ALL)
- [x] `POST /api/attendance/leave-request` — Đăng ký nghỉ phép (ốm, phép năm, không lương) (ALL)
- [x] `GET /api/attendance/leave-balance` — Tra cứu số ngày phép năm còn lại (ALL)
- [x] `POST /api/attendance/early-leave` — Đăng ký về sớm trước 17:30 có lý do chính đáng (ALL)
- [x] `POST /api/attendance/overtime` — Đăng ký làm thêm giờ (OT) chuẩn công thức HRM (ALL)
- [x] `POST /api/attendance/break/start` / `end` — Ghi nhận thời gian ra ngoài và tự động trừ giờ ăn trưa (ALL)
- [x] `GET /api/attendance/requests` — Danh sách các đơn từ đã nộp của cá nhân (ALL)

**Xét duyệt & Quản lý (HR, Trưởng phòng, PM):**
- [x] `GET /api/attendance/approval-queue` — Hàng đợi các đơn từ cần xét duyệt (HR, DEPT_HEAD, PM)
- [x] `PATCH /api/attendance/wfh-requests/:id/approve` / `reject` — Phê duyệt hoặc từ chối WFH (HR, DEPT_HEAD, PM)
- [x] `PATCH /api/attendance/wfh-requests/auto-approve-pending` — Tự động duyệt WFH lúc 09:30 (SYSTEM)
- [x] `PATCH /api/attendance/leave-requests/:id/approve` / `reject` — Phê duyệt đơn nghỉ phép và trừ quỹ phép (HR, DEPT_HEAD)
- [x] `PATCH /api/attendance/early-leave/:id/approve` / `reject` — Duyệt đơn về sớm (HR, DEPT_HEAD, PM)
- [x] `PATCH /api/attendance/overtime/:id/approve` / `reject` — Duyệt đơn làm thêm giờ (HR, DEPT_HEAD, PM)
- [x] `GET /api/attendance/export/excel` — Xuất bảng chấm công định dạng Excel `.xlsx` (HR, ADMIN)
- [x] `GET /api/attendance/export/pdf` — Xuất báo cáo chuyên cần định dạng PDF (HR, ADMIN)

---

### 🗂️ F4. Quản Trị Dự Án & Kế Hoạch Sprint Jira (Projects & Sprints)

**Dự án nhóm & Không gian cá nhân:**
- [x] `GET /api/projects/mine` — Danh sách dự án cá nhân & dự án nhóm tham gia (ALL)
- [x] `POST /api/projects` — Tạo dự án nhóm mới (Giới hạn: Chỉ DEPT_HEAD và ADMIN)
- [x] `GET /api/projects/:id` — Chi tiết dự án, thành viên và thông tin PM Lead (Project Members)
- [x] `PATCH /api/projects/:id` — Cập nhật thông tin dự án, cấu hình mô hình `SCRUM`/`KANBAN`/`DAILY`/`SIMPLE` (PM, DEPT_HEAD, ADMIN)
- [x] `PATCH /api/projects/:id/swap-pm` — Hoán đổi vị trí Project Manager an toàn trong transaction (DEPT_HEAD, ADMIN)
- [x] `POST /api/projects/:id/members` — Thêm thành viên vào dự án nhóm (PM, DEPT_HEAD, ADMIN)
- [x] `DELETE /api/projects/:id/members/:userId` — Xóa thành viên khỏi dự án (PM, DEPT_HEAD, ADMIN)

**Quản lý Sprint Agile (Jira-style):**
- [x] `GET /api/sprints/project/:projectId` — Danh sách Sprint Agile theo chu kỳ kèm thống kê Story Points (Project Members)
- [x] `POST /api/sprints` — Khởi tạo Sprint mới với tên gọi, chu kỳ và mục tiêu (PM, ADMIN)
- [x] `PATCH /api/sprints/:id/start` — Kích hoạt bắt đầu Sprint (PM, ADMIN)
- [x] `PATCH /api/sprints/:id/complete` — Đóng hoàn thành Sprint, tự động hoàn trả task dở dang về Backlog (PM, ADMIN)
- [x] `GET /api/sprints/:id/burndown` — Biểu đồ Burndown Chart tiêu hao Story Points của nhóm theo ngày (Project Members)
- [x] `GET /api/projects/:id/backlog` — Khối Product Backlog chứa các công việc chưa phân bổ (Project Members)
- [x] `CRUD /api/projects/:id/epics` — Quản trị các Epic lớn của dự án (PM, ADMIN)

---

### 📋 F5. Quản Lý Công Việc & Bảng Kanban (Tasks & Kanban)

**Bảng công việc & Tạo việc:**
- [x] `GET /api/tasks?scope=mine` — Danh sách công việc cá nhân và công việc được giao tại tab "Việc của tôi" (ALL)
- [x] `GET /api/tasks?scope=project&projectId=...` — Bảng công việc nhóm của dự án (Project Members)
- [x] `POST /api/tasks` — Tạo công việc mới:
  - Cho phép chọn mục "Việc cá nhân" (mặc định tại `/tasks`) (ALL)
  - Cho phép PM / Trưởng phòng chọn thành viên đội ngũ làm **Người phụ trách (Assignee)** (PM, DEPT_HEAD, ADMIN)
  - Hỗ trợ gán Story Points, Giờ ước tính, Hạn chót, Nhãn tags và Độ ưu tiên (ALL)
- [x] `PATCH /api/tasks/:id/board-position` — Kéo thả thay đổi trạng thái và vị trí cột Kanban nguyên tử (Assignee, PM, Creator)
- [x] `PATCH /api/tasks/:id/status` — Chuyển trạng thái nhanh qua dải tiến trình 5 bước (Assignee, PM, Creator)
- [x] `GET /api/tasks/:id` — Modal chi tiết Task 2 cột chuẩn Linear / Jira Cloud (ALL)
- [x] `PATCH /api/tasks/:id` — Cập nhật thông tin mô tả, deadline, độ ưu tiên (Assignee, PM, Creator)
- [x] `DELETE /api/tasks/:id` — Xóa mềm công việc (`deletedAt`) (PM, Creator, ADMIN)
- [x] Bảng danh sách đồng bộ (Table List View): Bộ lọc nâng cao, tìm kiếm và tính năng ẩn việc đã xong (ALL)
- [x] Hệ thống khung viền nhận diện ưu tiên 4 cấp độ: `URGENT`, `HIGH`, `MEDIUM`, `LOW` (ALL)
- [x] Đa ngôn ngữ (i18n): Song ngữ Tiếng Việt & Tiếng Anh 100% trên toàn bộ giao diện bảng (ALL)

**Trao đổi & Nhật ký công việc:**
- [x] `POST /api/tasks/:id/work-logs` — Ghi nhận số giờ làm việc thực tế (Assignee)
- [x] `GET /api/tasks/:id/work-logs` — Xem nhật ký thời gian của công việc (Project Members)
- [x] `GET /api/tasks/:id/comments` — Tải danh sách bình luận thảo luận (Project Members)
- [x] `POST /api/tasks/:id/comments` — Thêm bình luận mới kèm thả cảm xúc emoji (Project Members)

---

### ⚡ F6. Trưởng Phòng Ban & Giao Việc Nhanh (Department Head & Quick Tasks)
- [x] `DepartmentHeadDashboardLayout` — Giao diện bảng điều khiển chuyên biệt cho Trưởng phòng: Thống kê quân số, tình trạng vắng mặt, tiến độ các dự án trực thuộc (DEPT_HEAD, ADMIN)
- [x] `GET /api/dashboard/department-head` — Tổng hợp số liệu chuyên sâu về hiệu suất phòng ban (DEPT_HEAD, ADMIN)
- [x] `POST /api/quick-tasks` — Nút giao việc nhanh ⚡ `QuickTaskButton`: Giao việc khẩn cấp 1-chạm cho nhân viên không cần tạo dự án (DEPT_HEAD, PM, ADMIN)
- [x] `GET /api/quick-tasks` — Danh sách các công việc giao nhanh gửi đi và nhận được (ALL)
- [x] `PATCH /api/quick-tasks/:id/status` — Cập nhật tiến độ hoàn thành công việc nhanh (Assignee, Assigner)
- [x] `ProjectDetailModal` & `DeptHeadMemberProfileModal` — Bộ modal tra cứu dự án và nhân sự in-place không cần chuyển trang (DEPT_HEAD, ADMIN)

---

### 📹 F7. Cuộc Họp Trực Tuyến & Biên Bản AI (Meetings & Gemini AI)
- [x] `POST /api/meetings` — Lên lịch cuộc họp trực tuyến theo dự án, phòng ban hoặc mời đồng nghiệp tự do (PM, DEPT_HEAD, HR, ADMIN)
- [x] `GET /api/meetings/upcoming` / `past` — Danh sách cuộc họp sắp diễn ra và lịch sử cuộc họp (ALL)
- [x] `POST /api/meetings/:id/rsvp` — Phản hồi lời mời tham gia (`ACCEPTED`, `DECLINED`, `PENDING`) (Attendees)
- [x] **Phòng họp trực tuyến WebRTC chuẩn Google Meet**:
  - Truyền phát âm thanh, video chất lượng cao, chia sẻ màn hình với spotlight presenter (Attendees)
  - Chế độ cửa sổ nổi Picture-in-Picture (PiP) và Chế độ thu nhỏ góc màn hình (`isMinimized`) (Attendees)
  - Bật/Tắt mic, camera, chia sẻ màn hình, drawer danh sách người tham gia (Attendees)
  - Kết thúc cuộc họp ngay lập tức cho tất cả người tham gia (`HostEndMeetingModal`) (Host, PM, ADMIN)
- [x] **Live Speech-to-Text tiếng Việt**:
  - Web Speech API với bộ đệm câu thông minh (`Smart Sentence Buffer`) gom câu hoàn chỉnh theo ngữ nghĩa tiếng Việt (Attendees)
  - Lưu trữ phân mảnh độc lập (`MeetingTranscriptChunk`) loại bỏ race condition khi nhiều người nói (Attendees)
- [x] **Trí tuệ nhân tạo Gemini 1.5 Flash Meeting Intelligence**:
  - `POST /api/meetings/:id/ai-summary/generate` — Tự động phân tích hội thoại cuộc họp (Host, PM, ADMIN)
  - Trích xuất: Tóm tắt điều hành, Quyết định đạt được, Bảng Action Items (kèm nút tạo Task 1-click lên Kanban), Phân tích rủi ro (Host, PM, ADMIN)
  - Cơ chế Multi-Model Fallback tự động chống quá tải dịch vụ (SYSTEM)
- [x] **Báo cáo & Xuất bản chuyên cần**:
  - Nút tải **file Word (.doc)** định dạng chuẩn văn bản hành chính đầy đủ chữ ký xác nhận của Thư ký / Chủ tọa (ALL)
  - Nút xuất **file CSV / Excel** số liệu chuyên cần có UTF-8 BOM (ALL)
  - Tự động xuất biên bản họp sang kho tài liệu ClickUp Docs (`POST /api/meetings/:id/export-doc`) (Host, PM, ADMIN)

---

### 📄 F8. Quản Trị Tri Thức Doanh Nghiệp (Document Management System)
- [x] `POST /api/documents` — Tạo tài liệu mới với trình soạn thảo rich-text Tiptap (ALL)
- [x] `GET /api/documents` — Danh sách tài liệu (lọc theo dự án, phòng ban, cá nhân hoặc công ty) (ALL)
- [x] 5 Phân loại tài liệu chuẩn nghiệp vụ:
  - `TASK_REQUIREMENT` — Tài liệu đặc tả yêu cầu công việc
  - `TASK_SUBMISSION` — Báo cáo nghiệm thu sản phẩm bàn giao (Deliverables)
  - `PROJECT` — Tài liệu thiết kế và kiến trúc dự án
  - `MEETING_MINUTES` — Biên bản cuộc họp đồng bộ từ phân hệ M5
  - `COMPANY_POLICY` — Quy chế, chính sách áp dụng toàn doanh nghiệp (`/documents/company`)
- [x] `POST /api/documents/:id/attachments` — Tải lên tệp đính kèm tài liệu dung lượng tối đa 25MB (Creator, PM)
- [x] `GET /api/documents/:id/versions` — Quản lý lịch sử các phiên bản và khôi phục về phiên bản cũ (ALL)
- [x] `GET /api/documents/search/fulltext` — Tìm kiếm toàn văn thông minh theo tiêu đề và nội dung (ALL)
- [x] `POST /api/documents/:id/ai-summary` — Dùng AI tóm tắt nhanh nội dung tài liệu dài (ALL)

---

### 📅 F9. Lịch Làm Việc Doanh Nghiệp Hợp Nhất (Work Calendar)
- [x] `GET /api/calendar/timeline` — Hợp nhất 6 nguồn dữ liệu: Tasks, Sprints, Meetings, Nghỉ phép, WFH, Làm thêm giờ (ALL)
- [x] Hỗ trợ 3 góc nhìn linh hoạt: Lịch ngày (Day), Lịch tuần (Week), Lịch tháng (Month) (ALL)
- [x] Bộ máy phát hiện xung đột lịch trình (`Conflict Detection Engine`): Trùng giờ họp, dồn task quá hạn, họp trong ngày nghỉ phép (ALL)
- [x] `PATCH /api/calendar/items/:kind/:id/reschedule` — Kéo thả trực tiếp trên lưới lịch để dời ngày làm việc có kiểm tra RBAC (Assignee, Creator, PM)
- [x] `RescheduleConfirmModal` — Hộp thoại xác nhận dời lịch lưu lý do thay đổi (ALL)
- [x] `GET /api/calendar/export` — Xuất toàn bộ lịch trình ra file chuẩn **RFC 5545 iCalendar (`.ics`)** (ALL)

---

### 💬 F10. Trò Chuyện Trực Tuyến & Thông Báo Đa Kênh (Chat & Notifications)
- [x] Kiến trúc Native PostgreSQL + Socket.IO (Namespace `/chat`), vận hành nội bộ bảo mật 100% (ALL)
- [x] `POST /api/chat/conversations/direct/:targetUserId` — Tạo hoặc mở cuộc trò chuyện 1-1 trực tiếp (ALL)
- [x] `POST /api/chat/conversations/project/:projectId` — Nhóm trò chuyện tự động đồng bộ theo dự án (Project Members)
- [x] `POST /api/chat/conversations/department/:departmentId` — Nhóm trò chuyện tự động theo phòng ban (Department Members)
- [x] `GET /api/chat/conversations/:id/messages` — Tải lịch sử tin nhắn kèm reply quote và tệp đính kèm (Conversation Members)
- [x] `POST /api/chat/conversations/:id/messages/file` — Gửi tệp đính kèm an toàn lưu trên ổ đĩa nội bộ `/uploads/chat` (Conversation Members)
- [x] `POST /api/chat/messages/:id/reactions` — Thả cảm xúc emoji tương tác (👍, ❤️, 😂, 🎉, 🚀) (Conversation Members)
- [x] `PATCH /api/chat/conversations/:id/pin` / `mute` — Ghim hội thoại và Bật/Tắt thông báo (Conversation Members)
- [x] Menu ngữ cảnh chuột phải trên Avatar (`ChatContextMenu`): Nhấp chuột phải trên avatar bất kỳ để mở nhanh chat (ALL)
- [x] Thông báo đẩy Web Push native (chuẩn VAPID) và chuông thông báo thời gian thực (ALL)
