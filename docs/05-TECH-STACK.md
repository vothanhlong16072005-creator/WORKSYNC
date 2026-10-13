# 🛠️ Tech Stack — WorkSync
> Quyết định công nghệ và lý do lựa chọn

---

## Stack tổng quan

> **Quy ước cập nhật 2026-10-11**: Bảng dưới phản ánh phiên bản thực tế đang chạy trong `package.json` (React 19, NestJS 12, Vite 8, Prisma 5). Bảng gốc bên dưới ghi React 18 / NestJS 10 / Vite 5 không còn chính xác — coi bảng này là source of truth.

| Layer | Technology | Version (đang chạy) | Lý do chọn |
|-------|-----------|---------|------------|
| **Frontend Framework** | React + Vite | 19.2 / Vite 8.3 | Nhanh, ecosystem lớn, HMR tức thì |
| **Frontend Language** | TypeScript | 6.0.x | Type safety, giảm bug runtime |
| **Styling** | TailwindCSS | 3.4 | Utility-first, consistent spacing/color |
| **Component Library** | Radix Primitives + CVA | slot/label | Accessible, headless, không lock-in |
| **State — Client** | Zustand | 5.0 | Nhẹ, simple, không boilerplate, optimistic update tích hợp sẵn |
| **Forms** | react-hook-form + Zod | 7.89 / 3.25 | Performance, type-safe validation |
| **Routing** | React Router | 7.x | Client-side routing chuẩn |
| **Kanban DnD** | @hello-pangea/dnd | 18.x | Drag & drop ổn định cho React 19 strict mode |
| **Toast** | sonner | 2.0 | Headless, accessible, API gọn |
| **i18n** | i18next + react-i18next | 26.x / 17.x | Hỗ trợ VI/EN, chuyển ngữ 1-click |
| **Animations** | framer-motion | 14.x | Micro-interactions, drag feedback |
| **Icons** | lucide-react | 1.52 | Nét mảnh, phù hợp phong cách Bauhaus |
| **Lint (FE)** | oxlint (type-aware) | 1.81 | Nhanh hơn ESLint ~50x |
| **Backend Framework** | NestJS | 12.x | Modular, decorator-based, type-safe |
| **ORM** | Prisma | 5.22 | Type-safe, migration tốt, schema-first |
| **Database** | PostgreSQL | 16-alpine (port **5433**) | Reliable, ACID, JSON support |
| **Cache / Sessions** | Redis | 7-alpine (port **6380**) | Refresh token, cache — chưa gắn vào code |
| **Auth** | @nestjs/jwt + @nestjs/passport + bcrypt | 12 / 6 | Industry standard |
| **OAuth** | passport-google-oauth20 | 2.0 | Google login 1-click |
| **Validation** | class-validator + class-transformer | 0.15 / 0.5 | NestJS DTO validation |
| **Testing (BE)** | vitest + supertest | 4.1 / 7.0 | Nhanh, ESM-native, tương thích NestJS 12 |
| **Containerization** | Docker + Docker Compose | - | Dev environment chuẩn hóa |

---

## Monorepo Structure

```
worksync/
├── frontend/               # React 18 + Vite 5
│   ├── src/
│   │   ├── components/     # Shared UI components
│   │   ├── features/       # Feature-based modules (auth, tasks, meetings...)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Axios instance, utils
│   │   ├── stores/         # Zustand stores
│   │   ├── types/          # TypeScript types
│   │   └── i18n/           # Translations VI/EN/KO
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   └── package.json
│
├── backend/                # NestJS 10
│   ├── src/
│   │   ├── modules/        # Feature modules
│   │   │   ├── auth/
│   │   │   ├── users/
│   │   │   ├── attendance/
│   │   │   ├── projects/
│   │   │   ├── tasks/
│   │   │   ├── meetings/
│   │   │   ├── documents/
│   │   │   ├── reports/
│   │   │   └── notifications/
│   │   ├── common/         # Guards, decorators, filters, interceptors
│   │   ├── config/         # Configuration service
│   │   ├── prisma/         # Prisma service
│   │   └── main.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   └── package.json
│
├── docs/                   # Documentation (đây)
├── scripts/                # Utility scripts
├── docker-compose.yml      # Dev environment
├── docker-compose.prod.yml # Production
├── .env.example
└── README.md
```

---

## Port Mapping

| Service | Dev Port | Ghi chú |
|---------|---------|---------|
| Frontend (Vite) | 3000 | `npm run dev` |
| Backend (NestJS) | 4000 | `npm run start:dev` |
| PostgreSQL | 5432 | Docker |
| Redis | 6379 | Docker |
| Swagger UI | 4000/api/docs | Auto-generated |

---

## Environment Variables

### Backend `.env`
```env
# App
NODE_ENV=development
PORT=4000
FRONTEND_URL=http://localhost:3000

# Database
DATABASE_URL=postgresql://worksync:worksync@localhost:5432/worksync_db

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_ACCESS_SECRET=<64+ chars random string>
JWT_REFRESH_SECRET=<64+ chars random string>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Google Gemini AI
GEMINI_API_KEY=<your-gemini-api-key>
GEMINI_MODEL=gemini-1.5-flash

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=worksync@company.com
SMTP_PASS=<app-password>
SMTP_FROM="WorkSync <worksync@company.com>"

# Cloudinary
CLOUDINARY_CLOUD_NAME=<name>
CLOUDINARY_API_KEY=<key>
CLOUDINARY_API_SECRET=<secret>
```

