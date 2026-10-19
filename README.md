# WorkSync - Enterprise Workspace and Collaboration Platform

He thong quan ly du an, cong viec ca nhan, cham cong va cong tac doanh nghiep theo phong cach Bauhaus Minimalist.

---

## 1. Tong quan kien truc (Monorepo)

Du an duoc to chuc theo mo hinh Monorepo dong bo giua Backend va Frontend:

- backend: Nen tang NestJS 12, Prisma ORM, PostgreSQL 16.
- frontend: Ung dung React 19, Vite 8, Tailwind CSS, Zustand 5, react-i18next.
- docs: Bo tai lieu dac ta he thong gom PRD, Architecture, Database ERD va API Contract.
- docker-compose.yml: Cau hinh khoi chay co so du lieu PostgreSQL.
- start-dev.bat: Script khoi dong tu dong toan bo he thong tren Windows.

---

## 2. Tien do trien khai hien tai (Project Progress)

> ⚠️ **LƯU Ý QUAN TRỌNG:**
> Tính năng **Cuộc họp trực tuyến (Meetings & WebRTC - M5/M5.1/M5.2)** hiện tại **CHƯA ĐƯỢC TEST VÀ CHỮA LỖI HẾT TOÀN DIỆN** các trường hợp biên (edge-cases) trên môi trường thực tế đa thiết bị. Cần tiếp tục kiểm thử thực tế và hoàn thiện trước khi nghiệm thu sản xuất.

Bang theo doi tien do cac phan he theo lo trinh phat trien:

| Ma Milestone | Ten phan he / Module | Trang thai | Chi tiet thuc hien |
|---|---|---|---|
| M0 | Tai lieu dac ta va Khoi tao du an | Hoan thanh | PRD, Database 28 bang, API Contract, cau truc Monorepo |
| M1 | Xac thuc va Quan ly tai khoan | Hoan thanh | JWT, Google OAuth 2.0, tu dong khoi tao du an ca nhan |
| M3 | Quan ly Du an va Cong viec (CRUD API) | Hoan thanh | Scoped task query (mine/project), phan quyen truy cap, IDOR protection |
| M4 | Bang Kanban va Chi tiet cong viec | Hoan thanh | Keo tha task, modal 2 cot Linear/Jira, phan cap mau uu tien, da ngon ngu |
| M7 | Bang dieu khien tong quan (Dashboard) | Hoan thanh | Dashboard theo Role (Admin, HR, PM, Employee, Dept Head), Recharts analytics |
| M2 | Diem danh va Cham cong thong minh | Hoan thanh | Check-in/out GPS/WiFi, don tu WFH, nghi phep, OT, duyet don cap phong ban |
| M5 | Cuoc hop truc tuyen va WebRTC | Can kiem thu them | Mesh WebRTC, chia se man hinh, phong chuan bi Bauhaus, chat dinh kem file, xuat bao cao Word/CSV |
| M5.1 | Tri tue Cuoc hop (Meeting Intelligence) | Hoan thanh (Ky thuat) | Live Speech Streaming, tich hop Gemini 1.5 Flash tom tat bien ban va trich xuat Action Items |
| M6 | Quan ly Tai lieu du an (Documents) | Hoan thanh | Trinh soan thao Tiptap rich-text, phan quyen 4 scopes, AI tom tat, xuat PDF/Docx |
| M8 | Lich lam viec tong hop (Work Calendar) | Hoan thanh | Hop nhat 6 nguon (Tasks, Sprints, Meetings, Leaves, WFH, OT), 3 scopes, 3 views, drag-drop RBAC, export .ics |
| M9 | He thong Thong bao thoi gian thuc | Hoan thanh | Socket.IO real-time notification, Web Push (VAPID RFC 8292), cron nhac viec |

---

## 3. Cac tinh nang da hoan thien toi thoi diem hien tai

### A. Xac thuc va Phan quyen (Authentication and Authorization)
- Dang ky, dang nhap bang email va mat khau (ma hoa bcrypt, token JWT).
- Dang nhap 1-click thong qua Google OAuth 2.0.
- Tu dong tao du an ca nhan (Personal Project) rieng tu ngay khi tai khoan duoc tao.
- Kiem soat quyen truy cap du an tap trung (ProjectAccessService) ngan chan loi bao mat IDOR.

### B. Bang Kanban da pham vi (Dual-Scope Kanban)
- Pham vi Viec ca nhan: Khong gian cong viec rieng tu cua tung ca nhan, khong bi PM hoac thanh vien khac xem hay can thiep.
- Pham vi Du an nhom: Cac du an chung do PM quan ly, ho tro phan cong cong viec cho tung thanh vien.
- Pham vi Tat ca viec cua toi: Bang tong hop toan bo cong viec duoc giao tu moi du an va cong viec ca nhan tren mot man hinh duy nhat.
- Keo tha chuyen trang thai giua 5 cot: Can lam, Dang lam, Danh gia, Bi chan, Hoan thanh (dong bo vi tri tren database qua transaction).

