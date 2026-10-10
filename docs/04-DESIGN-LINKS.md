# 🎨 Design Links & UI Guidelines — WorkSync

> **Trạng thái:** Wireframes đang được thiết kế
> **Tool dùng:** Figma (link sẽ cập nhật khi có)

---

## Figma Links (cập nhật khi có)

| Màn hình | Link Figma | Trạng thái |
|----------|-----------|------------|
| Design System & Tokens | _TBD_ | Chưa có |
| Authentication (Login/Register) | _TBD_ | Có wireframe ASCII |
| Dashboard (PM/HR/Employee) | _TBD_ | Có wireframe ASCII |
| Kanban Board (ClickUp-style) | _TBD_ | Có wireframe ASCII |
| List / Calendar / Gantt Views | _TBD_ | Chưa có |
| Meeting Room (Video call) | _TBD_ | Có wireframe ASCII |
| Document Editor (ClickUp Docs) | _TBD_ | Có wireframe ASCII |
| Attendance Check-in | _TBD_ | Có wireframe ASCII |
| Notification Center | _TBD_ | Có wireframe ASCII |

---

## Key Screen Descriptions (ASCII Wireframes)

### Screen 1: Login / Register
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│       [Logo WorkSync]                                  │
│       Welcome back!                                    │
│       Login to your account                            │
│                                                        │
│       Email                                            │
│       ┌──────────────────────────────────────┐         │
│       │ user@company.com                     │         │
│       └──────────────────────────────────────┘         │
│       Password                                         │
│       ┌──────────────────────────────────────┐         │
│       │ •••••••••                            │ 👁️      │
│       └──────────────────────────────────────┘         │
│                                                        │
│       [ ] Remember me          Forgot password?        │
│                                                        │
│       [       L O G I N  B U T T O N         ]         │
│                                                        │
│       Don't have an account? Sign up                   │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Screen 2: Dashboard (PM View)
```
┌─────────────────────────────────────────────────────────────────────┐
│ WorkSync logo          🔔 Bell [3]    🌐 VI    👤 Van A ▾            │
├──────────┬──────────────────────────────────────────────────────────┤
│ WORKSPACE│                                                           │
│ 📊 Home  │  Good morning, Van A 👋                                   │
│ 📁 Projects  Sprint 12 — Ends in 5 days                             │
│ ✅ Tasks │                                                           │
│ 📅 Calendar  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│ 📹 Meetings  │  12 📋   │ │  5 ✅    │ │  3 🔴   │ │  85% ⬆  │  │
│ 📝 Docs  │  │  Tasks   │ │  Done    │ │  Blocked │ │  Progress│  │
│ ⏰ Attend│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│ 📈 Reports  [Burndown Chart ...........................]            │
│          │                                                           │
│ ⚙️ Settings  My Tasks Today                                          │
│          │  ● Fix login bug    IN_PROGRESS  Due: Today  2h left     │
│          │  ● Design dashboard TODO         Due: Oct 6              │
└──────────┴──────────────────────────────────────────────────────────┘
```

### Screen 3: Kanban Board (ClickUp-style)
```
WorkSync / Projects / WorkSync V2 / Board

[Views: 📊Board  📋List  📅Calendar  📊Gantt  📅Timeline]
[Filter ▾]  [Group by: Status ▾]  [+ Add Task]          [⚙️]

 TO DO (4)          IN PROGRESS (3)    IN REVIEW (2)    DONE (8)
┌──────────────┐   ┌──────────────┐   ┌──────────────┐  ┌──────────────┐
│🔴 Fix login  │   │🔵 API Auth   │   │✅ DB Schema  │  │✅ Proj Init  │
│   HIGH  3pt  │   │   MED  5pt   │   │   8pt        │  │   DONE       │
│   @An  📎    │   │   @Duc       │   │   @Hung      │  │              │
│   Due: Oct 5 │   │   ⏱ 2h 30m  │   │              │  │              │
├──────────────┤   ├──────────────┤   └──────────────┘  └──────────────┘
│🟡 Setup Redis│   │🔴 Redis Cache│
│   MED  2pt   │   │   BLOCKED    │
│   @Minh      │   │   ⚠️ reason  │
└──────────────┘   └──────────────┘
[+ Add task]       [+ Add task]       [+ Add task]       [+ Add task]
```

