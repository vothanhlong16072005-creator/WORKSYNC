# 🗄️ Thiết Kế Cơ Sở Dữ Liệu & ERD Chi Tiết (Database Schema & ERD) — WorkSync
> **Hệ quản trị CSDL:** PostgreSQL 16 (port 5433) | **ORM:** Prisma 5.22  
> **Quy chuẩn thiết kế:** 
> - Khóa chính định danh duy nhất dùng `cuid()`.
> - Mọi thực thể nghiệp vụ bắt buộc có `createdAt DateTime @default(now())`, `updatedAt DateTime @updatedAt`, và `deletedAt DateTime?` (Soft delete - Xóa mềm).
> - Tổng số thực thể: **37 Models / Tables** và **26 Enums** toàn vẹn phản ánh 100% mã nguồn thực tế.

---

## 1. Sơ Đồ Thực Thể Quan Hệ (ERD Cấp Độ Khái Niệm & Logic)

```
Company / Enterprise
├── Department (Phòng ban)
│   └── User (Nhân sự)
│       ├── AttendanceRecord (Chấm công hàng ngày)
│       ├── EarlyLeaveRequest (Đơn về sớm)
│       ├── OvertimeRequest (Đơn làm thêm giờ)
│       ├── BreakLog (Nhật ký ra ngoài tạm thời)
│       ├── WfhRequest (Đơn làm việc từ xa)
│       ├── LeaveRequest (Đơn xin nghỉ phép)
│       ├── QuickTask (Công việc giao nhanh 1-chạm)
│       ├── Notification & PushSubscription (Thông báo nội bộ & Web Push)
│       └── DailyReport (Báo cáo cuối ngày tự động)
│
├── Project (Dự án: TEAM hoặc PERSONAL)
│   ├── ProjectMember (Thành viên dự án & vai trò: PM, DEV, QA, BA)
│   ├── Sprint (Chu kỳ phát triển Agile/Scrum)
│   │   └── Task (Nhiệm vụ công việc)
│   │       ├── WorkLog (Nhật ký thời gian thực hiện)
│   │       ├── Comment & Reaction (Bình luận & Thả cảm xúc)
│   │       └── TaskDependency (Ràng buộc phụ thuộc công việc)
│   ├── Epic (Nhóm hạng mục lớn)
│   └── CustomField & CustomFieldValue (Trường tùy chỉnh theo dự án)
│
├── Meeting (Cuộc họp trực tuyến WebRTC)
│   ├── MeetingAttendee (Thành viên tham dự & RSVP)
│   ├── MeetingMinute (Biên bản họp & Phân tích Gemini 1.5 Flash AI)
│   └── MeetingTranscriptChunk (Phân mảnh nhận diện giọng nói STT)
│
├── Document (Không gian tri thức ClickUp Docs)
│   ├── DocumentVersion (Lịch sử các phiên bản tài liệu)
│   ├── DocumentAttachment (Tệp tin đính kèm tài liệu tới 25MB)
│   ├── DocumentPermission (Phân quyền truy cập tài liệu)
│   └── DocumentTemplate (Mẫu văn bản hành chính)
│
└── Conversation (Hội thoại trò chuyện Native Socket.IO)
    ├── ConversationMember (Thành viên cuộc trò chuyện)
    ├── ChatMessage (Tin nhắn văn bản & tệp tin)
    └── ChatMessageReaction (Thả cảm xúc emoji tương tác)
```

---

## 2. Danh Mục Toàn Bộ 26 Kiểu Dữ Liệu Liệt Kê (System Enums)

