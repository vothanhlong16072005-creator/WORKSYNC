# 🎨 Hướng Dẫn Thiết Kế & Hệ Thống Giao Diện (Design System & UI Guidelines) — WorkSync
> **Phiên bản:** 2.0 (Bauhaus PaaS Edition) | **Ngày cập nhật:** 21/10/2026  
> **Ngôn ngữ thiết kế:** Modern Bauhaus Enterprise PaaS (kết hợp phong cách Linear, Stripe và Apple Pro).  
> **Bộ phông chữ chuẩn:** Google Fonts **`Plus Jakarta Sans`** (weights 500-800) và **`Inter`** (weights 400-700) kèm subset `vietnamese,latin`.

---

## 1. Triết Lý Thiết Kế Cốt Lõi (Core Design Principles)

1. **Thanh Lịch & Rõ Ràng (Clarity over Decoration)**:
   - Sử dụng tông màu sáng sang trọng (`bg-slate-50`, thẻ `bg-white`, viền mảnh `border-slate-200/90`), tạo cảm giác rộng rãi, sạch sẽ cho ứng dụng SaaS doanh nghiệp.
   - Loại bỏ triệt để các viền đen thô kệch và màu sắc sặc sỡ nhức mắt.
2. **Nghiêm Cấm Sử Dụng Emoji Trên Nút Bấm**:
   - 100% nút bấm hành động (Action Buttons) sử dụng biểu tượng vector **Lucide React SVG** đồng bộ kích thước (16px / 18px), đảm bảo tính chuyên nghiệp.
3. **Phông Chữ Tiếng Việt Chuẩn Xác (Typography Excellence)**:
   - Tiêu đề, thẻ thống kê và nhãn trạng thái sử dụng **`Plus Jakarta Sans`** với `font-weight: 700 - 800`, `letter-spacing: -0.025em`.
   - Bảng số liệu, văn bản nội dung và code sử dụng **`Inter`** và font monospace hệ thống, loại bỏ hoàn toàn hiện tượng nhảy phông, vỡ dấu thanh tiếng Việt.
4. **Phản Hồi Trực Quan & Micro-interactions**:
   - Hiệu ứng chuyển động mượt mà (`duration-200 ease-in-out`), hover highlight dịu nhẹ, dải trạng thái đập nhịp (`animate-pulse`) cho các sự kiện trực tiếp (Live-ticking attendance, Live caption meeting).

---

## 2. Hệ Thống Màu Sắc & Tokens (Color Tokens)

### 2.1. Bảng màu Nền & Bề mặt (Surface & Neutral)
| Token | Mã màu Hex | Ứng dụng thực tế |
| :--- | :--- | :--- |
| `surface-ground` | `#f8fafc` (`slate-50`) | Màu nền chính toàn ứng dụng |
| `surface-card` | `#ffffff` (`white`) | Bề mặt các thẻ chức năng (Cards), Modal, Drawer |
| `surface-muted` | `#f1f5f9` (`slate-100`) | Nền thanh công cụ, ô nhập liệu phụ, dải tab |
| `border-subtle` | `#e2e8f0` (`slate-200`) | Viền ngăn cách giữa các module, đường kẻ bảng |
| `text-primary` | `#0f172a` (`slate-900`) | Tiêu đề chính, văn bản quan trọng |
| `text-secondary`| `#475569` (`slate-600`) | Nhãn trường, mô tả phụ, nội dung bảng |
| `text-muted` | `#94a3b8` (`slate-400`) | Placeholder, ngày tháng, thông tin chú thích |

### 2.2. Nhận Diện Mức Độ Ưu Tiên (Priority Frame Colors)
Khác với các hệ thống cũ dùng đường kẻ màu dày 4px gây phân tâm, WorkSync áp dụng khung viền pastel tinh tế:
- **`URGENT` (Khẩn cấp)**: Viền đỏ hồng `#f43f5e`, nền pastel `bg-rose-50/40`, chấm chỉ báo `#e11d48`.
- **`HIGH` (Cao)**: Viền cam hổ phách `#f59e0b`, nền pastel `bg-amber-50/40`, chấm chỉ báo `#d97706`.
- **`MEDIUM` (Trung bình)**: Viền xanh lam `#3b82f6`, nền pastel `bg-blue-50/40`, chấm chỉ báo `#2563eb`.
- **`LOW` (Thấp)**: Viền xám slate `#94a3b8`, nền pastel `bg-slate-50/60`, chấm chỉ báo `#64748b`.

---

## 3. Kiến Trúc Bố Cục Các Màn Hình Chính (Key Screen Layouts)

### 3.1. Executive Dashboard (Bảng Điều Khiển Tổng Quan)
- **Header Kicker & Welcome**: Lời chào cá nhân hóa, ngày tháng thời gian thực, nút làm mới dữ liệu nhanh.
- **Dải KPI Ribbon (6 Thẻ Đa Sắc)**: Tổng công việc, Đang thực hiện, Quá hạn, Đã hoàn thành, Chuyên cần hôm nay, Sức khỏe hệ thống.
- **Khối Biểu Đồ & Tác Vụ**: Biểu đồ Recharts tiến độ 7 ngày (Velocity), Khối Active Sprint (chu kỳ & SP), Cuộc họp sắp tới, Tài liệu gần đây.
- **Mega-Footer**: Liên kết nhanh hỗ trợ, phiên bản hệ thống và trạng thái kết nối máy chủ.

