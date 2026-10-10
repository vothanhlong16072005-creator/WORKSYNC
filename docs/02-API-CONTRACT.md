# 🔌 API Contract — WorkSync
> Tài liệu mô tả tất cả API endpoints, request/response format.
> **Base URL:** `http://localhost:4000/api`
> **Auth Header:** `Authorization: Bearer <accessToken>`
> **Response format chuẩn:**
> ```json
> { "success": true, "data": {...}, "meta": {...}, "error": null }
> ```

---

## 🔐 Auth Module (Implemented)

### POST /auth/register
**Roles:** ALL
**Body:**
```json
{ "email": "user@company.com", "password": "Pass123!", "name": "Nguyen Van A", "departmentId": "cuid" }
```
**Response 201:**
```json
{ "success": true, "data": { "user": { "id": "cuid", "email": "...", "name": "...", "role": "EMPLOYEE" }, "accessToken": "eyJ...", "refreshToken": "eyJ..." } }
```

---

### POST /auth/login
**Roles:** ALL
**Body:**
```json
{ "email": "user@company.com", "password": "Pass123!" }
```
**Response 200:**
```json
{ "success": true, "data": { "user": { "id": "cuid", "email": "...", "name": "...", "role": "PM", "avatar": "url" }, "accessToken": "eyJ..." } }
```

---

### GET /auth/me
**Roles:** ALL
**Response 200:**
```json
{ "success": true, "data": { "id": "cuid", "email": "...", "name": "...", "role": "EMPLOYEE", "department": { "id": "...", "name": "Engineering" }, "avatar": "url", "language": "vi" } }
```

---

## 👤 Users & Departments Module

### GET /users
**Roles:** ADMIN, HR
**Query:** `?page=1&limit=20&search=nguyen&role=EMPLOYEE&departmentId=xxx&status=ACTIVE&sort=createdAt:desc`
**Response 200:**
```json
{ "success": true, "data": [ { "id": "...", "name": "...", "email": "...", "role": "EMPLOYEE", "department": {...}, "status": "ACTIVE", "createdAt": "..." } ], "meta": { "total": 85, "page": 1, "limit": 20, "totalPages": 5 } }
```

---

### CRUD /departments
**Roles:** ADMIN, HR
**POST Body:**
```json
{ "name": "Engineering", "description": "Tech team", "managerId": "userId" }
```
**Response 200/201:**
```json
{ "success": true, "data": { "id": "cuid", "name": "Engineering", "description": "...", "managerId": "userId" } }
```

---

## ⏰ Attendance Module

### POST /attendance/check-in
**Roles:** ALL
**Body:**
```json
{ "latitude": 16.0544, "longitude": 108.2022, "ipAddress": "192.168.1.5", "deviceInfo": "Chrome 120 / Windows 11" }
```
**Response 201:**
```json
{ "success": true, "data": { "id": "cuid", "status": "ON_TIME", "checkInTime": "2026-10-04T08:45:00+07:00", "label": "Đúng giờ" } }
```

---

## 🗂️ Projects Module
 
### GET /projects/mine (Implemented)
**Roles:** Authenticated user
**Description:** Lấy danh sách dự án khả dụng với user (kèm số công việc chưa hoàn thành gán cho user để hiển thị badge).
**Response 200:**
```json
[
  {
    "id": "cuid",
    "name": "Việc cá nhân",
    "kind": "PERSONAL",
    "color": "#3B82F6",
    "openAssignedTaskCount": 2
  },
  {
    "id": "cuid",
    "name": "WorkSync Delivery",
    "kind": "TEAM",
    "color": "#4D7FC2",
    "openAssignedTaskCount": 5
  }
]
```

### GET /projects (Planned / Legacy)
**Roles:** ALL (Chỉ xem dự án có tham gia, ADMIN xem hết)
**Response 200:**
```json
{ "success": true, "data": [ { "id": "cuid", "name": "WorkSync", "description": "...", "status": "ACTIVE", "progress": 65, "memberCount": 8, "activeSprint": { "id": "...", "name": "Sprint 3", "endDate": "2026-10-15" } } ] }
```

---

### POST /projects/:id/sprints (Planned)
**Roles:** PM, ADMIN
**Body:**
```json
{ "name": "Sprint 3", "goal": "Finish auth", "startDate": "2026-10-01", "endDate": "2026-10-15" }
```
**Response 201:**
```json
{ "success": true, "data": { "id": "cuid", "name": "Sprint 3", "status": "PLANNING" } }
```

---

## 📋 Tasks Module