```prisma
enum Role {
  ADMIN              // Quản trị viên hệ thống toàn quyền
  HR                 // Quản lý nhân sự, chấm công
  PM                 // Quản lý dự án
  EMPLOYEE           // Nhân viên / Thành viên
  DEPARTMENT_HEAD    // Trưởng phòng ban (Phân quyền chiến lược mới)
}

enum UserStatus {
  ACTIVE             // Đang hoạt động
  INACTIVE           // Chưa kích hoạt
  SUSPENDED          // Bị tạm khóa
}

enum Language {
  VI                 // Tiếng Việt (Mặc định)
  EN                 // Tiếng Anh
  KO                 // Tiếng Hàn
}

enum AttendanceStatus {
  ON_TIME            // Đúng giờ
  LATE               // Đi muộn (sau 08:30)
  VERY_LATE          // Đi muộn nhiều (sau 09:30)
  WFH                // Làm việc từ xa được duyệt
  BUSINESS_TRIP      // Đi công tác
  ABSENT_APPROVED    // Nghỉ phép có duyệt
  ABSENT_UNAPPROVED  // Vắng mặt không phép
  EARLY_LEAVE_APPROVED   // Về sớm có phép
  EARLY_LEAVE_UNAPPROVED // Về sớm không phép
}

enum RequestStatus {
  PENDING            // Chờ xét duyệt
  APPROVED           // Đã phê duyệt
  REJECTED           // Bị từ chối
  AUTO_APPROVED      // Hệ thống tự động duyệt sau 09:30
}

enum BreakType {
  MANUAL             // Ra ngoài cá nhân tạm thời
  EARLY_LEAVE_OUT    // Ra ngoài về sớm
}

enum LeaveType {
  ANNUAL             // Phép năm (trừ quỹ 12 ngày/năm)
  SICK               // Nghỉ ốm
  UNPAID             // Nghỉ không lương
  COMPENSATORY       // Nghỉ bù
}

enum ProjectStatus {
  PLANNING           // Đang lập kế hoạch
  ACTIVE             // Đang triển khai
  ON_HOLD            // Tạm dừng
  COMPLETED          // Đã hoàn thành
  ARCHIVED           // Đã lưu trữ
}

enum ProjectKind {
  TEAM               // Dự án nhóm cộng tác
  PERSONAL           // Dự án công việc cá nhân
}

enum ProjectWorkflowType {
  SCRUM              // Mô hình Agile/Scrum theo Sprint
  KANBAN             // Mô hình luồng Kanban liên tục
  DAILY              // Mô hình tác vụ hàng ngày
  SIMPLE             // Mô hình danh sách việc đơn giản
}

enum SprintStatus {
  PLANNING           // Đang lập kế hoạch sprint
  ACTIVE             // Sprint đang diễn ra
  COMPLETED          // Sprint đã kết thúc
}

enum TaskStatus {
  TODO               // Cần làm
  IN_PROGRESS        // Đang thực hiện
  IN_REVIEW          // Đang đánh giá / Review
  BLOCKED            // Bị chặn / Có trở ngại
  DONE               // Đã hoàn thành
}

enum Priority {
  LOW                // Thấp
  MEDIUM             // Trung bình
  HIGH               // Cao
  URGENT             // Khẩn cấp
}

enum DependencyType {
  FINISH_TO_START    // Hoàn thành việc A mới bắt đầu việc B
  START_TO_START     // Bắt đầu việc A cùng lúc bắt đầu việc B
  FINISH_TO_FINISH   // Hoàn thành việc A cùng lúc hoàn thành việc B
}

enum CustomFieldType {
  TEXT               // Kiểu chữ
  NUMBER             // Kiểu số
  DATE               // Kiểu ngày tháng
  DROPDOWN           // Danh sách lựa chọn
  CHECKBOX           // Hộp kiểm đúng/sai
}

enum MeetingStatus {
  SCHEDULED          // Đã lên lịch
  IN_PROGRESS        // Cuộc họp đang diễn ra
  COMPLETED          // Cuộc họp đã kết thúc
  CANCELLED          // Cuộc họp đã bị hủy
}

enum MeetingScope {
  PROJECT            // Cuộc họp theo dự án
  DEPARTMENT         // Cuộc họp theo phòng ban
  ONE_ON_ONE         // Cuộc họp trực tiếp 1-1 / Mời tự do
}

enum RSVP {
  PENDING            // Chờ phản hồi
  ACCEPTED           // Đồng ý tham gia
  DECLINED           // Từ chối tham gia
}

enum AiJobStatus {
  PENDING            // Chờ xử lý AI
  PROCESSING         // Đang gửi tới Gemini 1.5 Flash
  DONE               // Đã hoàn tất phân tích
  FAILED             // Xử lý thất bại (Multi-model fallback)
}

enum DocVisibility {
  PUBLIC             // Công khai toàn công ty
  PRIVATE            // Cá nhân người tạo
  SHARED             // Chia sẻ chỉ định
}

enum SharePerm {
  VIEW               // Chỉ xem
  EDIT               // Có quyền chỉnh sửa
}

enum DocumentScope {
  PERSONAL           // Tài liệu cá nhân
  PROJECT            // Tài liệu dự án
  DEPARTMENT         // Tài liệu phòng ban
  COMPANY            // Tài liệu toàn công ty
}

enum DocumentType {
  STANDARD           // Tài liệu thông thường
  TASK_REQUIREMENT   // Tài liệu đặc tả yêu cầu công việc
  TASK_SUBMISSION    // Báo cáo nghiệm thu sản phẩm (Deliverable)
  MEETING_MINUTES    // Biên bản cuộc họp đồng bộ từ M5
  COMPANY_POLICY     // Quy chế & Cẩm nang công ty
  TEMPLATE           // Mẫu tài liệu hành chính
}

enum NotificationType {
  MEETING            // Lời mời / Nhắc nhở họp
  ATTENDANCE_APPROVAL// Thông báo duyệt đơn chấm công
  QUICK_TASK         // Thông báo giao việc nhanh
  MENTION            // Được nhắc tên @mention
  TASK               // Được giao việc / Đổi trạng thái task
  SYSTEM             // Thông báo toàn hệ thống
  CHAT               // Tin nhắn chat mới
}

enum ConversationType {
  DIRECT             // Hội thoại trực tiếp 1-1
  PROJECT            // Nhóm hội thoại theo dự án
  DEPARTMENT         // Nhóm hội thoại theo phòng ban
}

enum ChatMessageType {
  TEXT               // Tin nhắn văn bản
  FILE               // Tin nhắn tệp đính kèm
  SYSTEM             // Tin nhắn thông báo hệ thống
}
```

