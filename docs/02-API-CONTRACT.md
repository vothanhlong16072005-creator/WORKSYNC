# 🔌 Hợp Đồng Giao Tiếp API (API Contract) — WorkSync
> **Phiên bản:** 2.0 (Enterprise Updated) | **Ngày cập nhật:** 21/10/2026  
> **Base URL:** `http://localhost:4000/api`  
> **Auth Header:** `Authorization: Bearer <accessToken>`  
> **Cấu trúc phản hồi chuẩn (Standard Envelope):**
> ```json
> {
>   "success": true,
>   "data": { ... },
>   "meta": { "total": 100, "page": 1, "limit": 20 },
>   "error": null
> }
> ```

---

## 🔐 1. Xác Thực & Người Dùng (Auth & Users)

| Method | Endpoint | Quyền hạn | Mô tả chức năng |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/auth/register` | ALL | Đăng ký tài khoản mới; tự động cấp phát dự án `PERSONAL`. |
| `POST` | `/api/auth/login` | ALL | Đăng nhập email & mật khẩu; trả về Access Token & set HttpOnly Cookie. |
| `POST` | `/api/auth/google` | ALL | Đăng nhập/Đăng ký nhanh qua Google OAuth 2.0. |
| `POST` | `/api/auth/refresh` | ALL | Làm mới Access Token ngầm (Silent Refresh). |
| `POST` | `/api/auth/logout` | ALL | Hủy phiên làm việc và xóa cookie refreshToken. |
| `GET` | `/api/auth/me` | ALL | Lấy thông tin tài khoản và danh sách quyền hạn người dùng hiện tại. |
| `GET` | `/api/users` | ADMIN, HR, DEPT_HEAD | Danh sách người dùng hệ thống kèm tìm kiếm và lọc phòng ban. |
| `GET` | `/api/users/assignable` | ALL | Lấy danh sách thành viên hợp lệ để giao việc (theo phòng ban hoặc dự án). |
| `GET` | `/api/users/:id` | ALL | Xem thông tin hồ sơ người dùng. |
| `PATCH` | `/api/users/profile` | ALL | Cập nhật hồ sơ cá nhân: Họ tên, vị trí, ảnh đại diện, ngôn ngữ (`VI`/`EN`). |
| `PATCH` | `/api/users/:id/role` | ADMIN | Phân quyền vai trò mới cho tài khoản (`ADMIN`, `HR`, `DEPARTMENT_HEAD`, `PM`, `EMPLOYEE`). |

---

## ⏰ 2. Điểm Danh & Chuyên Cần (Smart Attendance)

| Method | Endpoint | Quyền hạn | Mô tả chức năng |
| :--- | :--- | :---: | :--- |
| `POST` | `/api/attendance/check-in` | ALL | Điểm danh 1-Click: Thẩm định IP Public + GPS Geofencing 3 chi nhánh FPT. |
| `POST` | `/api/attendance/check-out` | ALL | Điểm danh ra về: Tính tổng giờ làm thực tế và phát hiện về sớm. |
| `GET` | `/api/attendance/today` | ALL | Lấy trạng thái chuyên cần hôm nay kèm dải tiến trình live-ticking. |
| `GET` | `/api/attendance/my-history` | ALL | Lịch sử điểm danh cá nhân kèm Bảng nhiệt 365 ngày (Heatmap). |
| `POST` | `/api/attendance/wfh-request` | ALL | Tạo đơn làm việc từ xa (WFH). |
| `POST` | `/api/attendance/leave-request` | ALL | Tạo đơn xin nghỉ phép (tự động trừ quỹ ngày phép trong transaction). |
| `POST` | `/api/attendance/early-leave-request`| ALL | Tạo đơn đăng ký về sớm có lý do chính đáng trước 17:30. |
| `POST` | `/api/attendance/overtime-request` | ALL | Tạo đơn làm thêm giờ (OT) chuẩn công thức HRM. |
| `POST` | `/api/attendance/break-log` | ALL | Ghi nhận thời gian ra ngoài tạm thời và tự động trừ giờ ăn trưa. |
| `GET` | `/api/attendance/approval-queue` | HR, DEPT_HEAD, PM | Danh sách hàng đợi các đơn từ cần xét duyệt của cấp dưới. |
| `PATCH` | `/api/attendance/approve-request`| HR, DEPT_HEAD, PM | Duyệt đơn từ (WFH, Phép, Về sớm, OT) và cập nhật bảng công. |
| `PATCH` | `/api/attendance/reject-request` | HR, DEPT_HEAD, PM | Từ chối đơn từ kèm ghi chú lý do. |
| `GET` | `/api/attendance/export/excel` | HR, ADMIN | Xuất báo cáo bảng chấm công toàn công ty định dạng `.xlsx`. |
| `GET` | `/api/attendance/export/pdf` | HR, ADMIN | Xuất báo cáo chuyên cần định dạng chuẩn in ấn `.pdf`. |

---

## 🗂️ 3. Quản Trị Dự Án & Sprints (Projects & Sprints)

| Method | Endpoint | Quyền hạn | Mô tả chức năng |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/projects/mine` | ALL | Danh sách dự án cá nhân & dự án nhóm người dùng tham gia. |
| `POST` | `/api/projects` | DEPT_HEAD, ADMIN | Khởi tạo dự án nhóm mới (Ràng buộc: PM và Employee không được tạo). |
| `GET` | `/api/projects/:id` | Project Members | Xem chi tiết dự án, mô hình workflow (`SCRUM`/`KANBAN`/`DAILY`/`SIMPLE`). |
| `PATCH` | `/api/projects/:id` | PM, DEPT_HEAD, ADMIN | Cập nhật cấu hình và thông tin dự án. |
| `PATCH` | `/api/projects/:id/swap-pm` | DEPT_HEAD, ADMIN | Hoán đổi Project Manager dự án an toàn trong database transaction. |
| `POST` | `/api/projects/:id/members` | PM, DEPT_HEAD, ADMIN | Bổ sung thành viên và phân định Project Role. |
| `DELETE`| `/api/projects/:id/members/:userId` | PM, DEPT_HEAD, ADMIN | Xóa thành viên khỏi dự án nhóm. |
| `GET` | `/api/sprints/project/:projectId` | Project Members | Danh sách Sprint Agile theo chu kỳ kèm thống kê Story Points. |
| `POST` | `/api/sprints` | PM, ADMIN | Khởi tạo Sprint mới với chu kỳ và mục tiêu cam kết. |
| `PATCH` | `/api/sprints/:id/start` | PM, ADMIN | Bắt đầu kích hoạt Sprint đang ở trạng thái chuẩn bị. |
| `PATCH` | `/api/sprints/:id/complete` | PM, ADMIN | Đóng hoàn thành Sprint (tự động chuyển task dở dang về Backlog). |
| `GET` | `/api/sprints/:id/burndown` | Project Members | Biểu đồ Burndown Chart năng suất hoàn thành SP của nhóm. |

