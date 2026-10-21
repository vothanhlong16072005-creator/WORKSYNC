# 🔌 Hợp Đồng Giao Tiếp API Chi Tiết (API Contract Specification) — WorkSync
> **Phiên bản:** 2.0 (Enterprise Comprehensive) | **Ngày cập nhật:** 21/10/2026  
> **Base URL:** `http://localhost:4000/api`  
> **Auth Header:** `Authorization: Bearer <accessToken>`  
> **Cấu trúc phản hồi chuẩn (Standard JSON Envelope):**
> ```json
> {
>   "success": true,
>   "data": { ... },
>   "meta": { "total": 100, "page": 1, "limit": 20, "totalPages": 5 },
>   "error": null
> }
> ```

---

## 🔐 1. Xác Thực & Phân Quyền (Auth & Users)

### `POST /api/auth/register`
- **Mục đích:** Đăng ký tài khoản người dùng mới; hệ thống tự động khởi tạo dự án cá nhân (`PERSONAL`) song hành.
- **Quyền hạn:** Mọi đối tượng (Public).
- **Request Body:**
```json
{
  "email": "developer@worksync.com",
  "password": "Password@123",
  "name": "Lê Văn Cường",
  "departmentId": "dept-eng-001",
  "position": "Frontend Developer"
}
```
- **Response 201 Created:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "cmv123abc456",
      "email": "developer@worksync.com",
      "name": "Lê Văn Cường",
      "role": "EMPLOYEE",
      "department": { "id": "dept-eng-001", "name": "Kỹ thuật phần mềm" }
    },
    "personalProject": {
      "id": "proj-personal-usr1",
      "name": "Việc cá nhân",
      "kind": "PERSONAL"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### `POST /api/auth/login`
- **Request Body:**
```json
{
  "email": "pm@worksync.com",
  "password": "Password@123"
}
```
- **Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "usr-pm-001",
      "email": "pm@worksync.com",
      "name": "Nguyễn Minh Tuấn",
      "role": "PM",
      "position": "Project Manager",
      "avatar": "https://avatar.iran.liara.run/public/boy?username=tuan"
    },
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### `GET /api/auth/me`
- **Headers:** `Authorization: Bearer <accessToken>`
- **Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "id": "usr-pm-001",
    "email": "pm@worksync.com",
    "name": "Nguyễn Minh Tuấn",
    "role": "PM",
    "language": "VI",
    "department": { "id": "dept-01", "name": "Kỹ thuật phần mềm", "code": "DEV" }
  }
}
```

### `GET /api/users/assignable`
- **Mục đích:** Lấy danh sách thành viên trong dự án hoặc phòng ban để giao việc.
- **Query:** `?projectId=proj-123`
- **Response 200 OK:**
```json
{
  "success": true,
  "data": [
    { "id": "usr-dev-01", "name": "Trần Văn An", "email": "an@worksync.com", "role": "EMPLOYEE", "avatar": "..." },
    { "id": "usr-qa-02", "name": "Lê Thị Bình", "email": "binh@worksync.com", "role": "EMPLOYEE", "avatar": "..." }
  ]
}
```

---

## ⏰ 2. Điểm Danh Thông Minh & Quản Trị Chuyên Cần (Smart Attendance)

### `POST /api/attendance/check-in`
- **Mục đích:** Điểm danh 1-Click tích hợp xác thực kép qua Geofencing và IP Wifi.
- **Request Body:**
```json
{
  "latitude": 15.968600,
  "longitude": 108.260800,
  "ipAddress": "118.69.182.45",
  "note": "Check-in tại FPT Complex Đà Nẵng"
}
```
- **Response 200 OK (Thành công trong vùng hợp lệ):**
```json
{
  "success": true,
  "data": {
    "id": "att-record-today",
    "userId": "usr-123",
    "date": "2026-10-21T00:00:00.000Z",
    "checkInTime": "2026-10-21T08:14:22.000Z",
    "status": "ON_TIME",
    "officeLocation": "FPT Complex Đà Nẵng",
    "distanceMeters": 42.5,
    "ipValid": true
  }
}
```

### `POST /api/attendance/leave-request`
- **Mục đích:** Nộp đơn xin nghỉ phép (tự động kiểm tra và trừ quỹ phép năm).
- **Request Body:**
```json
{
  "type": "ANNUAL",
  "startDate": "2026-11-01",
  "endDate": "2026-11-02",
  "dayCount": 2.0,
  "reason": "Về quê giải quyết việc gia đình"
}
```
- **Response 201 Created:**
```json
{
  "success": true,
  "data": {
    "id": "leave-req-001",
    "status": "PENDING",
    "remainingLeaveBalance": 10.0
  }
}
```

### `POST /api/attendance/early-leave-request`
- **Request Body:**
```json
{
  "date": "2026-10-21",
  "expectedLeaveTime": "2026-10-21T16:00:00.000Z",
  "reason": "Đi khám bệnh theo lịch hẹn bác sĩ"
}
```

### `POST /api/attendance/overtime-request`
- **Request Body:**
```json
{
  "date": "2026-10-21",
  "registeredHours": 2.5,
  "reason": "Hỗ trợ deploy bản cập nhật Sprint 12 lên môi trường Production"
}
```

---

## 🗂️ 3. Quản Trị Dự Án & Sprints Jira (Projects & Sprints)

### `POST /api/projects`
- **Quyền hạn:** `DEPARTMENT_HEAD`, `ADMIN`.
- **Request Body:**
```json
{
  "name": "WorkSync Core Platform",
  "code": "WS-CORE",
  "description": "Nền tảng quản lý dự án & điểm danh thông minh",
  "workflowType": "SCRUM",
  "pmId": "usr-pm-001",
  "departmentId": "dept-01",
  "color": "#2563eb"
}
```

### `PATCH /api/projects/:id/swap-pm`
- **Quyền hạn:** `DEPARTMENT_HEAD`, `ADMIN`.
- **Request Body:**
```json
{
  "newPmId": "usr-pm-002",
  "reason": "Điều chuyển nhân sự quản trị sang dự án trọng điểm mới"
}
```
- **Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "id": "proj-ws-core",
    "name": "WorkSync Core Platform",
    "pm": { "id": "usr-pm-002", "name": "Trần Thị Mai", "email": "mai@worksync.com" }
  }
}
```