### 3.2. Bảng Công Việc Kanban & Linear Modal Chi Tiết
```
┌─────────────────────────────────────────────────────────────────────────┐
│ WorkSync / Việc được giao & Cá nhân                       [+ Tạo việc]  │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ │
│ │ Tổng: 24 việc │ │ Đang làm: 8   │ │ Quá hạn: 2    │ │ Hoàn tất: 14  │ │
│ └───────────────┘ └───────────────┘ └───────────────┘ └───────────────┘ │
│ [🔍 Tìm kiếm...] [Lọc ưu tiên ▾] [Lọc nhãn ▾] [Sắp xếp ▾] [Ẩn đã xong] │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────┤
│ CẦN LÀM (4)  │ ĐANG LÀM (5) │ ĐÁNH GIÁ (2) │ BỊ CHẶN (1)  │ HOÀN TẤT(12)│
│ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌─────────┐ │
│ │ TASK-101 │ │ │ TASK-104 │ │ │ TASK-108 │ │ │ TASK-102 │ │ │ TASK-09 │ │
│ │ Thiết kế │ │ │ Viết API │ │ │ Review   │ │ │ Lỗi CORS │ │ │ Setup   │ │
│ │ 🔴 Urgent│ │ │ 🟠 High  │ │ │ 🔵 Medium│ │ │ 🔴 Block │ │ │ 🟢 Done │ │
│ └──────────┘ │ └──────────┘ │ └──────────┘ │ └──────────┘ │ └─────────┘ │
└──────────────┴──────────────┴──────────────┴──────────────┴─────────────┘
```

### 3.3. Phòng Họp Trực Tuyến Chuẩn Google Meet (WebRTC Room)
- **Khung Trình Chiếu Nổi Bật (Spotlight Tile)**: Tự động đưa màn hình chia sẻ (Screen Share) hoặc người đang phát biểu vào vị trí trung tâm, định dạng `object-contain bg-slate-950`.
- **Dải Video Thành Viên (Participant Filmstrip)**: Thẻ camera bo góc mềm mại, hiển thị tên, trạng thái mic/cam và sóng âm thanh VU meter.
- **Thanh Điều Khiển Nổi Kính Mờ (Glassmorphic Bottom Bar)**: Các nút tròn hoàn hảo (`rounded-full`): Bật/Tắt Mic, Bật/Tắt Cam, Bật/Tắt Ghi âm AI, Chia sẻ màn hình, Mở Chat, Mở danh sách người tham dự, và Nút gác máy màu đỏ nổi bật.
- **Phụ Đề Nổi Thời Gian Thực (Live Caption Overlay)**: Tự động cuộn các câu thoại nhận diện STT tiếng Việt ở đáy màn hình.

### 3.4. Dòng Thời Gian Lịch Biểu Hợp Nhất (Work Calendar Timeline)
- Dải điều hướng Ngày / Tuần / Tháng kèm nút "Hôm nay".
- Bộ phát hiện xung đột: Thanh Alert banner đỏ nhấp nháy khi có trùng giờ họp hoặc dồn task quá hạn.
- Khối sự kiện phân màu trực quan: Tasks (Xanh lam), Sprints (Tím), Meetings (Xanh lá), Nghỉ phép (Cam), WFH (Vàng), Tăng ca (Đỏ).

### 3.5. Khung Trò Chuyện Trực Tuyến 2 Cột (Real-time Chat Hub)
- **Cột Trái (Conversations Sidebar)**: Danh sách hội thoại 1-1, Nhóm dự án, Nhóm phòng ban; huy hiệu tin chưa đọc (Unread badge), trạng thái online xanh lá và biểu tượng ghim.
- **Cột Phải (Active Conversation Window)**:
  - Header: Tên người nhận/nhóm, trạng thái hoạt động, nút tìm kiếm và tùy chọn tắt thông báo.
  - Vùng tin nhắn: Bong bóng tin nhắn chia 2 bên (xanh cho người gửi, trắng cho đối phương), hỗ trợ trích dẫn tin nhắn, xem tệp đính kèm và dải emoji reactions.
  - Vùng soạn thảo: Ô nhập tin nhắn đa dòng, nút gửi file kẹp giấy, nút gửi tin nhắn tức thời.

---

## 4. Khả Năng Tiếp Cận & Đa Nền Tảng (Accessibility & Responsive)

1. **Chuẩn WCAG 2.1 AA**:
   - Tỷ lệ tương phản chữ trên nền đạt tối thiểu 4.5:1 đối với văn bản thông thường và 3:1 đối với tiêu đề lớn.
   - Hỗ trợ đầy đủ điều hướng bằng bàn phím (`Tab`, `Enter`, `Esc`), nhãn `aria-label` cho các nút bấm chỉ có icon.
2. **Đáp ứng Đa Màn Hình (Responsive Design)**:
   - Tối ưu hóa mượt mà từ màn hình máy tính bàn 4K, laptop 13-16 inch đến máy tính bảng và điện thoại di động (hỗ trợ Drawer trượt thay thế sidebar khi màn hình < 768px).
