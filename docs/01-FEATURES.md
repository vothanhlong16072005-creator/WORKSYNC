# ✅ Danh Mục Tính Năng Chi Tiết (Feature List) — WorkSync
> **Phiên bản:** 2.0 (Enterprise Updated) | **Ngày cập nhật:** 21/10/2026  
> **Cấu trúc phân quyền:** Phân theo 5 vai trò hệ thống (`ADMIN`, `HR`, `DEPARTMENT_HEAD`, `PM`, `EMPLOYEE`) và 9 phân hệ chức năng lõi đã triển khai trong thực tế.

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

## 📌 Danh Mục Chi Tiết 9 Phân Hệ Chức Năng Đã Triển Khai

### 🔐 F1. Xác Thực, Hồ Sơ & Phân Quyền (Auth & Users)
- [x] `POST /api/auth/register` — Đăng ký tài khoản mới kèm tự động cấp phát Dự án cá nhân (`PERSONAL`).
- [x] `POST /api/auth/login` — Đăng nhập bằng email/password, trả về Access Token JWT và Refresh Token HttpOnly.
- [x] `POST /api/auth/google` — Đăng nhập / Đăng ký nhanh qua Google OAuth 2.0 (Idempotent user & project creation).
- [x] `POST /api/auth/refresh` — Quay vòng Refresh Token tự động ngầm dưới client (Silent Refresh).
- [x] `POST /api/auth/logout` — Đăng xuất, hủy phiên làm việc và xóa cookie.
- [x] `GET /api/auth/me` — Lấy thông tin hồ sơ và quyền hạn của người dùng hiện tại.
- [x] `PATCH /api/users/profile` — Cập nhật thông tin cá nhân, chức danh, ảnh đại diện và tùy chọn ngôn ngữ (`VI`/`EN`).
- [x] `GET /api/users` — Danh sách người dùng hệ thống (có tìm kiếm, phân trang và lọc theo phòng ban).
- [x] `GET /api/users/assignable` — Danh sách thành viên có thể giao việc trong phạm vi dự án hoặc phòng ban.
- [x] `CRUD /api/departments` — Quản trị danh mục phòng ban trực thuộc doanh nghiệp (Dành cho Admin).

---

### ⏰ F2. Điểm Danh Thông Minh & Quản Trị Chuyên Cần (Smart Attendance)
- [x] `POST /api/attendance/check-in` — Điểm danh 1-Click: Gửi tọa độ GPS + IP Public, tự động phát hiện chi nhánh FPT gần nhất (Đà Nẵng, Hà Nội, TP.HCM) và xác thực Geofence 500m.
- [x] `POST /api/attendance/check-out` — Điểm danh ra về: Tự động tính toán số giờ làm việc thực tế, phân loại đúng giờ hoặc về sớm.
- [x] `GET /api/attendance/today` — Trạng thái chuyên cần hôm nay kèm dải tiến trình Live-ticking và định vị bản đồ OpenStreetMap Leaflet.
- [x] `GET /api/attendance/my-history` — Lịch sử điểm danh cá nhân kèm Bảng nhiệt (Calendar Heatmap) 365 ngày GitHub-style.
- [x] `POST /api/attendance/wfh-request` — Đăng ký làm việc từ xa (WFH) kèm cơ chế tự động duyệt nếu quá 09:30.
- [x] `POST /api/attendance/leave-request` — Đăng ký nghỉ phép (Nghỉ ốm, phép năm, không lương) kèm trừ quỹ phép tự động trong transaction.
- [x] `POST /api/attendance/early-leave-request` — Đăng ký về sớm có lý do chính đáng trước 17:30.
- [x] `POST /api/attendance/overtime-request` — Đăng ký làm thêm giờ (OT) với công thức tính giờ chuẩn HRM.
- [x] `POST /api/attendance/break-log` — Ghi nhận thời gian ra ngoài tạm thời và tự động trừ giờ nghỉ trưa (12:00 – 13:00).
- [x] `GET /api/attendance/approval-queue` — Hàng đợi xét duyệt đơn từ dành cho HR, Trưởng phòng và PM.
- [x] `PATCH /api/attendance/approve-request` / `reject-request` — Phê duyệt hoặc từ chối đơn có lưu lý do và gửi thông báo tức thì.
- [x] `GET /api/attendance/export/excel` / `export/pdf` — Xuất báo cáo chuyên cần doanh nghiệp định dạng Excel và PDF.

