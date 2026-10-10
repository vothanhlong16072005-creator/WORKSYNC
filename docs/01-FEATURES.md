# ✅ Feature List — WorkSync
> Danh sách đầy đủ tất cả tính năng theo từng Role và Phase
> **Roles:** ADMIN, HR, PM, EMPLOYEE

---

## MVP — Phase 1 (Phải có)

### 🔐 F1. Auth & Phân quyền

- [x] POST /auth/register — Đăng ký tài khoản mới (ALL)
- [x] POST /auth/login — Đăng nhập, trả về accessToken + refreshToken (ALL)
- [x] POST /auth/refresh — Làm mới accessToken (ALL)
- [x] POST /auth/logout — Hủy session (ALL)
- [x] GET /auth/me — Lấy thông tin user hiện tại (ALL)
- [x] PATCH /auth/change-password — Đổi mật khẩu (ALL)
- [x] POST /auth/forgot-password — Gửi email reset password (ALL)
- [x] POST /auth/reset-password — Đặt lại mật khẩu bằng token (ALL)

### 👤 F2. Quản lý User & Department

**Admin quản lý:**
- [x] GET /users — Danh sách users (ADMIN, HR)
- [x] POST /users — Tạo user mới (ADMIN)
- [x] POST /users/bulk-import — Import batch từ Excel (ADMIN)
- [x] GET /users/:id — Xem chi tiết user (ADMIN, HR, PM)
- [x] PATCH /users/:id — Cập nhật thông tin user (ADMIN, HR)
- [x] PATCH /users/:id/role — Cấp/Thu hồi role (ADMIN)
- [x] PATCH /users/:id/status — Kích hoạt / Vô hiệu hóa tài khoản (ADMIN, HR)
- [x] DELETE /users/:id — Soft delete (ADMIN)
- [x] CRUD /departments — Quản lý phòng ban (ADMIN, HR)
- [x] GET /users/:id/login-history — Lịch sử đăng nhập (ADMIN)

**Employee tự quản:**
- [x] GET /profile — Xem hồ sơ cá nhân (ALL)
- [x] PATCH /profile — Cập nhật thông tin cá nhân (ALL)
- [x] PATCH /profile/avatar — Upload ảnh đại diện (ALL)
- [x] PATCH /profile/language — Đổi ngôn ngữ (ALL)
- [x] PATCH /profile/notification-settings — Cài đặt thông báo (ALL)

### ⏰ F3. Điểm danh Thông minh (Smart Attendance)

**Check-in/out:**
- [x] POST /attendance/check-in — Check-in 1-click (ALL)
- [x] POST /attendance/check-out — Check-out (optional) (ALL)
- [x] GET /attendance/today — Trạng thái điểm danh hôm nay của tôi (ALL)
- [x] GET /attendance/history — Lịch sử điểm danh cá nhân (ALL)

**WFH / Vắng mặt:**
- [x] POST /attendance/wfh — Khai báo WFH (ALL)
- [x] POST /attendance/leave-request — Gửi đơn xin nghỉ phép (ALL)
- [x] GET /attendance/leave-balance — Số ngày phép còn lại (ALL)
- [x] GET /attendance/requests — Danh sách đơn từ của tôi (ALL)

**HR quản lý:**
- [x] GET /attendance/report — Báo cáo điểm danh (ADMIN, HR, PM chỉ thấy team)
- [x] PATCH /attendance/:id — Chỉnh sửa điểm danh thủ công (ADMIN, HR)
- [x] GET /attendance/wfh-requests — Danh sách đơn WFH chờ duyệt (HR, PM)
- [x] PATCH /attendance/wfh-requests/:id/approve — Duyệt WFH (HR, PM)
- [x] PATCH /attendance/wfh-requests/:id/reject — Từ chối WFH (HR, PM)
- [x] GET /attendance/leave-requests — Danh sách đơn nghỉ phép chờ duyệt (HR, PM)
- [x] PATCH /attendance/leave-requests/:id/approve — Duyệt nghỉ phép (HR, PM)

**Admin cấu hình:**
- [x] PATCH /config/attendance — Cấu hình: IP ranges, GPS (ADMIN)

