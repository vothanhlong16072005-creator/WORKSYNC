# 📚 WorkSync — Hướng Dẫn Học Tập & Ôn Tập

> **Mục đích:** Bộ tài liệu tự học giúp bạn nắm vững kiến trúc, tổ chức code và giải thích từng cụm tính năng của dự án WorkSync — phục vụ trình bày, bảo vệ đồ án và trao đổi với giáo viên hướng dẫn.
>
> **Cập nhật:** 24/10/2026 | **Nguồn:** đối chiếu 100% với code thực tế tại `backend/src` và `frontend/src` + bộ `docs/` chính thức.

---

## 🎯 Cách Dùng Bộ Tài Liệu Này

### Lộ trình học gợi ý

| Giai đoạn | Đọc file | Mục tiêu |
|----------|-----------|----------|
| **1. Nền tảng** | `01-TONG-TONG-KIEN-TRUC.md` | Hiểu hệ thống này là gì, chạy thế nào, các module nằm ở đâu |
| **2. Cơ sở dữ liệu** | `02-DU-LIEU-HE-THONG-DATABASE.md` | 37 model Prisma, quan hệ FK, enum, transaction |
| **3. Backend** | `03-BACKEND-NESTJS.md` | Controller → Service → Prisma, Guards, RBAC, Socket.IO Gateway |
| **4. Frontend** | `04-FRONTEND-REACT.md` | React 19, Zustand, hooks, routing, i18n, design tokens |
| **5. Tính năng** | `05-` … `12-` (M1→M10) | Đi sâu từng cụm tính năng theo nghiệp vụ |
| **6. Triển khai** | `13-HUONG-DAN-TRIEN-KHAI.md` | Docker, test, deploy, bảo mật |
| **7. Chuẩn bị** | `99-CHEAT-SHEET-THI.md` | Tóm tắt để ôn nhanh trước khi trình bày |

### Quy ước đọc code trong tài liệu

Tài liệu dùng **đường dẫn thật** kèm số dòng, ví dụ:

```
backend/src/meetings/meetings.gateway.ts:80
```

→ Nhấn `Ctrl+P` trong VSCode, gõ đường dẫn, gõ `:80` để nhảy tới dòng đó.

---

## 📂 Danh Mục File Trong Folder `study/`

| File | Nội dung | Dành cho |
|------|----------|----------|
| `00-MUC-LUC-HUONG-DAN.md` | File này — hướng dẫn sử dụng | Tất cả |
| `01-TONG-TONG-KIEN-TRUC.md` | Tổng quan dự án, kiến trúc, cấu trúc thư mục, chạy dự án, Docker | Buổi trình bày tổng quan |
| `02-DU-LIEU-HE-THONG-DATABASE.md` | Schema Prisma 37 model, 26 enum, ERD, migration, transaction | Câu hỏi về dữ liệu |
| `03-BACKEND-NESTJS.md` | NestJS patterns, DI, Guards, Guards RBAC, Guards, exception filter, validation | Câu hỏi về backend |
| `04-FRONTEND-REACT.md` | React 19, Zustand persist, Axios+Zod, i18n, Tailwind tokens, component patterns | Câu hỏi về frontend |
| `05-FEATURE-AUTH-RBAC.md` | M1 — Xác thực JWT, OAuth, 5 vai trò, phân quyền 2 lớp | Hỏi về bảo mật |
| `06-FEATURE-ATTENDANCE.md` | M2 — GPS Geofencing, Haversine, IP check, nghỉ phép/WFH/OT, export | Hỏi về nghiệp vụ chấm công |
| `07-FEATURE-PROJECTS-SPRINTS.md` | M3/M3.5/M3.6 — Dự án, Kanban kéo thả, Sprint, Burndown, QuickTask, swap-PM | Hỏi về quản lý dự án |
| `08-FEATURE-MEETINGS-WEBRTC-AI.md` | M5 — WebRTC signaling, dual-track, STT, Gemini AI, export | Hỏi về tính năng phức tạp nhất |
| `09-FEATURE-DOCUMENTS.md` | M6 — Tiptap, versioning, phân quyền 5 scope, attachment 25MB, AI summary | Hỏi về quản lý tài liệu |
| `10-FEATURE-CALENDAR.md` | M8 — Timeline 6 nguồn, conflict engine, drag-drop RBAC, ICS export | Hỏi về lịch trình |
| `11-FEATURE-CHAT-NOTIFICATIONS.md` | M9 — Socket.IO chat, presence, reactions, Web Push VAPID | Hỏi về realtime |
| `12-FEATURE-DASHBOARD-DAILY-REPORT.md` | M10 + Dashboard — 5 layout theo role, AI draft báo cáo cuối ngày | Hỏi về báo cáo |
| `13-HUONG-DAN-TRIEN-KHAI.md` | Công nghệ, quy trình phát triển, test, deploy, mở rộng | Hỏi về quy trình |
| `99-CHEAT-SHEET-THI.md` | Bảng tra nhanh: mọi endpoint, enum, bảng DB, câu hỏi thường gặp | Ôn tập trước khi thi |

