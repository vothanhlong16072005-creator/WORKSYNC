# 🎨 Hướng Dẫn Thiết Kế & Bản Vẽ Giao Diện (Design System & ASCII Wireframes) — WorkSync
> **Phiên bản:** 2.0 (Enterprise Comprehensive) | **Ngày cập nhật:** 21/10/2026  
> **Phong cách:** Modern Bauhaus Enterprise PaaS (kết hợp Linear, Stripe và Apple Pro).  
> **Typography:** Google Fonts **`Plus Jakarta Sans`** (headings, cards, banners) và **`Inter`** (body, data tables, metrics) có đầy đủ subset `vietnamese,latin`.

---

## 1. Hệ Thống Màu Sắc & Tokens Chuẩn (Design Tokens)

### 1.1. Bảng màu Nền & Bề mặt (Surface & Neutral)
| Token | Giá trị Hex | Ứng dụng thực tế |
| :--- | :--- | :--- |
| `surface-ground` | `#f8fafc` (`slate-50`) | Màu nền chính toàn ứng dụng |
| `surface-card` | `#ffffff` (`white`) | Bề mặt các thẻ chức năng (Cards), Modal, Drawer |
| `surface-muted` | `#f1f5f9` (`slate-100`) | Nền thanh công cụ, ô nhập liệu phụ, dải tab |
| `border-subtle` | `#e2e8f0` (`slate-200`) | Viền ngăn cách giữa các module, đường kẻ bảng |
| `text-primary` | `#0f172a` (`slate-900`) | Tiêu đề chính, văn bản quan trọng |
| `text-secondary`| `#475569` (`slate-600`) | Nhãn trường, mô tả phụ, nội dung bảng |
| `text-muted` | `#94a3b8` (`slate-400`) | Placeholder, ngày tháng, thông tin chú thích |

### 1.2. Nhận Diện Mức Độ Ưu Tiên (Priority Frame Colors)
- **`URGENT` (Khẩn cấp)**: Viền đỏ hồng `#f43f5e`, nền pastel `bg-rose-50/40`, chấm chỉ báo `#e11d48`.
- **`HIGH` (Cao)**: Viền cam hổ phách `#f59e0b`, nền pastel `bg-amber-50/40`, chấm chỉ báo `#d97706`.
- **`MEDIUM` (Trung bình)**: Viền xanh lam `#3b82f6`, nền pastel `bg-blue-50/40`, chấm chỉ báo `#2563eb`.
- **`LOW` (Thấp)**: Viền xám slate `#94a3b8`, nền pastel `bg-slate-50/60`, chấm chỉ báo `#64748b`.

---

## 2. Bản Vẽ Bố Cục Chi Tiết Các Màn Hình (ASCII Wireframes)

