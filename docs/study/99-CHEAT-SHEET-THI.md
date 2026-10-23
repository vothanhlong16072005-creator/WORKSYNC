# 99 — CHEAT SHEET ÔN THI & PHỎNG VẤN

> **Cách dùng:** đọc lướt phần 1–3 trước khi vào phòng thi. Phần 4–8 để tra khi cần.
> **Nguyên tắc:** trả lời **"vì sao"** chứ không chỉ **"cái gì"** — giáo viên đánh giá tư duy, không đánh giá trí nhớ.

---

# PHẦN 1 — 30 GIÂY TỰ GIỚI THIỆU

> "WorkSync là nền tảng quản lý công việc doanh nghiệp, kiểu Jira + Slack + Google Calendar gộp lại. Kiến trúc **monorepo**: backend NestJS 12 + Prisma 5 + PostgreSQL 16, frontend React 19 + Vite 8 + TypeScript strict. Hệ thống có **5 vai trò**, phân quyền 3 tầng: JWT guard ở tầng HTTP, `@Roles()` ở tầng route, và **ownership check ở service layer** để chặn IDOR. Tính năng nổi bật nhất là **chấm công GPS geofence** bằng công thức Haversine, **họp video WebRTC mesh** có AI tóm tắt Gemini, **chat real-time** Socket.IO, và **lịch tổng hợp 6 nguồn** có engine phát hiện xung đột. Backend có **38 file test**, frontend **28 file test**."

---

# PHẦN 2 — 10 CON SỐ PHẢI NHỚ

| Số | Ý nghĩa |
|----|---------|
| **5** | Vai trò: ADMIN, HR, DEPARTMENT_HEAD, PM, EMPLOYEE |
| **37** | Prisma model |
| **26** | Prisma enum |
| **3** | Namespace WebSocket: `/chat`, `/meetings`, `/notifications` |
| **100m** | Bán kính geofence GPS |
| **25MB** | Giới hạn file đính kèm |
| **12** | Số loại sự kiện trong Calendar timeline (6 loại × nhiều nguồn) |
| **4** | Loại quy trình dự án: SCRUM, KANBAN, DAILY, SIMPLE |
| **3** | Loại xung đột lịch: meeting_overlap, overdue_overload, leave_during_meeting |
| **66** | Tổng file test (38 backend + 28 frontend) |

---

# PHẦN 3 — 20 CÂU HỎI THẦY THƯỜNG HỎI

### Q1. Dự án này giải quyết vấn đề gì?
> Quản lý vận hành doanh nghiệp trong **1 nơi**: chấm công GPS, quản lý task/sprint dự án, họp video, tài liệu, chat, lịch tổng hợp, dashboard theo vai trò. Trước đó các việc này nằm rời rạc ở Google Sheets/Docs/Calendar → không có dữ liệu liên thông, không audit được.

### Q2. Vì sao chọn NestJS?
> (1) **DI tự động** bằng decorator → dễ thay đổi implementation. (2) **Guard/Interceptor/Pipe** chuẩn hoá cross-cutting concern (auth, validation, logging). (3) **Module** cô lập → scale được. (4) Cùng hệ sinh thái TypeScript với frontend.

### Q3. Vì sao Prisma thay vì TypeORM?
> (1) **Type-safe**: `PrismaClient` sinh type tự động, đổi schema → TypeScript báo lỗi ngay. (2) **Migration** có lịch sử. (3) **Transaction API** rõ ràng (`$transaction([...])`). (4) Query builder an toàn mặc định → không có SQL injection kiểu nối chuỗi.

### Q4. Phân quyền 3 tầng là gì?
> ① **HTTP**: `JwtAuthGuard` chặn request không token. ② **Route**: `RolesGuard` + `@Roles('ADMIN')`. ③ **Service**: `ProjectAccessService`, `ensureMembership`, `canReschedule` kiểm tra quan hệ với **resource cụ thể**.
> **Tầng ③ là bắt buộc** — vì role không đủ để quyết định (PM của dự án A không được đụng dự án B).

### Q5. Soft delete là gì, vì sao dùng?
> Xoá bằng cách set `deletedAt = now()` thay vì `DELETE`. Giữ dữ liệu để audit, khôi phục được. Mọi query đều lọc `deletedAt: null`.