---

## 3. Đặc Tả Chi Tiết Từng Bảng CSDL (Full 37 Models)

### 👥 Nhóm 1: Tổ Chức & Người Dùng

#### 1. Bảng `User` (Thông tin tài khoản & Nhân sự)
```prisma
model User {
  id           String      @id @default(cuid())
  email        String      @unique
  passwordHash String
  name         String
  avatar       String?
  role         Role        @default(EMPLOYEE)
  status       UserStatus  @default(ACTIVE)
  position     String?     // Chức danh: "Senior Fullstack Engineer", "QA Lead"...
  language     Language    @default(VI)
  departmentId String?
  department   Department? @relation(fields: [departmentId], references: [id])
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  deletedAt    DateTime?

  // Khóa ngoại liên kết tới tất cả các phân hệ
  attendanceRecords          AttendanceRecord[]
  wfhRequests                WfhRequest[]
  leaveRequests              LeaveRequest[]
  earlyLeaveRequests         EarlyLeaveRequest[]   @relation("EarlyLeaveRequester")
  reviewedEarlyLeaveRequests EarlyLeaveRequest[]   @relation("EarlyLeaveReviewer")
  overtimeRequests           OvertimeRequest[]     @relation("OvertimeRequester")
  reviewedOvertimeRequests   OvertimeRequest[]     @relation("OvertimeReviewer")
  breakLogs                  BreakLog[]
  createdProjects            Project[]             @relation("ProjectCreator")
  personalProject            Project?              @relation("PersonalProjectOwner")
  managedProjects            Project[]             @relation("ProjectManager")
  projectMemberships         ProjectMember[]
  createdTasks               Task[]                @relation("TaskCreator")
  assignedTasks              Task[]                @relation("TaskAssignee")
  completedTasks             Task[]                @relation("TaskCompletedBy")
  workLogs                   WorkLog[]
  comments                   Comment[]
  reactions                  Reaction[]
  createdMeetings            Meeting[]             @relation("MeetingCreator")
  meetingAttendees           MeetingAttendee[]
  quickTasksAssigned         QuickTask[]           @relation("QuickTaskAssignee")
  quickTasksAssignedBy       QuickTask[]           @relation("QuickTaskAssigner")
  ownedDocuments             Document[]            @relation("DocumentOwner")
  createdDocuments           Document[]            @relation("DocumentCreator")
  updatedDocuments           Document[]            @relation("DocumentUpdater")
  savedVersions              DocumentVersion[]     @relation("DocumentVersionSaver")
  uploadedAttachments        DocumentAttachment[]  @relation("DocumentAttachmentUploader")
  documentPermissions        DocumentPermission[]  @relation("DocumentPermissionUser")
  grantedPermissions         DocumentPermission[]  @relation("DocumentPermissionGranter")
  createdTemplates           DocumentTemplate[]    @relation("DocumentTemplateCreator")
  dailyReports               DailyReport[]
  receivedNotifications      Notification[]        @relation("ReceivedNotifications")
  sentNotifications          Notification[]        @relation("NotificationActor")
  pushSubscriptions          PushSubscription[]
  createdSprints             Sprint[]              @relation("SprintCreator")
  createdConversations       Conversation[]        @relation("ConversationCreator")
  conversationMemberships    ConversationMember[]
  chatMessages               ChatMessage[]
  chatReactions              ChatMessageReaction[]
}
```

#### 2. Bảng `Department` (Phòng ban doanh nghiệp)
```prisma
model Department {
  id            String         @id @default(cuid())
  name          String         // Tên phòng: "Kỹ thuật phần mềm", "Nhân sự", "Kinh doanh"
  description   String?
  managerId     String?        // ID Trưởng phòng (DEPARTMENT_HEAD)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  deletedAt     DateTime?

  users         User[]
  projects      Project[]
  meetings      Meeting[]
  documents     Document[]
  conversations Conversation[]
}
```

