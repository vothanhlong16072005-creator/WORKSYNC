# 📋 Product Requirements Document (PRD)
# WorkSync — Nền Tảng Quản Lý Công Việc, Dự Án & Điểm Danh Doanh Nghiệp Toàn Diện

> **Phiên bản:** 2.0 (Enterprise Updated) | **Ngày cập nhật:** 21/10/2026 | **Trạng thái:** Triển khai thực tế & Hoàn thiện nghiệm thu  
> **Repository:** `vothanhlong16072005-creator/WORKSYNC`  
> ⚠️ **Lưu ý kiểm thử:** Module Cuộc họp trực tuyến (M5) đã hoàn thiện 100% về mặt lập trình và test unit/build, hiện đang trong quá trình nghiệm thu kiểm thử UAT đa thiết bị trước khi đưa vào sản xuất.

---

## 1. Tổng Quan Dự Án

### 1.1. Tên sản phẩm
**WorkSync** — Smart Workforce & Enterprise Project Management Platform.

### 1.2. Bối cảnh & Mục tiêu kinh doanh
Hệ thống được nghiên cứu và xây dựng dựa trên nhu cầu vận hành thực tế tại các doanh nghiệp công nghệ thông tin (điển hình như mô hình tại **FPT Software Đà Nẵng**), giải quyết triệt để sự phân mảnh giữa các công cụ chấm công, giao việc, họp trực tuyến, lịch biểu và quản lý tài liệu:

1. **Số hóa điểm danh thông minh (Smart Attendance)**: Thay thế hoàn toàn máy chấm công vân tay/thẻ từ truyền thống bằng cơ chế 1-Click tích hợp xác thực kép qua dải IP Wifi mạng nội bộ và GPS Geofencing đa chi nhánh (FPT Complex Đà Nẵng, FPT Tower Hà Nội, FPT Tân Thuận TP.HCM); tự động hóa quy trình xin nghỉ phép, WFH, về sớm và làm thêm giờ (OT).
2. **Quản lý công việc & Dự án phân tầng (Agile/Scrum & Linear-style)**: Tách bạch rõ ràng giữa Không gian việc cá nhân (`PERSONAL`) và Dự án đội ngũ (`TEAM`). Quản lý Sprint dạng chu kỳ chuẩn Jira, Product Backlog, bảng Kanban kéo thả thông minh và giao việc nhanh 1-chạm (`QuickTask`).
3. **Phòng họp trực tuyến & Biên bản AI (Google Meet-like & Gemini AI)**: Tích hợp phòng họp WebRTC đa bên, chia sẻ màn hình, nhận diện giọng nói tiếng Việt thời gian thực (Live STT), tự động sinh biên bản tóm tắt qua Google Gemini 1.5 Flash và xuất báo cáo Word/CSV chuẩn văn bản hành chính.
4. **Không gian tri thức doanh nghiệp (ClickUp Docs-style)**: Quản lý tài liệu đa cấp, lưu trữ tài liệu đặc tả task, nộp sản phẩm nghiệm thu (Deliverables), quản lý phiên bản (Version History) và kho quy chế công ty với giới hạn tải tệp tới 25MB.
5. **Hợp nhất lịch trình làm việc (Work Calendar Timeline)**: Gom tụ 6 nguồn dữ liệu (Tasks, Sprints, Meetings, Leave, WFH, Overtime) lên cùng một dòng thời gian trực quan, phát hiện xung đột lịch trình tự động và hỗ trợ dời lịch kéo thả có phân quyền RBAC.
6. **Mạng lưới giao tiếp nội bộ an toàn (Native Real-time Chat)**: Vận hành nội bộ độc lập trên nền PostgreSQL và NestJS Socket.IO, hỗ trợ hội thoại 1-1, nhóm dự án, nhóm phòng ban, chia sẻ tệp tin và thả cảm xúc emoji.

---

### 1.3. Hệ Thống 5 Vai Trò Người Dùng (5 Enterprise Roles)

Khác với thiết kế sơ khai ban đầu chỉ có 4 roles, hệ thống thực tế đã chuẩn hóa đầy đủ **5 vai trò phân cấp nghiệp vụ**:

