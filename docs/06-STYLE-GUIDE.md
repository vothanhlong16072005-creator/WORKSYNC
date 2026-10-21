# 📐 Quy Chuẩn Lập Trình & Thiết Kế (Engineering & UI Style Guide) — WorkSync
> **Phiên bản:** 2.0 (Strict Enterprise Edition) | **Ngày cập nhật:** 21/10/2026  
> **Áp dụng:** Toàn bộ thành viên phát triển và AI coding agents. Bắt buộc tuân thủ 100%.

---

## 1. Tiêu Chuẩn TypeScript Nghiêm Ngặt (Strict TypeScript)

### 1.1. Chính Sách "Zero Any"
- **Tuyệt đối không dùng kiểu `any`**.
- Sử dụng `unknown` kết hợp với type guard narrowing hoặc Zod parsing khi nhận dữ liệu từ bên ngoài.
- Dùng `interface` cho cấu trúc dữ liệu đối tượng có thể mở rộng; dùng `type` cho Discriminated Unions và Mapped Types.
- Sử dụng Discriminated Unions cho các máy trạng thái (State Machines) thay vì nhiều cờ boolean rời rạc.

```typescript
// ✅ ĐÚNG: Discriminated Union cho trạng thái tải
type DataState<T> =
  | { status: 'idle'; data: null; error: null }
  | { status: 'loading'; data: T | null; error: null }
  | { status: 'ready'; data: T; error: null }
  | { status: 'error'; data: T | null; error: string };

// ❌ SAI: Dùng cờ boolean rời rạc và any
interface BadState {
  isLoading: boolean;
  isError: boolean;
  data: any;
}
```

---

## 2. Quy Chuẩn Giao Diện & Trải Nghiệm (Bauhaus Enterprise UI/UX)

### 2.1. Cấm Tuyệt Đối Sử Dụng Emoji Trên Nút Bấm
- **Quy tắc bắt buộc:** Nghiêm cấm dùng các biểu tượng emoji thô (như 🚀, 📋, ⚡, 🔴, ⏰, 💾) trên nhãn nút bấm của hệ thống.
- **Thay thế chuẩn:** 100% các nút hành động sử dụng biểu tượng vector từ thư viện **`lucide-react`** với kích thước chuẩn 14px – 18px (`className="w-4 h-4"`).

```tsx
// ✅ ĐÚNG: Bauhaus Enterprise Button với Lucide SVG icon
<Button className="h-10 px-4 gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm">
  <Plus className="w-4 h-4" />
  <span>{t('kanban.create_task', 'Tạo công việc')}</span>
</Button>

// ❌ SAI: Dùng emoji trên nút bấm
<button className="btn">➕ Tạo công việc mới 🚀</button>
```

### 2.2. Quy Chuẩn Phông Chữ Tiếng Việt (Typography)
- Hệ thống nhúng Google Fonts quốc tế: **`Plus Jakarta Sans`** cho tiêu đề và **`Inter`** cho nội dung.
- Tiêu đề chính sử dụng `font-weight: 700 - 800`, chữ thường tự nhiên (tránh viết hoa toàn bộ `UPPERCASE` nặng nề), khoảng cách chữ âm nhẹ (`tracking-tight` hoặc `-0.025em`).

---

## 3. Quy Chuẩn Đa Ngôn Ngữ (Internationalization — i18n)

1. **Không Hardcode Text Trên Giao Diện**:
   - Mọi chuỗi hiển thị tới người dùng phải được bọc qua hàm dịch thuật `t('namespace.key', 'Fallback')` từ hook `useTranslation()`.
   - Mỗi chuỗi mới phải được khai báo đồng thời trong cả hai tệp từ điển:
     - [frontend/src/i18n/locales/vi.json](file:///d:/FPT%20Trainning/Project-TTDN/Ver2/frontend/src/i18n/locales/vi.json)
     - [frontend/src/i18n/locales/en.json](file:///d:/FPT%20Trainning/Project-TTDN/Ver2/frontend/src/i18n/locales/en.json)
2. **Định Dạng Ngày Tháng Theo Locale**:
   - Truyền `i18n.language` vào các hàm format ngày tháng (`formatDate`, `formatShortDate`, `getDeadlineInfo`) để hiển thị chuẩn `en-US` hoặc `vi-VN`.

---

## 4. Quy Chuẩn Backend & Cơ Sở Dữ Liệu (NestJS & Prisma)

### 4.1. Cấu Trúc Mã Nguồn Theo Tính Năng (Feature-Based Architecture)
- Mỗi module backend nằm trong một thư mục riêng biệt tại `backend/src/<feature>/`, bao gồm:
  - `<feature>.module.ts`: Khai báo module, imports, providers, controllers.
  - `<feature>.controller.ts`: Tiếp nhận HTTP requests, kiểm tra quyền Guards, trả về response envelope.
  - `<feature>.service.ts`: Chứa toàn bộ nghiệp vụ lõi (business logic).
  - `<feature>.gateway.ts`: Xử lý giao tiếp WebSocket thời gian thực (nếu có).
  - `dto/`: Data Transfer Objects với validation decorators (`class-validator`).

### 4.2. Giao Dịch Cơ Sở Dữ Liệu Nguyên Tử (Database Transactions)
- Bất kỳ nghiệp vụ nào thực hiện từ 2 thao tác ghi (INSERT/UPDATE/DELETE) trở lên trên CSDL bắt buộc phải được bọc trong `prisma.$transaction`.
- Ví dụ: Trừ quỹ ngày phép, tạo dự án cá nhân song hành khi đăng ký tài khoản, hoán đổi PM dự án (`swap-pm`), đóng Sprint và hoàn trả backlog.

```typescript
// ✅ ĐÚNG: Giao dịch nguyên tử đảm bảo toàn vẹn dữ liệu
await this.prisma.$transaction(async (tx) => {
  await tx.leaveRequest.update({ where: { id }, data: { status: 'APPROVED' } });
  await tx.attendanceRecord.createMany({ data: recordsToInsert });
});
```

### 4.3. Kiểm Soát Phân Quyền Chặt Chẽ (RBAC Guards)
- Mọi controller (trừ Auth endpoints công khai) đều phải khai báo `@UseGuards(JwtAuthGuard, RolesGuard)`.
- Các hành động nhạy cảm phải chỉ định rõ vai trò được phép thông qua decorator `@Roles(Role.ADMIN, Role.DEPARTMENT_HEAD)`.

---

## 5. Quy Chuẩn Kiểm Thử Tự Động (Automated Testing)

1. **Quy Tắc "Test-First Verification"**:
   - Mỗi tính năng hoặc hàm sửa lỗi mới phải đi kèm ít nhất một unit test hoặc integration test tương ứng.
   - Chạy lệnh kiểm thử toàn diện trước khi commit:
     - Backend: `npm test` trong thư mục `backend` (yêu cầu 100% test files pass).
     - Frontend: `npm test` trong thư mục `frontend` (yêu cầu 100% test files pass).
2. **Kiểm Tra Kiểu Dữ Liệu Khi Đóng Gói**:
   - Bắt buộc chạy `npm run build` ở frontend (`tsc -b && vite build`) để đảm bảo không có bất kỳ lỗi cú pháp hoặc cảnh báo TypeScript nào.
