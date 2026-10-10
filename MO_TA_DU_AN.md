# 🏢 MÔ TẢ DỰ ÁN CHI TIẾT — WORKSYNC
**Hệ thống Quản lý Dự án & Điểm danh Thông minh Tích hợp Trí tuệ Nhân tạo**

> Tài liệu này dành cho toàn bộ thành viên trong nhóm đọc để hiểu rõ dự án làm gì,
> ai có quyền làm gì, và từng tính năng sẽ được triển khai cụ thể như thế nào.
> Nguồn tham chiếu: Tài liệu specs trong thư mục `docs/`

---

## 📚 MỤC LỤC

1. [Dự Án Làm Gì?](#1-dự-án-làm-gì)
2. [Bối Cảnh Thực Tế & Phạm Vi Hệ Thống](#2-bối-cảnh-thực-tế--phạm-vi-hệ-thống)
3. [Ai Là Ai? Phân Quyền Hệ Thống (5 Vai Trò)](#3-ai-là-ai-phân-quyền-hệ-thống-5-vai-trò)
4. [Chi Tiết Từng Tính Năng & Cách Triển Khai](#4-chi-tiết-từng-tính-năng--cách-triển-khai)
5. [Stack Công Nghệ Sử Dụng](#5-stack-công-nghệ-sử-dụng)
6. [Cấu Trúc Module & Phân Chia Công Việc](#6-cấu-trúc-module--phân-chia-công-việc)

---

## 1. DỰ ÁN LÀM GÌ?

**WorkSync** là một nền tảng web (PWA) quản lý toàn diện hoạt động nội bộ doanh nghiệp phần mềm, được xây dựng dựa trên quan sát thực tế tại **FPT Software Đà Nẵng**. Hệ thống giải quyết các bài toán:

- **Điểm danh thông minh 1-Click (IP Wifi Văn phòng / GPS Geofencing)**: Nhân viên chỉ cần nhấn 1 nút "Check-in" trên giao diện Web/App. Hệ thống Backend sẽ tự động kiểm tra địa chỉ IP Public có thuộc dải IP Wifi của FPT Software / Công ty không, hoặc kiểm tra tọa độ GPS có nằm trong bán kính 100m văn phòng không. UX mượt mà, đơn giản và chuẩn doanh nghiệp.
- **Hỗ trợ làm việc từ xa (WFH)**: Nhân viên khai báo WFH online, HR/PM phê duyệt. Tự động duyệt nếu HR không xử lý trước 9:30.
- **Quản lý dự án & phân công task theo mô hình Agile/Scrum**: Kanban Board kéo thả, Sprint management, Gantt Chart, dependency giữa task, ghi log công việc.
- **Lên lịch và quản lý cuộc họp đa ngôn ngữ**: Tạo cuộc họp, gửi invitation tự động, ghi biên bản real-time, hỗ trợ 3 ngôn ngữ (Việt - Anh - Hàn).
- **Tóm tắt cuộc họp tự động bằng AI (Google Gemini)**: AI phân tích biên bản, sinh tóm tắt 3 ngôn ngữ, trích xuất action items, tự tạo task trên hệ thống.
- **Báo cáo tiến độ cuối ngày tự động**: Hệ thống nhắc nhở nhân viên báo cáo, AI tổng hợp từ work log, PM nhận email tổng kết cả team.
- **Dashboard phân tích & xuất tài liệu**: Burndown chart, velocity, team performance, xuất PDF/Excel.

---

## 2. BỐI CẢNH THỰC TẾ & PHẠM VI HỆ THỐNG

### Bối cảnh

Dự án được xây dựng dựa trên quan sát thực tế tại **FPT Software Đà Nẵng**, nơi:
- Các team làm việc theo mô hình Agile/Scrum với sprint 2 tuần
- Sử dụng Jira để quản lý task, Microsoft Teams để họp
- Có nhân viên làm việc hybrid (tại văn phòng + WFH)
- Có nhu cầu cầu nối đa ngôn ngữ (Việt - Hàn - Anh) trong các cuộc họp

### Phạm vi

**Nằm trong scope:**
- Web app (PWA) chạy trên PC và Mobile browser
- Giao diện Check-in 1-Click tích hợp xác thực IP Wifi & GPS Geofencing
- Hệ thống thông báo real-time (notification)
- AI tóm tắt họp (text-based, không cần ghi âm)
- Xuất báo cáo PDF/Word/Excel

**Ngoài scope (có thể mở rộng):**
- ESP32 RFID hardware (optional feature)
- Mobile native app (iOS/Android)
- Video call tích hợp

---

## 3. AI LÀ AI? PHÂN QUYỀN HỆ THỐNG (5 VAI TRÒ)

Hệ thống có **5 vai trò (Role)**: System Admin, HR Manager, Project Manager, Employee, Viewer. Mỗi vai trò thấy giao diện và làm được những việc khác nhau.

```
┌─────────────────────────────────────────────────────────────┐
│                    HỆ THỐNG WORKSYNC                        │
├─────────────┬──────────────┬────────────┬───────────────────┤
│   ADMIN     │   HR MANAGER │  PROJECT   │    EMPLOYEE       │
│  (Quản trị) │  (Nhân sự)   │  MANAGER   │   (Nhân viên)     │
│             │              │   (PM)     │                   │
├─────────────┴──────────────┴────────────┴───────────────────┤
│                      VIEWER (Khách/Báo cáo)                 │
└─────────────────────────────────────────────────────────────┘
```

---

### 👑 SYSTEM ADMIN — Quản trị Hệ thống

Admin là người có quyền cao nhất. Thường là IT Admin hoặc CTO/Tech Lead. Chịu trách nhiệm cấu hình toàn bộ hệ thống, **không tham gia vào công việc dự án hàng ngày**.

**Quản lý tổ chức:**
- Tạo/sửa/xóa phòng ban (Department).
- Cấu hình thông tin công ty (tên, logo, địa chỉ, tọa độ GPS, dải IP Wifi, bán kính GPS check-in).
- Cấu hình múi giờ, ngôn ngữ mặc định.

**Quản lý tài khoản:**
- Tạo tài khoản nhân viên mới (batch import từ Excel).
- Cấp/Thu hồi role cho bất kỳ user nào.
- Kích hoạt / Vô hiệu hóa / Reset password tài khoản.
- Xem lịch sử đăng nhập của tất cả users.

**Cấu hình hệ thống:**
- Cấu hình API Key cho Google Gemini AI.
- Cấu hình giờ làm việc, thời gian điểm danh, dải IP Wifi văn phòng hợp lệ, tọa độ GPS văn phòng & bán kính cho phép (mặc định: 100m).
- Quản lý email SMTP, xem toàn bộ system logs.

**Dashboard tổng quan:**
- Thống kê tổng quan toàn công ty.
- Báo cáo điểm danh toàn bộ nhân viên.
- Xuất dữ liệu toàn hệ thống (backup).

---

### 📋 HR MANAGER — Quản lý Nhân sự

HR Manager quản lý dữ liệu chấm công, ngày phép, hồ sơ nhân viên. Không can thiệp vào công việc dự án.

**Quản lý điểm danh:**
- Xem bảng điểm danh tất cả nhân viên theo ngày/tuần/tháng.
- Chỉnh sửa điểm danh thủ công (khi có sự cố).
- Xác nhận / Từ chối đơn khai báo WFH, công tác.
- Cấu hình lịch làm việc (ca, shift), ngày lễ, ngày nghỉ bù.
- Cảnh báo nhân viên đi muộn quá nhiều lần.

**Quản lý ngày phép:**
- Xem số ngày phép còn lại từng nhân viên.
- Xét duyệt đơn xin nghỉ phép.
- Cấu hình số ngày phép theo năm/loại hợp đồng.

**Quản lý hồ sơ nhân viên:**
- Xem/cập nhật thông tin nhân viên.
- Onboarding (tạo hồ sơ, cấp thẻ) / Offboarding (vô hiệu hóa khi nghỉ việc).

**Báo cáo chấm công:**
- Xuất bảng chấm công theo tháng (PDF/Excel).
- Báo cáo thống kê: đi muộn, vắng mặt, WFH.
- So sánh tỉ lệ WFH vs. văn phòng theo team.

---

### 🗂️ PROJECT MANAGER — Quản lý Dự án

PM là role **TRỌNG TÂM** nhất của hệ thống — sử dụng app nhiều nhất trong ngày.

**Quản lý Dự án:**
- Tạo dự án mới (tên, mô tả, deadline, khách hàng).
- Cấu hình workflow (To Do → In Progress → Review → Done).
- Thêm/Xóa thành viên, tạo Sprint, archive dự án.

**Quản lý Task:**
- Tạo task đầy đủ: tiêu đề, mô tả, priority, story points, deadline, assignee, label, attachment.
- Kéo thả task trên Kanban Board, gán task cho Sprint.
- Xem Gantt Chart, set dependency giữa task.
- Comment, mention (@) thành viên.

**Quản lý Meeting:**
- Tạo lịch họp, gửi invitation tự động qua email/notification.
- Tạo agenda, ghi biên bản trực tiếp trong app.
- Kích hoạt AI tóm tắt sau khi họp xong.
- Xuất biên bản họp ra PDF/Word.

**Nhận & Xem Báo cáo:**
- Nhận báo cáo cuối ngày tự động tổng hợp từ tất cả employee.
- Dashboard dự án: burndown chart, velocity, progress.
- Nhận cảnh báo khi task quá hạn hoặc bị block.

---

### 👨‍💻 EMPLOYEE — Nhân viên / Developer

Employee là **đối tượng đông nhất** sử dụng hệ thống. Mọi flow phải cực kỳ nhanh, đơn giản.

**Điểm danh:**
- Bấm 1 nút "Check-in" buổi sáng trên Web/App (hệ thống tự động xác thực IP Wifi / GPS).
- Khai báo làm việc từ xa (WFH) với lý do.
- Xem lịch sử điểm danh, số ngày phép, gửi đơn xin nghỉ.

**Quản lý Task:**
- Xem tất cả task được giao (filter: hôm nay / tuần này / tất cả).
- Cập nhật trạng thái task, % hoàn thành, thời gian thực tế.
- Ghi log công việc (Work Log), comment, đánh dấu task bị Block.
- Tạo Sub-task, xem task đồng nghiệp (view-only).

**Báo cáo cuối ngày:**
- Nhận nhắc nhở lúc 16:30 (notification).
- AI hỗ trợ tự động điền báo cáo dựa trên work log đã nhập.
- Xem lại báo cáo đã gửi các ngày trước.

**Meeting:**
- Xem lịch họp (calendar view), chấp nhận/từ chối lời mời.
- Xem agenda, biên bản cuộc họp, thêm ghi chú cá nhân.

**Hồ sơ cá nhân:**
- Xem & cập nhật thông tin, đổi mật khẩu.
- Cấu hình ngôn ngữ (Việt/Anh/Hàn), thông báo.
- Dashboard cá nhân: task trong tuần, điểm chuyên cần.

---

### 👁️ VIEWER — Người xem / Báo cáo

Role đặc biệt dành cho: Khách hàng (client Hàn Quốc), cấp trên muốn theo dõi, hoặc Giảng viên hướng dẫn. **Chỉ có quyền XEM**, không thể thay đổi dữ liệu.

- Xem dashboard tổng quan dự án được chia sẻ.
- Xem Kanban board (view-only), báo cáo tiến độ.
- Xem biên bản cuộc họp (nếu được share).
- KHÔNG thể: tạo task, comment, điểm danh, xem thông tin nhân viên.

---

### Ma trận Quyền hạn Tổng hợp

| Tính năng | Admin | HR | PM | Employee | Viewer |
|---|---|---|---|---|---|
| **ĐIỂM DANH** | | | | | |
| Check-in 1-Click (IP/GPS) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Khai báo WFH | ✅ | ✅ | ✅ | ✅ | ❌ |
| Xét duyệt WFH | ✅ | ✅ | ⚠️* | ❌ | ❌ |
| Xem chấm công toàn cty | ✅ | ✅ | ❌ | ❌ | ❌ |
| Xem chấm công team | ✅ | ✅ | ✅ | ❌ | ❌ |
| **DỰ ÁN & TASK** | | | | | |
| Tạo dự án | ✅ | ❌ | ✅ | ❌ | ❌ |
| Tạo task | ✅ | ❌ | ✅ | ⚠️** | ❌ |
| Cập nhật task | ✅ | ❌ | ✅ | ✅ | ❌ |
| Xem task dự án | ✅ | ❌ | ✅ | ✅ | ✅ |
| **MEETING** | | | | | |
| Tạo cuộc họp | ✅ | ❌ | ✅ | ❌ | ❌ |
| Xem lịch họp | ✅ | ❌ | ✅ | ✅ | ✅ |
| AI tóm tắt họp | ✅ | ❌ | ✅ | ❌ | ❌ |
| Xuất biên bản | ✅ | ❌ | ✅ | ❌ | ✅ |
| **BÁO CÁO** | | | | | |
| Gửi báo cáo cuối ngày | ❌ | ❌ | ❌ | ✅ | ❌ |
| Nhận báo cáo team | ✅ | ❌ | ✅ | ❌ | ❌ |
| Dashboard toàn cty | ✅ | ✅ | ❌ | ❌ | ❌ |
| Dashboard dự án | ✅ | ❌ | ✅ | ⚠️*** | ✅ |

> ⚠️* PM có thể xét duyệt WFH cho team của mình
> ⚠️** Employee có thể tạo sub-task trong task được giao
> ⚠️*** Employee chỉ xem dashboard dự án mình tham gia

---

## 4. CHI TIẾT TỪNG TÍNH NĂNG & CÁCH TRIỂN KHAI

### 4.1 Hệ Thống Xác Thực & Bảo Mật

| Tính năng | Cách hoạt động |
|---|---|
| Đăng ký / Đăng nhập | Email + mật khẩu. Access Token JWT (15 phút) lưu memory, Refresh Token (7 ngày) lưu HttpOnly cookie. |
| Phân quyền theo Role | Mỗi trang/API kiểm tra Role (ADMIN / HR / PM / EMPLOYEE / VIEWER) trước khi cho phép truy cập. |
| Silent Refresh | Client tự động gọi refresh token khi access token hết hạn, người dùng không bị logout. |

---

### 4.2 Điểm Danh Thông Minh (Smart Attendance)

**Cách hoạt động từng bước:**

```
Employee đăng nhập vào Web/App → Bấm nút "Check-in" (1 click)
    ↓
App gửi IP Public + Tọa độ GPS + Device ID lên Backend
    ↓
Backend kiểm tra:
  1. IP Public có thuộc dải IP Wifi Văn phòng (FPT Software / Công ty)?
  2. (Hoặc) Tọa độ GPS có nằm trong bán kính ≤ 100m của văn phòng không?
  3. Chưa check-in hôm nay?
    ↓
✅ PASS → Lưu DB, hiển thị "Chào [Tên], 07:52 — Đúng giờ"
❌ FAIL → Trả mã lỗi: NOT_IN_OFFICE_NETWORK / OUT_OF_GEOFENCE_RANGE / ALREADY_CHECKED_IN
```

**Các trạng thái điểm danh:**

| State               | Điều kiện            | Label　　　　　　 |
| ---------------------| ----------------------| -------------------|
| `ON_TIME`           | Check-in trước 9:00  | ✅ Đúng giờ　　　　|
| `LATE`              | Check-in 9:01 – 9:30 | ⚠️ Đi muộn　　　　 |
| `VERY_LATE`         | Check-in sau 9:30    | 🔴 Muộn nhiều　　 |
| `WFH`               | Khai báo làm từ xa   | 🏠 Work From Home |
| `BUSINESS_TRIP`     | Công tác             | ✈️ Công tác　　　　|
| `ABSENT_APPROVED`   | Nghỉ có phép         | 📋 Nghỉ phép　　　|
| `ABSENT_UNAPPROVED` | Vắng không phép      | ❌ Vắng mặt　　　　|

**Luồng xét duyệt WFH:**
1. Employee gửi khai báo WFH (chọn lý do, ghi chú, giờ bắt đầu/kết thúc dự kiến).
2. HR/PM nhận notification.
3. HR duyệt ✅ → Status = WFH_APPROVED / Từ chối ❌ → Employee nhận thông báo.
4. Nếu HR chưa duyệt đến 9:30 → Tự động duyệt (configurable).

---

### 4.3 Quản Lý Dự Án & Task (Project Management)

**Cấu trúc phân cấp:**

```
Company
└── Department (Phòng ban)
    └── Project (Dự án)
        ├── Member List (role: PM/Developer/Designer/Tester/DevOps/Bridge Engineer/BA/Viewer)
        ├── Sprint 1 (2 tuần, có goal)
        │   ├── Epic: Authentication
        │   │   ├── Task: Thiết kế màn hình đăng nhập [Employee A]
        │   │   │   ├── Sub-task: Mockup Figma
        │   │   │   └── Sub-task: Review với PM
        │   │   └── Task: API đăng nhập JWT [Employee B]
        │   └── Epic: Dashboard
        │       └── Task: Dashboard Admin [Employee C]
        └── Sprint 2
            └── ...
```

**Kanban Board:** TO DO → IN PROGRESS → IN REVIEW → DONE

| Từ | Sang | Ai được làm | Điều kiện |
|---|---|---|---|
| TO DO | IN PROGRESS | Employee | Click "Bắt đầu" |
| IN PROGRESS | IN REVIEW | Employee | Click "Gửi review" (kèm note) |
| IN PROGRESS | BLOCKED | Employee | Click "Báo blocked" (kèm lý do) |
| BLOCKED | IN PROGRESS | PM | PM resolve blocker |
| IN REVIEW | DONE | PM | PM approve |
| IN REVIEW | IN PROGRESS | PM | PM reject (kèm comment) |
| Bất kỳ | TO DO | PM | PM reopen |

---

### 4.4 Cuộc Họp & AI Tóm Tắt (Meeting + AI Summary)

**Luồng Meeting đầy đủ:**

```
TRƯỚC HỌP                    TRONG HỌP                   SAU HỌP
─────────                    ─────────                   ────────
PM tạo lịch họp          PM/Employee ghi               AI xử lý nội dung
+ Agenda items           biên bản real-time             tóm tắt + action items
    ↓                        ↓                             ↓
Hệ thống gửi             Thêm quyết định,              PM review & chỉnh sửa
invitation email          action items                   AI summary
    ↓                        ↓                             ↓
Employee accept/          Kết thúc họp →                Xuất PDF/Word
decline                   Click "Kết thúc"               + Gửi cho participants
```

**AI Tóm tắt (Google Gemini):**
1. PM click "Kết thúc họp" → Biên bản được gửi cho Gemini API.
2. AI phân tích và tạo:
   - Tóm tắt ngắn (3-5 câu) — bằng 3 ngôn ngữ (Việt/Anh/Hàn).
   - Các điểm quyết định chính.
   - Action Items (ai làm gì, deadline).
   - Vấn đề cần theo dõi (risks/blockers).
3. PM review, chỉnh sửa nếu cần.
4. Action Items → tự động chuyển thành Task trên hệ thống.

---

### 4.5 Báo Cáo Cuối Ngày & Dashboard

**Trigger & Nhắc nhở:**
- 16:30 → Notification nhắc Employee chưa báo cáo
- 17:00 → Nhắc nhở lần 2
- 17:15 → PM nhận email tổng hợp toàn team
- 17:30 → PM nhận danh sách "chưa báo cáo" để follow up

**AI hỗ trợ tự động điền:**
- Thu thập từ Work Logs, task đã cập nhật, comments trong ngày.
- Tự động liệt kê: task đã làm, thời gian, % tiến độ, blockers.
- Employee chỉ cần review, bổ sung và bấm Gửi.

---

### 4.6 Hệ Thống Thông Báo (Notification)

| Sự kiện | Người nhận | Kênh |
|---|---|---|
| Task mới được giao | Employee | In-app + Email |
| Task sắp đến deadline (1 ngày) | Employee | In-app + Email |
| Task quá deadline | Employee + PM | In-app + Email |
| Task chuyển sang IN REVIEW | PM | In-app |
| Task bị BLOCKED | PM | In-app (ngay) |
| Sprint kết thúc | PM + Team | Email tổng kết |
| Comment có @mention | Người được nhắc | In-app |
| Lịch meeting sắp đến | Participants | In-app + Email |
| AI Summary sẵn sàng | PM | In-app |
| Nhắc nhở báo cáo cuối ngày | Employee | In-app |
| WFH chờ duyệt | HR | In-app |
| WFH được duyệt/từ chối | Employee | In-app |
| Nhắc nhở check-in | Employee (chưa CI) | In-app |

---

### 4.7 Xuất Tài Liệu (Export Documents)

| Báo cáo | Người xuất | Định dạng | Tần suất |
|---|---|---|---|
| Bảng chấm công tháng | HR | Excel/PDF | Hàng tháng |
| Báo cáo tiến độ Sprint | PM | PDF | Kết thúc sprint |
| Biên bản cuộc họp | PM | PDF/Word | Sau mỗi họp |
| Báo cáo cá nhân | Employee | PDF | Theo yêu cầu |
| Báo cáo KPI team | PM/Admin | Excel | Hàng tháng |

---

## 5. STACK CÔNG NGHỆ SỬ DỤNG

| Tầng | Công nghệ | Dùng để làm gì |
|---|---|---|
| **Frontend** | ReactJS 18 (Vite 5 + TypeScript) | Toàn bộ giao diện người dùng. State: Zustand + TanStack Query |
| **Styling** | TailwindCSS 3 + shadcn/ui | Component library đẹp, responsive |
| **Backend** | NestJS 10 (TypeScript) | REST API, WebSocket Gateway, Cron Jobs, Guards |
| **Database** | PostgreSQL 16 | Lưu toàn bộ dữ liệu ứng dụng (15+ tables) |
| **ORM** | Prisma 5 | Schema, migrations, type-safe queries |
| **Cache** | Redis 7 | Session, QR token store, cache |
| **Real-time** | Socket.IO + NestJS WebSocket | QR refresh, notification, board update |
| **AI** | Google Gemini API (1.5 Flash) | Tóm tắt cuộc họp, gợi ý báo cáo |
| **File** | Cloudinary / Local FS | Avatar, attachment, export files |
| **Export** | pdf-lib / exceljs | Xuất PDF báo cáo, Excel chấm công |
| **Email** | Nodemailer + Gmail SMTP | Invitation, notification, báo cáo |
| **Geolocation & IP** | HTML5 Geolocation API + ip-range-check | Xác định vị trí GPS & kiểm tra IP Wifi văn phòng |
| **Calendar** | FullCalendar 6 | Calendar view cho meeting |
| **Kanban** | @dnd-kit/core | Drag & drop Kanban board |
| **Charts** | Recharts | Burndown, bar, pie charts |
| **i18n** | i18next + react-i18next | Đa ngôn ngữ VI/EN/KO |
| **Deploy** | Docker + Docker Compose + Nginx | Containerization, reverse proxy |

---

## 6. CẤU TRÚC MODULE & PHÂN CHIA CÔNG VIỆC

| Module | Nội dung chính |
|---|---|
| 🔐 Auth & Phân quyền | Đăng nhập, JWT access/refresh token, phân quyền 5 role |
| ⏰ Điểm danh thông minh | Xác thực IP Wifi văn phòng & GPS Geofencing (1-click), check-in/out, WFH |
| 🗂️ Quản lý Dự án & Task | CRUD Project, Sprint, Epic, Task, Sub-task, Work Log, Kanban, Gantt |
| 📅 Meeting & AI Summary | Lên lịch, ghi biên bản real-time, Gemini AI tóm tắt 3 ngôn ngữ |
| 📊 Báo cáo & Dashboard | Daily report + AI draft, PM/HR dashboard, burndown chart |
| 🔔 Notification | Push in-app real-time (Socket.IO) + Email notification |
| 📤 Export Documents | PDF biên bản, Excel chấm công, PDF báo cáo Sprint |
| 👤 User & Department | Quản lý user, phòng ban, hồ sơ nhân viên, ngày phép |
| 🌐 i18n | Đa ngôn ngữ Việt/Anh/Hàn |

### Luồng tương tác theo ngày làm việc

```
07:30 - 08:30  │  Employee bấm 1-click Check-in trên Web/App (xác thực IP Wifi / GPS)
               │
08:30          │  PM xem dashboard: ai đã có mặt, ai WFH, ai vắng
               │
08:30 - 09:00  │  Daily standup meeting (PM tạo, Employee tham gia)
               │
09:00 - 16:30  │  Employee: cập nhật task, log công việc, comment
               │  PM: theo dõi board, điều phối, họp KH
               │  HR: xem chấm công sáng, xét duyệt đơn từ
               │
16:30          │  System gửi notification nhắc Employee báo cáo
               │
17:00          │  Employee hoàn thành form báo cáo cuối ngày
               │
17:15          │  System tổng hợp → PM nhận email/notification báo cáo team
               │
17:30          │  PM review báo cáo, comment, ghi nhận
               │
18:00          │  Employee check-out (optional)
               │
Cuối tháng     │  HR xuất bảng chấm công → tính lương
```

---

## NGUYÊN TẮC THIẾT KẾ

1. **Mobile-first**: Nhân viên điểm danh và cập nhật task qua điện thoại
2. **Real-time**: Cập nhật trạng thái task, notification tức thì
3. **AI-augmented**: AI hỗ trợ nhưng không thay thế quyết định của người
4. **Offline-capable**: PWA cache cơ bản khi mất mạng
5. **Đa ngôn ngữ**: Hỗ trợ Tiếng Việt, Tiếng Anh, Tiếng Hàn (i18n)
6. **Audit trail**: Mọi hành động đều được ghi log có timestamp

---

> 📌 **Ghi chú cho nhóm**: Tài liệu này là nguồn tham chiếu chính cho toàn bộ dự án.
> Khi có thay đổi tính năng, cập nhật vào đây trước khi code.
> Mọi thắc mắc về nghiệp vụ → đối chiếu file này trước khi hỏi.