| Vai trò (Role) | Mã hệ thống | Trách nhiệm & Quyền hạn thực tế |
| :--- | :--- | :--- |
| **Quản trị viên hệ thống** | `ADMIN` | Toàn quyền kiểm soát hệ thống: Quản lý người dùng, phân bổ phòng ban, cấu hình IP/GPS văn phòng, cài đặt hệ thống và theo dõi sức khỏe ứng dụng. |
| **Quản lý Nhân sự** | `HR` | Quản trị chuyên cần: Giám sát bảng chấm công toàn công ty, thiết lập chỉ tiêu giờ làm, phê duyệt đơn nghỉ phép/WFH/OT, xuất báo cáo nhân sự Excel/PDF. |
| **Trưởng phòng ban** | `DEPARTMENT_HEAD` | **(Bổ sung thực tế)**: Quản lý toàn diện nhân sự & dự án trực thuộc phòng: Phê duyệt đơn từ thành viên, hoán đổi Project Manager (`swap-pm`), giao việc nhanh đa năng (`QuickTask`), drill-down theo dõi hiệu suất dự án/sprint/nhân viên trên Dashboard riêng. |
| **Quản lý Dự án** | `PM` | Quản trị vòng đời dự án: Lập kế hoạch Sprint (Jira-style), gán Story Points, phân bổ Assignee cho thành viên trong dự án nhóm, điều phối cuộc họp dự án, duyệt đơn WFH/OT của thành viên dự án. |
| **Nhân viên / Thành viên** | `EMPLOYEE` | Developer, Designer, Tester, BA: Check-in/out GPS & IP, quản lý bảng Kanban cá nhân, cập nhật tiến độ công việc được giao, nộp tài liệu nghiệm thu, tham gia họp trực tuyến và trò chuyện nội bộ. |

---

### 1.4. Phạm Vi Hệ Thống Hoàn Thành Thực Tế (Implemented Scope)

#### Nằm trong phạm vi đã triển khai (100% Code Complete):
1. **Module M1 — Auth & RBAC**: Đăng nhập/Đăng ký JWT, Refresh Token silent rotation, Google OAuth, phân quyền RBAC nghiêm ngặt 5 vai trò.
2. **Module M2 — Smart Attendance**: 1-Click check-in/out, Geofencing đa chi nhánh (Hà Nội, Đà Nẵng, TP.HCM), bản đồ Leaflet OpenStreetMap, đăng ký WFH/Nghỉ phép/Về sớm/OT, Calendar Heatmap 365 ngày, xuất Excel/PDF.
3. **Module M3 & M4 — Projects & Kanban**: Phân tách dự án Cá nhân (`PERSONAL`) và Dự án nhóm (`TEAM`), Modal chi tiết Task 2 cột chuẩn Linear, hệ thống thẻ ưu tiên 4 cấp độ, bảng Kanban kéo thả an toàn chống IDOR, hỗ trợ song ngữ VI/EN 100%.
4. **Module M3.5 & M3.6 — Dept Head & Sprint Planning Hub**: Giao việc nhanh 1-chạm (`QuickTask`), hoán đổi PM dự án nguyên tử, điều phối Sprint Agile theo chu kỳ chuẩn Jira, Product Backlog, biểu đồ Burndown Chart Recharts.
5. **Module M5 & M5.1 & M5.2 — Meetings & Gemini AI**: Phòng họp trực tuyến WebRTC, chia sẻ màn hình, nhận diện giọng nói tiếng Việt thời gian thực (STT), Gemini 1.5 Flash meeting intelligence trích xuất Action Items/Decisions, chat trong cuộc họp, xuất biên bản Word (.doc) và CSV.
6. **Module M6 — Document Management System**: Rich-text Tiptap editor, cây tài liệu đa cấp, quản lý phiên bản (Versions), đính kèm tệp tin 25MB, tài liệu quy chế công ty.
7. **Module M8 — Work Calendar**: Lịch làm việc hợp nhất 6 nguồn dữ liệu, chế độ Ngày/Tuần/Tháng, phát hiện xung đột lịch trình thông minh, kéo thả dời lịch có RBAC, xuất file iCalendar (`.ics`).
8. **Module M9 — Real-time Chat & Web Push**: Chat trực tuyến Socket.IO Native nội bộ (1-1, Dự án, Phòng ban), đính kèm file, thả cảm xúc emoji, menu ngữ cảnh chuột phải trên avatar toàn hệ thống, Web Push Notifications (VAPID).