#### 3. Bảng `SystemConfig` (Cấu hình hệ thống toàn cục)
```prisma
model SystemConfig {
  id                 String   @id @default(cuid())
  companyName        String   // "WorkSync Enterprise"
  companyLogoUrl     String?
  timezone           String   @default("Asia/Ho_Chi_Minh")
  workStartTime      String   @default("08:00")
  workEndTime        String   @default("17:30")
  checkinStartTime   String   @default("06:00")
  checkinEndTime     String   @default("12:00")
  allowedIpRanges    String[] // Danh sách IP Wifi hợp lệ văn phòng
  officeLatitude     Float    // Tọa độ FPT Complex: 15.968600
  officeLongitude    Float    // 108.260800
  gpsRadiusMeters    Int      @default(500) // Bán kính Geofence 500m
  wfhAutoApproveTime String   @default("09:30")
  geminiApiKey       String?
  smtpHost           String?
  smtpPort           Int?
  smtpUser           String?
  smtpPass           String?
  updatedAt          DateTime @updatedAt
}
```

---

### ⏰ Nhóm 2: Điểm Danh & Chuyên Cần (Smart Attendance)

#### 4. Bảng `AttendanceRecord` (Bản ghi điểm danh hàng ngày)
```prisma
model AttendanceRecord {
  id            String           @id @default(cuid())
  userId        String
  user          User             @relation(fields: [userId], references: [id])
  date          DateTime         @db.Date
  status        AttendanceStatus // ON_TIME, LATE, WFH, ABSENT_APPROVED...
  checkInTime   DateTime?
  checkOutTime  DateTime?
  checkInIp     String?
  checkInLat    Float?
  checkInLng    Float?
  checkInMethod String?          // "GPS_IP", "MANUAL"
  note          String?
  editedBy      String?
  editedAt      DateTime?
  createdAt     DateTime         @default(now())

  @@unique([userId, date])
  @@index([userId, date])
  @@index([date])
}
```

#### 5. Bảng `EarlyLeaveRequest` (Đơn xin về sớm trước 17:30)
```prisma
model EarlyLeaveRequest {
  id                String        @id @default(cuid())
  userId            String
  user              User          @relation("EarlyLeaveRequester", fields: [userId], references: [id])
  date              DateTime      @db.Date
  expectedLeaveTime DateTime
  reason            String
  status            RequestStatus @default(PENDING)
  reviewedBy        String?
  reviewedByUser    User?         @relation("EarlyLeaveReviewer", fields: [reviewedBy], references: [id])
  reviewedAt        DateTime?
  createdAt         DateTime      @default(now())

  @@unique([userId, date])
  @@index([userId, date])
  @@index([status])
}
```

#### 6. Bảng `OvertimeRequest` (Đơn đăng ký làm thêm giờ)
```prisma
model OvertimeRequest {
  id              String        @id @default(cuid())
  userId          String
  user            User          @relation("OvertimeRequester", fields: [userId], references: [id])
  date            DateTime      @db.Date
  registeredHours Float         // Số giờ đăng ký trước
  actualHours     Float?        // Số giờ thực tế = min(registered, checkOut - 17:30)
  reason          String
  status          RequestStatus @default(PENDING)
  reviewedBy      String?
  reviewedByUser  User?         @relation("OvertimeReviewer", fields: [reviewedBy], references: [id])
  reviewedAt      DateTime?
  createdAt       DateTime      @default(now())

  @@unique([userId, date])
  @@index([userId, date])
  @@index([status])
}
```

#### 7. Bảng `BreakLog` (Nhật ký ra ngoài tạm thời & Giờ trưa)
```prisma
model BreakLog {
  id              String    @id @default(cuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  date            DateTime  @db.Date
  breakStart      DateTime
  breakEnd        DateTime?
  breakType       BreakType @default(MANUAL)
  durationMinutes Int?
  createdAt       DateTime  @default(now())

  @@index([userId, date])
}
```

#### 8. Bảng `WfhRequest` (Đơn làm việc từ xa)
```prisma
model WfhRequest {
  id         String        @id @default(cuid())
  userId     String
  user       User          @relation(fields: [userId], references: [id])
  date       DateTime      @db.Date
  reason     String
  status     RequestStatus @default(PENDING)
  approvedBy String?
  approvedAt DateTime?
  createdAt  DateTime      @default(now())

  @@unique([userId, date])
  @@index([userId, date])
  @@index([status])
}
```

#### 9. Bảng `LeaveRequest` (Đơn xin nghỉ phép & Quỹ ngày phép)
```prisma
model LeaveRequest {
  id         String        @id @default(cuid())
  userId     String
  user       User          @relation(fields: [userId], references: [id])
  type       LeaveType     // ANNUAL, SICK, UNPAID, COMPENSATORY
  startDate  DateTime      @db.Date
  endDate    DateTime      @db.Date
  dayCount   Float         // Số ngày phép xin nghỉ
  reason     String
  status     RequestStatus @default(PENDING)
  approvedBy String?
  approvedAt DateTime?
  createdAt  DateTime      @default(now())

  @@index([userId])
  @@index([status])
}
```