### `GET /api/sprints/:id/burndown`
- **Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "sprintId": "sprint-12",
    "totalStoryPoints": 65,
    "days": [
      { "day": "Day 1", "idealRemaining": 65, "actualRemaining": 65 },
      { "day": "Day 2", "idealRemaining": 58.5, "actualRemaining": 60 },
      { "day": "Day 3", "idealRemaining": 52, "actualRemaining": 48 }
    ]
  }
}
```

---

## 📋 4. Quản Lý Công Việc & Bảng Kanban (Tasks & Kanban)

### `POST /api/tasks`
- **Mục đích:** Tạo công việc mới (hỗ trợ phân bổ Assignee bởi PM hoặc tự tạo việc cá nhân).
- **Request Body:**
```json
{
  "title": "Tối ưu hóa phông chữ tiếng Việt Plus Jakarta Sans",
  "description": "Thay thế font-display và nhúng Google Fonts chuẩn quốc tế",
  "projectId": "proj-ws-core",
  "sprintId": "sprint-12",
  "assigneeId": "usr-dev-01",
  "priority": "HIGH",
  "storyPoints": 5,
  "timeEstimate": 8.0,
  "dueDate": "2026-10-25T17:30:00.000Z",
  "labels": ["FRONTEND", "TYPOGRAPHY", "BAUHAUS"]
}
```
- **Response 201 Created:**
```json
{
  "success": true,
  "data": {
    "id": "TASK-1024",
    "title": "Tối ưu hóa phông chữ tiếng Việt Plus Jakarta Sans",
    "status": "TODO",
    "priority": "HIGH",
    "assignee": { "id": "usr-dev-01", "name": "Trần Văn An" },
    "creator": { "id": "usr-pm-001", "name": "Nguyễn Minh Tuấn" }
  }
}
```

### `PATCH /api/tasks/:id/board-position`
- **Mục đích:** Kéo thả cập nhật trạng thái và vị trí cột Kanban trong transaction atomic.
- **Request Body:**
```json
{
  "status": "IN_PROGRESS",
  "boardOrder": 1500.5
}
```

---

## ⚡ 5. Giao Việc Nhanh Trưởng Phòng (Quick Tasks)

### `POST /api/quick-tasks`
- **Request Body:**
```json
{
  "title": "Xử lý khẩn cấp lỗi CORS kết nối Mobile Gateway",
  "description": "Khách hàng báo lỗi không đăng nhập được qua IP văn phòng Cầu Giấy",
  "assigneeId": "usr-dev-01",
  "priority": "URGENT",
  "dueDate": "2026-10-21T21:00:00.000Z"
}
```

---

## 📹 6. Cuộc Họp Trực Tuyến & Biên Bản AI (Meetings & AI)

### `POST /api/meetings/:id/ai-summary/generate`
- **Mục đích:** Gửi toàn bộ transcript hội thoại lên Google Gemini 1.5 Flash để trích xuất biên bản có cấu trúc.
- **Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "aiSummary": "Cuộc họp Sprint Planning 12 đã thống nhất mục tiêu hoàn thiện module Chấm công và kiểm thử WebRTC...",
    "actionItems": [
      {
        "task": "Nâng cấp giao diện phòng họp theo chuẩn Google Meet",
        "assigneeId": "usr-dev-01",
        "dueDate": "2026-10-23"
      },
      {
        "task": "Kiểm thử WebRTC trên môi trường thực tế đa thiết bị",
        "assigneeId": "usr-qa-02",
        "dueDate": "2026-10-24"
      }
    ],
    "decisions": [
      "Thống nhất xuất biên bản họp ra 2 định dạng: Word (.doc) và CSV số liệu chuyên cần",
      "Giới hạn dung lượng tệp đính kèm trong chat phòng họp ở mức 25MB"
    ],
    "risks": [
      "Tính năng WebRTC cần kiểm thử UAT kỹ lưỡng trên mạng băng thông yếu trước khi bàn giao"
    ]
  }
}
```