---

## 2. Các Nhóm Tính Năng Chi Tiết (Chi Tiết 9 Phân Hệ Lõi)

### F1. Xác thực, Hồ sơ & Phân quyền RBAC
- Đăng nhập JWT Access Token (15m) + Refresh Token (7 ngày trong Cookie an toàn).
- Hỗ trợ Google OAuth 2.0 tích hợp tự động cấp phát tài khoản cá nhân.
- Tự động tạo Dự án cá nhân (`PERSONAL`) ngay khi khởi tạo tài khoản (Idempotent Provisioning).
- Ma trận phân quyền 5 Roles kiểm soát tại cả Controller Guards (Backend) và PermissionGuard (Frontend).

### F2. Điểm danh Thông minh & Quản trị Chuyên cần
- Xác thực vị trí Geofencing 500m với 3 văn phòng thực tế: FPT Complex Đà Nẵng, FPT Tower Cầu Giấy, FPT Tân Thuận Q7.
- Tự động nhận diện chi nhánh gần nhất dựa trên tọa độ GPS người dùng.
- Thẩm định IP Public mạng Wifi nội bộ, chống giả mạo tọa độ.
- Quản lý toàn diện: Đơn nghỉ phép (Leave Balance), Đơn làm từ xa (WFH), Đơn về sớm (Early Leave), Đơn tăng ca (Overtime), Nhật ký nghỉ trưa (Break Log).
- Trực quan hóa dữ liệu: Bảng nhiệt GitHub-style 365 ngày, biểu đồ cột số giờ làm 30 ngày, xuất báo cáo bảng chấm công định dạng Excel và PDF.

### F3. Quản lý Dự án, Backlog & Sprint Planning (Jira-style)
- Hỗ trợ 4 mô hình quy trình: `SCRUM`, `KANBAN`, `DAILY`, `SIMPLE`.
- Quản lý Sprint chu kỳ: Điểm Story Points, mục tiêu Sprint, thanh tiến độ % hoàn thành, biểu đồ Burndown Chart.
- Quản lý Backlog: Khối công việc tồn đọng chưa gán Sprint, dropdown kéo/chuyển việc vào Sprint đang chạy tức thì.
- Phân bổ người phụ trách: PM/Admin/Dept Head có quyền gán bất kỳ thành viên dự án nào làm Assignee khi tạo task.

### F4. Bảng Công Việc Kanban & Linear Task Details
- 2 Không gian làm việc: Tab "Việc của tôi" (`/tasks` - quản lý công việc cá nhân & công việc được giao) và Tab "Dự án nhóm" (`/projects/:id/tasks`).
- Bảng Kanban 5 cột: Cần làm (TODO) -> Đang làm (IN_PROGRESS) -> Đánh giá (IN_REVIEW) -> Bị chặn (BLOCKED) -> Hoàn thành (DONE).
- Chế độ danh sách (Table View) đồng bộ hóa với đầy đủ bộ lọc theo nhãn, độ ưu tiên, thành viên và tìm kiếm từ khóa.
- Modal chi tiết Task chuẩn Linear: Dải tiến trình trạng thái tương tác nhanh, bảng thông số thuộc tính (Assignee, Reporter, Deadline, Estimates, SP, Sprint).
- Cơ chế kéo thả an toàn: Chặn kéo thả tùy tiện trên bảng nhóm đối với thành viên không có thẩm quyền (Read-only mode).