### GET /tasks (Implemented)
**Roles:** Authenticated user (Project member, Personal owner, hoặc ADMIN)
**Query Parameters:**
- `scope`: `mine` (mặc định) hoặc `project`
- `projectId`: Tùy chọn cho `scope=mine`, bắt buộc cho `scope=project`
**Mô tả:**
- `GET /tasks?scope=mine`: Lấy toàn bộ task chưa hoàn thành được gán cho user trên tất cả project hợp lệ.
- `GET /tasks?scope=mine&projectId=:id`: Lấy task được gán cho user trong một project cụ thể.
- `GET /tasks?scope=project&projectId=:id`: Lấy toàn bộ task trong một team project (không áp dụng cho personal project).
**Response 200:**
```json
[
  {
    "id": "cuid",
    "title": "Implement Kanban DnD",
    "description": "...",
    "status": "IN_PROGRESS",
    "priority": "HIGH",
    "position": 1024,
    "labels": ["UI", "FEATURE"],
    "assignee": { "id": "cuid", "name": "Nguyen Van A", "avatar": null },
    "project": { "id": "cuid", "name": "WorkSync Delivery", "color": "#4D7FC2", "kind": "TEAM" }
  }
]
```

### PATCH /tasks/:id/board-position (Implemented)
**Roles:** Task Assignee, Project PM, hoặc ADMIN
**Mô tả:** Di chuyển trạng thái task và sắp xếp lại vị trí trên bảng Kanban trong một transaction nguyên tử.
**Body:**
```json
{
  "status": "IN_PROGRESS",
  "destinationIndex": 0
}
```
**Response 200:** Task object sau khi cập nhật.

---

### POST /tasks/:id/dependencies
**Roles:** PM
**Body:**
```json
{ "dependsOnId": "taskId2", "dependencyType": "FINISH_TO_START" }
```
**Response 201:**
```json
{ "success": true, "data": { "id": "cuid", "taskId": "taskId1", "dependsOnId": "taskId2", "dependencyType": "FINISH_TO_START" } }
```

---

### POST /tasks/:id/work-logs
**Roles:** Assignee
**Body:**
```json
{ "duration": 120, "description": "Code API Auth", "logDate": "2026-10-05T10:00:00Z" }
```
**Response 201:**
```json
{ "success": true, "data": { "id": "cuid", "duration": 120, "taskId": "taskId" } }
```

---

## 📹 Meetings Module

### POST /meetings
**Roles:** PM, HR, ADMIN
**Body:**
```json
{ "title": "Sprint 3 Planning", "startTime": "2026-10-05T09:00:00+07:00", "endTime": "2026-10-05T10:00:00+07:00", "participants": ["userId1"], "agenda": ["Review"] }
```
**Response 201:**
```json
{ "success": true, "data": { "id": "cuid", "title": "...", "roomCode": "ws-abc123" } }
```

---

## 📝 Documents Module

### GET /docs/tree
**Roles:** Project Members (Tùy visibility)
**Response 200:**
```json
{ "success": true, "data": [ { "id": "rootDoc1", "title": "Sprint 3", "children": [ { "id": "subDoc1", "title": "Backend API", "children": [] } ] } ] }
```

---

## 📊 Báo cáo & Dashboard

### GET /dashboard/pm
**Roles:** PM, ADMIN
**Response 200:**
```json
{ "success": true, "data": { "activeProjects": 3, "tasksCompletedThisWeek": 24, "burndownData": [ { "date": "2026-10-01", "ideal": 50, "actual": 45 } ], "teamWorkload": [ { "userId": "user1", "assignedPoints": 15, "completedPoints": 10 } ] } }
```

### POST /reports/daily
**Roles:** ALL
**Body:**
```json
{ "date": "2026-10-05", "content": "Hôm nay tôi đã code xong API Auth", "tasksDone": ["taskId1"], "plannedTomorrow": "Làm tiếp Dashboard" }
```
**Response 201:** DailyReport object

---

## 🔔 Notifications & Realtime

### GET /notifications
**Roles:** ALL (Chỉ lấy thông báo của chính mình)
**Response 200:**
```json
{ "success": true, "data": [ { "id": "cuid", "type": "TASK_ASSIGNED", "title": "Task mới", "message": "Bạn được gán task", "read": false, "createdAt": "..." } ], "meta": { "unreadCount": 3 } }
```

### WebSocket Auth Format
**Connection URL:** `ws://localhost:4000?token=<accessToken>`
**Client Payload Gửi (ví dụ tham gia room meeting):**
```json
{ "event": "meeting.join", "data": { "meetingId": "cuid" } }
```
**Server Payload Nhận:**
```json
{ "event": "notification.new", "data": { "title": "...", "message": "..." } }
```
