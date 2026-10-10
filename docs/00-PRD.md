# 📋 Product Requirements Document (PRD)
# WorkSync — Hệ thống Quản lý Dự án & Điểm danh Thông minh

> **Phiên bản:** 1.0 | **Ngày tạo:** 2026-10-04 | **Trạng thái:** Draft

---

## 1. Tổng quan dự án

### 1.1. Tên sản phẩm
**WorkSync** — Smart Workforce & Project Management Platform

### 1.2. Mục tiêu kinh doanh

WorkSync là một nền tảng web (PWA) quản lý toàn diện hoạt động nội bộ doanh nghiệp phần mềm, xây dựng dựa trên quan sát thực tế tại **FPT Software Đà Nẵng**. Mục tiêu:

1. **Số hóa điểm danh** — Thay thế máy chấm công vật lý bằng hệ thống 1-click tích hợp IP Wifi & GPS Geofencing.
2. **Tập trung quản lý dự án** — Hệ thống tích hợp đầy đủ theo phong cách ClickUp (multi-view, custom fields, time tracking).
3. **Tối ưu hóa cuộc họp** — Tích hợp họp online (video call, screen share), ghi biên bản và tóm tắt AI tự động.
4. **Quản lý tài liệu thông minh** — Rich-text docs với nested structure, version history và AI summary (ClickUp Docs-style).
5. **Giảm overhead báo cáo** — AI tự động tổng hợp báo cáo cuối ngày từ work log.

### 1.3. Đối tượng người dùng

| Nhóm | Mô tả | Số lượng ước tính |
|------|-------|-------------------|
| **System Admin** | IT Admin / CTO — cấu hình hệ thống toàn bộ | 1-3 người |
| **HR Manager** | Quản lý nhân sự, chấm công, ngày phép | 2-5 người |
| **Project Manager (PM)** | Quản lý dự án, sprint, phân công task | 5-15 người |
| **Employee** | Developer, Designer, Tester, BA — người dùng chính hàng ngày | 50-200 người |

> ❌ **Không có role Viewer** — Đã bỏ khỏi scope dự án.

### 1.4. Phạm vi hệ thống

**Nằm trong scope (MVP):**
- Web app (PWA) chạy trên PC và Mobile browser
- Điểm danh 1-Click tích hợp IP Wifi & GPS Geofencing
- Quản lý dự án theo phong cách ClickUp (List, Board, Calendar, Gantt, Timeline views)
- Họp online tích hợp (video call, screen share) như Google Meet — WebRTC
- Quản lý tài liệu dạng rich-text như ClickUp Docs + AI summary
- AI tóm tắt cuộc họp và gợi ý báo cáo cuối ngày (Google Gemini)
- Thông báo real-time (WebSocket + Email)
- Xuất báo cáo PDF/Excel

**Ngoài scope (Phase 2+):**
- Mobile native app (iOS/Android)
- ESP32 RFID hardware
- AI ghi âm tự động (chỉ text-based)
- Billing / Tính lương tự động

---

## 2. Tính năng MVP (7 nhóm chức năng cốt lõi)

### F1. Xác thực & Phân quyền
- Đăng nhập / Đăng ký bằng email + password
- JWT Access Token (15 phút) + Refresh Token (7 ngày, HttpOnly cookie)
- Silent refresh tự động — người dùng không bị logout đột ngột
- 4 Roles: ADMIN / HR / PM / EMPLOYEE
- Role-based access control (RBAC) cho toàn bộ API và UI route

### F2. Điểm danh Thông minh (Smart Attendance)
- Check-in 1-Click: Gửi IP Public + GPS lên server, tự động xác thực
- IP Validation: So sánh với dải IP Wifi văn phòng (Admin cấu hình)
- GPS Geofencing: Kiểm tra trong bán kính <= 100m từ tọa độ văn phòng
- WFH Management: Khai báo WFH -> HR/PM phê duyệt -> tự động duyệt sau 9:30 nếu chưa xử lý
- 7 trạng thái: ON_TIME / LATE / VERY_LATE / WFH / BUSINESS_TRIP / ABSENT_APPROVED / ABSENT_UNAPPROVED

### F3. Quản lý Dự án & Task (ClickUp-style)
- CRUD: Project, Sprint (Agile/Scrum), Epic, Task, Sub-task
- 5 Views: Kanban Board (drag & drop), List View, Calendar View, Gantt Chart, Timeline View
- Task fields đầy đủ: priority, story points, time estimate, time tracked, label, assignee, attachment, dependency
- Work Log: ghi nhận thời gian thực tế làm việc
- Comment với @mention, reaction emoji
- Custom fields per project (dropdown, text, number, date, checkbox)
- Kanban workflow: TO DO -> IN PROGRESS -> IN REVIEW -> BLOCKED -> DONE