### Màn hình 1: Đăng Nhập & Đăng Ký (Authentication)
```
┌────────────────────────────────────────────────────────┐
│                                                        │
│       [Logo WorkSync Enterprise]                       │
│       Chào mừng bạn trở lại!                           │
│       Đăng nhập vào không gian làm việc của bạn        │
│                                                        │
│       Email công vụ                                    │
│       ┌──────────────────────────────────────┐         │
│       │ user@worksync.com                    │         │
│       └──────────────────────────────────────┘         │
│       Mật khẩu                                         │
│       ┌──────────────────────────────────────┐         │
│       │ •••••••••••••                        │ [Ẩn/Hiện]│
│       └──────────────────────────────────────┘         │
│                                                        │
│       [x] Ghi nhớ đăng nhập       Quên mật khẩu?       │
│                                                        │
│       [          Đ Ă N G   N H Ậ P           ]         │
│                                                        │
│       ────────────── HOẶC ──────────────               │
│       [   G   Đăng nhập nhanh với Google     ]         │
│                                                        │
│       Chưa có tài khoản? Đăng ký ngay                  │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Màn hình 2: Bảng Điều Khiển Tổng Quan (Executive Dashboard)
```
┌───────────────────────────────────────────────────────────────────────────┐
│ [WS Logo] WorkSync     [🔍 Tìm kiếm nhanh...]     🔔 (3)   🌐 VI   👤 Tuấn ▾│
├───────────┬───────────────────────────────────────────────────────────────┤
│ ĐIỀU HƯỚNG│ Xin chào, Nguyễn Minh Tuấn 👋                                 │
│ 📊 Tổng quan│ Thứ Tư, 21/10/2026 — FPT Complex Đà Nẵng                       │
│ 📁 Dự án   ├───────────┬───────────┬───────────┬───────────┬─────────────┤
│ 📋 Việc tôi│ 24 Tasks  │ 8 Đang làm│ 2 Quá hạn │ 14 Đã xong│ 98% Chuyên c│
│ 📅 Lịch làm│ Tổng cộng │ In-prog   │ Overdue   │ Completed │ On-time     │
│ ⚡ Giao nhanh├───────────┴───────────┴───────────┴───────────┴─────────────┤
│ 📹 Cuộc họp│ 📈 Tốc Độ Hoàn Thành 7 Ngày (Sprint Velocity)               │
│ 📄 Tài liệu│ [Recharts Bar Chart: T2(12pt), T3(18pt), T4(24pt)...]        │
│ ⏰ Điểm danh├─────────────────────────────┬───────────────────────────────┤
│ 💬 Trò chuyện│ 📌 Active Sprint: Sprint 12 │ 📹 Cuộc Họp Sắp Diễn Ra       │
│           │ Tiến độ: [========--] 78%   │ • 09:30: Daily Standup        │
│           │ Còn lại: 4 ngày (15/65 SP)  │ • 14:00: Demo WebRTC với UAT  │
│           │ [Chi tiết Sprint ↗]         │ [Vào phòng họp ↗]             │
└───────────┴─────────────────────────────┴───────────────────────────────┘
```

### Màn hình 3: Bảng Công Việc Kanban & Thanh Lọc Đồng Bộ
```
WorkSync / Việc của tôi (Assigned & Personal)                 [+ Tạo việc]
┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐
│ Tổng: 24 việc │ │ Đang làm: 8   │ │ Quá hạn: 2    │ │ Hoàn tất: 14  │
└───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘
[Chế độ: 📊 Bảng | 📋 Danh sách] [🔍 Tìm kiếm...] [Lọc ưu tiên ▾] [Ẩn việc đã xong]

  CẦN LÀM (4)         ĐANG LÀM (5)        ĐÁNH GIÁ (2)       HOÀN TẤT (12)
┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐
│TASK-101        │  │TASK-104        │  │TASK-108        │  │TASK-098        │
│Viết API Login  │  │Tối ưu font VI  │  │Review WebRTC   │  │Setup Monorepo  │
│🔴 URGENT  5 SP │  │🟠 HIGH    3 SP │  │🔵 MEDIUM  2 SP │  │🟢 DONE    8 SP │
│👤 Tuấn  ⏰ 2d  │  │👤 An     ⏰ 1d  │  │👤 Bình   ⏰ 3d  │  │👤 Hùng  ⏰ Xong│
│[Linear Modal ↗]│  │[Linear Modal ↗]│  │[Linear Modal ↗]│  │[Linear Modal ↗]│
├────────────────┤  ├────────────────┤  └────────────────┘  └────────────────┘
│TASK-102        │  │TASK-105        │
│Cấu hình Redis  │  │Bảng nhiệt chấm │
│🔵 MEDIUM  2 SP │  │🟠 HIGH    5 SP │
└────────────────┘  └────────────────┘
```

### Màn hình 4: Modal Chi Tiết Nhiệm Vụ Chuẩn Linear (Task Details Modal)
```
┌────────────────────────────────────────────────────────────────────────────┐
│ TASK-104 • WorkSync Core Platform                     [🔴 HIGH] [✖ Đóng]  │
├────────────────────────────────────────┬───────────────────────────────────┤
│ TỐI ƯU HÓA PHÔNG CHỮ TIẾNG VIỆT       │ THÔNG SỐ CÔNG VIỆC                │
│                                        │                                   │
│ [TIẾN TRÌNH TRẠNG THÁI]                │ 👤 Người nhận việc:               │
│ [Cần làm] [Đang làm*] [Review] [Xong]  │   Trần Văn An (Frontend Dev)      │
│                                        │ 👤 Người giao việc:               │
│ MÔ TẢ CÔNG VIỆC:                       │   Nguyễn Minh Tuấn (PM)           │
│ - Gỡ bỏ font hẹp Haettenschweiler/Impac│ 📅 Hạn chót hoàn thành:           │
│ - Nhúng Google Fonts Plus Jakarta Sans │   25/10/2026 (Còn 4 ngày)         │
│ - Tinh chỉnh tiêu đề Kanban không vỡ   │ ⏱ Thời gian ước tính: 8.0 giờ    │
│                                        │ ⏳ Thời gian thực tế: 6.5 giờ     │
│ 📎 TÀI LIỆU & BÀN GIAO NGHIỆM THU:     │ ⚡ Story Points: 5 SP              │
│ • kien_truc_typography.pdf (1.2 MB)    │ 📁 Dự án: WorkSync Core Platform  │
│ [Tải lên sản phẩm nghiệm thu ⬆]        │ 🏃 Sprint: Sprint 12              │
│                                        │ 🕒 Tạo lúc: 21/10/2026 09:15      │
└────────────────────────────────────────┴───────────────────────────────────┘
```

### Màn hình 5: Phòng Họp Trực Tuyến Chuẩn Google Meet & Live STT (WebRTC)
```
┌────────────────────────────────────────────────────────────────────────────┐
│ Sprint 12 Daily Standup  •  00:25:40   [🔴 ĐANG GHI AI]   [5 người tham gia]│
├────────────────────────────────────────┬───────────────────────────────────┤
│                                        │ 📝 BIÊN BẢN HỌP GEMINI 1.5 FLASH  │
│       [SPOTLIGHT SCREEN SHARE]         │ ───────────────────────────────── │
│                                        │ • Tóm tắt: Nhóm Frontend đã hoàn  │
│      Màn hình trình chiếu của An       │   tất song ngữ VI/EN trên Kanban. │
│   ┌────────────────────────────────┐   │ • Quyết định:                     │
│   │  Vite + React 19 Kanban Demo   │   │   1. Xuất biên bản họp ra Word.   │
│   │                                │   │ • Action Items:                   │
│   └────────────────────────────────┘   │   ☐ @An: Deploy bản vá font tiếng │
│                                        │      Việt trước 17:00 hôm nay     │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ │   [+ 1-Click Tạo Task Lên Kanban] │
│ │ Tuấn (PM)│ │ Mai (Dev)│ │ Bình (QA)│ │                                   │
│ │ [VU:|||] │ │ [VU: | ] │ │ [VU:  ]  │ │ 💬 Chat & Tệp tin cuộc họp (2)    │
│ └──────────┘ └──────────┘ └──────────┘ │ [📄 Xuất Word .doc] [📊 Xuất CSV] │
├────────────────────────────────────────┴───────────────────────────────────┤
│ 💬 LIVE SUBTITLE: "An: Tôi đã cập nhật xong Plus Jakarta Sans không bị lỗi"│
├────────────────────────────────────────────────────────────────────────────┤
│   [🎤 Mic]   [📷 Cam]   [🔴 Ghi AI]   [🖥 Chia sẻ màn hình]   [🔴 Kết thúc] │
└────────────────────────────────────────────────────────────────────────────┘
```

### Màn hình 6: Điểm Danh Thông Minh & Bảng Nhiệt 365 Ngày (Attendance)
```
┌───────────────────────────────────────────────────────────────────────────┐
│ WorkSync / Điểm danh thông minh & Quản trị chuyên cần                     │
├───────────────────────────────────────────────────────────────────────────┤
│ 📍 FPT Complex Đà Nẵng (Đang trong vùng Geofence: 42m - Hợp lệ)           │
│ Giờ làm việc: 08:00 – 17:30  |  Check-in hôm nay: 08:14:22 (ĐÚNG GIỜ)      │
│ [CHECK-IN 1-CLICK: ĐÃ XÁC NHẬN ✅]     [CHECK-OUT RA VỀ 🚪]                │
├───────────────────────────────────────────────────────────────────────────┤
│ 🗺 BẢN ĐỒ ĐỊNH VỊ GEOFENCE (Leaflet OpenStreetMap FPT 4K)                 │
│ [Vùng tròn 500m xanh lá quanh FPT Complex] • [Avatar bạn tại 15.968, 108.26]│
├───────────────────────────────────────────────────────────────────────────┤
│ 🗓 BẢNG NHIỆT CHUYÊN CẦN 365 NGÀY (GitHub-style Heatmap 52 tuần)           │
│ T2 ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                   │
│ T4 ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                   │
│ T6 ■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■■                   │
│ Chú thích: 🟩 Đúng giờ (180) | 🟨 Đi muộn (8) | 🟦 WFH (12) | 🟧 Nghỉ phép (3)│
│                                                                           │
│ [Đơn WFH]  [Đơn Nghỉ phép]  [Đơn Về sớm]  [Đơn Làm thêm giờ] [Xuất Excel] │
└───────────────────────────────────────────────────────────────────────────┘
```

### Màn hình 7: Khung Trò Chuyện Trực Tuyến 2 Cột (Real-time Chat Hub)
```
┌────────────────────────────────┬──────────────────────────────────────────┐
│ 💬 TRÒ CHUYỆN NỘI BỘ           │ 👤 Trần Văn An (Frontend Lead)           │
│ [🔍 Tìm kiếm hội thoại...]     │ 🟢 Trực tuyến  •  Phòng Kỹ thuật phần mềm │
├────────────────────────────────┼──────────────────────────────────────────┤
│ 📌 HỘI THOẠI ĐÃ GHIM           │                                          │
│ ⭐ Nhóm Dự Án WorkSync Core    │ [14:20] Trần Văn An:                     │
│    Tuấn: Đã push bản vá font   │ Mình vừa test bản dựng mới, phông chữ    │
│                                │ Plus Jakarta Sans hiển thị rất đẹp!      │
│ 💬 TRỰC TIẾP 1-1               │ ❤️ (Tuấn, Mai)                            │
│ 👤 Trần Văn An             (1) │                                          │
│    An: Font tiếng Việt rất đẹp!│ [14:22] Bạn (Tuấn):                      │
│ 👤 Lê Thị Bình                 │ Tuyệt vời, mình vừa cập nhật lại bộ docs │
│    Bình: Đã nhận đơn nghỉ phép │ cho đồ án rồi nhé!                       │
│                                │ 🚀 (An)                                  │
│ 👥 PHÒNG BAN                   │                                          │
│ 🏢 Kỹ thuật phần mềm (12 mem) │                                          │
├────────────────────────────────┼──────────────────────────────────────────┤
│                                │ ✍️ An đang nhập tin nhắn...              │
│                                │ [📎] [Nhập tin nhắn... (Enter gửi)]  [➤] │
└────────────────────────────────┴──────────────────────────────────────────┘
```

### Màn hình 8: Quản Trị Sprint Agile Chuẩn Jira (Sprints & Backlog Hub)
```
┌───────────────────────────────────────────────────────────────────────────┐
│ WorkSync / Dự án / WorkSync Core Platform / Kế Hoạch Sprint               │
├───────────────────────────────────────────────────────────────────────────┤
│ 🏃 SPRINT 12 (Đang kích hoạt: 14/10 – 28/10)           [+ Thêm việc vào SP]│
│ Mục tiêu: Triển khai Chat real-time và tối ưu bảng Kanban                 │
│ Tiến độ: 50/65 Story Points (76%) hoàn thành        [Đóng Sprint]         │
│ ┌───────────────────────────────────────────────────────────────────────┐ │
│ │ [x] TASK-101: Viết Gateway Socket.IO      Assignee: An     5 SP   DONE│ │
│ │ [x] TASK-102: Giao diện chat 2 cột        Assignee: Mai    3 SP   DONE│ │
│ │ [ ] TASK-103: Thả cảm xúc emoji           Assignee: Tuấn   2 SP   TODO│ │
│ └───────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│ 📦 PRODUCT BACKLOG (18 công việc chưa phân bổ Sprint)  [+ Tạo việc mới]   │
│ • TASK-110: Tích hợp thanh toán lương tự động               Assignee: --  │
│ • TASK-111: Mobile native app PWA                           Assignee: --  │
│ [Kéo thả hoặc bấm chuyển việc vào Sprint đang chạy ▾]                    │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Quy Chuẩn Kích Thước Màn Hình (Responsive Breakpoints)

| Breakpoint | Chiều rộng (Width) | Hành vi giao diện (Layout Behavior) |
| :--- | :--- | :--- |
| **Mobile** | `375px – 767px` | Thu gọn sidebar thành Drawer trượt, hiển thị bảng Kanban 1 cột có vuốt ngang. |
| **Tablet** | `768px – 1023px` | Bảng Kanban hiển thị 2-3 cột, ẩn thanh bên phụ của khung chat. |
| **Desktop** | `1024px – 1439px` | Bố cục chuẩn: Sidebar trái 260px, Khung nội dung chính tự co giãn, Modal 2 cột. |
| **Wide / 4K**| `1440px+` | Hiển thị trọn vẹn 5 cột Kanban, mở rộng timeline lịch trình và bản đồ FPT 4K. |
