# 🗄️ Database Schema & ERD — WorkSync
> Stack: PostgreSQL 16 + Prisma 5
> **Conventions:** id dùng cuid(), mọi entity có createdAt/updatedAt/deletedAt, soft delete bắt buộc

---

## ERD Tổng quan (Text)

```
Company
├── Department (nhiều phòng ban)
│   └── User (nhiều nhân viên)
│       ├── AttendanceRecord (lịch sử điểm danh)
│       ├── WfhRequest (đơn WFH)
│       ├── LeaveRequest (đơn nghỉ phép)
│       └── Notification (thông báo)
│
├── Project (nhiều dự án)
│   ├── ProjectMember (thành viên dự án - nhiều-nhiều User)
│   ├── Sprint (nhiều sprint)
│   │   └── Epic
│   │       └── Task (có thể có parentTask = sub-task)
│   │           ├── WorkLog
│   │           ├── Comment (có reactions)
│   │           ├── TaskAttachment
│   │           ├── TaskDependency (nhiều-nhiều Task)
│   │           └── CustomFieldValue
│   ├── CustomField (custom fields của project)
│   ├── Document (ClickUp Docs - nested)
│   │   └── Document (sub-docs - self-referential)
│   └── Meeting
│       ├── MeetingParticipant (nhiều-nhiều User)
│       ├── MeetingMinutes
│       └── MeetingAiSummary
│
└── DailyReport (báo cáo cuối ngày)
```

---

## Chi tiết từng Table

### 1. users
```sql
id            String    @id @default(cuid())
email         String    @unique
passwordHash  String
name          String
avatar        String?
role          Role      -- ADMIN | HR | PM | EMPLOYEE
status        UserStatus -- ACTIVE | INACTIVE | SUSPENDED
position      String?   -- "Backend Developer", "Designer"...
language      Language  -- VI | EN | KO (default: VI)
departmentId  String?
department    Department @relation
createdAt     DateTime  @default(now())
updatedAt     DateTime  @updatedAt
deletedAt     DateTime?
```

### 2. departments
```sql
id          String    @id @default(cuid())
name        String    -- "Engineering", "QA", "Design"
description String?
managerId   String?   -- HR Manager hoặc người phụ trách
createdAt   DateTime
updatedAt   DateTime
deletedAt   DateTime?
```

### 3. system_config
```sql
id                String   @id @default(cuid())
companyName       String
companyLogoUrl    String?
timezone          String   @default("Asia/Ho_Chi_Minh")
workStartTime     String   @default("08:00")
workEndTime       String   @default("17:30")
checkinStartTime  String   @default("06:00")
checkinEndTime    String   @default("12:00")
-- IP Wifi whitelist
allowedIpRanges   String[] -- ["192.168.1.0/24", "10.0.0.0/8"]
-- GPS
officeLatitude    Float
officeLongitude   Float
gpsRadiusMeters   Int      @default(100)
-- WFH auto-approve
wfhAutoApproveTime String  @default("09:30")
-- Gemini
geminiApiKey      String?
-- SMTP
smtpHost          String?
smtpPort          Int?
smtpUser          String?
smtpPass          String?
updatedAt         DateTime @updatedAt
```

### 4. attendance_records
```sql
id            String          @id @default(cuid())
userId        String
user          User            @relation
date          DateTime        -- ngày điểm danh (date only)
status        AttendanceStatus -- ON_TIME | LATE | VERY_LATE | WFH | BUSINESS_TRIP | ABSENT_APPROVED | ABSENT_UNAPPROVED
checkInTime   DateTime?
checkOutTime  DateTime?
checkInIp     String?
checkInLat    Float?
checkInLng    Float?
checkInMethod String?         -- "IP" | "GPS" | "MANUAL"
note          String?
editedBy      String?         -- HR manual edit userId
editedAt      DateTime?
createdAt     DateTime        @default(now())

@@unique([userId, date])
```