### Q6. Transaction khi nào cần?
> Khi **nhiều thao tác phải thành công cùng nhau**: (1) Update Kanban position — đổi cả 2 task. (2) Swap PM — đổi 2 người trong dự án. (3) Trừ ngày nghỉ phép + tạo record. (4) Upsert personal project khi đăng ký.
> `prisma.$transaction([...])` cho thao tác độc lập, `prisma.$transaction(async tx => ...)` khi cần đọc trước rồi ghi.

### Q7. `Promise.all` khác `Promise.allSettled`?
> `Promise.all` → reject ngay khi 1 promise lỗi (fail-fast). `allSettled` → chờ hết, mỗi cái độc lập.
> Dùng `all` cho query độc lập (lỗi 1 = lỗi hệ thống). Dùng `allSettled` cho **fan-out** (gửi push tới nhiều thiết bị — 1 thiết bị fail không được chặn các thiết bị khác).

### Q8. Chấm công GPS hoạt động thế nào?
> Haversine formula tính khoảng cách **cầu nối lớn** giữa vị trí GPS và tọa độ văn phòng, so với `radiusMeters: 100`. 3 preset văn phòng FPT (Đà Nẵng, Hà Nội, TP.HCM). **Fail-closed**: không có GPS hoặc không đủ quyền → từ chối, không cho qua.

### Q9: Vì sao cần kiểm tra IP nữa, GPS chưa đủ?
> GPS có thể bị **spoof** (fake app). IP check là lớp phòng thủ thứ 2: mạng văn phòng = hợp lệ. Dùng `ip-range-check` với **fail-closed** (thiếu cấu hình IP range → chặn, không phải cho qua).
> IPv4-mapped IPv6 (`::ffff:127.0.0.1`) phải **normalize** trước khi check — nếu không sẽ bypass.

### Q10: Tính giờ làm việc thế nào?
> `checkOut - checkIn` → trừ **phần giao đèa giờ nghỉ trưa** (`getLunchOverlapMinutes`) → giờ làm việc thực tế. OT = `min(registeredHours, checkOut - 17:30)`. Ngày chuẩn hóa qua `getLocalDateOnly()` với timezone `Asia/Ho_Chi_Minh`.

### Q11: WebRTC mesh là gì, hạn chế?
> Mỗi peer kết nối **trực tiếp** với mọi peer khác. Ưu: không cần server media, độ trễ thấp. **Nhược**: với N người → N(N-1)/2 kết nối; tối đa ~4–6 người/room. Giải pháp mở rộng: SFU (mediasoup, LiveKit).
> Giải quyết **glare**: khi 2 peer cùng tạo offer → quy tắc tất định `self.id < remoteUserId` để chỉ 1 bên là initiator.

### Q12: Vì sao chia 2 track cho chia sẻ màn hình?
> `worksync-cam-*` và `worksync-screen-*` là 2 transceiver độc lập. Nếu dùng chung 1 track → khi người dùng tắt camera, màn hình cũng mất. Tách track → bật/tắc độc lập, đúng trải nghiệm người dùng.

### Q13: STT tiếng Việt hoạt động thế nào?
> **Web Speech API** (`SpeechRecognition`, `lang: 'vi-VN'`) — không cần gửi audio lên server. Vấn đề: engine nhận dạng liên tục → câu bị cắt vụn. Giải pháp: **Smart Sentence Buffer** — chỉ flush khi đạt **≥ 15 từ** HOẶC gặp dấu câu (`.`, `?`, `!`). Kết quả: transcript dạng câu hoàn chỉnh, đọc dễ hơn nhiều.

### Q14: AI tóm tắt họp dùng gì?
> **Google Gemini 1.5 Flash** qua `@google/generative-ai`. Input: transcript đã đánh dấu speaker + agenda. Output: tóm tắt, quyết định, action item (có attribution người phụ trách).
> **Fallback**: nếu không có `GEMINI_API_KEY` hoặc API lỗi → dùng heuristic (đếm task, nhóm action item theo keyword) → hệ thống không bao giờ "chết" vì AI.