---

## 📋 4. Quản Lý Công Việc & Bảng Kanban (Tasks & Kanban)

| Method | Endpoint | Quyền hạn | Mô tả chức năng |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/tasks` | ALL | Danh sách công việc theo `?scope=mine` (cá nhân) hoặc `?scope=project`. |
| `POST` | `/api/tasks` | ALL | Tạo công việc mới: hỗ trợ gán Assignee, Story Points, Hạn chót, Ưu tiên. |
| `GET` | `/api/tasks/:id` | Assignee, PM, Members | Xem chi tiết nhiệm vụ chuẩn 2 cột Linear (workflow, timeline, metadata). |
| `PATCH` | `/api/tasks/:id/board-position` | Assignee, PM, Creator | Kéo thả đổi cột trạng thái và thứ tự sắp xếp trên Kanban. |
| `PATCH` | `/api/tasks/:id/status` | Assignee, PM, Creator | Chuyển trạng thái nhanh (`TODO`, `IN_PROGRESS`, `IN_REVIEW`, `BLOCKED`, `DONE`). |
| `PATCH` | `/api/tasks/:id` | Assignee, PM, Creator | Cập nhật nội dung mô tả, tiêu đề, độ ưu tiên hoặc người phụ trách. |
| `DELETE`| `/api/tasks/:id` | PM, Creator, ADMIN | Xóa mềm công việc (`deletedAt`). |

---

## ⚡ 5. Trưởng Phòng & Giao Việc Nhanh (Department Head & Quick Tasks)

| Method | Endpoint | Quyền hạn | Mô tả chức năng |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/dept-head/overview` | DEPT_HEAD, ADMIN | Thống kê tổng quan nhân sự, tiến độ dự án và rủi ro phòng ban. |
| `POST` | `/api/quick-tasks` | DEPT_HEAD, PM, ADMIN | Giao việc khẩn cấp 1-chạm cho nhân viên không cần qua tạo dự án. |
| `GET` | `/api/quick-tasks` | ALL | Danh sách công việc giao nhanh gửi đi hoặc được nhận. |
| `PATCH` | `/api/quick-tasks/:id/status`| Assignee, Creator | Cập nhật tiến độ hoàn thành công việc nhanh. |