### 5. wfh_requests
```sql
id            String        @id @default(cuid())
userId        String
user          User          @relation
date          DateTime
reason        String
expectedStart String
expectedEnd   String
status        RequestStatus -- PENDING | APPROVED | REJECTED | AUTO_APPROVED
reviewedBy    String?
reviewedAt    DateTime?
rejectionNote String?
createdAt     DateTime      @default(now())
updatedAt     DateTime      @updatedAt
```

### 6. leave_requests
```sql
id            String        @id @default(cuid())
userId        String
startDate     DateTime
endDate       DateTime
leaveType     LeaveType     -- ANNUAL | SICK | UNPAID | COMPENSATORY
reason        String
status        RequestStatus
dayCount      Float         -- số ngày nghỉ (0.5 nếu nửa ngày)
reviewedBy    String?
reviewedAt    DateTime?
createdAt     DateTime      @default(now())
updatedAt     DateTime      @updatedAt
```

### 7. projects
```sql
id          String        @id @default(cuid())
name        String
description String?
status      ProjectStatus -- PLANNING | ACTIVE | ON_HOLD | COMPLETED | ARCHIVED
color       String        @default("#3B82F6")
icon        String?
startDate   DateTime?
endDate     DateTime?
createdById String
createdBy   User          @relation
createdAt   DateTime      @default(now())
updatedAt   DateTime      @updatedAt
deletedAt   DateTime?
```

### 8. project_members
```sql
id          String      @id @default(cuid())
projectId   String
userId      String
projectRole String      -- "PM" | "DEVELOPER" | "DESIGNER" | "TESTER" | "BA" | "DEVOPS"
joinedAt    DateTime    @default(now())

@@unique([projectId, userId])
```

### 9. sprints
```sql
id          String       @id @default(cuid())
projectId   String
project     Project      @relation
name        String       -- "Sprint 1", "Sprint 2"
goal        String?
status      SprintStatus -- PLANNING | ACTIVE | COMPLETED
startDate   DateTime?
endDate     DateTime?
createdAt   DateTime     @default(now())
updatedAt   DateTime     @updatedAt
```

### 10. epics
```sql
id          String   @id @default(cuid())
projectId   String
sprintId    String?
title       String
description String?
color       String?
startDate   DateTime?
endDate     DateTime?
createdAt   DateTime @default(now())
updatedAt   DateTime @updatedAt
deletedAt   DateTime?
```

### 11. tasks
```sql
id              String      @id @default(cuid())
projectId       String
sprintId        String?
epicId          String?
parentTaskId    String?     -- null = task gốc, có giá trị = sub-task
assigneeId      String?
createdById     String
title           String
description     String?     -- Rich text JSON (ProseMirror/Tiptap format)
status          TaskStatus  -- TODO | IN_PROGRESS | IN_REVIEW | BLOCKED | DONE
priority        Priority    -- LOW | MEDIUM | HIGH | URGENT
storyPoints     Int?
timeEstimate    Int?        -- minutes
timeTracked     Int         @default(0) -- minutes (tổng từ work logs)
position        Int         @default(0) -- thứ tự trong kanban column
dueDate         DateTime?
labels          String[]    -- ["backend", "auth", "urgent"]
deletedAt       DateTime?
createdAt       DateTime    @default(now())
updatedAt       DateTime    @updatedAt
```

### 12. task_dependencies
```sql
id            String         @id @default(cuid())
taskId        String         -- task phụ thuộc vào...
dependsOnId   String         -- ...task này
dependencyType DependencyType -- FINISH_TO_START | START_TO_START | FINISH_TO_FINISH

@@unique([taskId, dependsOnId])
```

### 13. work_logs
```sql
id          String   @id @default(cuid())
taskId      String
userId      String
duration    Int      -- minutes
description String?
logDate     DateTime @default(now())
createdAt   DateTime @default(now())
updatedAt   DateTime @updatedAt
```