### 🗂️ F4. Quản lý Dự án & Task

**Project:**
- [x] GET /projects — Danh sách dự án (ALL - chỉ thấy dự án mình tham gia, ADMIN thấy hết)
- [x] POST /projects — Tạo dự án mới (ADMIN, PM)
- [x] GET /projects/:id — Chi tiết dự án (Member của project, ADMIN)
- [x] PATCH /projects/:id — Cập nhật dự án (PM, ADMIN)
- [x] DELETE /projects/:id — Soft delete dự án (PM, ADMIN)
- [x] POST /projects/:id/members — Thêm thành viên (PM, ADMIN)
- [x] DELETE /projects/:id/members/:userId — Xóa thành viên (PM, ADMIN)
- [x] PATCH /projects/:id/members/:userId/role — Đổi role (PM, ADMIN)

**Sprint:**
- [x] GET /projects/:id/sprints — Danh sách sprints (Project Members)
- [x] POST /projects/:id/sprints — Tạo sprint mới (PM, ADMIN)
- [x] PATCH /sprints/:id — Cập nhật sprint (PM, ADMIN)
- [x] PATCH /sprints/:id/start — Bắt đầu sprint (PM)
- [x] PATCH /sprints/:id/complete — Hoàn thành sprint (PM)
- [x] DELETE /sprints/:id — Xóa sprint (PM)

**Epic:**
- [x] CRUD /projects/:id/epics — Quản lý epics (PM)

**Task:**
- [x] GET /tasks — Danh sách task (Project Members)
- [x] POST /tasks — Tạo task mới (PM, EMPLOYEE trong project)
- [x] GET /tasks/:id — Chi tiết task (Project Members)
- [x] PATCH /tasks/:id — Cập nhật task (Assignee, PM)
- [x] PATCH /tasks/:id/status — Chuyển trạng thái (Assignee, PM)
- [x] PATCH /tasks/:id/assign — Gán task cho người (PM, Tự gán)
- [x] DELETE /tasks/:id — Soft delete (PM)
- [x] POST /tasks/:id/subtasks — Tạo sub-task (Project Members)
- [x] PATCH /tasks/:id/dependencies — Set dependency (PM)

**Work Log:**
- [x] POST /tasks/:id/work-logs — Ghi log công việc (Assignee)
- [x] GET /tasks/:id/work-logs — Xem log của task (Project Members)
- [x] PATCH /work-logs/:id — Sửa log (Owner của log)
- [x] DELETE /work-logs/:id — Xóa log (Owner, PM)

**Comment:**
- [x] GET /tasks/:id/comments — Danh sách comments (Project Members)
- [x] POST /tasks/:id/comments — Thêm comment (Project Members)
- [x] PATCH /comments/:id — Sửa comment (Owner)
- [x] DELETE /comments/:id — Xóa comment (Owner, PM)
- [x] POST /comments/:id/reactions — Thêm reaction (Project Members)

**Custom Fields:**
- [x] POST /projects/:id/custom-fields — Tạo custom field (PM)
- [x] PATCH /tasks/:id/custom-fields — Set custom field (Project Members)

**Kanban Views:**
- [x] GET /projects/:id/board — Kanban board data (Project Members)
- [x] GET /projects/:id/list — List view (Project Members)
- [x] GET /projects/:id/calendar — Calendar view (Project Members)
- [x] GET /projects/:id/gantt — Gantt chart (Project Members)
- [x] GET /projects/:id/timeline — Timeline view (Project Members)

### 📹 F5. Cuộc họp Online & AI Tóm tắt

**Meeting:**
- [x] GET /meetings — Danh sách cuộc họp (ALL - theo lời mời)
- [x] POST /meetings — Tạo cuộc họp (PM, HR, ADMIN)
- [x] GET /meetings/:id — Chi tiết (Participants)
- [x] PATCH /meetings/:id — Cập nhật cuộc họp (Creator, PM)
- [x] DELETE /meetings/:id — Hủy cuộc họp (Creator, PM)
- [x] POST /meetings/:id/join — Tham gia (Participants)
- [x] PATCH /meetings/:id/accept — Chấp nhận lời mời (Participants)
- [x] PATCH /meetings/:id/decline — Từ chối lời mời (Participants)