### Frontend `.env`
```env
VITE_API_URL=http://localhost:4000/api/v1
VITE_WS_URL=http://localhost:4000
VITE_APP_NAME=WorkSync
VITE_DEFAULT_LANGUAGE=vi
```

---

## Dependency Versions (Pinned)

### Frontend key deps
```json
{
  "react": "^18.3.0",
  "typescript": "^5.5.0",
  "vite": "^5.4.0",
  "tailwindcss": "^3.4.0",
  "@tanstack/react-query": "^5.56.0",
  "zustand": "^4.5.0",
  "react-hook-form": "^7.53.0",
  "zod": "^3.23.0",
  "@tiptap/react": "^2.7.0",
  "@dnd-kit/core": "^6.1.0",
  "fullcalendar": "^6.1.0",
  "recharts": "^2.12.0",
  "socket.io-client": "^4.7.0",
  "simple-peer": "^9.11.0",
  "i18next": "^23.16.0",
  "react-i18next": "^15.0.0",
  "jspdf": "^2.5.0",
  "exceljs": "^4.4.0"
}
```

### Backend key deps
```json
{
  "@nestjs/core": "^10.4.0",
  "typescript": "^5.5.0",
  "prisma": "^5.20.0",
  "@prisma/client": "^5.20.0",
  "socket.io": "^4.7.0",
  "@nestjs/jwt": "^10.2.0",
  "passport-jwt": "^4.0.0",
  "bcrypt": "^5.1.0",
  "@google/generative-ai": "^0.21.0",
  "bull": "^4.16.0",
  "nodemailer": "^6.9.0",
  "cloudinary": "^2.5.0",
  "ip-range-check": "^0.2.0",
  "class-validator": "^0.14.0",
  "pino": "^9.4.0"
}
```

---

## Lý do không dùng (Architecture Decisions)

| Alternative | Lý do không chọn |
|-------------|-----------------|
| Next.js thay Vite+React | Team quen React thuần, Next.js SSR không cần thiết cho internal tool |
| Prisma thay TypeORM | Prisma có DX tốt hơn, migration rõ ràng hơn, type-safe hơn |
| MongoDB thay PostgreSQL | Data có quan hệ phức tạp (task deps, sprint hierarchy), cần ACID |
| REST thay GraphQL | GraphQL overhead không cần thiết, REST đủ đơn giản và quen |
| Redux thay Zustand | Redux boilerplate quá nhiều, Zustand đủ cho internal state |
| Agora/Twilio thay WebRTC | Chi phí cao, WebRTC đủ cho MVP với nhóm nhỏ (<20 người/call) |
| SQS thay Bull | Bull/Redis đủ cho scale hiện tại, tránh AWS dependency |

---

## Trạng thái tích hợp thực tế (2026-10-11)

| Module đã wire vào code | Module còn thiếu (theo PRD) |
|---|---|
| ✅ Auth (JWT, Google OAuth, bcrypt) | ⬜ Bull queue (Redis chưa kết nối) |
| ✅ Users (CRUD + Department) | ⬜ Pino structured logging (đang dùng `console`) |
| ✅ Projects (TEAM + PERSONAL, scoped access) | ⬜ WebRTC signaling, Socket.IO gateway |
| ✅ Tasks (scoped queries, board-position PATCH) | ⬜ Tiptap rich-text editor |
| ✅ Prisma schema đầy đủ 28 bảng theo PRD | ⬜ FullCalendar, Recharts, jsPDF, exceljs |
| ✅ Sidebar + Header + DashboardLayout + i18n | ⬜ Swagger UI decorators (`@ApiOperation`) — endpoints chưa khai báo |
| ✅ Kanban UI (Linear modal, priority frames) | ⬜ Notification system (in-app + WebSocket) |
| ✅ Zod boundary validation ở frontend | ⬜ Dashboard widgets (chỉ có placeholder) |
| | ⬜ Attendance / Meetings / Documents / Reports modules |

## Quyết định đã điều chỉnh so với PRD ban đầu

| Quyết định | Thay đổi | Lý do |
|---|---|---|
| Không dùng TanStack Query | Dùng Zustand + axios trực tiếp cho server state | MVP chỉ có 2 module data chính (projects + tasks), Zustand + optimistic update đủ dùng, tránh thêm 1 lớp cache. Sẽ đánh giá lại khi có 4+ module data. |
| Không dùng Bull + Redis queue | Job xử lý đồng bộ trong request | Tính năng AI summary chưa triển khai, chưa cần queue. Redis đã chạy trong docker-compose nhưng chưa wire vào code. |
| Không dùng Pino | Dùng `console.log` mặc định của NestJS | Logging chưa phải bottleneck. Sẽ nâng cấp khi cần structured log. |
| TypeScript 6 + Vite 8 + NestJS 12 | Thay vì TS 5 / Vite 5 / NestJS 10 | Tận dụng decorator metadata mới, Vite 8 HMR nhanh hơn, React 19 concurrent rendering. |
| `@hello-pangea/dnd` thay `@dnd-kit/core` | Bản fork ổn định cho React 19 | `@dnd-kit/core` 6.x còn bug với React 19 strict mode, `hello-pangea/dnd` đã fix và có API giống `react-beautiful-dnd`. |
| `sonner` thay `react-hot-toast` | API gọn, hỗ trợ promise toast, mặc định accessible | Sonner render 1 region duy nhất, dễ style theo Bauhaus tokens. |
| `Radix Primitives + CVA` thay `shadcn/ui` | Tránh copy-paste shadcn components, kiểm soát 100% code | Phong cách Bauhaus cần custom nhiều, shadcn default quá generic. |
