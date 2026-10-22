# Hướng Dẫn Triển Khai Toàn Diện WorkSync Lên Cloud Đa Nền Tảng

Tài liệu này hướng dẫn chi tiết từng bước đưa hệ thống **WorkSync (Ver2)** lên môi trường Cloud thực tế theo mô hình **Vercel (Frontend) + Render (Backend NestJS + WebSockets) + Neon (PostgreSQL Cloud)** hoàn toàn **MIỄN PHÍ 100%**.

Sau khi hoàn thành, bạn sẽ có:
* **Tên miền Frontend (HTTPS)**: `https://worksync.vercel.app` (Mở trên mọi thiết bị máy tính, điện thoại, tablet).
* **Tên miền Backend API & WebSockets**: `https://worksync-api.onrender.com`.
* **Cơ sở dữ liệu PostgreSQL Cloud**: Lưu trữ dữ liệu an toàn trên Neon.tech.

---

## 📋 TỔNG QUAN CÁC BƯỚC THỰC HIỆN

```
[1. Neon.tech]                 [2. Render.com]                 [3. Vercel.com]
Tạo PostgreSQL Cloud  --->  Deploy Backend NestJS  --->  Deploy Frontend Vite
(Lấy DATABASE_URL)         (Cấp API + WebSockets)       (Cấp HTTPS Domain)
```

---

## 🗄️ BƯỚC 1: TẠO DATABASE POSTGRESQL CLOUD TRÊN NEON.TECH (3 PHÚT)