---

### 🗂️ F3. Quản Trị Dự Án & Kế Hoạch Sprint Chuẩn Jira (Projects & Sprints)
- [x] `GET /api/projects/mine` — Danh sách dự án người dùng tham gia kèm huy hiệu đếm công việc mở.
- [x] `POST /api/projects` — Tạo dự án nhóm mới (Giới hạn bảo mật: Chỉ Trưởng phòng `DEPARTMENT_HEAD` và `ADMIN`).
- [x] `GET /api/projects/:id` — Chi tiết dự án, thành viên, tiến độ KPI và thông tin PM Lead.
- [x] `PATCH /api/projects/:id` — Cập nhật thông tin dự án, cấu hình mô hình làm việc (`SCRUM`, `KANBAN`, `DAILY`, `SIMPLE`).
- [x] `PATCH /api/projects/:id/swap-pm` — Hoán đổi vị trí PM dự án an toàn trong database transaction (Quyền Trưởng phòng).
- [x] `POST /api/projects/:id/members` — Thêm thành viên vào dự án nhóm kèm phân định vai trò dự án.
- [x] `GET /api/sprints/project/:projectId` — Danh sách Sprint Agile theo chu kỳ kèm thống kê Story Points và tỷ lệ hoàn thành.
- [x] `POST /api/sprints` — Khởi tạo Sprint mới với tên gọi, mục tiêu, ngày bắt đầu và ngày kết thúc.
- [x] `PATCH /api/sprints/:id/start` / `complete` — Kích hoạt bắt đầu hoặc đóng Sprint (tự động chuyển việc dở dang về Backlog).
- [x] `GET /api/sprints/:id/burndown` — Biểu đồ Burndown Chart trực quan hóa năng suất tiêu hao Story Points của nhóm theo ngày.
- [x] `GET /api/projects/:id/backlog` — Danh mục Product Backlog chứa các yêu cầu công việc chưa phân bổ vào Sprint.

---

### 📋 F4. Bảng Công Việc Kanban & Chi Tiết Nhiệm Vụ Linear (Tasks & Kanban)
- [x] `GET /api/tasks?scope=mine|project` — Tải danh sách công việc theo 2 góc nhìn: Việc của tôi (cá nhân + được giao) và Dự án nhóm.
- [x] `POST /api/tasks` — Tạo công việc mới:
  - Cho phép chọn mục **"Việc cá nhân"** (mặc định tại `/tasks`).
  - Cho phép PM / Trưởng phòng chọn thành viên đội ngũ làm **Người phụ trách (Assignee)** kèm gửi thông báo tức thì.
  - Thiết lập Story Points, Giờ ước lượng, Hạn chót, Nhãn phân loại và Mức độ ưu tiên.
- [x] `PATCH /api/tasks/:id/board-position` — Kéo thả thay đổi trạng thái và vị trí thẻ task với kiểm soát quyền hạn (RBAC) chống IDOR.
- [x] `PATCH /api/tasks/:id/status` — Chuyển trạng thái công việc nhanh qua dropdown hoặc dải tiến trình workflow 5 bước.
- [x] `GET /api/tasks/:id` — Modal chi tiết Task 2 cột chuẩn Linear / Jira Cloud:
  - Cột chính: Tiêu đề, Dải tiến trình trạng thái, Mô tả định dạng rich-text, Nhãn tags.
  - Cột thông số: Người phụ trách, Người tạo, Hạn chót cảnh báo màu, Giờ ước tính, Giờ thực tế, Story Points, Sprint.
- [x] Bảng danh sách đồng bộ (Table View): Hỗ trợ sắp xếp theo hạn chót/ưu tiên/ngày tạo, bộ lọc nhãn/mức độ và tính năng ẩn việc đã xong.
- [x] Hệ thống khung viền nhận diện ưu tiên 4 cấp độ: `URGENT` (đỏ rực), `HIGH` (cam), `MEDIUM` (xanh lam), `LOW` (xám).
- [x] Hỗ trợ Đa ngôn ngữ (i18n): Song ngữ Tiếng Việt và English 100% trên toàn bộ giao diện bảng và thẻ.

---