### 14. comments
```sql
id          String   @id @default(cuid())
taskId      String?
docId       String?
meetingId   String?
authorId    String
content     String   -- Rich text JSON
mentions    String[] -- userId[]
isEdited    Boolean  @default(false)
createdAt   DateTime @default(now())
updatedAt   DateTime @updatedAt
deletedAt   DateTime?
```

### 15. reactions
```sql
id        String   @id @default(cuid())
commentId String
userId    String
emoji     String   -- "👍", "🔥", "✅"

@@unique([commentId, userId, emoji])
```

### 16. custom_fields
```sql
id          String          @id @default(cuid())
projectId   String
name        String          -- "Khách hàng", "Priority Score"
fieldType   CustomFieldType -- TEXT | NUMBER | DATE | DROPDOWN | CHECKBOX
options     String[]        -- Cho DROPDOWN: ["Option A", "Option B"]
createdAt   DateTime        @default(now())
```

### 17. custom_field_values
```sql
id            String @id @default(cuid())
taskId        String
customFieldId String
value         String -- Lưu dạng string, parse theo fieldType
updatedAt     DateTime @updatedAt

@@unique([taskId, customFieldId])
```

### 18. meetings
```sql
id          String        @id @default(cuid())
projectId   String?
createdById String
title       String
description String?
status      MeetingStatus -- SCHEDULED | ONGOING | ENDED | CANCELLED
startTime   DateTime
endTime     DateTime
roomCode    String        @unique -- "ws-abc123" cho WebRTC room
agenda      String[]      -- Danh sách agenda items
recordingUrl String?
createdAt   DateTime      @default(now())
updatedAt   DateTime      @updatedAt
```

### 19. meeting_participants
```sql
id         String             @id @default(cuid())
meetingId  String
userId     String
rsvpStatus RsvpStatus         -- PENDING | ACCEPTED | DECLINED
joinedAt   DateTime?
leftAt     DateTime?

@@unique([meetingId, userId])
```

### 20. meeting_minutes
```sql
id          String   @id @default(cuid())
meetingId   String   @unique
content     String   -- Rich text JSON (biên bản)
actionItems Json[]   -- [{ title, assigneeId, deadline }]
decisions   String[]
updatedById String?
createdAt   DateTime @default(now())
updatedAt   DateTime @updatedAt
```

### 21. meeting_ai_summaries
```sql
id           String      @id @default(cuid())
meetingId    String      @unique
status       AiJobStatus -- PENDING | PROCESSING | DONE | FAILED
summaryVi    String?
summaryEn    String?
summaryKo    String?
keyDecisions String[]
actionItems  Json[]
risks        String[]
generatedAt  DateTime?
createdAt    DateTime    @default(now())
```

### 22. documents
```sql
id           String     @id @default(cuid())
projectId    String?
parentDocId  String?    -- Self-referential: null = root doc
createdById  String
title        String
content      Json?      -- ProseMirror/Tiptap JSON content
visibility   DocVisibility -- PUBLIC | PRIVATE | SHARED
currentVersion Int      @default(1)
wordCount    Int        @default(0)
icon         String?
createdAt    DateTime   @default(now())
updatedAt    DateTime   @updatedAt
deletedAt    DateTime?
```

### 23. document_versions
```sql
id          String   @id @default(cuid())
docId       String
version     Int
content     Json     -- Snapshot nội dung tại version đó
updatedById String
createdAt   DateTime @default(now())

@@unique([docId, version])
```

### 24. document_shares
```sql
id         String      @id @default(cuid())
docId      String
userId     String
permission SharePerm   -- VIEW | EDIT
createdAt  DateTime    @default(now())

@@unique([docId, userId])
```

### 25. document_ai_summaries
```sql
id         String      @id @default(cuid())
docId      String      @unique
status     AiJobStatus
summary    String?
keyPoints  String[]
createdAt  DateTime    @default(now())
```