1. Truy cập [https://neon.tech](https://neon.tech) và chọn **Sign Up** (đăng nhập nhanh bằng tài khoản GitHub).
2. Bấm **Create Project**:
   * **Project Name**: `worksync-db`
   * **Postgres version**: Chọn 15 hoặc 16 (mặc định)
   * **Region**: Chọn `Singapore (ap-southeast-1)` để có tốc độ truy cập từ Việt Nam nhanh nhất.
3. Sau khi tạo xong, màn hình sẽ hiển thị mục **Connection Details**:
   * Chọn tab **Connection string** và chọn định dạng **Pooled connection** (hoặc Direct).
   * Chuỗi kết nối có dạng:
     ```
     postgresql://worksync_owner:abc123xyz@ep-cool-fog-123456-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
     ```
   * **Sao chép (Copy) chuỗi này lại** để dùng cho Bước 2.

---

## ⚙️ BƯỚC 2: TRIỂN KHAI BACKEND NESTJS LÊN RENDER.COM (5 PHÚT)

1. Truy cập [https://render.com](https://render.com) và chọn **Get Started** (đăng nhập bằng tài khoản GitHub).
2. Tại bảng điều khiển Render, nhấn nút **New +** ở góc trên cùng bên phải -> Chọn **Web Service**.
3. Chọn kho mã nguồn (Repository) GitHub chứa dự án của bạn (`Ver2` hoặc tên repo của bạn).
4. Điền các thông tin cấu hình như sau:
   * **Name**: `worksync-backend` (hoặc tên tùy ý)
   * **Region**: `Singapore` (để cùng khu vực với Neon Database)
   * **Branch**: `main`
   * **Root Directory**: `backend`
   * **Runtime**: `Node`
   * **Build Command**:
     ```bash
     npm install && npm run build
     ```
   * **Start Command**:
     ```bash
     npx prisma db push && npm run seed:all && node dist/main
     ```
     *(Lệnh này sẽ tự động khởi tạo các bảng Prisma và nạp đầy đủ toàn bộ dữ liệu mẫu người dùng, phòng ban, dự án vào database Neon)*
   * **Instance Type**: Chọn gói **Free** ($0/month).

5. Cuộn xuống mục **Environment Variables** (Biến môi trường), nhấn **Add Environment Variable** và thêm các khóa sau:
   * `DATABASE_URL`: *(Dán chuỗi kết nối vừa copy từ Neon ở Bước 1)*
   * `JWT_SECRET`: `super_secret_jwt_key_worksync`
   * `NODE_ENV`: `production`
   * `PORT`: `10000`
   * `CORS_ORIGIN`: `*`
   * `GEMINI_API_KEY`: `your_gemini_api_key_here`
   * `VAPID_PUBLIC_KEY`: `your_vapid_public_key_here`
   * `VAPID_PRIVATE_KEY`: `your_vapid_private_key_here`
   * `VAPID_EMAIL`: `admin@worksync.com`

6. Bấm nút **Create Web Service**.
7. Chờ 3-4 phút để Render build và khởi động. Khi màn hình hiện chữ **`Live`** màu xanh, bạn sao chép URL của backend (ví dụ: `https://worksync-backend.onrender.com`).

---

## 🌐 BƯỚC 3: TRIỂN KHAI FRONTEND REACT LÊN VERCEL (3 PHÚT)

1. Truy cập [https://vercel.com](https://vercel.com) và đăng nhập bằng tài khoản GitHub.
2. Tại trang **Dashboard**, nhấn nút **Add New...** -> Chọn **Project**.
3. Tìm và chọn kho GitHub của bạn -> Nhấn **Import**.
4. Cấu hình dự án trên Vercel:
   * **Project Name**: `worksync` (hoặc tên bạn thích, ví dụ: `worksync-vothanhlong`)
   * **Framework Preset**: Chọn **Vite**
   * **Root Directory**: Nhấn nút *Edit* và chọn thư mục **`frontend`** -> Bấm *Continue*.
   * **Build and Output Settings**: Giữ mặc định (Build Command: `npm run build`, Output Directory: `dist`).

5. Mở mục **Environment Variables** (Biến môi trường) và thêm 2 biến:
   * Tên biến 1: **`VITE_API_URL`**
     * Giá trị: `https://worksync-backend.onrender.com/api` *(Thay bằng URL Render của bạn kèm đuôi /api)*
   * Tên biến 2: **`VITE_WS_URL`**
     * Giá trị: `https://worksync-backend.onrender.com` *(Thay bằng URL Render của bạn không có đuôi /api)*

6. Nhấn nút **Deploy**!
7. Sau khoảng 1 phút, Vercel sẽ hoàn tất và hiển thị pháo hoa chúc mừng kèm đường link chính thức của bạn (ví dụ: `https://worksync.vercel.app`).

---

## 📱 BƯỚC 4: TRẢI NGHIỆM ĐA THIẾT BỊ & ĐƯA VÀO BÁO CÁO

Bây giờ bạn đã có một sản phẩm chạy thực tế 100% trên môi trường Internet toàn cầu:
1. **Truy cập trên điện thoại thông minh (iOS / Android)**:
   * Mở trình duyệt Safari hoặc Chrome trên điện thoại, truy cập link Vercel của bạn.
   * Đăng nhập với tài khoản:
     * Email: `admin@worksync.com` (hoặc `vothanhlong1704@gmail.com`)
     * Mật khẩu: `Password123!`
   * Thử nghiệm tính năng **Chấm công GPS Geofence 100m**: Trình duyệt điện thoại sẽ xin cấp quyền Vị trí (Location), hệ thống sẽ tính khoảng cách thực tế đến văn phòng!
2. **Thử nghiệm Cuộc họp Video WebRTC**:
   * Mở link trên máy tính bằng một tài khoản (ví dụ PM `pm@worksync.com`).
   * Mở link trên điện thoại bằng một tài khoản khác (ví dụ Nhân viên `vothanhlong1704@gmail.com`).
   * Cả 2 cùng tham gia vào 1 phòng họp để thấy video trực tiếp truyền giữa 2 thiết bị.
3. **Đưa vào Báo cáo & Thuyết trình**:
   * Đặt đường link `https://worksync.vercel.app` ngay tại **Trang bìa** hoặc **Phần giới thiệu sản phẩm**.
   * Chèn mã **QR Code** trỏ về link dự án để thầy cô và hội đồng có thể quét bằng điện thoại và trải nghiệm ngay lúc chấm điểm.