---

### 🗂️ Nhóm 3: Dự Án, Sprints & Công Việc (Projects, Sprints, Tasks)

#### 10. Bảng `Project` (Dự án nhóm hoặc Việc cá nhân)
```prisma
model Project {
  id           String              @id @default(cuid())
  name         String
  code         String              @unique // "WS-CORE", "PERSONAL-USR1"
  description  String?
  kind         ProjectKind         @default(TEAM)      // TEAM hoặc PERSONAL
  workflowType ProjectWorkflowType @default(KANBAN)    // SCRUM, KANBAN, DAILY, SIMPLE
  status       ProjectStatus       @default(ACTIVE)
  color        String?             @default("#3b82f6")
  creatorId    String
  creator      User                @relation("ProjectCreator", fields: [creatorId], references: [id])
  ownerId      String?             @unique             // Chủ sở hữu duy nhất nếu là PERSONAL
  owner        User?               @relation("PersonalProjectOwner", fields: [ownerId], references: [id])
  pmId         String?                                 // Project Manager nếu là TEAM
  pm           User?               @relation("ProjectManager", fields: [pmId], references: [id])
  departmentId String?
  department   Department?         @relation(fields: [departmentId], references: [id])
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt
  deletedAt    DateTime?

  members      ProjectMember[]
  sprints      Sprint[]
  epics        Epic[]
  tasks        Task[]
  customFields CustomField[]
  documents    Document[]
  meetings     Meeting[]
  conversations Conversation[]

  @@index([kind, ownerId])
  @@index([pmId])
}
```

#### 11. Bảng `ProjectMember` (Thành viên tham gia dự án nhóm)
```prisma
model ProjectMember {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  role      String   @default("MEMBER") // PM, DEV, QA, BA, TECH_LEAD
  joinedAt  DateTime @default(now())

  @@unique([projectId, userId])
  @@index([userId])
}
```

#### 12. Bảng `Sprint` (Chu kỳ phát triển Agile/Scrum chuẩn Jira)
```prisma
model Sprint {
  id          String       @id @default(cuid())
  projectId   String
  project     Project      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name        String       // "Sprint 1 — Core Architecture"
  goal        String?
  startDate   DateTime
  endDate     DateTime
  status      SprintStatus @default(PLANNING)
  totalPoints Int          @default(0)
  completedPoints Int      @default(0)
  creatorId   String
  creator     User         @relation("SprintCreator", fields: [creatorId], references: [id])
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  tasks       Task[]

  @@index([projectId, status])
}
```

#### 13. Bảng `Epic` (Hạng mục công việc lớn)
```prisma
model Epic {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  title       String
  description String?
  color       String?  @default("#8b5cf6")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tasks       Task[]
}
```

#### 14. Bảng `Task` (Nhiệm vụ công việc cốt lõi)
```prisma
model Task {
  id           String      @id @default(cuid())
  title        String
  description  String?
  status       TaskStatus  @default(TODO) // TODO, IN_PROGRESS, IN_REVIEW, BLOCKED, DONE
  priority     Priority    @default(MEDIUM) // LOW, MEDIUM, HIGH, URGENT
  projectId    String
  project      Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  sprintId     String?
  sprint       Sprint?     @relation(fields: [sprintId], references: [id])
  epicId       String?
  epic         Epic?       @relation(fields: [epicId], references: [id])
  creatorId    String
  createdBy    User        @relation("TaskCreator", fields: [creatorId], references: [id])
  assigneeId   String?     // Người nhận việc được gán bởi PM/Trưởng phòng
  assignee     User?       @relation("TaskAssignee", fields: [assigneeId], references: [id])
  completedById String?
  completedBy  User?       @relation("TaskCompletedBy", fields: [completedById], references: [id])
  completedAt  DateTime?
  parentTaskId String?
  parentTask   Task?       @relation("SubTasks", fields: [parentTaskId], references: [id])
  subTasks     Task[]      @relation("SubTasks")
  dueDate      DateTime?
  storyPoints  Int?        // Điểm phức tạp Story Points
  timeEstimate Float?      // Giờ ước tính
  timeTracked  Float?      @default(0) // Giờ thực tế đã thực hiện
  boardOrder   Float       @default(0) // Vị trí kéo thả trên cột Kanban
  labels       String[]    // ["BACKEND", "UI", "BUG", "URGENT"]
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt
  deletedAt    DateTime?

  workLogs     WorkLog[]
  comments     Comment[]
  dependencies TaskDependency[] @relation("TaskDependencies")
  dependents   TaskDependency[] @relation("DependentTasks")
  customFieldValues CustomFieldValue[]
  documents    Document[]

  @@index([projectId, status])
  @@index([assigneeId, status])
  @@index([sprintId])
}
```