---

## 📹 6. Cuộc Họp Trực Tuyến & Biên Bản AI (Meetings & AI)

| Method | Endpoint | Quyền hạn | Mô tả chức năng |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/meetings/upcoming` | ALL | Danh sách các cuộc họp sắp diễn ra mà người dùng được mời. |
| `GET` | `/api/meetings/past` | ALL | Lịch sử các cuộc họp đã kết thúc. |
| `POST` | `/api/meetings` | PM, DEPT_HEAD, HR, ADMIN | Lên lịch cuộc họp mới (theo dự án, phòng ban hoặc tự do). |
| `GET` | `/api/meetings/:id` | Attendees | Xem chi tiết phòng họp, danh sách RSVP và tài liệu đính kèm. |
| `POST` | `/api/meetings/:id/rsvp` | Attendees | Phản hồi lời mời (`ACCEPTED`, `DECLINED`, `PENDING`). |
| `POST` | `/api/meetings/:id/transcripts` | Attendees | Lưu trữ phân mảnh dòng thoại nhận diện giọng nói tiếng Việt thời gian thực. |
| `POST` | `/api/meetings/:id/ai-summary/generate`| Host, PM, ADMIN | Kích hoạt Google Gemini 1.5 Flash tạo biên bản tóm tắt, Action Items. |
| `GET` | `/api/meetings/:id/report` | Attendees | Tải dữ liệu báo cáo chuyên cần và biên bản họp tổng hợp. |
| `POST` | `/api/meetings/:id/export-doc` | Host, PM, ADMIN | Xuất trực tiếp biên bản họp sang kho tài liệu ClickUp Docs. |
| `DELETE`| `/api/meetings/:id` | Host, PM, ADMIN | Hủy bỏ cuộc họp (gửi thông báo thu hồi lịch). |

---

## 📄 7. Quản Trị Tri Thức Doanh Nghiệp (Document Management System)

| Method | Endpoint | Quyền hạn | Mô tả chức năng |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/documents` | ALL | Danh sách tài liệu (lọc theo dự án, phòng ban, cá nhân hoặc công ty). |
| `POST` | `/api/documents` | ALL | Tạo tài liệu mới hỗ trợ soạn thảo Tiptap rich-text. |
| `GET` | `/api/documents/:id` | Authorized Users | Đọc nội dung tài liệu và danh sách tệp đính kèm. |
| `PATCH` | `/api/documents/:id` | Creator, PM, ADMIN | Chỉnh sửa tài liệu (tự động tạo bản ghi `DocumentVersion`). |
| `GET` | `/api/documents/:id/versions` | Authorized Users | Xem lịch sử các phiên bản chỉnh sửa của tài liệu. |
| `POST` | `/api/documents/:id/versions/:ver/restore` | Creator, PM | Khôi phục tài liệu về phiên bản lịch sử chỉ định. |
| `POST` | `/api/documents/:id/attachments`| Creator, PM | Tải lên tệp đính kèm tài liệu dung lượng tối đa 25MB. |
| `GET` | `/api/documents/search/fulltext` | ALL | Tìm kiếm toàn văn thông minh theo tiêu đề và nội dung. |
| `GET` | `/api/documents/company` | ALL | Danh mục tài liệu quy chế, chính sách áp dụng toàn doanh nghiệp. |

---

## 📅 8. Lịch Làm Việc Doanh Nghiệp (Work Calendar)