### 26. daily_reports
```sql
id            String   @id @default(cuid())
userId        String
date          DateTime
content       String   -- Nội dung báo cáo (rich text)
tasksDone     String[] -- taskId[]
blockers      String?
plannedTomorrow String?
aiDrafted     Boolean  @default(false)
submittedAt   DateTime?
createdAt     DateTime @default(now())
updatedAt     DateTime @updatedAt

@@unique([userId, date])
```

### 27. notifications
```sql
id         String           @id @default(cuid())
userId     String           -- người nhận
type       NotificationType
title      String
message    String
link       String?          -- deep link vào app
read       Boolean          @default(false)
readAt     DateTime?
metadata   Json?            -- extra data tùy type
createdAt  DateTime         @default(now())
```

### 28. audit_logs
```sql
id         String   @id @default(cuid())
userId     String?
action     String   -- "USER_LOGIN", "TASK_STATUS_CHANGED"
entityType String?  -- "Task", "User", "Project"
entityId   String?
oldValue   Json?
newValue   Json?
ipAddress  String?
userAgent  String?
createdAt  DateTime @default(now())
```

---

## Enums

```prisma
enum Role              { ADMIN HR PM EMPLOYEE }
enum UserStatus        { ACTIVE INACTIVE SUSPENDED }
enum Language          { VI EN KO }
enum AttendanceStatus  { ON_TIME LATE VERY_LATE WFH BUSINESS_TRIP ABSENT_APPROVED ABSENT_UNAPPROVED }
enum RequestStatus     { PENDING APPROVED REJECTED AUTO_APPROVED }
enum LeaveType         { ANNUAL SICK UNPAID COMPENSATORY }
enum ProjectStatus     { PLANNING ACTIVE ON_HOLD COMPLETED ARCHIVED }
enum SprintStatus      { PLANNING ACTIVE COMPLETED }
enum TaskStatus        { TODO IN_PROGRESS IN_REVIEW BLOCKED DONE }
enum Priority          { LOW MEDIUM HIGH URGENT }
enum DependencyType    { FINISH_TO_START START_TO_START FINISH_TO_FINISH }
enum CustomFieldType   { TEXT NUMBER DATE DROPDOWN CHECKBOX }
enum MeetingStatus     { SCHEDULED ONGOING ENDED CANCELLED }
enum RsvpStatus        { PENDING ACCEPTED DECLINED }
enum AiJobStatus       { PENDING PROCESSING DONE FAILED }
enum DocVisibility     { PUBLIC PRIVATE SHARED }
enum SharePerm         { VIEW EDIT }
enum NotificationType  {
  TASK_ASSIGNED TASK_STATUS_CHANGED TASK_COMMENTED TASK_DEADLINE_SOON
  TASK_OVERDUE TASK_BLOCKED TASK_MENTION
  SPRINT_STARTED SPRINT_ENDED
  MEETING_INVITED MEETING_STARTING MEETING_AI_READY
  WFH_REQUEST_PENDING WFH_APPROVED WFH_REJECTED
  DAILY_REPORT_REMINDER
  SYSTEM
}
```

---

## Indexes quan trọng

```sql
-- Tìm kiếm tasks thường xuyên
CREATE INDEX idx_tasks_project_status ON tasks(projectId, status) WHERE deletedAt IS NULL;
CREATE INDEX idx_tasks_assignee ON tasks(assigneeId) WHERE deletedAt IS NULL;
CREATE INDEX idx_tasks_sprint ON tasks(sprintId) WHERE deletedAt IS NULL;

-- Điểm danh theo ngày
CREATE INDEX idx_attendance_user_date ON attendance_records(userId, date);
CREATE INDEX idx_attendance_date ON attendance_records(date);

-- Notifications theo user chưa đọc
CREATE INDEX idx_notifications_user_unread ON notifications(userId, read) WHERE read = false;

-- Documents tree
CREATE INDEX idx_docs_parent ON documents(parentDocId) WHERE deletedAt IS NULL;
CREATE INDEX idx_docs_project ON documents(projectId) WHERE deletedAt IS NULL;
```