### Q15. Tại sao lưu cả JSON lẫn Text cho tài liệu?
> `content Json` giữ cấu trúc rich-text để render lại (bold, table, image). `contentText String` là bản flatten để **tìm kiếm toàn văn** — tìm trong JSONB kém hiệu quả hơn nhiều.

### Q16. Versioning tài liệu append-only thế nào?
> Mỗi lần sửa → **tạo** `DocumentVersion` mới + tăng `currentVersion`, trong 1 transaction. Khôi phục phiên bản cũ **không ghi đè** lịch sử mà tạo phiên bản mới chứa nội dung cũ. Lịch sử chỉ có chiều thêm → đúng nguyên tắc audit trail.

### Q17. Calendar tổng hợp 6 nguồn thế nào?
> 6 bảng có 6 kiểu cột thời gian khác nhau (`dueDate`, `startTime/endTime`, `startDate/endDate`) → chuẩn hóa về `startAt`/`endAt` ISO. Dùng **discriminated union** (`kind: 'task' | 'sprint' | ...`) → TypeScript thu hẹp type theo `kind`.

### Q18. Conflict Detection Engine?
> 3 quy tắc chạy ở **server**: (1) `meeting_overlap` — interval overlap `start1 < end2 && end1 > start2`. (2) `overdue_overload` — ≥ 3 task quá hạn cùng user. (3) `leave_during_meeting` — nghỉ phép giao với lịch họp.
> Server vì cần `meetingAttendee` mà client không có, và client không đáng tin.

### Q19: Kéo-thả trên Calendar có an toàn không?
> Có 2 lớp: ① frontend disable drag dựa trên cờ `canReschedule` từ API (UX). ② **server** gọi `canReschedule()` → nếu không đủ quyền → `ForbiddenException`. Client có thể bị bypass → server check là bắt buộc.
> Đặc biệt: leave/WFH/OT **không** kéo được — vì là yêu cầu nhân sự đã duyệt, muốn đổi phải gửi yêu cầu mới.

### Q20. WebSocket xác thực thế nào?
> Verify JWT trong `handleConnection`, lấy token từ `handshake.auth` → `handshake.query` → `handshake.headers` (3 nguồn vì browser WebSocket **không cho set custom header**). Lỗi → `disconnect()` ngay (**fail-closed**). Sau đó lưu `client.data.userId` dùng cho mọi event.

---

# PHẦN 4 — BẢNG TRA NHANH

## 4.1 5 Vai Trò

| Role | Mô tả | Đặc quyền chính |
|------|-------|----------------|
| `ADMIN` | Quản trị viên | Toàn quyền + Admin Control Center + quản lý user (soft delete) |
| `HR` | Nhân sự | Duyệt WFH/Leave/OT/Early Leave, xem báo cáo của **mọi người**, dashboard HR |
| `DEPARTMENT_HEAD` | Trưởng phòng | Quyền trong **phòng ban mình**: duyệt đơn, xem báo cáo phòng, tạo doc `DEPARTMENT` |
| `PM` | Project Manager | Quản lý dự án mình, sprint, swap PM, duyệt deliverable, nộp báo cáo hộ thành viên |
| `EMPLOYEE` | Nhân viên | Task được giao, check-in, chat, tài liệu cá nhân, báo cáo ngày của mình |

> ⚠️ Role `VIEWER` trong bản thiết kế cũ **không tồn tại** trong schema thật.

## 4.2 26 Enum Quan Trọng