### F5. Trưởng Phòng Ban & Giao Việc Nhanh (QuickTask)
- Dashboard chuyên biệt cho Trưởng phòng: Tổng quan nhân sự phòng ban, danh sách dự án trực thuộc, tình trạng chấm công và tiến độ sprint.
- Hoán đổi PM nguyên tử (`swap-pm`): Cho phép Trưởng phòng bàn giao quyền PM cho kỹ sư khác an toàn trong transaction.
- Nút giao việc nhanh ⚡ `QuickTask`: Tạo việc tức thời cho bất kỳ nhân viên nào trong phòng ban kèm deadline và độ ưu tiên mà không cần tạo dự án phức tạp.

### F6. Phòng Họp Trực Tuyến & Trí Tuệ Nhân Tạo (Gemini 1.5 Flash)
- Phòng họp WebRTC tích hợp sẵn: Truyền video, âm thanh, chia sẻ màn hình chất lượng cao mà không cần cài đặt phần mềm bên ngoài.
- Live Speech-to-Text: Nhận diện giọng nói tiếng Việt thời gian thực, lưu trữ độc lập từng đoạn thoại (`MeetingTranscriptChunk`) chống xung đột.
- Gemini 1.5 Flash AI Engine: Tự động phân tích hội thoại, trích xuất tóm tắt tổng quan, quyết định đã thống nhất, bảng Action Items (kèm nút tạo Task 1-click lên Kanban) và nhận diện rủi ro.
- Xuất biên bản cuộc họp đa định dạng: Tải file Word (`.doc`) định dạng chuẩn văn bản hành chính và file CSV số liệu chuyên cần.
- Tiện ích chuẩn Google Meet: Picture-in-Picture (PiP), chế độ thu nhỏ góc màn hình, drawer danh sách người tham gia, chat đính kèm file trong phòng họp.

### F7. Quản Trị Tri Thức Doanh Nghiệp (ClickUp Docs-style)
- Trình soạn thảo Rich-Text Tiptap hiện đại hỗ trợ định dạng chuyên sâu.
- Phân loại 5 use case tài liệu: Đặc tả yêu cầu task, Nộp sản phẩm nghiệm thu, Tài liệu kỹ thuật dự án, Biên bản họp tự động xuất từ M5, và Kho quy chế toàn công ty (`/documents/company`).
- Hỗ trợ tải tệp đính kèm đa phương tiện lên tới 25MB, quản lý lịch sử phiên bản (`DocumentVersion`) và khôi phục phiên bản cũ.

### F8. Lịch Làm Việc Doanh Nghiệp Hợp Nhất (Work Calendar)
- Hợp nhất 6 luồng dữ liệu thời gian: Tasks, Sprints, Meetings, Nghỉ phép, WFH, Làm thêm giờ lên một giao diện lịch duy nhất.
- Hỗ trợ 3 góc nhìn: Lịch ngày (Day), Lịch tuần (Week), Lịch tháng (Month).
- Bộ máy phát hiện xung đột (`Conflict Detection Engine`): Cảnh báo trùng giờ họp, dồn ứ task quá hạn và họp trong ngày nghỉ phép.
- Kéo thả dời lịch HTML5 native có kiểm tra quyền hạn chặt chẽ (RBAC) và modal xác nhận.
- Xuất lịch chuẩn quốc tế RFC 5545 iCalendar (`.ics`) tương thích Google Calendar, Outlook và Apple Calendar.

### F9. Trò Chuyện Trực Tuyến & Thông Báo Đa Kênh
- Kiến trúc Native PostgreSQL + Socket.IO: Vận hành nội bộ độc lập, bảo mật dữ liệu tuyệt đối.
- 3 loại hình hội thoại: Trò chuyện 1-1 (`DIRECT`), Nhóm theo dự án (`PROJECT`), Nhóm theo phòng ban (`DEPARTMENT`).
- Trải nghiệm tương tác cao: Báo hiệu đang gõ (Typing indicator), trạng thái online/offline, đánh dấu đã đọc, thả cảm xúc emoji, trích dẫn trả lời, gửi tệp tin đính kèm.
- Menu chuột phải toàn hệ thống (`ChatContextMenu`): Nhấp chuột phải vào avatar bất kỳ để mở nhanh cuộc trò chuyện.
- Thông báo đẩy Web Push native (chuẩn VAPID) và trung tâm thông báo thời gian thực.