#### 15. Bảng `TaskDependency` (Ràng buộc quan hệ công việc)
```prisma
model TaskDependency {
  id             String         @id @default(cuid())
  taskId         String
  task           Task           @relation("TaskDependencies", fields: [taskId], references: [id], onDelete: Cascade)
  dependsOnTaskId String
  dependsOnTask  Task           @relation("DependentTasks", fields: [dependsOnTaskId], references: [id], onDelete: Cascade)
  type           DependencyType @default(FINISH_TO_START)

  @@unique([taskId, dependsOnTaskId])
}
```

#### 16. Bảng `WorkLog` (Nhật ký ghi nhận giờ làm việc)
```prisma
model WorkLog {
  id          String    @id @default(cuid())
  taskId      String
  task        Task      @relation(fields: [taskId], references: [id], onDelete: Cascade)
  userId      String
  user        User      @relation(fields: [userId], references: [id])
  hoursSpent  Float     // Số giờ làm việc thực tế
  date        DateTime  @db.Date
  description String?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([taskId])
  @@index([userId, date])
}
```

#### 17. Bảng `Comment` & 18. Bảng `Reaction` (Bình luận & Thả cảm xúc trao đổi)
```prisma
model Comment {
  id        String     @id @default(cuid())
  taskId    String
  task      Task       @relation(fields: [taskId], references: [id], onDelete: Cascade)
  userId    String
  user      User       @relation(fields: [userId], references: [id])
  content   String
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt
  deletedAt DateTime?

  reactions Reaction[]
  @@index([taskId])
}

model Reaction {
  id        String   @id @default(cuid())
  commentId String
  comment   Comment  @relation(fields: [commentId], references: [id], onDelete: Cascade)
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  emoji     String   // "👍", "❤️", "🚀", "🎉"
  createdAt DateTime @default(now())

  @@unique([commentId, userId, emoji])
}
```

#### 19. Bảng `CustomField` & 20. Bảng `CustomFieldValue` (Trường dữ liệu tùy biến)
```prisma
model CustomField {
  id          String          @id @default(cuid())
  projectId   String
  project     Project         @relation(fields: [projectId], references: [id], onDelete: Cascade)
  name        String          // "Môi trường test", "Khách hàng"
  type        CustomFieldType // TEXT, NUMBER, DATE, DROPDOWN, CHECKBOX
  options     String[]        // Cho DROPDOWN
  isRequired  Boolean         @default(false)
  createdAt   DateTime        @default(now())

  values      CustomFieldValue[]
}

model CustomFieldValue {
  id            String      @id @default(cuid())
  customFieldId String
  customField   CustomField @relation(fields: [customFieldId], references: [id], onDelete: Cascade)
  taskId        String
  task          Task        @relation(fields: [taskId], references: [id], onDelete: Cascade)
  value         String      // Lưu chuỗi đại diện giá trị

  @@unique([customFieldId, taskId])
}
```

#### 21. Bảng `QuickTask` (Giao việc nhanh 1-chạm của Trưởng phòng ban)
```prisma
model QuickTask {
  id           String        @id @default(cuid())
  title        String
  description  String?
  priority     Priority      @default(HIGH)
  dueDate      DateTime?
  status       TaskStatus    @default(TODO)
  assignerId   String        // ID Trưởng phòng / PM giao
  assigner     User          @relation("QuickTaskAssigner", fields: [assignerId], references: [id])
  assigneeId   String        // ID Nhân viên nhận việc
  assignee     User          @relation("QuickTaskAssignee", fields: [assigneeId], references: [id])
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  @@index([assigneeId, status])
  @@index([assignerId])
}
```

---

### 📹 Nhóm 4: Cuộc Họp Trực Tuyến & Biên Bản AI (Meetings & Gemini AI)

#### 22. Bảng `Meeting` (Phòng họp trực tuyến WebRTC)
```prisma
model Meeting {
  id           String        @id @default(cuid())
  title        String
  description  String?
  scope        MeetingScope  @default(PROJECT) // PROJECT, DEPARTMENT, ONE_ON_ONE
  projectId    String?
  project      Project?      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  departmentId String?
  department   Department?   @relation(fields: [departmentId], references: [id], onDelete: Cascade)
  hostId       String        // Chủ tọa cuộc họp
  host         User          @relation("MeetingCreator", fields: [hostId], references: [id])
  startTime    DateTime
  endTime      DateTime?
  status       MeetingStatus @default(SCHEDULED) // SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED
  meetingLink  String?       @unique // Link truy cập phòng họp: "/meetings/room-xyz"
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  deletedAt    DateTime?

  attendees    MeetingAttendee[]
  minutes      MeetingMinute?
  transcripts  MeetingTranscriptChunk[]
  documents    Document[]

  @@index([hostId])
  @@index([startTime, status])
}
```