```
Role           : ADMIN | HR | PM | EMPLOYEE | DEPARTMENT_HEAD
UserStatus     : ACTIVE | INACTIVE | SUSPENDED
Language       : VI | EN | KO
AttendanceStatus: ON_TIME | LATE | VERY_LATE | WFH | BUSINESS_TRIP
                | ABSENT_APPROVED | ABSENT_UNAPPROVED
                | EARLY_LEAVE_APPROVED | EARLY_LEAVE_UNAPPROVED
RequestStatus  : PENDING | APPROVED | REJECTED | AUTO_APPROVED
BreakType      : MANUAL | EARLY_LEAVE_OUT
LeaveType      : ANNUAL | SICK | UNPAID | COMPENSATORY
ProjectStatus  : PLANNING | ACTIVE | ON_HOLD | COMPLETED | ARCHIVED
ProjectKind    : TEAM | PERSONAL
ProjectWorkflowType: SCRUM | KANBAN | DAILY | SIMPLE
SprintStatus   : PLANNING | ACTIVE | COMPLETED
TaskStatus     : TODO | IN_PROGRESS | IN_REVIEW | BLOCKED | DONE
Priority       : LOW | MEDIUM | HIGH | URGENT
DependencyType : FINISH_TO_START | START_TO_START | FINISH_TO_FINISH
CustomFieldType: TEXT | NUMBER | DATE | DROPDOWN | CHECKBOX
MeetingStatus  : SCHEDULED | IN_PROGRESS | COMPLETED | CANCELLED
MeetingScope   : PROJECT | DEPARTMENT | ONE_ON_ONE
RSVP            : PENDING | ACCEPTED | DECLINED
AiJobStatus    : PENDING | PROCESSING | DONE | FAILED
DocVisibility  : PUBLIC | PRIVATE | SHARED
SharePerm      : VIEW | EDIT
DocumentScope  : PERSONAL | PROJECT | DEPARTMENT | COMPANY
DocumentType   : STANDARD | TASK_REQUIREMENT | TASK_SUBMISSION
                | MEETING_MINUTES | COMPANY_POLICY | TEMPLATE
NotificationType: MEETING | ATTENDANCE_APPROVAL | QUICK_TASK | MENTION
                | TASK | SYSTEM | CHAT | DAILY_REPORT
ConversationType: DIRECT | PROJECT | DEPARTMENT
ChatMessageType : TEXT | IMAGE | FILE | SYSTEM
```

## 4.3 Endpoint Theo Module

```
/api/auth            register | login | google | google/callback
/api/users           assignable | (CRUD, soft delete)
/api/admin           (Admin Control Center)
/api/projects        mine | :id | :id/members | :id/swap-pm
/api/sprints         :id | :id/burndown | :id/start | :id/complete
/api/tasks           :id | :id/board-position
/api/quick-tasks     stats | :id
/api/attendance      check-in | check-out | today | history | leave-balance
                     export/excel | export/pdf
                     wfh | leave-request | overtime | early-leave | break/*
                     requests | team | company | settings
/api/meetings        (list/create) | :id | join | :id/report | ai-summary
/api/documents       recent | company | project/:id | task/:id | meeting/:id
                     search/fulltext | from-template | task/submit
                     :id | :id/versions | :id/versions/:v/restore
                     :id/attachments | :id/ai-summary | :id/export/pdf|docx
                     :id/share
/api/calendar        timeline | items/:kind/:id/reschedule | export
/api/chat            conversations | conversations/direct|project|department|group
                     conversations/:id/messages | messages/:id/reactions
/api/notifications   unread-count | read-all | :id/read | push-subscribe
/api/dashboard       me | employee | pm | hr | admin | department-head
/api/daily-reports   draft/today | (submit) | mine | team/weekly | team/daily | :id
```

## 4.4 Route Frontend (25 Route)

```
/login  /register                                    ← public
/meetings/:id  /meetings/:id/prepare  /meetings/:id/room   ← fullscreen
/dashboard  /notifications
/projects  /projects/:id  /projects/:id/sprints/:sprintId
/tasks  /tasks/:taskId  /projects/:projectId/tasks
/quick-tasks
/meetings  /meetings/:id/report
/documents  /documents/company  /documents/:id
/calendar
/chat  /chat/:conversationId
/attendance
/admin                                               ← ADMIN only
*  →  redirect /dashboard
```

## 4.5 Công Nghệ → Dùng Để Làm Gì