---

## ⚠️ Lưu Ý Quan Trọng Về Tính Chính Xác

Khi soạn tài liệu này, tôi đã **đọc trực tiếp code nguồn** chứ không chỉ dựa vào `docs/`. Điều này phát hiện ra một số điểm lệch giữa tài liệu cũ và code thực tế:

| Điểm lệch | `docs/` ghi | Code thực tế | Ghi chú |
|------------|-------------|---------------|---------|
| Bán kính Geofence | 500m | **100m** | `office-presets.ts` đặt `radiusMeters: 100`; commit `891b458` ghi rõ "geofence 100m". `geo-validation.service.ts` vẫn default 500m nhưng luôn được truyền giá trị từ preset. |
| Số vai trò | 5 (một số tài liệu cũ nói 4 + VIEWER) | **5**: `ADMIN`, `HR`, `DEPARTMENT_HEAD`, `PM`, `EMPLOYEE` | `MO_TA_DU_AN.md` còn mô tả role `VIEWER` — role này **không tồn tại** trong enum `Role` của Prisma. |
| Số bảng DB | "28 tables" / "37 models" | **37 model** | Đếm trực tiếp từ `schema.prisma`: 37 `model` + 26 `enum`. `docs/05-TECH-STACK.md` ghi "37 models" — **chính xác**. |
| Bảng tin nhắn chat | RAM của backend | **PostgreSQL** (`ChatMessage` model) | Gateway chỉ cache chat *trong phòng họp*, chat chính dùng DB. |

> **Khi trình bày với giáo viên, hãy dựa vào bộ tài liệu này (đã đối chiếu code)** thay vì `MO_TA_DU_AN.md` — file đó là tài liệu thiết kế ban đầu và đã lỗi thời ở một số chi tiết.

---

## 🔗 Tài liệu liên quan trong repo

| File | Vai trò |
|------|---------|
| `docs/00-PRD.md` | Yêu cầu sản phẩm, 5 vai trò, nguyên tắc nghiệp vụ |
| `docs/01-FEATURES.md` | Checklist đầy đủ từng endpoint theo vai trò |
| `docs/02-API-CONTRACT.md` | Request/response mẫu cho từng API |
| `docs/03-DATABASE.md` | ERD + schema chi tiết |
| `docs/05-TECH-STACK.md` | Bảng công nghệ + kiến trúc |
| `docs/06-STYLE-GUIDE.md` | Quy ước viết code cho team |
| `docs/99-PROGRESS-LOG.md` | Nhật ký phát triển theo ngày |
| `docs/M5.3-WEBRTC-FIX-PLAN.md` | Plan sửa 7 bug WebRTC (đã triển khai commit `051a637`) |
| `.agents/memory/ACTIVE_CONTEXT.md` | Trạng thái dự án hiện tại |

---

## 💡 Gợi Ý Khi Trả Lời Giáo Viên

Với mỗi câu hỏi, hãy trả lời theo công thức **3 tầng**:

1. **Vấn đề nghiệp vụ** — Tại sao cần tính năng này (VD: "Vì nhân viên vào sau không thấy camera người vào trước")
2. **Giải pháp kỹ thuật** — Dùng công nghệ gì, file nào (VD: "Server relay media state trong `meetings.gateway.ts`, deterministic initiator so sánh userId")
3. **Bằng chứng đã hoạt động** — Test/thước đo được (VD: "38 test files backend, 28 test files frontend, E2E 7 scenario")

> Chi tiết cụ thể cho từng module nằm trong các file `05-` đến `12-` của folder này.