#### 23. Bảng `MeetingAttendee` (Người tham gia & Phản hồi RSVP)
```prisma
model MeetingAttendee {
  id              String    @id @default(cuid())
  meetingId       String
  meeting         Meeting   @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  rsvp            RSVP      @default(PENDING) // PENDING, ACCEPTED, DECLINED
  joinedAt        DateTime?
  leftAt          DateTime?
  durationMinutes Int?      @default(0) // Số phút thực tế có mặt trong phòng

  @@unique([meetingId, userId])
  @@index([userId])
}
```

#### 24. Bảng `MeetingMinute` (Biên bản họp & Phân tích Gemini 1.5 Flash AI)
```prisma
model MeetingMinute {
  id             String      @id @default(cuid())
  meetingId      String      @unique
  meeting        Meeting     @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  rawTranscript  String?     // Toàn văn lời thoại ghép nối từ chunks
  aiSummary      String?     // Tóm tắt điều hành cấu trúc
  actionItems    Json?       // Danh sách việc cần làm: [{task, assigneeId, dueDate}]
  decisions      Json?       // Danh sách quyết định đạt được
  keyDiscussions Json?       // Các chủ đề thảo luận chính
  risks          Json?       // Rủi ro & trở ngại được phát hiện
  sentiment      String?     // Đánh giá không khí cuộc họp
  aiStatus       AiJobStatus @default(PENDING) // PENDING, PROCESSING, DONE, FAILED
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
}
```

#### 25. Bảng `MeetingTranscriptChunk` (Phân mảnh nhận diện giọng nói STT)
```prisma
model MeetingTranscriptChunk {
  id          String   @id @default(cuid())
  meetingId   String
  meeting     Meeting  @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  speakerId   String?  // ID người phát biểu
  speakerName String   // Tên hiển thị người nói
  content     String   // Câu thoại nhận diện được từ Web Speech API
  timestamp   DateTime @default(now())
  chunkIndex  Int      // Số thứ tự phân mảnh (chống race condition khi nhiều người nói)

  @@index([meetingId, chunkIndex])
}
```

---

### 📄 Nhóm 5: Không Gian Quản Trị Tri Thức (ClickUp Docs)

#### 26. Bảng `Document` (Tài liệu Rich-Text)
```prisma
model Document {
  id           String        @id @default(cuid())
  title        String
  content      String        // HTML / JSON lưu trữ từ Tiptap editor
  scope        DocumentScope @default(PROJECT) // PERSONAL, PROJECT, DEPARTMENT, COMPANY
  docType      DocumentType  @default(STANDARD)// TASK_REQUIREMENT, TASK_SUBMISSION, MEETING_MINUTES...
  visibility   DocVisibility @default(PUBLIC)
  projectId    String?
  project      Project?      @relation(fields: [projectId], references: [id], onDelete: Cascade)
  departmentId String?
  department   Department?   @relation(fields: [departmentId], references: [id], onDelete: Cascade)
  taskId       String?
  task         Task?         @relation(fields: [taskId], references: [id])
  meetingId    String?
  meeting      Meeting?      @relation(fields: [meetingId], references: [id])
  ownerId      String
  owner        User          @relation("DocumentOwner", fields: [ownerId], references: [id])
  creatorId    String
  creator      User          @relation("DocumentCreator", fields: [creatorId], references: [id])
  updatedById  String?
  updatedBy    User?         @relation("DocumentUpdater", fields: [updatedById], references: [id])
  version      Int           @default(1)
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
  deletedAt    DateTime?

  versions     DocumentVersion[]
  attachments  DocumentAttachment[]
  permissions  DocumentPermission[]

  @@index([scope, docType])
  @@index([projectId])
  @@index([taskId])
}
```

#### 27. Bảng `DocumentVersion` (Lịch sử các phiên bản tài liệu)
```prisma
model DocumentVersion {
  id            String   @id @default(cuid())
  documentId    String
  document      Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  versionNumber Int
  title         String
  content       String
  savedById     String
  savedBy       User     @relation("DocumentVersionSaver", fields: [savedById], references: [id])
  createdAt     DateTime @default(now())

  @@unique([documentId, versionNumber])
}
```

#### 28. Bảng `DocumentAttachment` (Tệp tin đính kèm tới 25MB)
```prisma
model DocumentAttachment {
  id          String   @id @default(cuid())
  documentId  String
  document    Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  fileName    String
  fileSize    Int      // Kích thước tệp (bytes)
  mimeType    String   // "application/pdf", "image/png"...
  storagePath String   // Đường dẫn lưu trữ trên ổ đĩa: "/uploads/docs/..."
  uploaderId  String
  uploader    User     @relation("DocumentAttachmentUploader", fields: [uploaderId], references: [id])
  createdAt   DateTime @default(now())

  @@index([documentId])
}
```