---

## 3. Chỉ Số Chất Lượng & Mục Tiêu Kỹ Thuật (KPIs & Metrics)

| Chỉ số | Mục tiêu cam kết | Kết quả thực tế đạt được |
| :--- | :--- | :--- |
| **Độ phủ Unit Test (Backend)** | >= 80% | **35 test files / 311 unit tests PASS 100%** |
| **Độ phủ Unit Test (Frontend)** | >= 80% | **27 test files / 106 unit tests PASS 100%** |
| **Độ tin cậy Type-checking** | Zero `any` (Strict TS) | **Vite build & tsc -b: 0 lỗi, 0 cảnh báo** |
| **Thời gian phản hồi API (P95)** | <= 300ms | Đạt trung bình 45ms - 120ms (nhờ Redis cache & Prisma indexing) |
| **Thời gian Check-in 1-Click** | <= 3 giây | Hoàn tất trong 1.2s (tính cả thẩm định tọa độ GPS & IP) |
| **Tốc độ AI Gemini Meeting Summary**| <= 10 giây | Phản hồi trung bình 2.8s - 4.5s qua Google Generative AI Cloud |
| **Hỗ trợ Đa ngôn ngữ** | 100% VI & EN | Bản địa hóa hoàn chỉnh qua `i18next` cho toàn bộ giao diện |

---

## 4. Yêu Cầu Phi Chức Năng (Non-Functional Requirements)

1. **Bảo mật & Kiểm soát truy cập**:
   - Mật khẩu mã hóa bcrypt cost factor 10.
   - Access Token JWT 15 phút, Refresh Token quay vòng trong HttpOnly Cookie.
   - Bảo vệ chống IDOR: Toàn bộ thao tác Task, Project, Document, Attendance đều kiểm tra quyền sở hữu hoặc tư cách thành viên.
2. **Kiến trúc & Tính ổn định**:
   - Thiết kế Clean Architecture, tách biệt Controller, Service, Repository (Prisma).
   - Mọi thao tác cập nhật nhiều bảng sử dụng Database Transaction nguyên tử (`$transaction`).
3. **Thẩm mỹ & Trải nghiệm Người dùng (UI/UX)**:
   - Áp dụng triệt để phong cách **Bauhaus Enterprise Modern**: Tông sáng thanh lịch, độ tương phản đạt chuẩn WCAG AA, bo góc mềm mại `rounded-2xl`, loại bỏ hoàn toàn biểu tượng emoji thô trên nút bấm.
   - Bộ phông chữ chuyên nghiệp quốc tế: **Plus Jakarta Sans** (tiêu đề, thẻ) và **Inter** (nội dung, bảng số liệu), hỗ trợ hiển thị tiếng Việt hoàn hảo không lỗi phông.

---

## 5. Quy Tắc Nghiệp Vụ Chuẩn (Business Rules)

- **Múi giờ hệ thống**: `Asia/Ho_Chi_Minh` (GMT+7) cho toàn bộ việc tính toán thời gian check-in, hạn chót và lịch trình.
- **Khung giờ chấm công**: Khung giờ check-in chuẩn: 06:00 – 12:00. Check-out chuẩn: 11:00 – 22:00. Check-out trước 17:30 yêu cầu đơn Về sớm (`EarlyLeaveRequest`).
- **Phân quyền tạo việc**: Nhân viên (`EMPLOYEE`) chỉ được tạo task trong Dự án cá nhân (`PERSONAL`). Chỉ PM, Trưởng phòng và Admin mới có quyền tạo task trong Dự án nhóm (`TEAM`) và chỉ định Assignee cho thành viên.
- **Quyền hạn tạo dự án**: Chỉ Trưởng phòng (`DEPARTMENT_HEAD`) và Admin mới có quyền tạo Dự án nhóm mới.
- **Xóa mềm (Soft Delete)**: Tất cả thực thể quan trọng đều áp dụng trường `deletedAt`, nghiêm cấm xóa vĩnh viễn khỏi CSDL vật lý.