### ⚡ F5. Trưởng Phòng Ban & Giao Việc Nhanh (Department Head & Quick Tasks)
- [x] `DepartmentHeadDashboardLayout` — Giao diện bảng điều khiển riêng biệt dành riêng cho Trưởng phòng: Thống kê quân số, tình trạng vắng mặt, danh sách dự án trực thuộc và cảnh báo rủi ro.
- [x] `GET /api/dept-head/overview` — Tổng hợp số liệu chuyên sâu về tỷ lệ hoàn thành dự án và tiến độ Sprint trong phòng ban.
- [x] `POST /api/quick-tasks` — Nút giao việc nhanh ⚡ `QuickTaskButton`: Tạo và giao việc khẩn cấp cho bất kỳ nhân viên nào trong phòng ban chỉ với 1-chạm.
- [x] `GET /api/quick-tasks` — Danh sách các công việc giao nhanh, theo dõi trạng thái phản hồi và mức độ khẩn cấp.
- [x] `PATCH /api/quick-tasks/:id/status` — Người được giao cập nhật trạng thái thực hiện công việc nhanh.
- [x] `ProjectDetailModal` & `DeptHeadMemberProfileModal` — Bộ modal tra cứu thông tin dự án và nhân viên in-place không cần chuyển trang.

---

### 📹 F6. Cuộc Họp Trực Tuyến & Biên Bản Thông Minh AI (Meetings & Gemini AI)
- [x] `POST /api/meetings` — Khởi tạo cuộc họp trực tuyến theo dự án, phòng ban hoặc mời đồng nghiệp tự do.
- [x] `GET /api/meetings/upcoming` / `past` — Danh sách cuộc họp sắp diễn ra và lịch sử các cuộc họp đã kết thúc.
- [x] `POST /api/meetings/:id/rsvp` — Phản hồi lời mời tham gia cuộc họp (`ACCEPTED`, `DECLINED`, `PENDING`).
- [x] **Phòng họp trực tuyến WebRTC chuẩn Google Meet**:
  - Truyền phát âm thanh, video chất lượng cao, chia sẻ màn hình với spotlight presenter.
  - Chế độ cửa sổ nổi Picture-in-Picture (PiP) và thu nhỏ góc màn hình (`isMinimized`).
  - Bộ điều khiển nổi kính mờ bo tròn, drawer danh sách người tham gia và trạng thái mic/cam.
  - Kết thúc cuộc họp tức thời cho tất cả người tham gia (`HostEndMeetingModal`).
- [x] **Live Speech-to-Text tiếng Việt**:
  - Tích hợp Web Speech API với bộ đệm câu thông minh (`Smart Sentence Buffer`) gom câu hoàn chỉnh theo ngữ nghĩa.
  - Lưu trữ phân mảnh độc lập (`MeetingTranscriptChunk`) loại bỏ race condition khi nhiều người nói cùng lúc.
- [x] **Trí tuệ nhân tạo Gemini 1.5 Flash Meeting Intelligence**:
  - `POST /api/meetings/:id/ai-summary/generate` — Tự động phân tích toàn bộ cuộc họp.
  - Trích xuất: Tóm tắt điều hành, Quyết định đạt được, Bảng Action Items (kèm người nhận & nút tạo Task 1-click lên Kanban), Phân tích rủi ro.
  - Cơ chế tự động thử lại đa mô hình (Multi-Model Fallback) chống quá tải dịch vụ.
- [x] **Báo cáo & Xuất bản chuyên cần**:
  - Xuất biên bản cuộc họp ra **file Word (.doc)** định dạng chuẩn văn bản hành chính doanh nghiệp.
  - Xuất số liệu chuyên cần ra **file CSV / Excel** có UTF-8 BOM.
  - Tự động xuất biên bản sang hệ thống tài liệu ClickUp Docs (`POST /api/meetings/:id/export-doc`).

---

### 📄 F7. Quản Trị Tri Thức Doanh Nghiệp (Document Management System)
- [x] `POST /api/documents` — Khởi tạo tài liệu mới với trình soạn thảo rich-text Tiptap.
- [x] `GET /api/documents` — Danh sách tài liệu đa phạm vi: Cá nhân, Dự án, Phòng ban, Toàn công ty.
- [x] 5 Phân loại tài liệu chuẩn nghiệp vụ:
  - `TASK_REQUIREMENT` — Tài liệu đặc tả yêu cầu công việc.
  - `TASK_SUBMISSION` — Báo cáo kết quả / sản phẩm bàn giao nghiệm thu task (Deliverables).
  - `PROJECT` — Tài liệu thiết kế và kiến trúc dự án.
  - `MEETING_MINUTES` — Biên bản cuộc họp đồng bộ từ phân hệ M5.
  - `COMPANY_POLICY` — Quy chế, chính sách và cẩm nang doanh nghiệp (`/documents/company`).