**Biên bản:**
- [x] GET /meetings/:id/minutes — Lấy biên bản (Participants)
- [x] PATCH /meetings/:id/minutes — Ghi/cập nhật biên bản (Creator, PM)
- [x] POST /meetings/:id/minutes/action-items — Thêm action item (Creator, PM)
- [x] PATCH /meetings/:id/end — Kết thúc họp -> trigger AI (Creator)

**AI Summary:**
- [x] POST /meetings/:id/ai-summary — Gọi Gemini tóm tắt (Creator, PM)
- [x] GET /meetings/:id/ai-summary — Xem kết quả (Participants)
- [x] POST /meetings/:id/ai-summary/create-tasks — Tạo tasks từ AI (PM)

**Export:**
- [x] GET /meetings/:id/export/pdf — Xuất biên bản (Participants)
- [x] GET /meetings/:id/export/word — Xuất biên bản (Participants)

### 📝 F6. Quản lý Tài liệu (ClickUp Docs)

- [x] GET /docs — Danh sách tài liệu (ALL - theo visibility)
- [x] POST /docs — Tạo tài liệu mới (ALL)
- [x] GET /docs/:id — Lấy nội dung tài liệu (Người có quyền)
- [x] PATCH /docs/:id — Cập nhật nội dung (Editor, Creator)
- [x] DELETE /docs/:id — Soft delete tài liệu (Creator, PM, ADMIN)
- [x] PATCH /docs/:id/visibility — Đổi quyền truy cập (Creator)
- [x] POST /docs/:id/share — Chia sẻ (Creator)
- [x] GET /docs/:id/history — Lịch sử version (Viewers)
- [x] POST /docs/:id/history/:version/restore — Khôi phục (Creator, Editor)
- [x] POST /docs/:id/ai-summary — Tóm tắt AI (Viewers)
- [x] POST /docs/:id/link-task — Liên kết với task (Editor)
- [x] GET /docs/tree — Cây thư mục (Viewers)

### 📊 F7. Báo cáo & Dashboard

**Daily Report (Employee):**
- [x] POST /reports/daily — Gửi báo cáo cuối ngày (ALL)
- [x] GET /reports/daily — Xem báo cáo đã gửi (ALL - PM xem của team)
- [x] POST /reports/daily/ai-draft — AI tự động điền (ALL)

**Dashboard data:**
- [x] GET /dashboard/pm — PM dashboard (PM, ADMIN)
- [x] GET /dashboard/hr — HR dashboard (HR, ADMIN)
- [x] GET /dashboard/admin — Admin dashboard (ADMIN)
- [x] GET /dashboard/employee — Employee dashboard (ALL)

**Export:**
- [x] GET /reports/attendance/export — Xuất bảng chấm công (HR, ADMIN)
- [x] GET /reports/sprint/:id/export — Xuất báo cáo sprint (PM, ADMIN)
- [x] GET /reports/employee/:id/export — Xuất báo cáo cá nhân (ALL)

### 🔔 F8. Thông báo

- [x] GET /notifications — Danh sách thông báo (ALL)
- [x] PATCH /notifications/:id/read — Đánh dấu đã đọc (ALL)
- [x] PATCH /notifications/read-all — Đánh dấu tất cả đã đọc (ALL)
- [x] DELETE /notifications/:id — Xóa thông báo (ALL)
- [x] GET /notifications/unread-count — Số thông báo chưa đọc (ALL)
- [x] WebSocket event: notification.new — Nhận thông báo (ALL)

---

## Phase 2 (Tương lai)

- [ ] Mobile PWA nâng cao — Push Notification native
- [ ] Tích hợp Google Calendar
- [ ] Webhook outbound
- [ ] AI ghi âm cuộc họp tự động
- [ ] Billing module
- [ ] Analytics nâng cao
- [ ] Multi-tenant
- [ ] SSO
- [ ] RFID Hardware integration