### `POST /api/meetings/:id/export-doc`
- **Mục đích:** Chuyển đổi biên bản họp AI thành tài liệu chuẩn trong ClickUp Docs.
- **Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "documentId": "doc-meet-min-01",
    "title": "Biên bản cuộc họp Sprint 12 — 21/10/2026",
    "scope": "PROJECT",
    "docType": "MEETING_MINUTES"
  }
}
```

---

## 📄 7. Quản Trị Tri Thức Doanh Nghiệp (ClickUp Docs)

### `POST /api/documents`
- **Request Body:**
```json
{
  "title": "Quy chế bảo mật thông tin nội bộ & Quản lý thiết bị",
  "content": "<h2>1. Phạm vi áp dụng</h2><p>Quy chế áp dụng đối với 100% cán bộ nhân viên...</p>",
  "scope": "COMPANY",
  "docType": "COMPANY_POLICY",
  "visibility": "PUBLIC"
}
```

### `POST /api/documents/:id/attachments`
- **Form Data:** `file: <binary_data>` (Giới hạn 25MB: PDF, DOCX, PNG, ZIP...)
- **Response 201 Created:**
```json
{
  "success": true,
  "data": {
    "id": "att-doc-01",
    "fileName": "kien_truc_he_thong_v2.pdf",
    "fileSize": 4194304,
    "storagePath": "/uploads/docs/att-doc-01.pdf"
  }
}
```

---

## 📅 8. Lịch Làm Việc Doanh Nghiệp (Work Calendar)

### `GET /api/calendar/timeline`
- **Query:** `?scope=mine&startDate=2026-10-01&endDate=2026-10-31`
- **Response 200 OK (Hợp nhất 6 nguồn):**
```json
{
  "success": true,
  "data": {
    "tasks": [
      { "id": "t-1", "title": "Deploy API", "start": "2026-10-21T09:00:00Z", "end": "2026-10-21T17:30:00Z", "priority": "HIGH" }
    ],
    "sprints": [
      { "id": "sp-12", "title": "Sprint 12", "start": "2026-10-14", "end": "2026-10-28" }
    ],
    "meetings": [
      { "id": "m-10", "title": "Daily Standup", "start": "2026-10-21T09:30:00Z", "end": "2026-10-21T10:00:00Z" }
    ],
    "leaveRequests": [],
    "wfhRequests": [
      { "id": "wfh-2", "date": "2026-10-22", "status": "APPROVED" }
    ],
    "overtimeRequests": [],
    "conflicts": [
      {
        "type": "meeting_overlap",
        "severity": "HIGH",
        "message": "Trùng giờ giữa cuộc họp Daily Standup và Sprint Demo lúc 09:30"
      }
    ]
  }
}
```

---

## 💬 9. Trò Chuyện Trực Tuyến & Tin Nhắn (Real-time Chat)

### `POST /api/chat/conversations/direct/:targetUserId`
- **Mục đích:** Bắt đầu hoặc mở cuộc hội thoại 1-1 với đồng nghiệp.
- **Response 200 OK:**
```json
{
  "success": true,
  "data": {
    "id": "conv-direct-001",
    "type": "DIRECT",
    "recipient": { "id": "usr-dev-01", "name": "Trần Văn An", "avatar": "..." },
    "lastMessageAt": "2026-10-21T19:25:00.000Z"
  }
}
```

### `POST /api/chat/conversations/:id/messages`
- **Request Body:**
```json
{
  "content": "Chào Tuấn, mình đã tối ưu xong phông chữ tiếng Việt cho bảng Kanban rồi nhé!",
  "replyToId": "msg-prev-009"
}
```

### `POST /api/chat/messages/:id/reactions`
- **Request Body:**
```json
{
  "emoji": "🚀"
}
```

---

## ⚡ 10. Giao Thức WebSocket Thời Gian Thực (Gateways Contract)

### Namespace `/chat` (Socket.IO)
- **Client gửi:**
  - `join_conversation`: `{ "conversationId": "conv-001" }`
  - `send_message`: `{ "conversationId": "conv-001", "content": "Hello" }`
  - `typing_start` / `typing_stop`: `{ "conversationId": "conv-001" }`
- **Server phát:**
  - `new_message`: Tin nhắn mới phát tới room `conv:${id}`.
  - `user_typing`: `{ "userId": "usr-1", "isTyping": true }`.
  - `message_reaction_updated`: Cập nhật số lượng emoji thả trên tin nhắn.

### Namespace `/meetings` (WebRTC Signaling)
- **Client gửi:**
  - `join-room`: `{ "meetingId": "meet-10", "userId": "usr-1" }`
  - `offer` / `answer` / `ice-candidate`: Chuyển tiếp tín hiệu kết nối P2P WebRTC.
  - `meeting:transcript-chunk`: `{ "meetingId": "meet-10", "content": "Chúng ta bắt đầu thảo luận..." }`
  - `meeting:end-for-all`: Yêu cầu kết thúc họp tức thì cho toàn bộ phòng.
- **Server phát:**
  - `user-connected` / `user-disconnected`: Cập nhật danh sách người tham dự.
  - `chat-history`: Nạp 200 tin nhắn chat gần nhất cho người vào sau hoặc F5.
  - `meeting-ended`: Buộc điều hướng toàn bộ client tới trang Báo cáo chuyên cần.