| Công nghệ | Dùng cho |
|-----------|----------|
| **NestJS 12** | Backend framework, DI, Guard/Pipe/Interceptor |
| **Prisma 5.22** | ORM, migration, transaction, type-safe client |
| **PostgreSQL 16** | DB chính (37 model, 26 enum, soft delete, index) |
| **Redis 7** | Cache (không phải chat transport) |
| **Socket.IO 4.8** | 3 namespace real-time |
| **Passport JWT + bcrypt** | Auth (bcrypt cost 10) |
| **Google OAuth 2.0** | Đăng nhập Google |
| **Gemini 1.5 Flash** | AI tóm tắt họp + tài liệu |
| **React 19** | UI, hooks, concurrent features |
| **Vite 8.3** | Build tool dev server + HMR |
| **TypeScript strict** | Strict typing, zero `any` |
| **TailwindCSS 3.4** | Utility-first styling |
| **Zustand 5** | Client state + `persist` |
| **Axios 1.20** | HTTP client + interceptors |
| **Zod 3.25** | Runtime validation ở biên API |
| **i18next 26.4** | Đa ngữ (VI/EN) |
| **Tiptap 3.32** | Rich text editor (ProseMirror) |
| **Leaflet 1.9** | Bản đồ GPS |
| **@hello-pangea/dnd 18** | Kanban drag-and-drop (React 19 compatible) |
| **Recharts 3.10** | Burndown + Velocity charts |
| **simple-peer 9.11** | WebRTC P2P |
| **Web Speech API** | STT tiếng Việt (native browser) |
| **web-push 3.6** | Web Push VAPID |
| **xlsx / jspdf / docx** | Export Excel/PDF/Word |
| **Vitest 4** | Test cả 2 phía |
| **oxlint** | Lint nhanh (Rust-based) |

---

# PHẦN 5 — BẢNG TRA NHANH DB (37 Model)

| Nhóm | Model |
|------|-------|
| **User & Auth** | `User`, `Department`, `RefreshToken` (nếu có), `PushSubscription` |
| **Dự án** | `Project`, `ProjectMember`, `PersonalProjectLink` |
| **Task** | `Task`, `TaskDependency`, `WorkLog`, `CustomField`, `CustomFieldValue`, `QuickTask` |
| **Sprint** | `Sprint`, `SprintTask` |
| **Họp** | `Meeting`, `MeetingAttendee`, `MeetingChatMessage`, `MeetingSummary`, `AiJob` |
| **Tài liệu** | `Document`, `DocumentVersion`, `DocumentPermission`, `DocumentAttachment`, `DocumentTemplate` |
| **Chấm công** | `AttendanceRecord`, `BreakLog`, `LeaveRequest`, `WfhRequest`, `OvertimeRequest`, `EarlyLeaveRequest` |
| **Chat** | `Conversation`, `ConversationMember`, `ChatMessage`, `ChatMessageReaction` |
| **Thông báo** | `Notification` |
| **Báo cáo ngày** | `DailyReport` |

> Chi tiết đầy đủ 37 model + 26 enum + quan hệ: `docs/study/02-DU-LIEU-HE-THONG-DATABASE.md`

---

# PHẦN 6 — 15 MẸO TRẢ LỜI GIÁO VIÊN

### 1. Nếu bị hỏi "làm thêm được gì?"
> "Tôi đã xác minh lại toàn bộ tài liệu bằng **đọc code thật**, không chỉ đọc design doc. Qua đó phát hiện và sửa các sai lệch: geofence thật là **100m** (không phải 500m như doc cũ), schema có **37 model** (không phải 43), và role `VIEWER` trong bản thiết kế **không tồn tại**."

### 2. Nếu bị hỏi "hệ thống có đáp ứng yêu cầu phi chức năng không?"
> "Có 5 yêu cầu chính đã hiện thực: **Hiệu năng** (7 query dashboard chạy song song bằng `Promise.all` → 7× nhanh hơn tuần tự); **Khả dụng** (graceful degradation cho AI, WebSocket reconnect 5 lần); **Bảo mật** (3 tầng phân quyền + fail-closed); **Khả năng bảo trì** (DTO kế thừa, hàm phân quyền thuần dễ test); **Chạy được** (Docker Compose 1 lệnh, deploy free tier)."

### 3. Nếu bị hỏi "có điểm nào chưa làm tốt?"
> "Có 4 điểm tôi nhận thức rõ: (1) **Chat chưa scale multi-instance** — `onlineUsers` nằm trong RAM, cần Socket.IO Redis Adapter. (2) **Chưa có rate limiting** trên endpoint auth — cần `@nestjs/throttler`. (3) **`JWT_SECRET` có fallback hardcode** — production nên fail-closed. (4) **Tìm kiếm tài liệu dùng `ILIKE`** — khi dữ liệu lớn nên chuyển sang Postgres `tsvector` + GIN index."

