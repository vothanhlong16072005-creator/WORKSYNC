# 🛠️ Tech Stack — WorkSync
> Quyết định công nghệ và lý do lựa chọn

---

## Stack tổng quan

| Layer | Technology | Version | Lý do chọn |
|-------|-----------|---------|------------|
| **Frontend Framework** | React (Vite) | 18 / Vite 5 | Nhanh, ecosystem lớn, team quen thuộc |
| **Frontend Language** | TypeScript | 5.x | Type safety, giảm bug runtime |
| **Styling** | TailwindCSS | 3.x | Utility-first, consistent spacing/color |
| **Component Library** | shadcn/ui | latest | Accessible, customizable, không lock-in |
| **State — Server** | TanStack Query | 5.x | Cache, sync server state, optimistic update |
| **State — Client** | Zustand | 4.x | Nhẹ, simple, không boilerplate |
| **Forms** | react-hook-form + Zod | - | Performance, type-safe validation |
| **Routing** | React Router | 6.x | Client-side routing chuẩn |
| **Rich Text Editor** | Tiptap | 2.x | Extensible, ProseMirror-based, ClickUp-style |
| **Kanban DnD** | @dnd-kit/core | 6.x | Accessible drag & drop, smooth animation |
| **Calendar** | FullCalendar | 6.x | Feature-rich, hỗ trợ nhiều views |
| **Charts** | Recharts | 2.x | React-native, composable charts |
| **Video Call** | WebRTC + simple-peer | - | Peer-to-peer, không cần server media relay cho MVP |
| **Real-time** | Socket.IO Client | 4.x | Bidirectional events |
| **i18n** | i18next + react-i18next | - | VI/EN/KO support |
| **Export** | jsPDF + exceljs | - | Export PDF/Excel phía client |
| **PWA** | Vite PWA Plugin | - | Service worker, offline cache |
| **Backend Framework** | NestJS | 10.x | Modular, TypeScript native, decorator-based |
| **ORM** | Prisma | 5.x | Type-safe, migration tốt, schema-first |
| **Database** | PostgreSQL | 16 | Reliable, ACID, JSON support |
| **Cache / Sessions** | Redis | 7.x | Refresh token blacklist, session, job queue |
| **Auth** | JWT + Passport + bcrypt | - | Industry standard |
| **WebSocket** | Socket.IO (NestJS Gateway) | 4.x | Real-time notification, meeting biên bản |
| **WebRTC Signaling** | Socket.IO | - | Signaling server cho video call |
| **AI** | Google Gemini API | 1.5 Flash | Meeting summary, doc summary, report draft |
| **Email** | Nodemailer + Gmail SMTP | - | Invitation, notification email |
| **File Storage** | Cloudinary | - | Avatar, attachment, export files |
| **Geolocation** | HTML5 Geolocation API | - | GPS check-in |
| **IP Validation** | ip-range-check (npm) | - | Kiểm tra IP Wifi văn phòng |
| **Job Queue** | Bull (Redis-backed) | - | Background jobs: AI processing, email, reports |
| **Logging** | Pino | - | Structured JSON logging, fast |
| **API Docs** | Swagger (NestJS) | - | Auto-generated từ decorators |
| **Validation** | class-validator + class-transformer | - | NestJS DTO validation |
| **Containerization** | Docker + Docker Compose | - | Consistent dev/prod environment |
| **Reverse Proxy** | Nginx | - | SSL termination, static files |
| **CI/CD** | GitHub Actions | - | Lint + Test trên PR, deploy tự động |

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
