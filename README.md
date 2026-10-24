# WorkSync Enterprise — All-in-One Collaboration & Workspace Platform

[![Vercel Deployment](https://img.shields.io/badge/Vercel-Deployed-black?style=flat&logo=vercel)](https://worksync-lac.vercel.app)
[![Render Backend](https://img.shields.io/badge/Render-Live-46E3B7?style=flat&logo=render)](https://worksync-backend-sfbs.onrender.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%205.x-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react)](https://react.dev/)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?style=flat&logo=nestjs)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **WorkSync Enterprise** is a modern, unified workplace collaboration platform inspired by the **Bauhaus minimalist design philosophy**. It combines Agile project management, smart enterprise attendance, rich document management, real-time messaging, calendar consolidation, and AI-powered meeting minutes into a single cohesive ecosystem.

---

## 📑 Table of Contents

- [1. Live Deployments & Demo Access](#1-live-deployments--demo-access)
- [2. Known Issues & Development Notice](#2-known-issues--development-notice)
- [3. Core Features & Functional Modules](#3-core-features--functional-modules)
  - [3.1. Authentication, Identity & RBAC](#31-authentication-identity--rbac)
  - [3.2. Agile Project Management & Dual-Scope Kanban](#32-agile-project-management--dual-scope-kanban)
  - [3.3. Smart Attendance & Geofenced Check-in](#33-smart-attendance--geofenced-check-in)
  - [3.4. ClickUp-Style Enterprise Document Management](#34-clickup-style-enterprise-document-management)
  - [3.5. Real-Time Chat & Workplace Culture](#35-real-time-chat--workplace-culture)
  - [3.6. Work Calendar Timeline (6 Data Sources)](#36-work-calendar-timeline-6-data-sources)
  - [3.7. Online Meetings & Gemini AI Intelligence](#37-online-meetings--gemini-ai-intelligence)
  - [3.8. System Administration & Role-Based Dashboards](#38-system-administration--role-based-dashboards)
- [4. Technology Stack](#4-technology-stack)
- [5. Architecture & Monorepo Structure](#5-architecture--monorepo-structure)
- [6. Local Development & Quickstart](#6-local-development--quickstart)
  - [6.1. Prerequisites](#61-prerequisites)
  - [6.2. Environment Configuration](#62-environment-configuration)
  - [6.3. Docker Services (PostgreSQL & Redis)](#63-docker-services-postgresql--redis)
  - [6.4. Database Migration & Safe Demo Data Seeding](#64-database-migration--safe-demo-data-seeding)
  - [6.5. Running the Application](#65-running-the-application)
- [7. Automated Testing & Verification](#7-automated-testing--verification)
- [8. Deployment Guide](#8-deployment-guide)
- [9. Contributing & Authors](#9-contributing--authors)

---

## 1. Live Deployments & Demo Access

| Environment | Service | Live URL |
| :--- | :--- | :--- |
| **Frontend** | Production Single Page Application | [https://worksync-lac.vercel.app](https://worksync-lac.vercel.app) |
| **Backend API** | REST API & WebSockets Gateway | [https://worksync-backend-sfbs.onrender.com](https://worksync-backend-sfbs.onrender.com) |
| **API Health Check** | Base Endpoint | [https://worksync-backend-sfbs.onrender.com/api](https://worksync-backend-sfbs.onrender.com/api) |
| **GitHub Repository** | Source Code & Version Control | [https://github.com/vothanhlong16072005-creator/WORKSYNC](https://github.com/vothanhlong16072005-creator/WORKSYNC) |

### 🔑 Pre-Seeded Demo Accounts

The database includes 6 fully-provisioned demo accounts representing all key enterprise roles. All accounts use the shared password:

```text
Password123!
```

| # | Email | Role | Department | Included Test Data & Access Scope |
| :-: | :--- | :---: | :--- | :--- |
| 1 | `vothanhlong1704@gmail.com` | **EMPLOYEE** | Software Engineering | 49 assigned tasks, 14 quick tasks (including overdue tasks for badge testing), 32 documents, 63.8h worklogs. |
| 2 | `pm@worksync.com` | **PM** | Software Engineering | Manages 4 core projects, 8 delegated tasks, sprint histories with Story Points & Burndown metrics. |
| 3 | `pm2@worksync.com` | **PM** | Software Engineering | Additional project manager with isolated team tasks and sprint planning. |
| 4 | `hr@worksync.com` | **HR** | Human Resources | 754 attendance records, company-wide punctuality reports, employee leave balances, automated birthday chat greetings. |
| 5 | `head@gmail.com` | **DEPT_HEAD** | Software Engineering | Departmental task delegation, member management, leave & WFH approval workflow. |
| 6 | `admin@worksync.com` | **ADMIN** | System Management | Complete administrative privileges, organizational hierarchy management for 5 departments and 40 users. |

---

## 2. Known Issues & Development Notice

> [!WARNING]
> ### ⚠️ Note on Online Meeting Video/Camera Contention (Under Active Development)
> In the Online Meetings module (`M5/M5.1/M5.2` — `useWebRTCPeer.ts` & `PersistentCallManager.tsx`):
> - **Current Status:** Two-way microphone audio, Web Speech API real-time Vietnamese speech-to-text, live captioning, and Google Gemini AI meeting minutes summarization are fully functional.
> - **Known Limitation:** The **peer video camera rendering** when testing multiple participants concurrently on a **single machine using multiple browser tabs (e.g., Chrome + Edge)** is still pending complete resolution. On Windows, consumer USB webcams enforce an exclusive hardware lock that blocks secondary browser processes (`NotReadableError`), and WebRTC multi-stream mesh video renegotiation across simultaneous local browser processes requires further renegotiation tuning. 
> - **Mitigation:** The system currently initiates graceful audio fallback to ensure call participants are not dropped, but camera video streaming in this multi-tab local testing edge case is being addressed in the next release cycle.

---

## 3. Core Features & Functional Modules

### 3.1. Authentication, Identity & RBAC
- **Multi-Method Login:** Secure email/password authentication using bcrypt hashing and signed JWT tokens with configurable expiration.
- **Google OAuth 2.0:** One-click enterprise single sign-on (SSO) integration.
- **Automated Personal Workspace:** Automatic creation of an isolated "Personal Project" upon registration.
- **Fine-Grained RBAC:** Strict server-side enforcement of 5 distinct roles (`ADMIN`, `HR`, `PM`, `DEPT_HEAD`, `EMPLOYEE`), preventing Insecure Direct Object Reference (IDOR) attacks across projects and departments.

### 3.2. Agile Project Management & Dual-Scope Kanban
- **Tri-Scope View Architecture:**
  - *My Tasks Scope:* Strictly private to the employee; hidden from managers and peers.
  - *Team Project Scope:* Collaborative boards where PMs, Department Heads, and assigned members manage sprint tasks with drag-and-drop status transitions.
  - *All Tasks Scope:* Consolidated view across personal assignments and all team projects.
- **5-Stage Kanban Workflow:** `TODO` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `IN_REVIEW` $\rightarrow$ `BLOCKED` $\rightarrow$ `DONE`, synchronized through atomic database transactions.
- **Visual Priority & Deadline Indicators:** Distinct Bauhaus color-coded borders and dynamic badges for `URGENT`, `HIGH`, `MEDIUM`, and `LOW` tasks with real-time overdue alerts.
- **Enterprise Task Detail Modal:** 2-column layout (Linear/Jira Cloud style) supporting time tracking, story points, custom fields, dependencies (Finish-to-Start), and comment threads.

### 3.3. Smart Attendance & Geofenced Check-in
- **Geofenced GPS Check-in:** Real-time distance calculation against office coordinates using the Haversine formula with configurable radius thresholds.
- **Office Wi-Fi IP Verification:** Automatic subnet and IP address whitelisting to prevent off-site check-in fraud.
- **Automated Working Hours & Overtime:** Instant calculation of daily working hours, late arrivals, early leaves, and approved Overtime (OT).
- **Comprehensive Leave & WFH Workflow:** Multi-tier request submission and approval system for annual leave, sick leave, and remote work (WFH).
- **Exporting Capabilities:** Instant generation of attendance reports in **Microsoft Excel (.xlsx)** and **Adobe PDF (.pdf)** with custom company headers.

### 3.4. ClickUp-Style Enterprise Document Management
- **Rich Text Authoring:** Embedded Tiptap editor with markdown support, code blocks, checklists, and inline tables.
- **Granular 4-Tier Scopes:** `COMPANY` (public), `DEPARTMENT` (departmental members), `PROJECT` (project members), and `PRIVATE` (individual only).
- **Version Control & Rollback:** Complete version history with instant rollback to any historical revision.
- **Physical Attachment Storage:** Multi-file attachment system with safe naming, MIME-type validation, streaming downloads, and disk cleanup.
- **Document AI Summarization:** Integrated Google Gemini assistant to generate executive briefs and key takeaways.

### 3.5. Real-Time Chat & Workplace Culture
- **WebSocket Engine:** High-performance Socket.IO channels for 1-on-1 direct messaging, project team chats, and departmental discussion rooms.
- **Rich Media & Reactions:** Support for file attachments up to 25MB, full-screen lightbox image preview, emoji reactions, and quote replies.
- **Presence & Typing Indicators:** Real-time online/offline presence tracking and live typing indicators.
- **Company Culture Automation:** One-click automated birthday greeting triggers that deliver personalized celebration messages and cultural interactions via the chat system.

### 3.6. Work Calendar Timeline (6 Data Sources)
- **Unified Master Schedule:** Consolidates 6 distinct business events onto a single interactive canvas:
  1. Project Tasks & Milestones
  2. Sprint Cycles
  3. Online Meetings
  4. Annual Leave Days
  5. Work-From-Home (WFH) Schedules
  6. Overtime (OT) Sessions
- **Multi-Scope & Conflict Detection:** Day, Week, and Month views with automated warning alerts for meeting overlaps and task deadlines scheduled during leave days.
- **Calendar Synchronization:** Export standard **RFC 5545 iCalendar (`.ics`)** files compatible with Google Calendar, Microsoft Outlook, and Apple Calendar.

### 3.7. Online Meetings & Gemini AI Intelligence
- **WebRTC Peer-to-Peer Mesh:** Decentralized audio and video exchange with low latency without third-party streaming fees.
- **Client-Side Speech-to-Text (STT):** Browser-native Web Speech API configured for Vietnamese (`vi-VN`) speech streaming with auto-reconnecting watchdog logic.
- **Live Captions:** Real-time subtitle streaming to all participants via Socket.IO channels.
- **Google Gemini 1.5 Flash Meeting Minutes:** Automatic synthesis of meeting transcripts into structured JSON minutes containing executive summaries, agreed decisions, and assigned action items with deadlines.

### 3.8. System Administration & Role-Based Dashboards
- **Role-Tailored Dashboards:** Dedicated analytics and KPI views for Admin, HR, PMs, Department Heads, and Employees built with Recharts.
- **Organizational Hierarchy Management:** Full CRUD management for company departments, manager assignments, user accounts, and status toggles.
- **Bilingual Interface (i18n):** Instant switching between **Tiếng Việt (VI)** and **English (EN)** via `react-i18next`.

---

## 4. Technology Stack

| Layer | Technologies & Libraries |
| :--- | :--- |
| **Frontend Framework** | React 18 / 19, TypeScript (Strict Mode), Vite 8 |
| **State Management** | Zustand 5 |
| **Styling & Icons** | Tailwind CSS, Lucide React, Bauhaus Minimalist Theme |
| **Rich Text & Media** | Tiptap Editor, WebRTC, Web Speech API |
| **Data Visualization** | Recharts, Custom Timeline SVG Canvas |
| **Internationalization** | react-i18next (English & Vietnamese) |
| **Backend Framework** | NestJS 11 / 12, Node.js (v20+ LTS) |
| **ORM & Database** | Prisma ORM 5, PostgreSQL 16 |
| **Caching & In-Memory**| Redis 7 (alpine) |
| **Realtime Engine** | Socket.IO (WebSockets) |
| **Artificial Intelligence** | Google Generative AI (Gemini 1.5 Flash) |
| **File Processing** | ExcelJS, PDFKit, Multer |
| **DevOps & Hosting** | Docker, Docker Compose, Vercel, Render |

---

## 5. Architecture & Monorepo Structure

```text
WORKSYNC/
├── backend/                        # NestJS Backend Application
│   ├── prisma/                     # Database Schema, Migrations & Seed Suites
│   │   ├── schema.prisma           # Comprehensive 28-Table Enterprise Schema
│   │   ├── seed-organizational.ts  # Organizational & Department Seeding
│   │   ├── seed-sprints-history.ts # Historical Sprints & Burndown Metrics
│   │   ├── seed-quicktasks.ts      # Delegated & Overdue Quick Tasks
│   │   ├── seed-project-docs.ts    # Multilevel Documents & File Attachments
│   │   ├── seed-activity.ts        # Epics, Dependencies & WorkLogs
│   │   ├── verify-seed.ts          # 8-Invariant Integrity & Simulation Suite
│   │   └── rollback-seed.ts        # Safe Rollback Script for `seed-*` Entities
│   ├── src/
│   │   ├── admin/                  # System Admin & Department Management
│   │   ├── attendance/             # Geofenced Attendance & Leave Service
│   │   ├── auth/                   # JWT & Google OAuth 2.0 Strategies
│   │   ├── calendar/               # 6-Source Consolidated Calendar
│   │   ├── chat/                   # Real-time Chat Gateway & Controllers
│   │   ├── documents/              # Document Management, AI & Export
│   │   ├── meetings/               # WebRTC Gateway & Gemini AI Minutes
│   │   ├── notifications/          # Socket.IO & VAPID Web Push
│   │   ├── projects/               # Projects, Kanban, Sprints & Access Control
│   │   ├── tasks/                  # Task CRUD & State Machines
│   │   └── users/                  # User Profile & Directory Service
│   └── uploads/                    # Local Attachment & File Storage Directory
├── frontend/                       # React 18 + Vite Frontend Application
│   ├── src/
│   │   ├── components/             # Reusable UI, Navbars, Sidebars & Modals
│   │   ├── features/
│   │   │   ├── admin/              # Admin Console & Department Views
│   │   │   ├── attendance/         # Check-in, Leave & Attendance Tables
│   │   │   ├── auth/               # Login, Register & OAuth Callback
│   │   │   ├── calendar/           # Interactive Timeline & Conflict Display
│   │   │   ├── chat/               # Chat Sidebar, Channels & Lightbox
│   │   │   ├── dashboard/          # Role-Based Analytics Dashboards
│   │   │   ├── documents/          # Tiptap Editor & Attachment Viewers
│   │   │   ├── meetings/           # WebRTC Room, Preview & AI Captions
│   │   │   └── projects/           # Kanban Boards, Sprints & Task Details
│   │   ├── i18n/                   # Bilingual Translations (en.json / vi.json)
│   │   └── stores/                 # Zustand Global State Stores
│   ├── public/                     # Static Assets & Icons
│   └── index.html                  # HTML5 Entry Point
├── docs/                           # Architecture, PRD, and Specification Docs
├── docker-compose.yml              # Local PostgreSQL 16 & Redis 7 Container Setup
└── README.md                       # Comprehensive Project Documentation
```

---

## 6. Local Development & Quickstart

### 6.1. Prerequisites
- **Node.js**: v20.x or higher (LTS recommended)
- **Package Manager**: npm v10.x or higher
- **Container Runtime**: Docker Desktop (for PostgreSQL & Redis)
- **Git**: v2.40 or higher

### 6.2. Environment Configuration

#### 1. Backend Environment Setup:
Create a `.env` file inside the `backend/` folder:

```bash
cp backend/.env.example backend/.env
```

Ensure the following variables are defined in `backend/.env`:

```env
PORT=4000
DATABASE_URL="postgresql://worksync:worksync@localhost:5433/worksync_db?schema=public"
REDIS_HOST=localhost
REDIS_PORT=6380

# JWT Authentication
JWT_SECRET=super_secret_jwt_key_worksync

# Google OAuth 2.0
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:4000/api/auth/google/callback

# Google Gemini API (For AI Summaries & Meeting Minutes)
GEMINI_API_KEY=your_gemini_api_key_here

# Web Push Notification (VAPID RFC 8292)
VAPID_PUBLIC_KEY=BJAo2v-WU99QH-W-KksXUQctq-x576Fh3cxBegR2Tdf0_GPklGTVMQz6fbgmprxhatUk4sBASdv90h_hgKaDbhE
VAPID_PRIVATE_KEY=your_vapid_private_key
VAPID_EMAIL=admin@worksync.com
```

#### 2. Frontend Environment Setup:
Create a `.env` file inside the `frontend/` folder:

```env
VITE_API_URL=http://localhost:4000/api
VITE_WS_URL=http://localhost:4000
VITE_VAPID_PUBLIC_KEY=BJAo2v-WU99QH-W-KksXUQctq-x576Fh3cxBegR2Tdf0_GPklGTVMQz6fbgmprxhatUk4sBASdv90h_hgKaDbhE
```

---

### 6.3. Docker Services (PostgreSQL & Redis)

Start the local database and Redis services using Docker Compose:

```bash
docker compose up -d
```

Verify that the containers are healthy:
- PostgreSQL 16 listening on `localhost:5433` (`worksync_db_v2`)
- Redis 7 listening on `localhost:6380` (`worksync_redis_v2`)

---

### 6.4. Database Migration & Safe Demo Data Seeding

Run Prisma migrations and execute the comprehensive demo data seeding suite:

```bash
cd backend

# Run database migrations
npx prisma migrate deploy

# Run the complete incremental demo seeding suite
npm run seed:demo

# Verify 8/8 business invariants and view simulated account scopes
npm run seed:verify -- --demo-view
```

> **Note on Seeding Safety:** All generated demo entities use deterministic `seed-*` prefixes. You can safely rollback only the seed data without damaging production records using:
> ```bash
> npm run seed:rollback
> ```

---

### 6.5. Running the Application

Open two separate terminal windows:

#### Terminal 1 — Start NestJS Backend:
```bash
cd backend
npm run start:dev
```
*Backend will be running at [http://localhost:4000](http://localhost:4000) (API root: `/api`).*

#### Terminal 2 — Start Vite React Frontend:
```bash
cd frontend
npm run dev
```
*Frontend will be running at [http://localhost:5173](http://localhost:5173).*

Log in using any of the [6 Pre-Seeded Demo Accounts](#key-pre-seeded-demo-accounts) with password `Password123!`.

---

## 7. Automated Testing & Verification

The project enforces strict unit and integration testing across both frontend and backend modules:

```bash
# 1. Run all Backend tests (43 test files, 355+ tests)
cd backend
npm test

# 2. Run all Frontend Vitest suites (34 test files, 153+ tests)
cd frontend
npm test -- --run

# 3. Verify TypeScript strict type-checking & production builds
cd backend && npm run build
cd ../frontend && npm run build
```

---

## 8. Deployment Guide

### Frontend Deployment (Vercel)
The frontend is optimized for zero-configuration deployment on Vercel:
1. Connect your GitHub repository to Vercel.
2. Set Root Directory to `frontend`.
3. Configure the following Environment Variables in the Vercel Project Settings:
   - `VITE_API_URL`: `https://worksync-backend-sfbs.onrender.com/api`
   - `VITE_WS_URL`: `https://worksync-backend-sfbs.onrender.com`
   - `VITE_VAPID_PUBLIC_KEY`: *(Your VAPID public key)*
4. Click **Deploy**. Vercel will build and distribute the app through its global edge CDN.

### Backend Deployment (Render)
1. Create a new **Web Service** on [dashboard.render.com](https://dashboard.render.com).
2. Set Root Directory to `backend`.
3. Build Command: `npm install && npm run build`
4. Start Command: `npm run start:prod`
5. Connect your managed PostgreSQL database and configure all `.env` variables in the Environment tab.

---

## 9. Contributing & Authors

- **Author & Project Creator:** Võ Thanh Long ([@vothanhlong16072005-creator](https://github.com/vothanhlong16072005-creator))
- **Repository:** [vothanhlong16072005-creator/WORKSYNC](https://github.com/vothanhlong16072005-creator/WORKSYNC)
- **License:** Released under the [MIT License](https://opensource.org/licenses/MIT).