### 4. Nếu bị hỏi "nếu thêm 1000 người dùng thì sao?"
> "Phần WebSocket là bottleneck đầu tiên → thêm Redis Adapter. Dashboard nhiều query → thêm cache Redis TTL 60s. Database đã có index đầy đủ; nếu cần thì đọc replica. Tìm kiếm tài liệu → `tsvector`."

### 5. Nếu bị hỏi "vì sao chọn PostgreSQL mà không MySQL?"
> "PostgreSQL có `JSONB` (lưu nội dung Tiptap) và `ILIKE` hỗ trợ tìm kiếm tiếng Việt không phân biệt hoa thường. Ngoài ra transaction isolation và index của PG mạnh hơn cho workload read-heavy này."

### 6. Nếu bị hỏi "vì sao không dùng Firebase/Supabase?"
> "Cần **transaction ACID** (trừ ngày nghỉ phép + tạo record, swap PM, Kanban reorder) và **quan hệ phức tạp** 37 model. Firebase không có transaction đa bảng kiểu đó; Supabase có nhưng tôi muốn kiểm soát toàn bộ tầng truy xuất dữ liệu và có migration tự quản lý."

### 7. Nếu bị hỏi "design system của bạn thế nào?"
> "Có `DESIGN.md` làm nguồn sự thật, dùng **design tokens** (Tailwind config), shadcn-style component với `class-variance-authority` + `tailwind-merge` để style variant an toàn, và `lucide-react` cho icon nhất quán."

### 8. Nếu bị hỏi "i18n thế nào?"
> "i18next + react-i18next, 2 ngôn ngữ **VI/EN**. Key theo namespace, có fallback tiếng Việt. Server cũng lưu `Language` enum trong DB để nhớ lựa chọn của user."

### 9. Nếu bị hỏi "real-time thế nào, polling hay WebSocket?"
> "3 namespace WebSocket: `/chat`, `/meetings`, `/notifications`. Mỗi namespace có **vòng đời độc lập** → chat lỗi không ảnh hưởng meeting. Xác thực 1 lần lúc handshake, `client.data.userId` dùng xuyên suốt."

### 10. Nếu bị hỏi "làm sao chống IDOR?"
> "Ownership check ở **service layer**, không chỉ controller. VD: `ProjectAccessService` kiểm tra user có thuộc project không; `ensureMembership` chặn đọc chat của phòng khác; `canReschedule` chặn kéo task của người khác. Role `@Roles()` **không đủ** vì PM dự án A không được đụng dự án B."

### 11. Nếu bị hỏi "AI có chắc không?"
> "Không. AI là **tăng tốc**, không phải nguồn sự thật. (1) Có **fallback heuristic** khi API lỗi → hệ thống không chết. (2) Output luôn để user **edit** trước khi gửi/chốt. (3) Action item từ AI → tạo task **cần xác nhận** của user, không tự tạo. (4) Khi không có `GEMINI_API_KEY` thì tính năng bị tắt, không ảnh hưởng phần cứng."

### 12. Nếu bị hỏi "bạn học được gì?"
> "Tôi học được cách **đọc code như tài liệu**: design doc có thể sai, nhưng code và schema không nói dối. Ví dụ tôi tìm ra 3 sai lệch bằng cách đọc trực tiếp `schema.prisma` và `office-presets.ts`. Tôi cũng học cách **đặt câu hỏi về trade-off** thay vì chỉ hỏi 'tính năng này làm gì' — ví dụ 'tại sao chọn 100m chứ không phải 500m'."

### 13. Nếu bị hỏi "dữ liệu mẫu có thật không?"
> "Có script seed riêng cho 4 miền: enterprise (user/phòng ban/dự án/task/sprint/attendance), meetings, calendar (leave/WFH/OT để conflict engine có dữ liệu chạy thật), chat (conversation + reaction). Không có dữ liệu giả rỗng."