| Method | Endpoint | Quyền hạn | Mô tả chức năng |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/calendar/timeline` | ALL | Lấy timeline hợp nhất 6 nguồn dữ liệu: Tasks, Sprints, Meetings, Leave, WFH, OT. |
| `PATCH` | `/api/calendar/items/:kind/:id/reschedule` | Assignee, Creator, PM | Kéo thả dời lịch làm việc trực tiếp trên giao diện lịch có kiểm tra RBAC. |
| `GET` | `/api/calendar/export` | ALL | Tải về tệp lịch định dạng chuẩn RFC 5545 iCalendar (`.ics`). |

---

## 💬 9. Trò Chuyện Trực Tuyến & Thông Báo (Chat & Notifications)

| Method | Endpoint | Quyền hạn | Mô tả chức năng |
| :--- | :--- | :---: | :--- |
| `GET` | `/api/chat/conversations` | ALL | Danh sách các cuộc trò chuyện của người dùng (1-1, dự án, phòng ban). |
| `POST` | `/api/chat/conversations/direct/:userId` | ALL | Khởi tạo hoặc lấy hội thoại 1-1 trực tiếp với đồng nghiệp. |
| `POST` | `/api/chat/conversations/project/:projectId` | Project Members | Mở nhóm trò chuyện của dự án. |
| `POST` | `/api/chat/conversations/department/:deptId` | Department Members | Mở nhóm trò chuyện của phòng ban. |
| `GET` | `/api/chat/conversations/:id/messages` | Conversation Members | Tải lịch sử tin nhắn kèm reactions và tệp đính kèm. |
| `POST` | `/api/chat/conversations/:id/messages` | Conversation Members | Gửi tin nhắn văn bản (hỗ trợ trích dẫn reply quote). |
| `POST` | `/api/chat/conversations/:id/messages/file` | Conversation Members | Gửi tệp đính kèm an toàn lưu trên ổ đĩa nội bộ `/uploads/chat`. |
| `POST` | `/api/chat/messages/:id/reactions` | Conversation Members | Thả biểu cảm emoji (👍, ❤️, 😂, 🎉, 🚀). |
| `PATCH` | `/api/chat/conversations/:id/pin` / `mute` | Conversation Members | Ghim hội thoại lên đầu hoặc Bật/Tắt thông báo tin nhắn. |
| `GET` | `/api/notifications` | ALL | Lấy danh sách thông báo hệ thống thời gian thực. |
| `PATCH` | `/api/notifications/:id/read` | ALL | Đánh dấu thông báo đã đọc. |
| `POST` | `/api/notifications/web-push/subscribe` | ALL | Đăng ký nhận thông báo đẩy Web Push native (chuẩn VAPID). |

---

## ⚡ 10. Các Kênh WebSocket Thời Gian Thực (WebSocket Gateways)

### A. Namespace `/chat` (Native Socket.IO)
- **`join-conversation`**: Người dùng tham gia phòng hội thoại `conv:${id}`.
- **`send-message`**: Gửi tin nhắn tức thời tới các thành viên trong phòng.
- **`typing` / `stop-typing`**: Phát tín hiệu đang gõ phím hiển thị 3 chấm động.
- **`message-reaction`**: Phát tín hiệu thả biểu cảm emoji thời gian thực.
- **`read-receipt`**: Thông báo người dùng đã đọc tin nhắn.

### B. Namespace `/meetings` (WebRTC Signaling)
- **`join-room`**: Tham gia phòng họp, nhận lịch sử thoại và trạng thái ghi âm.
- **`offer` / `answer` / `ice-candidate`**: Trao đổi tín hiệu kết nối P2P đa client.
- **`media-state-changed`**: Bật/tắt mic, camera, chia sẻ màn hình.
- **`live-transcript-chunk`**: Stream từng câu thoại nhận diện giọng nói STT lên máy chủ.
- **`room-chat-message`**: Trò chuyện và gửi file trong khi đang họp.
- **`end-meeting-all`**: Host kết thúc cuộc họp ngay lập tức cho tất cả người tham gia.

### C. Namespace `/notifications` (System Alerts)
- **`notification`**: Phát thông báo tức thời khi được giao việc, nhắc nhở họp hoặc duyệt đơn.