#### 29. Bảng `DocumentPermission` & 30. Bảng `DocumentTemplate`
- `DocumentPermission`: Quản lý phân quyền chia sẻ (`userId`, `documentId`, `permission: VIEW | EDIT`).
- `DocumentTemplate`: Kho mẫu văn bản hành chính doanh nghiệp (`title`, `content`, `category`, `creatorId`).

---

### 💬 Nhóm 6: Trò Chuyện Trực Tuyến & Thông Báo (Chat & Notifications)

#### 31. Bảng `Conversation` (Hội thoại trò chuyện)
```prisma
model Conversation {
  id            String           @id @default(cuid())
  type          ConversationType @default(DIRECT) // DIRECT, PROJECT, DEPARTMENT
  projectId     String?
  project       Project?         @relation(fields: [projectId], references: [id], onDelete: Cascade)
  departmentId  String?
  department    Department?      @relation(fields: [departmentId], references: [id], onDelete: Cascade)
  name          String?          // Tên nhóm nếu là group
  avatar        String?
  creatorId     String?
  creator       User?            @relation("ConversationCreator", fields: [creatorId], references: [id])
  lastMessageAt DateTime         @default(now())
  createdAt     DateTime         @default(now())
  updatedAt     DateTime         @updatedAt

  members       ConversationMember[]
  messages      ChatMessage[]

  @@index([type])
  @@index([lastMessageAt])
}
```

#### 32. Bảng `ConversationMember` (Thành viên cuộc trò chuyện)
```prisma
model ConversationMember {
  id             String       @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  userId         String
  user           User         @relation(fields: [userId], references: [id])
  isPinned       Boolean      @default(false) // Ghim lên đầu danh sách
  isMuted        Boolean      @default(false) // Tắt thông báo
  unreadCount    Int          @default(0)     // Số tin chưa đọc
  lastReadAt     DateTime?
  joinedAt       DateTime     @default(now())

  @@unique([conversationId, userId])
  @@index([userId])
}
```

#### 33. Bảng `ChatMessage` (Tin nhắn văn bản & tệp tin)
```prisma
model ChatMessage {
  id             String          @id @default(cuid())
  conversationId String
  conversation   Conversation    @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  senderId       String
  sender         User            @relation(fields: [senderId], references: [id])
  type           ChatMessageType @default(TEXT) // TEXT, FILE, SYSTEM
  content        String
  fileUrl        String?         // Link tệp đính kèm: "/uploads/chat/..."
  fileName       String?
  fileSize       Int?
  replyToId      String?
  replyTo        ChatMessage?    @relation("ReplyQuote", fields: [replyToId], references: [id])
  replies        ChatMessage[]   @relation("ReplyQuote")
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  deletedAt      DateTime?

  reactions      ChatMessageReaction[]

  @@index([conversationId, createdAt])
}
```

#### 34. Bảng `ChatMessageReaction` (Cảm xúc emoji trên tin nhắn)
```prisma
model ChatMessageReaction {
  id        String      @id @default(cuid())
  messageId String
  message   ChatMessage @relation(fields: [messageId], references: [id], onDelete: Cascade)
  userId    String
  user      User        @relation(fields: [userId], references: [id])
  emoji     String      // "👍", "❤️", "😂", "🎉", "🚀"
  createdAt DateTime    @default(now())

  @@unique([messageId, userId, emoji])
}
```

#### 35. Bảng `Notification` (Thông báo nội bộ thời gian thực)
```prisma
model Notification {
  id        String           @id @default(cuid())
  userId    String           // Người nhận thông báo
  user      User             @relation("ReceivedNotifications", fields: [userId], references: [id])
  actorId   String?          // Người tạo ra hành động
  actor     User?            @relation("NotificationActor", fields: [actorId], references: [id])
  type      NotificationType // MEETING, ATTENDANCE_APPROVAL, QUICK_TASK, TASK, CHAT...
  title     String
  message   String
  link      String?          // Đường dẫn điều hướng nhanh
  isRead    Boolean          @default(false)
  createdAt DateTime         @default(now())

  @@index([userId, isRead])
  @@index([createdAt])
}
```

#### 36. Bảng `PushSubscription` & 37. Bảng `DailyReport`
```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  endpoint  String   @unique
  p256dh    String
  auth      String
  createdAt DateTime @default(now())

  @@index([userId])
}

model DailyReport {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id])
  date       DateTime @db.Date
  tasksDone  String[] // Danh sách việc đã xong
  tasksTodo  String[] // Kế hoạch ngày mai
  blockers   String?  // Khó khăn / Trở ngại
  aiDrafted  Boolean  @default(false)
  submittedAt DateTime @default(now())

  @@unique([userId, date])
}
```