### 14. Nếu bị hỏi "ứng dụng chạy ở đâu?"
> "Có bản deploy thật: Neon (PostgreSQL cloud, Singapore) + Render (backend NestJS + WebSocket) + Vercel (frontend). Tất cả free tier, 0đ. Kèm QR code trên slide để thầy quét trải nghiệm ngay."

### 15. Nếu bị hỏi "khó nhất khi nào?"
> "**Fix WebRTC với người vào muộn** — máy khách mới join không có `MediaStream` local nên `addTrack` không hoàn chỉnh. Giải pháp: hàm `ensurePeer` dùng chung cho mọi peer, luôn attach track hiện tại trước khi tạo offer/answer → fix được cả người vào muộn lẫn người bật camera sau."

---

# PHẦN 7 — 10 TỪ KHOÁ KỸ THUẬT PHẢI NÓI ĐƯỢC

| Từ | Nghĩa | Ví dụ câu nói |
|----|-------|---------------|
| **Idempotent** | Chạy nhiều lần kết quả như 1 lần | "Notification cron dùng cờ `rsvpReminderSentAt` để chỉ gửi 1 lần duy nhất." |
| **Race condition** | 2 thao tác cùng lúc xung đột | "`upsert` tránh race condition khi 2 request cùng tạo báo cáo." |
| **Fail-closed vs fail-open** | Lỗi → chặn hay cho qua | "Auth fail-closed; AI summary fail-safe (fallback heuristic)." |
| **Discriminated union** | Union có tag để thu hẹp type | "`ItemKind` giúp TS biết `item.assigneeId` chỉ tồn tại ở task." |
| **Optimistic update + rollback** | Cập nhật trước, hoàn tác nếu lỗi | "Calendar và Zustand task store đều có rollback." |
| **Cursor pagination** | Phân trang theo con trỏ | "Chat dùng cursor vì offset sẽ nhảy dòng khi có tin mới." |
| **Transaction** | Giao dịch ACID | "Swap PM + Kanban reorder dùng `prisma.$transaction`." |
| **Soft delete** | Xoá logic giữ dữ liệu | "37 model có `deletedAt` indexed." |
| **Normalized vs denormalized** | Chuẩn hoá vs làm phẳng | "Tài liệu lưu cả JSON (render) và Text (search)." |
| **Graceful degradation** | Tính năng hỏng vẫn chạy | "Mất `GEMINI_API_KEY` → chỉ mất AI, phần còn vẫn hoạt động." |

---

# PHẦN 8 — CHECKLIST TRƯỚC KHI VÀO PHÒNG THI

## 8.1 30 Phút Trước
- [ ] Đọc lại Phần 1 (tự giới thiệu) + Phần 3 (20 câu)
- [ ] Mở `docs/study/00-MUC-LUC-HUONG-DAN.md` để biết tra ở đâu
- [ ] Kiểm tra demo còn chạy không (`npm run start:dev` + `npm run dev`)

## 8.2 Nếu Bị Hỏi Về Code Cụ Thể
| Câu hỏi dạng | File cần mở |
|---------------|-------------|
| "Chấm công GPS hoạt động thế nào?" | `backend/src/attendance/utils/geo-validation.service.ts`, `office-presets.ts` |
| "Tính giờ làm việc?" | `backend/src/attendance/utils/time-calculator.ts` |
| "Phân quyền dự án?" | `backend/src/projects/project-access.service.ts` |
| "Kanban kéo thả?" | `backend/src/tasks/tasks.service.ts` (`board-position`) |
| "Swap PM?" | `backend/src/projects/projects.service.ts` (`swap-pm`) |
| "WebRTC?" | `backend/src/meetings/meetings.gateway.ts`, `frontend/.../useWebRTCPeer.ts` |
| "AI tóm tắt?" | `backend/src/meetings/meeting-ai.service.ts` |
| "Chat socket?" | `backend/src/chat/chat.gateway.ts`, `chat.service.ts` |
| "Conflict lịch?" | `backend/src/calendar/calendar.service.ts` (`detectConflicts`) |
| "Kéo-thả lịch?" | `backend/src/calendar/calendar.permissions.ts` |
| "Editor tài liệu?" | `frontend/src/features/documents/components/editor/TiptapEditor.tsx` |
| "Dashboard theo role?" | `frontend/src/features/dashboard/components/DashboardPage.tsx` |
| "Báo cáo ngày?" | `backend/src/daily-reports/daily-reports.draft.service.ts` |