- [x] `POST /api/documents/:id/attachments` — Tải tệp đính kèm đa định dạng hỗ trợ dung lượng lên tới 25MB.
- [x] `GET /api/documents/:id/versions` — Quản lý lịch sử các phiên bản tài liệu và khôi phục về phiên bản cũ.
- [x] `GET /api/documents/search/fulltext` — Tìm kiếm toàn văn thông minh theo tiêu đề và nội dung tài liệu.
- [x] `POST /api/documents/:id/ai-summary` — Dùng AI tóm tắt nhanh nội dung tài liệu dài.

---

### 📅 F8. Lịch Làm Việc Doanh Nghiệp Hợp Nhất (Work Calendar)
- [x] `GET /api/calendar/timeline` — Hợp nhất 6 luồng dữ liệu thời gian: Tasks, Sprints, Meetings, Nghỉ phép, WFH, Làm thêm giờ (OT).
- [x] Hỗ trợ 3 chế độ xem linh hoạt: Lịch ngày (Day), Lịch tuần (Week), Lịch tháng (Month).
- [x] Bộ máy phát hiện xung đột lịch trình (`Conflict Detection Engine`):
  - `meeting_overlap` — Trùng lặp giờ giữa 2 cuộc họp.
  - `overdue_overload` — Dồn ứ quá tải các công việc quá hạn trong cùng một ngày.
  - `leave_during_meeting` — Xếp lịch họp vào ngày nhân sự đang nghỉ phép.
- [x] `PATCH /api/calendar/items/:kind/:id/reschedule` — Kéo thả trực tiếp trên lưới lịch để dời ngày làm việc có kiểm tra quyền hạn (Assignee/Creator/PM/Admin).
- [x] `RescheduleConfirmModal` — Hộp thoại xác nhận dời lịch hiển thị thời gian cũ -> mới và lý do thay đổi.
- [x] `GET /api/calendar/export` — Xuất toàn bộ lịch trình ra file chuẩn **RFC 5545 iCalendar (`.ics`)** tương thích Google Calendar, Outlook và Apple Calendar.

---

### 💬 F9. Trò Chuyện Trực Tuyến & Thông Báo Đa Kênh (Chat & Notifications)
- [x] Kiến trúc Native PostgreSQL + NestJS Socket.IO (Namespace `/chat`), độc lập và bảo mật 100%.
- [x] `POST /api/chat/conversations/direct/:targetUserId` — Tạo hoặc mở cuộc trò chuyện trực tiếp 1-1.
- [x] `POST /api/chat/conversations/project/:projectId` — Nhóm trò chuyện tự động đồng bộ theo thành viên dự án.
- [x] `POST /api/chat/conversations/department/:departmentId` — Nhóm trò chuyện tự động theo phòng ban.
- [x] `GET /api/chat/conversations/:id/messages` — Tải lịch sử tin nhắn kèm tin nhắn trích dẫn (reply quote) và tệp đính kèm.
- [x] `POST /api/chat/conversations/:id/messages/file` — Tải lên tệp đính kèm an toàn lưu trữ trên ổ đĩa nội bộ (`/uploads/chat`).
- [x] `POST /api/chat/messages/:messageId/reactions` — Thả cảm xúc emoji tương tác (👍, ❤️, 😂, 🎉, 🚀) và đồng bộ real-time.
- [x] `PATCH /api/chat/conversations/:id/pin` / `mute` — Ghim hội thoại quan trọng lên đầu và Bật/Tắt thông báo cuộc trò chuyện.
- [x] Menu ngữ cảnh chuột phải trên Avatar (`ChatContextMenu`): Nhấp chuột phải vào bất kỳ avatar người dùng nào trên bảng Kanban, dự án hoặc tài liệu để mở nhanh cuộc trò chuyện.
- [x] Thông báo đẩy Web Push native (chuẩn VAPID) và chuông thông báo thời gian thực với phân loại chuyên nghiệp, không dùng emoji thô.