### C. He thong Nhan dien Do uu tien va Han chot
- Phan cap mau sac khung the task ro ret:
  - URGENT (Khan cap): Khung vien do 2px, vien trai 6px do tham, nen ung do nhe, do bong canh bao.
  - HIGH (Cao): Khung vien cam 2px, vien trai 5px cam dam, nen ung cam nhe.
  - MEDIUM (Trung binh): Khung vien xanh sky 2px, vien trai 4px xanh coban, nen anh xanh mat.
  - LOW (Thap): Khung vien xam 1.5px, vien trai 3px xam slate, nen trang thanh lich.
- Tinh toan han chot (Deadline) tu dong: Hien the canh bao Qua han (do), Het han hom nay (vang cam), hoac so ngay con lai.
- Bo cong cu Loc (Filter) va Sap xep (Sort) da tieu chi: Theo do uu tien, han chot gap nhat, ngay tao hoac vi tri keo tha.

### D. Modal Chi tiet Cong viec chuan Enterprise
- Thiet ke 2 cot hien dai (phong cach Linear va Jira Cloud):
  - Cot trai: Tieu de ro rang, thanh tien trinh trang thai 5 buoc cho phep click chuyen trang thai ngay, phan mo ta va nhan phan loai.
  - Cot phai: Bang thuoc tinh hop nhat gom Nguoi phu trach, Nguoi tao task, Han chot kem canh bao dong, Uoc tinh gio, Thoi gian da thuc hien, Story points, Du an va Sprint lien ket.

### E. Lich lam viec tong hop (Work Calendar Timeline - M8)
- Hop nhat 6 nguon du lieu tren 1 timeline duy nhat: Tasks, Sprints, Meetings, LeaveRequests (Phep nam), WfhRequests (WFH), OvertimeRequests (Tang ca).
- 3 che do xem (Day, Week, Month) va 3 pham vi (Ca nhan `mine`, Phong ban `department`, Toan cong ty `company`).
- Phat hien xung dot tu dong: Trung gio hop, qua tai cong viec qua han, va cuoc hop trong ngay nghi phep.
- Keo tha doi lich (Drag-drop reschedule) kiem soat quyen RBAC nghiem ngat: Chi nguoi tao hoac PM/Admin moi co quyen doi lich, nguoi khac bi khoa va hien thi toast canh bao.
- Xuat file lich RFC 5545 iCalendar (.ics) dong bo de dang voi Google Calendar, Outlook, Apple Calendar.

### F. Ho tro Da ngon ngu Quoc te (Bilingual i18n)
- Tich hop he thong da ngon ngu react-i18next voi bo tu dien Tieng Viet va Tieng Anh.
- Nut chuyen doi ngon ngu VI / EN truc tiep tren Header, cho phep chuyen toan bo giao dien tuc thi ma khong can load lai trang.

### G. Thanh dieu huong (Sidebar) thong minh
- Menu Cong viec phan cap dang cay, tu dong cap nhat badge so do dem so luong cong viec chua hoan thanh duoc giao cho nguoi dung.
- Menu Lich lam viec (`/calendar`) tich hop cho moi vai tro.

---

## 4. Huong dan cai dat va khoi chay

### Yeu cau moi truong
- Node.js phien ban 20 tro len.
- Docker Desktop (chay container PostgreSQL).
- Git.

### Cac buoc thuc hien

1. Clone ma nguon:
```bash
git clone https://github.com/vothanhlong16072005-creator/WORKSYNC.git
cd WORKSYNC
```

2. Cai dat goi phu thuoc:
```bash
cd backend && npm install
cd ../frontend && npm install
cd ..
```

3. Cau hinh bien moi truong:
Tao file backend/.env dua tren backend/.env.example:
```env
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/worksync_v2?schema=public"
JWT_SECRET=super_secret_jwt_key_worksync
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback
```

4. Khoi chay he thong:
Tren Windows, chay file start-dev.bat hoac khoi dong thu cong:
```bash
docker-compose up -d
cd backend && npm run start:dev
cd frontend && npm run dev
```

Truy cap he thong tai dia chi: http://localhost:5173.
API backend Swagger tai dia chi: http://localhost:4000/api/docs.

---

## 5. Kiem thu ma nguon (Testing)

```bash
cd backend && npm test
cd ../frontend && npm run build
```