## 8.3 Câu Hỏi Khó Nhất — Chuẩn Bị Sẵn

| Câu hỏi | Trả lời ngắn |
|---------|-------------|
| "Tại sao không dùng monorepo tool (Nx/Turborepo)?" | "2 app + shared types là đủ; thêm Nx lúc này là over-engineering. Hiện tại chia thư mục rõ ràng, khi cần có thể migrate." |
| "Tại sao không dùng GraphQL?" | "REST đủ cho 25 route + phân trang cursor; GraphQL thêm query planner + N+1 risk mà không mang lại lợi ích gì cho use case này." |
| "Tại sao dùng Zod thay vì class-validator?" | "Zod chạy được **ở cả server và client** → cùng 1 schema validate 2 chiều, không duplicate rule. Cho type inference tốt hơn." |
| "Database có bị chậm không?" | "Có index trên `assigneeId`, `status`, `dueDate`, `deletedAt`, `conversationId`. Query dashboard dùng `Promise.all`. Nếu lớn hơn sẽ thêm cache Redis + materialized view." |
| "Bạn đã deploy thật chưa?" | "Có — Neon + Render + Vercel, free tier, có QR để thầy trải nghiệm ngay." |
| "Có thể làm thêm tính năng nào?" | "Push notification cho mobile app (PWA), offline-first với service worker cache, export PDF tổng hợp báo cáo team, và đồng bộ Google Calendar 2 chiều qua OAuth." |

---

## Đường Dẫn Tài Liệu

| File | Nội dung |
|------|----------|
| `00-MUC-LUC-HUONG-DAN.md` | Mục lục + hướng dẫn đọc + bảng sai lệch doc-vs-code |
| `01-TONG-TONG-KIEN-TRUC.md` | Kiến trúc tổng thể, công nghệ, RBAC matrix, trace request |
| `02-DU-LIEU-HE-THONG-DATABASE.md` | 37 model + 26 enum + quan hệ + index + transaction |
| `03-BACKEND-NESTJS.md` | NestJS 12, DI, Guard/Pipe, 3 namespace Socket.IO |
| `04-FRONTEND-REACT.md` | React 19 + Vite, 25 route, Zustand, Axios + Zod, i18n |
| `05-FEATURE-AUTH-RBAC.md` | M1: bcrypt, JWT, Google OAuth, 3 tầng phân quyền |
| `06-FEATURE-ATTENDANCE.md` | M2: Haversine, IP range, giờ làm việc, export |
| `07-FEATURE-PROJECTS-SPRINTS.md` | M3/M3.5/M3.6: ProjectKind, Kanban, QuickTask, Sprint + Burndown |
| `08-FEATURE-MEETINGS-WEBRTC-AI.md` | M5: WebRTC mesh, STT, Gemini, export Word/CSV |
| `09-FEATURE-DOCUMENTS.md` | M6: Tiptap, 5 scope, versioning, 25MB, AI summary |
| `10-FEATURE-CALENDAR.md` | M8: 6 nguồn, conflict engine, kéo-thả RBAC, .ics |
| `11-FEATURE-CHAT-NOTIFICATIONS.md` | M9: Socket.IO chat, presence, reactions, Web Push VAPID |
| `12-FEATURE-DASHBOARD-DAILY-REPORT.md` | M10: 5 layout, AI draft 6 nguồn, khoá báo cáo |
| `13-HUONG-DAN-TRIEN-KHAI.md` | Docker, Vitest, Deploy Neon+Render+Vercel, security |
| **`99-CHEAT-SHEET-THI.md`** | **File này — ôn nhanh, 20 câu, 15 mẹo** |

> **Lời khuyên cuối:** khi bị hỏi "vì sao", luôn trả lời theo cấu trúc **Vấn đề → Quyết định → Trade-off → Hướng mở rộng**. Đó là thứ giáo viên đánh giá cao nhất.