### F4. Cuộc họp Online & AI Tóm tắt
- Tạo phòng họp: PM tạo meeting với agenda, participants, gửi invitation tự động
- Video call tích hợp: WebRTC-based (video, audio, screen share) — không cần app ngoài
- Ghi biên bản real-time: Editor trong app trong khi họp
- AI Tóm tắt (Google Gemini): Tóm tắt -> 3 ngôn ngữ (VI/EN/KO), trích xuất action items -> tự tạo Task
- Xuất biên bản ra PDF/Word

### F5. Quản lý Tài liệu (ClickUp Docs-style)
- Rich-text editor: heading, bold, italic, code block, table, checklist, image embed
- Nested documents: Doc -> Sub-doc (cây thư mục không giới hạn độ sâu)
- Version history: Lưu lịch sử chỉnh sửa, so sánh version, rollback
- AI Summary: Tóm tắt nội dung tài liệu dài bằng Gemini AI
- Quyền truy cập: Public (toàn team) / Private (chỉ người tạo) / Shared (chọn người)
- Link to task: Liên kết tài liệu với task/project cụ thể

### F6. Báo cáo & Dashboard
- Employee Daily Report: Nhắc nhở 16:30, AI tự điền từ work log, Employee review & gửi
- PM Dashboard: Burndown chart, Velocity, Task distribution, Team performance
- HR Dashboard: Bảng chấm công, thống kê đi muộn/WFH/vắng mặt, ngày phép còn lại
- Admin Dashboard: Thống kê toàn công ty, system health, active users
- Xuất Excel/PDF cho tất cả báo cáo

### F7. Thông báo Real-time
- In-app notification qua WebSocket (Socket.IO) — hiển thị tức thì
- Email notification cho sự kiện quan trọng (meeting invite, task assign)
- Push notification nhắc nhở check-in, báo cáo, deadline task sắp đến
- Notification center: lịch sử thông báo, đánh dấu đã đọc, xóa

---

## 3. KPIs & Success Metrics

| Metric | Target |
|--------|--------|
| Tỉ lệ check-in thành công qua IP/GPS | >= 95% |
| Thời gian check-in (end-to-end) | <= 3 giây |
| API response time (P95) | <= 500ms |
| Uptime hệ thống | >= 99.5% |
| Thời gian tải trang (LCP) | <= 2 giây |
| AI Summary accuracy (user rating >= 4/5) | >= 80% |
| Employee adoption rate sau 1 tháng | >= 70% |
| Lighthouse PWA score | >= 80 |

---

## 4. Non-functional Requirements

| Yêu cầu | Chi tiết |
|---------|----------|
| Performance | API response <= 500ms (P95), DB query <= 100ms |
| Security | OWASP Top 10, bcrypt cost 10, JWT secret 64+ chars, CORS strict |
| Scalability | Hỗ trợ 500 concurrent users, horizontal scale với Docker |
| Accessibility | WCAG AA 2.1 — contrast ratio >= 4.5:1, keyboard nav, ARIA |
| Internationalization | Tiếng Việt (mặc định), Tiếng Anh, Tiếng Hàn (i18next) |
| PWA | Offline cache cơ bản, installable, Lighthouse PWA >= 80 |
| Browser Support | Chrome 120+, Firefox 120+, Safari 17+, Edge 120+ |
| Audit Trail | Mọi action ghi log với timestamp, userId, IP, action |

---

## 5. Business Rules

- Múi giờ: GMT+7 (Asia/Ho_Chi_Minh)
- Ngôn ngữ UI mặc định: Tiếng Việt
- Giờ làm việc chuẩn: 8:00 – 17:30 (cấu hình được)
- Giờ check-in hợp lệ: 6:00 – 12:00
- Giờ check-out hợp lệ: 11:00 – 22:00
- WFH auto-approve: 9:30 nếu HR/PM chưa xử lý (cấu hình được)
- Sprint length: 1-4 tuần (mặc định 2 tuần)
- Soft delete: Mọi entity dùng deletedAt thay vì hard DELETE
- Pagination: Mặc định 20 items/page, max 100
- Task dependency: Không tạo vòng lặp phụ thuộc (circular dependency)

---

## 6. Phase Roadmap

| Phase | Thời gian | Nội dung |
|-------|-----------|----------|
| **MVP (Phase 1)** | 8-12 tuần | 7 nhóm tính năng cốt lõi ở trên |
| **Phase 2** | +4-6 tuần | Mobile PWA nâng cao, AI ghi âm tự động, Tích hợp Slack/Teams |
| **Phase 3** | +4-6 tuần | Billing & payroll tích hợp, Analytics nâng cao, Multi-tenant |
