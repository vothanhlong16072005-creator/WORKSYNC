# 🚀 Hướng Dẫn Khởi Chạy và Khởi Động Lại Dự Án WorkSync (Ver2)

Tài liệu này hướng dẫn chi tiết cách khởi động, khởi động lại và xử lý các tình huống thường gặp khi phát triển dự án WorkSync.

---

## ⚡ Cách 1: Khởi động nhanh bằng 1-Click (Khuyên dùng trên Windows)

1. Mở ứng dụng **Docker Desktop** trên máy tính (chờ biểu tượng Docker chuyển sang màu xanh lá cây / Engine running).
2. Nhấp đúp chuột vào file [start-dev.bat](file:///d:/FPT%20Trainning/Project-TTDN/Ver2/start-dev.bat) tại thư mục gốc của dự án.
3. Script sẽ tự động:
   - Bật container cơ sở dữ liệu PostgreSQL (port 5433) và Redis (port 6380).
   - Mở cửa sổ Terminal riêng cho **Backend** (`npm run start:dev` tại port 4000).
   - Mở cửa sổ Terminal riêng cho **Frontend** (`npm run dev` tại port 5173).
4. Mở trình duyệt tại: **http://localhost:5173**

---

## 🛠️ Cách 2: Khởi động thủ công bằng dòng lệnh (Terminal)

Nếu bạn muốn kiểm soát từng dịch vụ riêng biệt, hãy mở các cửa sổ Terminal (PowerShell hoặc Command Prompt) theo thứ tự sau:

### Bước 1: Khởi động Cơ sở dữ liệu (Database)
> Yêu cầu: Đã bật Docker Desktop.

Tại thư mục gốc dự án (`d:\FPT Trainning\Project-TTDN\Ver2`):
```powershell
docker compose up -d
```
*Lưu ý: Lệnh này sẽ chạy PostgreSQL trên cổng `localhost:5433` và Redis trên cổng `localhost:6380`.*

---

### Bước 2: Khởi động Backend (NestJS)
Mở một cửa sổ Terminal mới, di chuyển vào thư mục `backend`:
```powershell
cd "d:\FPT Trainning\Project-TTDN\Ver2\backend"
npm run start:dev
```
- Server Backend sẽ chạy tại: **http://localhost:4000**
- API Base URL: **http://localhost:4000/api**
- Chế độ `--watch` sẽ tự động tải lại (hot reload) mỗi khi bạn sửa code backend.

---

### Bước 3: Khởi động Frontend (React + Vite)
Mở thêm một cửa sổ Terminal mới, di chuyển vào thư mục `frontend`:
```powershell
cd "d:\FPT Trainning\Project-TTDN\Ver2\frontend"
npm run dev
```
- Ứng dụng Frontend sẽ chạy tại: **http://localhost:5173**
- Vite hỗ trợ HMR (Hot Module Replacement) cập nhật giao diện ngay lập tức khi bạn chỉnh sửa file.

---

## 🔄 Cách khởi động lại dự án (Restart) khi gặp sự cố

### 1. Khi bạn vừa khởi động lại máy tính (Reboot)
1. Bật **Docker Desktop** và đợi Docker sẵn sàng.
2. Tại thư mục gốc, gõ: `docker compose up -d`
3. Mở 2 terminal chạy `npm run start:dev` (ở `backend`) và `npm run dev` (ở `frontend`).

### 2. Khi cần dừng hoặc tắt toàn bộ dự án
- Ở các cửa sổ Terminal đang chạy `backend` hoặc `frontend`, nhấn tổ hợp phím **`Ctrl + C`**, sau đó gõ **`Y`** để tắt.
- Dừng database container:
  ```powershell
  docker compose down
  ```

### 3. Khi sửa đổi schema Database (Prisma Migration)
Nếu bạn thay đổi file `backend/prisma/schema.prisma` và cần áp dụng cập nhật mới vào database:
```powershell
cd "d:\FPT Trainning\Project-TTDN\Ver2\backend"
npx prisma migrate deploy
```

### 4. Khi muốn nạp lại dữ liệu mẫu (Seed Data)
```powershell
cd "d:\FPT Trainning\Project-TTDN\Ver2\backend"
npx tsx prisma/seed.ts
```

### 5. Khi bị xung đột cổng (Port already in use)
- **Port 4000** (Backend): Nếu bị chiếm dụng, hãy tắt tiến trình Node đang chiếm cổng:
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 4000).OwningProcess | Stop-Process -Force
  ```
- **Port 5173** (Frontend): Vite sẽ tự động đề xuất chuyển sang 5174 nếu 5173 bận, hoặc bạn có thể tắt tiến trình chiếm 5173:
  ```powershell
  Get-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess | Stop-Process -Force
  ```
- **Port 5433** (PostgreSQL): Đảm bảo container Docker đang giữ cổng này, không bị xung đột với dịch vụ khác.