### Screen 4: Meeting Room (P2P WebRTC)
```
┌──────────────────────────────────────────────────────────────────┐
│  Sprint 3 Planning  •  00:45:32         🔴 REC   [5 participants] │
├────────────────────────┬─────────────────────────────────────────┤
│                        │  📝 Biên bản cuộc họp                   │
│  [Video Grid]          │  ──────────────────────────────         │
│  (Max 6 participants)  │  **Agenda:**                            │
│  ┌────────┐ ┌────────┐ │  1. Review Sprint 2 results             │
│  │ Van A  │ │ Duc B  │ │  2. Plan Sprint 3 stories               │
│  │ 🎤 📷 │ │ 🔇 📷 │ │                                         │
│  └────────┘ └────────┘ │  **Quyết định:**                        │
│                        │  - Tăng story points cho Auth task      │
│  ┌────────┐ ┌────────┐ │                                         │
│  │ Minh C │ │ Thu D  │ │  **Action Items:**                      │
│  │ 📷    │ │ 🔇 📷 │ │  ☐ @Duc: Fix login API — Oct 7          │
│  └────────┘ └────────┘ │  ☐ @An: Design dashboard — Oct 8       │
│                        │                                         │
├────────────────────────┤  [✨ AI Tóm tắt]  [📄 Xuất PDF]        │
│ 🎤  📷  🖥️ Share  ⋯  │                                         │
│ [Kết thúc họp 🔴]      │                                         │
└────────────────────────┴─────────────────────────────────────────┘
```

### Screen 5: Document Editor (Nested Sidebar Layout)
```
┌──────────┬──────────────────────────────────────────────────────────┐
│ 📝 Docs  │ 📝 Sprint 3 Requirements                 [🔒 Public ▾] [⋯] │
│          │ ──────────────────────────────────────────────────────── │
│ 🔍 Search│ [B] [I] [U] [H1] [H2] [H3] [< >] [Table] [Checklist] [/] │
│          │                                                          │
│ ▾ Root   │ # Sprint 3 Requirements                                  │
│   📄 Doc1│                                                          │
│   ▾ Doc2 │ ## Mục tiêu Sprint                                       │
│    📄 Sub│ Hoàn thành module Authentication và cơ bản Dashboard PM. │
│          │                                                          │
│ + New Doc│ ## User Stories                                          │
│          │ - [ ] US-01: Đăng nhập bằng email/password               │
│          │ - [ ] US-02: JWT refresh token tự động                   │
│          │                                                          │
│          │ [✨ AI Tóm tắt]  Version 3 • Last edited 2 hours ago       │
└──────────┴──────────────────────────────────────────────────────────┘
```

### Screen 6: Notification Center (Sidebar Slide-over)
```
┌───────────────────────────────────────────────┬─────────────────────┐
│                                               │ 🔔 Notifications [x]│
│                                               │ ─────────────────── │
│                                               │ [Mark all as read]  │
│            MAIN CONTENT AREA                  │                     │
│                                               │ 🟢 Task Assigned    │
│                                               │ @Duc assigned you   │
│                                               │ to "Fix login API"  │
│                                               │ 2 mins ago          │
│                                               │                     │
│                                               │ 🔵 Meeting Start    │
│                                               │ Sprint 3 Planning   │
│                                               │ starts in 5 mins    │
│                                               │ [Join Now]          │
│                                               │                     │
│                                               │ ⚪ Leave Approved   │
│                                               │ Your leave on Oct 7 │
│                                               │ was approved.       │
└───────────────────────────────────────────────┴─────────────────────┘
```

### Screen 7: HR Attendance Management
```
┌─────────────────────────────────────────────────────────────────────┐
│ WorkSync / HR / Attendance Report                                    │
│                                                                     │
│ [Filter by Date: Oct 4] [Filter by Dept: All]  [Export to Excel ⬇️] │
│                                                                     │
│  User Name      | Dept   | Check-in | Status    | GPS/IP   | Action │
│  ───────────────|────────|──────────|───────────|──────────|─────── │
│  Nguyen Van A   | Dev    | 08:15    | ✅ OK     | Valid IP | [Edit] │
│  Tran Thi B     | Design | 08:45    | ⚠️ LATE   | Valid IP | [Edit] │
│  Le Van C       | Dev    | --:--    | 🔵 WFH    | -        | [Edit] │
│  Pham D         | QA     | 08:20    | 🔴 INVALID| GPS(5km) | [Edit] │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Breakpoints (Responsive)

| Breakpoint | Width | Ghi chú |
|-----------|-------|---------|
| Mobile | 375px – 767px | Check-in, cập nhật task, xem notification |
| Tablet | 768px – 1023px | Kanban board (2 columns), calendar |
| Desktop | 1024px – 1439px | Full sidebar + content |
| Wide | 1440px+ | Gantt chart, analytics dashboard |
