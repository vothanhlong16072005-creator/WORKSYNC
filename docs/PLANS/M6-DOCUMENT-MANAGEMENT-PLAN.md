# 📘 M6 — Document Management System Plan

> **Module ID:** M6
> **Tên:** Document Management System (Tiptap Rich-Text + Real-time Collab + MinIO Storage)
> **Ngày tạo:** 2026-10-18
> **Người viết:** Cursor (Plan generation)
> **Trạng thái:** 📋 **PLAN READY** — Chờ user duyệt & bắt đầu triển khai
> **Module tiếp theo trong roadmap:** M5 ✅ → M3.5 ✅ → M9 ✅ → **M6** (file này)

---

## 0. TỔNG QUAN

### 0.1. Mục tiêu nghiệp vụ

Xây dựng hệ thống quản lý tài liệu doanh nghiệp tập trung, phục vụ 5 use case nghiệp vụ chính:

| # | Use Case | Người tạo | Người xem | Đặc tính |
|---|----------|-----------|-----------|----------|
| **U1** | **Tài liệu yêu cầu đính kèm task** (PM giao kèm spec) | PM | PM + Assignee + DEPT_HEAD | Auto-link với Task; lưu trong Project Documents sau khi task DONE |
| **U2** | **Tài liệu nộp bằng chứng hoàn thành task** (Employee nộp kết quả) | Employee (Assignee) | PM + Employee + DEPT_HEAD | Upload khi task DONE; lưu trong Project Documents |
| **U3** | **Tài liệu dự án chung** (Spec, Design, Meeting Notes thủ công) | PM + DEPT_HEAD | Tất cả thành viên dự án | Rich-text Tiptap, Versioning, Tags |
| **U4** | **Biên bản cuộc họp tự động** (từ MeetingMinutes M5) | Auto (từ Meeting) | Toàn bộ Attendees | Auto-sinh khi meeting COMPLETED; AI Summary Gemini |
| **U5** | **Tài liệu chung công ty** (Quy chế, Nội quy, Chính sách) | Admin | Toàn bộ User | Read-only cho mọi role, chỉ Admin CRUD |

### 0.2. Phạm vi kỹ thuật đã chốt với user

| Hạng mục | Quyết định |
|----------|------------|
| Editor | **Tiptap** (@tiptap/react + @tiptap/starter-kit + extensions) |
| Storage file | **MinIO local** (S3-compatible, Docker, miễn phí) |
| Search | **PostgreSQL Full-Text Search** (tsvector) |
| Real-time collab | **Đơn giản** — WebSocket broadcast nội dung, không cần CRDT |
| AI | **Gemini 1.5 Flash** (đã có API key từ M5) |
| Export | **PDF + DOCX** (jspdf + docx libs) |
| Templates | Có — Meeting Minutes, Project Proposal, Weekly Report |
| Attachments | Có — qua MinIO, mọi role theo scope |

### 0.3. Tại sao cần M6?

1. **PM hiện tại giao task mà không kèm spec** → Employee làm sai, phải họp lại nhiều lần
2. **Employee làm xong task không có chỗ nộp bằng chứng** → PM phải hỏi qua chat/email
3. **Tài liệu dự án phân tán** ở Google Drive, Confluence, Notion → không đồng bộ với task/sprint
4. **Biên bản họp** (M5) hiện chỉ là rich-text trong meeting, không thành "tài liệu" searchable
5. **Quy chế công ty** không có chỗ lưu tập trung → nhân viên mới hỏi lung tung

### 0.4. Effort ước lượng

| Module con | Effort | Phụ thuộc |
|------------|--------|-----------|
| Phase 1 — Schema + MinIO setup | 2h | (không) |
| Phase 2 — Backend Core (CRUD + Versioning + FTS) | 4h | Phase 1 |
| Phase 3 — Backend Attachments (MinIO + presigned URL) | 3h | Phase 1 |
| Phase 4 — Backend Auto-doc (Task + Meeting) | 3h | Phase 2 |
| Phase 5 — Frontend Tiptap Editor + Pages | 6h | Phase 2, 3 |
| Phase 6 — Frontend Real-time + Templates + Export | 4h | Phase 5 |
| Phase 7 — AI Summary Gemini | 2h | Phase 4 |
| Phase 8 — Tests + Polish + E2E | 4h | All |
| **TỔNG** | **~28h (7 ngày)** | |

---

## 1. NGHIỆP VỤ CHUẨN (Đã xác nhận)

### 1.1. Phân quyền theo Use Case

```
                          ┌──────────────┐
                          │    ADMIN     │ (toàn quyền + U5)
                          └──────────────┘
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│  DEPT_HEAD   │         │     HR       │         │     PM       │
│ U1: Tạo     │         │ (chỉ xem)   │         │ U1: Tạo ✅  │
│ U2: Xem     │         │              │         │ U2: Xem ✅  │
│ U3: Tạo ✅  │         │              │         │ U3: Tạo ✅  │
│ U4: Xem     │         │              │         │ U4: Xem ✅  │
│ U5: Xem     │         │              │         │ U5: Xem     │
└──────────────┘         └──────────────┘         └──────────────┘
        │                         │                         │
        └─────────────────────────┴─────────────────────────┘
                                  │
                          ┌──────────────┐
                          │  EMPLOYEE    │
                          │ U1: Xem (assignee) │
                          │ U2: Tạo ✅  │
                          │ U3: Xem (member)  │
                          │ U4: Xem (attendee)│
                          │ U5: Xem           │
                          └──────────────┘
```

### 1.2. Ví dụ thực tế (E2E flow)

**Tình huống A — PM giao task kèm spec (U1):**

1. **PM Nguyễn Minh Tuấn** tạo task "TASK-105: Implement OAuth Google Login" cho Long Võ
2. Click "+ Đính kèm tài liệu yêu cầu" → mở modal Tiptap
3. Viết spec với headings, code block, embed hình sơ đồ flow
4. Click "Lưu & Đính kèm vào task" → sinh ra `Document` với `linkedTaskId = TASK-105`
5. Long Võ (assignee) mở task → thấy tài liệu spec ở panel "Tài liệu yêu cầu"
6. Sau khi Long Võ check-in task DONE, tài liệu vẫn còn, badge "Đã đính kèm vào TASK-105", searchable ở `/projects/p-3/documents`

**Tình huống B — Employee nộp bằng chứng (U2):**

1. **Long Võ** hoàn thành task → click "Nộp bằng chứng"
2. Modal upload: kéo thả file (PDF báo cáo, ảnh screenshot, .zip source code)
3. Files upload lên MinIO qua presigned URL
4. Sinh `Document` với `linkedTaskId = TASK-105`, `type = SUBMISSION`
5. PM nhận notification "Long Võ đã nộp bằng chứng cho TASK-105"
6. PM xem tài liệu, có thể comment/approve

**Tình huống C — Biên bản họp tự động (U4):**

1. **PM Tuấn** tạo meeting "Sprint 14 Review" với 5 attendees
2. Trong cuộc họp, ghi biên bản bằng Tiptap editor ở panel bên phải (`MeetingMinutes` từ M5)
3. Khi meeting chuyển `COMPLETED`, **auto-trigger** job:
   - Lưu `MeetingMinutes.content` (đã có từ M5) thành `Document` với `linkedMeetingId`, `type = MEETING_MINUTES`
   - Gọi Gemini API: `gemini-1.5-flash` → sinh AI Summary
   - Lưu vào `Document.aiSummary` field
4. Tất cả attendees nhận notification với link tài liệu

**Tình huống D — Tài liệu chung công ty (U5):**

1. **Admin Võ Thanh Long** tạo "Quy chế làm việc 2027" tại `/admin/documents`
2. Rich-text với Tiptap, version v1
3. Sau 1 tháng cập nhật → version v2, v3...
4. Mọi user vào `/documents/company` xem được, có lịch sử version, có thể export PDF

### 1.3. RBAC Matrix chi tiết

#### Theo Scope

| Action / Scope | PERSONAL | PROJECT | DEPARTMENT | COMPANY |
|----------------|:--------:|:-------:|:----------:|:-------:|
| Create | ✅ Owner | ✅ PM/DEPT_HEAD | ✅ DEPT_HEAD | ✅ Admin |
| Read | ✅ Owner | ✅ Project members | ✅ Department members | ✅ All |
| Update | ✅ Owner | ✅ PM/DEPT_HEAD | ✅ DEPT_HEAD | ✅ Admin |
| Delete | ✅ Owner | ✅ PM/DEPT_HEAD | ✅ DEPT_HEAD | ✅ Admin |
| Comment | ✅ Owner | ✅ Project members | ✅ Department members | ✅ All |

#### Theo Use Case (cụ thể hơn)

| Action | Admin | DEPT_HEAD | PM | HR | Employee |
|--------|:-----:|:---------:|:--:|:--:|:--------:|
| **U1** Tạo tài liệu yêu cầu task | ✅ | ✅ (project phòng mình) | ✅ (project mình PM) | ❌ | ❌ |
| **U1** Xem tài liệu yêu cầu | ✅ | ✅ (cùng dự án) | ✅ (project mình) | ✅ | ✅ (assignee) |
| **U2** Tạo submission khi task DONE | ✅ | ✅ (cùng dự án) | ✅ (project mình) | ❌ | ✅ (assignee) |
| **U2** Xem submission | ✅ | ✅ (cùng dự án) | ✅ (project mình) | ✅ | ✅ (assignee + submitter) |
| **U3** Tạo tài liệu dự án | ✅ | ✅ (phòng mình) | ✅ (project mình PM) | ❌ | ❌ |
| **U3** Xem tài liệu dự án | ✅ | ✅ | ✅ | ✅ | ✅ (member) |
| **U4** Xem biên bản họp | ✅ | ✅ | ✅ | ✅ | ✅ (attendee) |
| **U5** Tạo tài liệu công ty | ✅ | ❌ | ❌ | ❌ | ❌ |
| **U5** Xem tài liệu công ty | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 2. KIẾN TRÚC TỔNG THỂ

### 2.1. Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React 19)                       │
│  Tiptap Editor + Zustand + Axios + Socket.IO Client         │
└─────────────────────────────────────────────────────────────┘
                              │ REST + WebSocket
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (NestJS 12)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │Documents │  │ Versions │  │Attachments│  │  Search  │  │
│  │ Module   │  │ Module   │  │  Module   │  │  (FTS)   │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │Templates │  │ AI Sum.  │  │Gateway   │                │
│  │ Module   │  │ (Gemini) │  │(WS Collab)│                │
│  └──────────┘  └──────────┘  └──────────┘                │
└─────────────────────────────────────────────────────────────┘
              │                    │                  │
              ▼                    ▼                  ▼
       ┌──────────┐         ┌──────────┐       ┌──────────┐
       │PostgreSQL│         │  MinIO   │       │ Gemini   │
       │(Prisma + │         │ (Files)  │       │1.5 Flash │
       │ tsvector)│         │          │       │ (AI Sum) │
       └──────────┘         └──────────┘       └──────────┘
```

### 2.2. File Structure (mới tạo)

```
backend/src/documents/                              ← TẠO MỚI
├── documents.module.ts
├── documents.controller.ts                         (REST API)
├── documents.service.ts                            (Core CRUD + Versioning)
├── documents.gateway.ts                            (WebSocket collab)
├── documents-access.service.ts                     (RBAC theo scope)
├── document-search.service.ts                      (PostgreSQL FTS)
├── document-templates.service.ts                   (Templates)
├── document-ai.service.ts                          (Gemini summary)
├── document-export.service.ts                      (PDF + DOCX export)
├── document-attachments.service.ts                 (MinIO file upload)
├── dto/
│   ├── create-document.dto.ts                      (Zod)
│   ├── update-document.dto.ts                      (Zod)
│   ├── document-query.dto.ts                       (Zod)
│   ├── create-from-template.dto.ts                 (Zod)
│   └── submit-task-deliverable.dto.ts              (Zod)
└── __tests__/
    ├── documents.service.spec.ts                   (≥15 cases)
    ├── documents-access.service.spec.ts            (≥10 cases RBAC)
    ├── document-attachments.service.spec.ts        (≥8 cases)
    └── document-ai.service.spec.ts                 (≥4 cases)

frontend/src/features/documents/                     ← TẠO MỚI
├── pages/
│   ├── DocumentListPage.tsx                        (/documents)
│   ├── DocumentEditorPage.tsx                      (/documents/:id)
│   ├── ProjectDocumentsPage.tsx                    (/projects/:id/documents)
│   ├── CompanyDocumentsPage.tsx                    (/documents/company)
│   ├── TaskDeliverablesPage.tsx                    (/tasks/:id/deliverables)
│   └── DocumentSearchPage.tsx                      (/documents/search)
├── components/
│   ├── editor/
│   │   ├── TiptapEditor.tsx                        (Main editor)
│   │   ├── EditorToolbar.tsx                       (Bold, Italic, ...)
│   │   ├── EditorBubbleMenu.tsx                    (Inline formatting)
│   │   └── EditorExtensions.ts                     (Custom extensions config)
│   ├── DocumentCard.tsx
│   ├── DocumentTree.tsx                            (Nested folders)
│   ├── DocumentVersionHistory.tsx
│   ├── DocumentShareDialog.tsx
│   ├── DocumentUploadAttachment.tsx                (MinIO uploader)
│   ├── DocumentExportMenu.tsx                      (PDF/DOCX)
│   ├── DocumentAiSummaryPanel.tsx
│   ├── DocumentTemplatePicker.tsx
│   ├── DocumentCollaboratorsAvatars.tsx            (Real-time presence)
│   └── DocumentRecentWidget.tsx                    (Dashboard widget)
├── hooks/
│   ├── useDocuments.ts
│   ├── useDocumentVersions.ts
│   ├── useDocumentSearch.ts
│   ├── useDocumentCollab.ts                        (WebSocket)
│   ├── useDocumentAttachments.ts
│   └── useDocumentAiSummary.ts
├── stores/
│   └── document.store.ts                           (Zustand)
├── api/
│   ├── document.api.ts
│   └── document-attachments.api.ts
└── types/
    └── document.types.ts

frontend/src/features/meetings/components/           ← SỬA
└── MinutesEditor.tsx                                (Dùng chung Tiptap)
```

---

## 3. SCHEMA PRISMA

### 3.1. Migration mới

```prisma
// File: backend/prisma/schema.prisma (bổ sung)

enum DocumentScope {
  PERSONAL    // Cá nhân (owner là 1 user)
  PROJECT     // Dự án (PM/DEPT_HEAD quản lý)
  DEPARTMENT  // Phòng ban
  COMPANY     // Toàn công ty
}

enum DocumentType {
  STANDARD          // Tài liệu thông thường
  TASK_REQUIREMENT  // U1 - PM đính kèm task
  TASK_SUBMISSION   // U2 - Employee nộp bằng chứng
  MEETING_MINUTES   // U4 - Biên bản họp (auto)
  COMPANY_POLICY    // U5 - Quy chế công ty
  TEMPLATE          // Template
}

model Document {
  id              String        @id @default(cuid())
  title           String
  content         Json          // Tiptap JSON
  contentText     String        @db.Text // Plain text cho FTS
  scope           DocumentScope
  type            DocumentType  @default(STANDARD)

  // Owner
  ownerId         String
  owner           User          @relation("DocumentOwner", fields: [ownerId], references: [id])

  // Scope relations
  projectId       String?
  project         Project?      @relation(fields: [projectId], references: [id])
  departmentId    String?
  department      Department?   @relation(fields: [departmentId], references: [id])

  // Linked entities (cho U1, U2, U4)
  linkedTaskId    String?
  linkedTask      Task?         @relation("DocumentLinkedTask", fields: [linkedTaskId], references: [id])
  linkedMeetingId String?
  linkedMeeting   Meeting?      @relation("DocumentLinkedMeeting", fields: [linkedMeetingId], references: [id])

  // Metadata
  aiSummary       String?       @db.Text
  templateKey     String?       // 'meeting_minutes', 'project_proposal', ...
  parentId        String?       // Nested folders
  parent          Document?     @relation("DocumentTree", fields: [parentId], references: [id])
  children        Document[]    @relation("DocumentTree")
  tags            String[]      // ['spec', 'design', 'urgent']

  // Versioning
  currentVersion  Int           @default(1)
  versions        DocumentVersion[]

  // Attachments
  attachments     DocumentAttachment[]

  // Access
  permissions     DocumentPermission[]

  // Stats
  viewCount       Int           @default(0)
  lastViewedAt    DateTime?

  // Audit
  createdById     String
  createdBy       User          @relation("DocumentCreator", fields: [createdById], references: [id])
  updatedById     String?
  updatedBy       User?         @relation("DocumentUpdater", fields: [updatedById], references: [id])

  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
  deletedAt       DateTime?

  @@index([scope, deletedAt])
  @@index([projectId, deletedAt])
  @@index([departmentId, deletedAt])
  @@index([linkedTaskId])
  @@index([linkedMeetingId])
  @@index([ownerId, deletedAt])
  // FTS index (PostgreSQL)
  // CREATE INDEX idx_document_fts ON "Document" USING GIN (to_tsvector('simple', contentText));
}

model DocumentVersion {
  id           String   @id @default(cuid())
  documentId   String
  document     Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  version      Int
  title        String
  content      Json
  contentText  String   @db.Text
  changeNote   String?  // "Cập nhật phần API spec"
  savedById    String
  savedBy      User     @relation("DocumentVersionSaver", fields: [savedById], references: [id])
  createdAt    DateTime @default(now())

  @@unique([documentId, version])
  @@index([documentId, version])
}

model DocumentAttachment {
  id            String   @id @default(cuid())
  documentId    String
  document      Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  fileName      String
  fileSize      Int      // bytes
  mimeType      String
  minioKey      String   // path trong MinIO bucket
  minioBucket   String   @default("worksync-documents")
  uploadedById  String
  uploadedBy    User     @relation("DocumentAttachmentUploader", fields: [uploadedById], references: [id])
  createdAt     DateTime @default(now())

  @@index([documentId])
}

model DocumentPermission {
  id           String   @id @default(cuid())
  documentId   String
  document     Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  userId       String
  user         User     @relation(fields: [DocumentPermissionUser", fields: [userId], references: [id])
  canEdit      Boolean  @default(false)
  canComment   Boolean  @default(true)
  canShare     Boolean  @default(false)
  grantedById  String
  grantedBy    User     @relation("DocumentPermissionGranter", fields: [grantedById], references: [id])
  createdAt    DateTime @default(now())

  @@unique([documentId, userId])
  @@index([documentId])
}

model DocumentTemplate {
  id            String   @id @default(cuid())
  key           String   @unique  // 'meeting_minutes', 'project_proposal', 'weekly_report'
  name          String   // "Biên bản họp", "Đề xuất dự án"
  description   String?
  content       Json     // Tiptap JSON template
  scope         DocumentScope
  createdById   String
  createdBy     User     @relation("DocumentTemplateCreator", fields: [createdById], references: [id])
  isSystem      Boolean  @default(false)  // Template hệ thống (không xóa được)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}
```

### 3.2. Migration name

```
backend/prisma/migrations/20261018000000_m6_documents/migration.sql
```

### 3.3. Update existing models

```prisma
// Task bổ sung relation
model Task {
  // ... existing fields
  linkedDocuments Document[] @relation("DocumentLinkedTask")
}

// Meeting bổ sung relation
model Meeting {
  // ... existing fields
  linkedDocuments Document[] @relation("DocumentLinkedMeeting")
}

// User bổ sung relations
model User {
  // ... existing fields
  ownedDocuments       Document[]         @relation("DocumentOwner")
  createdDocuments     Document[]         @relation("DocumentCreator")
  updatedDocuments     Document[]         @relation("DocumentUpdater")
  savedVersions        DocumentVersion[]  @relation("DocumentVersionSaver")
  uploadedAttachments  DocumentAttachment[] @relation("DocumentAttachmentUploader")
  documentPermissions  DocumentPermission[] @relation("DocumentPermissionUser")
  grantedPermissions   DocumentPermission[] @relation("DocumentPermissionGranter")
  createdTemplates     DocumentTemplate[]   @relation("DocumentTemplateCreator")
}
```

### 3.4. PostgreSQL FTS migration

```sql
-- File: backend/prisma/migrations/20261018000000_m6_documents/migration.sql

-- ... (Prisma generated CREATE TABLE statements) ...

-- FTS index
CREATE INDEX idx_document_fts
  ON "Document"
  USING GIN (to_tsvector('simple', content_text));

-- Trigger tự động cập nhật contentText
CREATE OR REPLACE FUNCTION document_update_content_text()
RETURNS TRIGGER AS $$
BEGIN
  -- Convert Tiptap JSON to plain text (simple extraction)
  NEW.content_text := (
    SELECT string_agg(value->>'text', ' ')
    FROM jsonb_array_elements(NEW.content::jsonb->'content') AS value
    WHERE value->>'text' IS NOT NULL
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_document_content_text
  BEFORE INSERT OR UPDATE OF content ON "Document"
  FOR EACH ROW EXECUTE FUNCTION document_update_content_text();
```

---

## 4. BACKEND — REST API

### 4.1. DocumentsController — 14 endpoints

```typescript
@Controller('documents')
@UseGuards(JwtAuthGuard)
export class DocumentsController {
  // === CRUD cơ bản ===
  @Get()                          // GET /api/documents?scope=&projectId=&search=&page=
  @Get('tree')                    // GET /api/documents/tree?parentId=
  @Get('recent')                  // GET /api/documents/recent?limit=10
  @Get('company')                 // GET /api/documents/company (U5)
  @Get('project/:projectId')      // GET /api/documents/project/:projectId (U3)
  @Get('task/:taskId')            // GET /api/documents/task/:taskId (U1 + U2)
  @Get('meeting/:meetingId')      // GET /api/documents/meeting/:meetingId (U4)

  @Get(':id')                     // GET /api/documents/:id
  @Post()                         // POST /api/documents (create)
  @Patch(':id')                   // PATCH /api/documents/:id (auto-save version)
  @Delete(':id')                  // DELETE /api/documents/:id (soft)

  // === Versioning ===
  @Get(':id/versions')            // GET /api/documents/:id/versions
  @Get(':id/versions/:version')   // GET /api/documents/:id/versions/:version
  @Post(':id/versions/:version/restore')  // POST restore to version N

  // === Templates ===
  @Get('templates/all')           // GET /api/documents/templates/all
  @Post('templates/create')       // POST /api/documents/templates/create (admin only)
  @Post('from-template')          // POST /api/documents/from-template (tạo doc từ template)

  // === Attachments ===
  @Post(':id/attachments')        // POST upload (multipart/form-data)
  @Get(':id/attachments')         // GET list
  @Delete(':id/attachments/:attId') // DELETE

  // === Search & AI ===
  @Get('search/fulltext')         // GET /api/documents/search/fulltext?q=
  @Post(':id/ai-summary')         // POST generate AI summary (Gemini)
  @Get(':id/ai-summary')          // GET cached AI summary

  // === Export ===
  @Get(':id/export/pdf')          // GET download PDF
  @Get(':id/export/docx')         // GET download DOCX

  // === Share & Permissions ===
  @Post(':id/share')              // POST add user permission
  @Delete(':id/share/:userId')    // DELETE
  @Get(':id/share')               // GET list shared users
}
```

### 4.2. DocumentsService — Business Logic

```typescript
@Injectable()
export class DocumentsService {
  // === CRUD ===
  async create(dto: CreateDocumentDto, actor: CurrentActor): Promise<Document> {
    // 1. Validate scope + linked entity permissions
    // 2. Auto-set ownerId = actor.id, createdById = actor.id
    // 3. Set contentText from content JSON (trigger DB)
    // 4. If from template: copy template content
    // 5. If linkedTaskId: verify actor can create (PM/DEPT_HEAD)
    // 6. Create DocumentVersion v1
  }

  async findAll(query: DocumentQueryDto, actor: CurrentActor): Promise<Page<Document>> {
    // RBAC filter:
    //   - PERSONAL: where ownerId = actor.id
    //   - PROJECT: where projectId IN (actor's projects)
    //   - DEPARTMENT: where departmentId = actor.departmentId
    //   - COMPANY: where scope = COMPANY
    // Apply search, tags filter, pagination
  }

  async findOne(id: string, actor: CurrentActor): Promise<Document> {
    // 1. Find document
    // 2. Check access (use DocumentsAccessService)
    // 3. Increment viewCount, update lastViewedAt
  }

  async update(id: string, dto: UpdateDocumentDto, actor: CurrentActor): Promise<Document> {
    // 1. Check edit permission
    // 2. Save current version to DocumentVersion (if content changed)
    // 3. Increment currentVersion
    // 4. Update content
  }

  async softDelete(id: string, actor: CurrentActor): Promise<void> {
    // RBAC: Owner or Admin only
  }

  // === U1: PM tạo tài liệu yêu cầu task ===
  async createTaskRequirement(taskId: string, dto: CreateDocumentDto, actor: CurrentActor): Promise<Document> {
    // 1. Verify actor is PM/DEPT_HEAD/Admin
    // 2. Verify task exists & actor has access
    // 3. Create Document with linkedTaskId, type = TASK_REQUIREMENT
  }

  // === U2: Employee nộp bằng chứng ===
  async createTaskSubmission(taskId: string, dto: SubmitTaskDeliverableDto, actor: CurrentActor): Promise<Document> {
    // 1. Verify actor is assignee of task
    // 2. Verify task status can accept submission (DONE or IN_REVIEW)
    // 3. Create Document with linkedTaskId, type = TASK_SUBMISSION
  }

  // === U4: Auto biên bản họp ===
  async createFromMeetingMinutes(meetingId: string, actor: CurrentActor): Promise<Document> {
    // Called by MeetingsService when meeting COMPLETED
    // 1. Get meeting.minutes (from M5)
    // 2. Create Document with linkedMeetingId, type = MEETING_MINUTES
    // 3. Trigger AI summary (async)
  }
}
```

### 4.3. DocumentsAccessService — RBAC trung tâm

```typescript
@Injectable()
export class DocumentsAccessService {
  canRead(document: Document, actor: CurrentActor): boolean {
    // PERSONAL: ownerId === actor.id OR has explicit permission
    // PROJECT: actor is project member (PM, member, DEPT_HEAD, HR, Admin)
    // DEPARTMENT: actor.departmentId === document.departmentId
    // COMPANY: always true
  }

  canEdit(document: Document, actor: CurrentActor): boolean {
    // PERSONAL: owner
    // PROJECT: PM of project OR DEPT_HEAD of department OR Admin
    // DEPARTMENT: DEPT_HEAD of department OR Admin
    // COMPANY: Admin only
  }

  canDelete(document: Document, actor: CurrentActor): boolean {
    // Same as canEdit
  }

  async assertReadable(documentId: string, actor: CurrentActor): Promise<Document> {
    // Throw ForbiddenException if not readable
  }
}
```

### 4.4. DocumentAttachmentsService — MinIO integration

```typescript
@Injectable()
export class DocumentAttachmentsService {
  private minioClient: Client;
  private bucket = 'worksync-documents';

  constructor() {
    this.minioClient = new Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: false,
      accessKey: process.env.MINIO_ACCESS_KEY,
      secretKey: process.env.MINIO_SECRET_KEY,
    });
    this.ensureBucket();
  }

  async upload(documentId: string, file: Express.Multer.File, actor: CurrentActor): Promise<DocumentAttachment> {
    // 1. Verify actor can edit document
    // 2. Generate minioKey: `${documentId}/${cuid()}-${file.originalname}`
    // 3. Upload to MinIO
    // 4. Create DocumentAttachment record
  }

  async getDownloadUrl(attachmentId: string, actor: CurrentActor): Promise<string> {
    // 1. Verify access
    // 2. Return presigned URL (expires in 1 hour)
  }

  async delete(attachmentId: string, actor: CurrentActor): Promise<void> {
    // 1. Verify uploader or document owner
    // 2. Delete from MinIO + DB
  }

  private async ensureBucket(): Promise<void> {
    const exists = await this.minioClient.bucketExists(this.bucket);
    if (!exists) {
      await this.minioClient.makeBucket(this.bucket, 'us-east-1');
    }
  }
}
```

### 4.5. DocumentSearchService — PostgreSQL FTS

```typescript
@Injectable()
export class DocumentSearchService {
  async fulltextSearch(query: string, actor: CurrentActor, filters: SearchFilters): Promise<Document[]> {
    // 1. Build RBAC filter (same as findAll)
    // 2. Use Prisma raw query:
    //    SELECT * FROM "Document"
    //    WHERE to_tsvector('simple', content_text) @@ plainto_tsquery('simple', $1)
    //      AND deleted_at IS NULL
    //      AND (RBAC filter)
    //    ORDER BY ts_rank(...) DESC
    //    LIMIT 20;
  }

  async searchByTags(tags: string[], actor: CurrentActor): Promise<Document[]> {
    // WHERE tags && $1::text[]
  }
}
```

### 4.6. DocumentAiService — Gemini Summary

```typescript
@Injectable()
export class DocumentAiService {
  private genai: GoogleGenerativeAI;

  constructor() {
    this.genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  }

  async generateSummary(documentId: string, actor: CurrentActor): Promise<string> {
    // 1. Verify access
    // 2. Get document.contentText
    // 3. Truncate to 30000 chars (Gemini limit)
    // 4. Call Gemini:
    //    const model = this.genai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    //    const result = await model.generateContent(
    //      `Tóm tắt tài liệu sau bằng tiếng Việt, 3-5 đoạn ngắn gọn:\n\n${contentText}`
    //    );
    // 5. Save to document.aiSummary
    // 6. Return summary
  }
}
```

### 4.7. DocumentExportService — PDF + DOCX

```typescript
@Injectable()
export class DocumentExportService {
  async exportPdf(documentId: string, actor: CurrentActor): Promise<Buffer> {
    // 1. Verify access
    // 2. Get document.content (Tiptap JSON)
    // 3. Convert to HTML using @tiptap/html
    // 4. Render to PDF using puppeteer or pdfkit
    // 5. Return Buffer (controller sends as file download)
  }

  async exportDocx(documentId: string, actor: CurrentActor): Promise<Buffer> {
    // 1. Verify access
    // 2. Convert Tiptap JSON to DOCX using 'docx' npm package
    // 3. Return Buffer
  }
}
```

### 4.8. DocumentsGateway — Real-time collab

```typescript
@WebSocketGateway({ namespace: '/documents', cors: { origin: '*' } })
export class DocumentsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private userSockets = new Map<string, Set<string>>(); // userId -> Set<socketId>
  private docRooms = new Map<string, Set<string>>();    // docId -> Set<socketId>

  @SubscribeMessage('join')
  async handleJoin(client: Socket, payload: { documentId: string; token: string }) {
    // 1. Verify JWT
    // 2. Verify access
    // 3. Join room `doc:${documentId}`
    // 4. Broadcast 'user:joined' to room
    // 5. Send current active users to client
  }

  @SubscribeMessage('content:update')
  async handleContentUpdate(client: Socket, payload: { documentId: string; content: any }) {
    // 1. Verify access
    // 2. Broadcast to all sockets in room except sender
    // 3. (Optional) Save draft to DB every 30s
  }

  @SubscribeMessage('cursor:move')
  async handleCursorMove(client: Socket, payload: { documentId: string; position: number }) {
    // Broadcast cursor position for collaborative cursor display
  }

  @SubscribeMessage('leave')
  handleLeave(client: Socket, payload: { documentId: string }) {
    client.leave(`doc:${payload.documentId}`);
    this.server.to(`doc:${payload.documentId}`).emit('user:left', { userId: ... });
  }
}
```

---

## 5. FRONTEND — UI/UX

### 5.1. Pages & Routes

```
/documents                       → DocumentListPage (My Documents)
/documents/company               → CompanyDocumentsPage (U5)
/documents/search?q=             → DocumentSearchPage
/documents/:id                   → DocumentEditorPage (Tiptap)
/documents/:id/versions          → DocumentVersionHistory (modal)
/projects/:id/documents          → ProjectDocumentsPage (U3)
/tasks/:id/deliverables          → TaskDeliverablesPage (U1 + U2)
/documents/templates             → DocumentTemplatePicker (modal trigger)
```

### 5.2. TiptapEditor Component

```typescript
// frontend/src/features/documents/components/editor/TiptapEditor.tsx

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import Placeholder from '@tiptap/extension-placeholder';
import Collaboration from '@tiptap/extension-collaboration';
// ... other extensions

interface TiptapEditorProps {
  initialContent: any;  // Tiptap JSON
  documentId: string;
  readOnly?: boolean;
  onUpdate?: (content: any) => void;
  onSave?: (content: any) => Promise<void>;
}

export const TiptapEditor: React.FC<TiptapEditorProps> = ({
  initialContent, documentId, readOnly, onUpdate, onSave
}) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Link.configure({ openOnClick: false }),
      Image,
      Table.configure({ resizable: true }),
      TableRow, TableHeader, TableCell,
      Placeholder.configure({ placeholder: 'Bắt đầu viết tài liệu...' }),
    ],
    content: initialContent,
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getJSON());
      // Auto-save every 30s
    },
  });

  // WebSocket integration for real-time collab
  useDocumentCollab(documentId, editor);

  return (
    <div className="border-slate-200/80 rounded-2xl border bg-white">
      {!readOnly && <EditorToolbar editor={editor} />}
      <EditorContent editor={editor} className="prose prose-slate max-w-none p-6 min-h-[500px]" />
    </div>
  );
};
```

### 5.3. EditorToolbar

```typescript
export const EditorToolbar: React.FC<{ editor: Editor }> = ({ editor }) => {
  return (
    <div className="border-b border-slate-200 p-2 flex flex-wrap gap-1">
      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>
        <Bold size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>
        <Italic size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
        <Heading1 size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()}>
        <List size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
        <Code size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setLink({ href: prompt('URL?') || '' }).run()}>
        <LinkIcon size={16} />
      </ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
        <TableIcon size={16} />
      </ToolbarButton>
      <ImageUploadButton editor={editor} />
      <div className="ml-auto flex gap-1">
        <DocumentExportMenu documentId={...} />
        <Button onClick={onSave}><Save size={16} /> Lưu</Button>
      </div>
    </div>
  );
};
```

### 5.4. DocumentListPage UI

```
┌──────────────────────────────────────────────────────────────┐
│  TÀI LIỆU CỦA TÔI                          [+ Tạo mới]     │
│  [Tất cả] [Cá nhân] [Dự án] [Phòng ban] [Công ty]          │
│  🔍 Tìm kiếm...                                              │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐    │
│  │ 📄 Spec OAuth Google Login         v3 • 2h trước    │    │
│  │ Tài liệu yêu cầu • TASK-105 • PM Tuấn               │    │
│  │ #spec #oauth #urgent                                  │    │
│  └──────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ 📄 Báo cáo Sprint 14                v2 • Hôm qua     │    │
│  │ Tài liệu dự án • WorkSync Platform • PM Tuấn        │    │
│  │ #report #sprint                                        │    │
│  └──────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ 📝 Biên bản họp Standup 16/10       v1 • Hôm nay     │    │
│  │ Từ cuộc họp • Auto-generated • 5 attendees           │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### 5.5. DocumentEditorPage UI

```
┌──────────────────────────────────────────────────────────────┐
│  ← Quay lại   Spec OAuth Google Login         [⋮ Menu]      │
│  v3 • PM Tuấn • 2 giờ trước • 3 collaborators online 🟢    │
├──────────────────────────────────────────────────────────────┤
│  [B] [I] [H1] [H2] [List] [Code] [Link] [Table] [🖼️] [...]  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  # OAuth Google Login - Spec kỹ thuật                       │
│                                                              │
│  ## 1. Tổng quan                                             │
│  Cho phép user đăng nhập bằng Google...                      │
│                                                              │
│  ## 2. Flow                                                  │
│                                                              │
│  ## 3. API Endpoints                                         │
│                                                              │
│  [Auto-saved • 14:32:05]                          [Lưu]     │
├──────────────────────────────────────────────────────────────┤
│  📎 2 file đính kèm           [⬆️ Upload]                    │
│  • api-design.pdf (234 KB)                                  │
│  • flow-diagram.png (89 KB)                                 │
├──────────────────────────────────────────────────────────────┤
│  🤖 AI Summary                                    [Tạo]     │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Tài liệu mô tả chi tiết implementation OAuth Google  │    │
│  │ Login cho WorkSync. Tập trung vào 3 phần chính: tổng │    │
│  │ quan, flow xử lý, và API endpoints...                │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### 5.6. TaskDeliverablesPage UI (U1 + U2)

```
┌──────────────────────────────────────────────────────────────┐
│  ← TASK-105: Implement OAuth Google Login                     │
│  Status: IN_PROGRESS • Assignee: Long Võ • Sprint 14         │
├──────────────────────────────────────────────────────────────┤
│  [Chi tiết] [Tài liệu] [Comments] [Activity]                │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  📄 TÀI LIỆU YÊU CẦU (1)                  [+ Thêm]          │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ 📄 Spec OAuth Google Login         v3 • PM Tuấn     │    │
│  │ [Mở tài liệu]                                        │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                              │
│  📦 BẰNG CHỨNG HOÀN THÀNH (2)        [+ Nộp bằng chứng]    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ 📄 Implementation Report            v1 • Long Võ     │    │
│  │ 2 file đính kèm                                        │    │
│  │ [Mở] [Download]                                        │    │
│  └──────────────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ 🖼️ Screenshots                                        │    │
│  │ 3 file đính kèm                                        │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

### 5.7. useDocumentCollab hook

```typescript
// frontend/src/features/documents/hooks/useDocumentCollab.ts

import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Editor } from '@tiptap/react';

export function useDocumentCollab(documentId: string, editor: Editor | null) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!editor || !documentId) return;

    const token = useAuthStore.getState().token;
    const socket = io(`${API_URL}/documents`, {
      auth: { token },
      query: { documentId },
    });
    socketRef.current = socket;

    socket.on('content:remote-update', ({ content, userId }) => {
      if (userId !== useAuthStore.getState().user?.id) {
        // Apply remote content without triggering onUpdate
        editor.commands.setContent(content, false);
      }
    });

    socket.on('user:joined', ({ user, activeUsers }) => {
      // Update collaborator avatars
    });

    socket.on('user:left', ({ userId }) => {
      // Remove avatar
    });

    // Throttled local update broadcast
    let lastContent = '';
    editor.on('update', ({ editor }) => {
      const content = editor.getJSON();
      const contentStr = JSON.stringify(content);
      if (contentStr !== lastContent) {
        lastContent = contentStr;
        socket.emit('content:update', { documentId, content });
      }
    });

    return () => {
      socket.emit('leave', { documentId });
      socket.disconnect();
    };
  }, [documentId, editor]);
}
```

---

## 6. INTEGRATION VỚI MODULE KHÁC

### 6.1. M3.5 Tasks — U1 + U2

```typescript
// backend/src/tasks/tasks.service.ts (bổ sung)

async getDocuments(taskId: string, actor: CurrentActor): Promise<Document[]> {
  return this.documentsService.findByTask(taskId, actor);
}

// Trong create/update task, có thể kèm document requirement:
async createRequirementDocument(taskId: string, dto: CreateDocumentDto, actor: CurrentActor) {
  return this.documentsService.createTaskRequirement(taskId, dto, actor);
}
```

```typescript
// frontend/src/features/tasks/components/TaskDetailModal.tsx (bổ sung tab Tài liệu)

const TaskDocumentsTab: React.FC<{ task: Task }> = ({ task }) => {
  const { data: docs } = useTaskDocuments(task.id);
  const canSubmit = task.assigneeId === currentUser.id && task.status === 'DONE';
  const canCreateReq = ['PM', 'DEPT_HEAD', 'ADMIN'].includes(currentUser.role);

  return (
    <div>
      <Section title="Tài liệu yêu cầu (PM đính kèm)">
        {docs?.requirements.map(d => <DocumentCard doc={d} />)}
        {canCreateReq && <Button onClick={() => setShowReqModal(true)}>+ Thêm tài liệu yêu cầu</Button>}
      </Section>

      <Section title="Bằng chứng hoàn thành (Employee nộp)">
        {docs?.submissions.map(d => <DocumentCard doc={d} />)}
        {canSubmit && <Button onClick={() => setShowSubmitModal(true)}>+ Nộp bằng chứng</Button>}
      </Section>
    </div>
  );
};
```

### 6.2. M5 Meetings — U4 auto biên bản

```typescript
// backend/src/meetings/meetings.service.ts (bổ sung vào complete())

async complete(meetingId: string, actor: CurrentActor): Promise<Meeting> {
  // ... existing logic to set status = COMPLETED ...

  // Auto-generate meeting minutes document (U4)
  if (meeting.minutes) {
    await this.documentsService.createFromMeetingMinutes(meetingId, actor);
    // Trigger AI summary async (don't await)
    this.documentsAiService.generateSummary(documentId, actor).catch(console.error);
  }

  // ... notify attendees ...
}
```

### 6.3. Dashboard Recent Documents Widget

```typescript
// frontend/src/features/dashboard/components/widgets/DocumentRecentWidget.tsx

export const DocumentRecentWidget: React.FC = () => {
  const { data: docs } = useRecentDocuments(5);

  return (
    <Card>
      <CardHeader>
        <h3>📄 Tài liệu gần đây</h3>
        <NavLink to="/documents">Xem tất cả</NavLink>
      </CardHeader>
      <ul>
        {docs?.map(d => (
          <li key={d.id}>
            <NavLink to={`/documents/${d.id}`}>
              <FileText size={14} />
              <span>{d.title}</span>
              <Badge>{d.scope}</Badge>
            </NavLink>
          </li>
        ))}
      </ul>
    </Card>
  );
};
```

---

## 7. MINIO SETUP

### 7.1. Docker Compose (bổ sung)

```yaml
# docker-compose.yml (thêm service)
services:
  minio:
    image: minio/minio:latest
    container_name: worksync_minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    ports:
      - "9000:9000"   # API
      - "9001:9001"   # Web console
    volumes:
      - minio_data:/data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  minio_data:
```

### 7.2. Environment variables

```bash
# backend/.env
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin123
MINIO_BUCKET=worksync-documents
MINIO_USE_SSL=false
```

### 7.3. Cấu trúc thư mục MinIO

```
worksync-documents/
├── {documentId-1}/
│   ├── {attachmentId-1}-report.pdf
│   ├── {attachmentId-2}-screenshot.png
│   └── ...
├── {documentId-2}/
│   └── ...
```

---

## 8. TESTING STRATEGY

### 8.1. Backend Unit Tests (Vitest)

| File | Test cases | Expected |
|------|-----------|----------|
| `documents.service.spec.ts` | 15: CRUD, versioning, RBAC, search | 100% pass |
| `documents-access.service.spec.ts` | 10: canRead/canEdit theo scope + role | 100% pass |
| `document-attachments.service.spec.ts` | 8: upload, download, delete, presigned URL | 100% pass |
| `document-ai.service.spec.ts` | 4: Gemini call, error handling, cache | 100% pass |
| `document-export.service.spec.ts` | 4: PDF, DOCX conversion | 100% pass |
| `documents-search.service.spec.ts` | 5: FTS query, RBAC filter, ranking | 100% pass |
| `documents.gateway.spec.ts` | 6: join, update, leave, RBAC | 100% pass |

**Tổng: 52 backend test cases, dự kiến ~52 unit tests pass**

### 8.2. Frontend Component Tests (Vitest + RTL)

| File | Test cases | Expected |
|------|-----------|----------|
| `TiptapEditor.test.tsx` | 4: render, bold, save, real-time | 100% pass |
| `DocumentListPage.test.tsx` | 3: render, filter, search | 100% pass |
| `DocumentEditorPage.test.tsx` | 3: render, save version, export | 100% pass |
| `TaskDeliverablesPage.test.tsx` | 3: render requirements/submissions | 100% pass |
| `DocumentUploadAttachment.test.tsx` | 2: drag-drop, progress | 100% pass |

**Tổng: 15 frontend test cases**

### 8.3. Integration Tests (E2E thủ công)

**Scenario 1 — U1: PM đính kèm tài liệu yêu cầu**
1. PM Tuấn login → vào TASK-105 → click "Tạo tài liệu yêu cầu"
2. Viết spec bằng Tiptap → Save
3. Long Võ (assignee) mở task → thấy tài liệu
4. Long Võ click "Mở tài liệu" → DocumentEditorPage mở, có badge "Tài liệu yêu cầu"

**Scenario 2 — U2: Employee nộp bằng chứng**
1. Long Võ hoàn thành task → click "Nộp bằng chứng"
2. Upload 2 file PDF + ảnh qua MinIO
3. PM Tuấn nhận notification → mở xem submissions
4. PM xem được file, download được

**Scenario 3 — U3: Tài liệu dự án chung**
1. PM Tuấn tạo doc "Sprint 14 Plan" trong `/projects/p-3/documents`
2. Chọn template "Project Proposal" → sửa nội dung
3. Version v1 → Save
4. Sửa tiếp → v2
5. Click "Lịch sử version" → thấy v1 và v2
6. Restore v1 → nội dung quay lại bản đầu

**Scenario 4 — U4: Biên bản họp auto**
1. PM Tuấn tạo meeting → attendees: 5 người
2. Trong phòng họp, ghi biên bản bằng Tiptap
3. Meeting COMPLETED → auto sinh doc
4. 5 attendees nhận notification
5. Click notification → mở doc, có AI Summary từ Gemini

**Scenario 5 — U5: Tài liệu công ty**
1. Admin tạo "Quy chế làm việc 2027" tại `/admin/documents`
2. Version v1
3. Mọi user xem được tại `/documents/company`
4. Sửa → v2, v3
5. Export PDF → tải về thành công

**Scenario 6 — Real-time collab**
1. PM mở doc A
2. DEPT_HEAD cũng mở doc A
3. PM gõ "Xin chào" → DEPT_HEAD thấy xuất hiện ngay (< 500ms)
4. 2 avatars hiển thị ở header (collaborators online)

**Scenario 7 — Search full-text**
1. Tạo 3 doc có nội dung "OAuth Google"
2. Search "OAuth" → thấy 3 doc ranked
3. Search "Google Login" → thấy doc có chính xác cụm từ

### 8.4. Test counts sau M6

| Layer | Before M6 | After M6 | Tổng |
|-------|-----------|----------|------|
| Backend Vitest | 226 | +52 | **278** |
| Frontend Vitest | 59 | +15 | **74** |
| E2E | Manual | 7 scenarios | Manual + 7 |

---

## 9. DEPENDENCIES

### 9.1. Backend (cần thêm)

```json
{
  "dependencies": {
    "@tiptap/core": "^2.6.0",
    "@tiptap/html": "^2.6.0",
    "minio": "^8.0.1",
    "multer": "^1.4.5-lts.1",
    "@nestjs/platform-express": "^10.0.0",
    "@google/generative-ai": "^0.21.0",      // đã có từ M5
    "puppeteer": "^23.0.0",                  // PDF export
    "docx": "^9.0.0",                        // DOCX export
    "socket.io": "^4.7.5"                    // đã có từ M5
  },
  "devDependencies": {
    "@types/multer": "^1.4.11"
  }
}
```

### 9.2. Frontend (cần thêm)

```json
{
  "dependencies": {
    "@tiptap/react": "^2.6.0",
    "@tiptap/starter-kit": "^2.6.0",
    "@tiptap/extension-link": "^2.6.0",
    "@tiptap/extension-image": "^2.6.0",
    "@tiptap/extension-table": "^2.6.0",
    "@tiptap/extension-placeholder": "^2.6.0",
    "socket.io-client": "^4.7.5"             // đã có từ M5
  }
}
```

---

## 10. RISK & MITIGATION

| # | Risk | Impact | Mitigation |
|---|------|--------|------------|
| R1 | MinIO down → không upload được | High | Health check, fallback message rõ ràng, retry logic |
| R2 | Tiptap content size lớn (>1MB) làm chậm editor | Medium | Lazy load, virtualization cho content >500KB |
| R3 | Real-time collab conflict khi 2 user edit cùng lúc | Medium | Last-write-wins cho đơn giản; cảnh báo "User X đang sửa" |
| R4 | Gemini API quota exceeded | Medium | Cache summary, fallback "Tóm tắt thất bại" với retry button |
| R5 | FTS query chậm với 10K+ documents | Low | Index đã có GIN, partition theo scope nếu cần |
| R6 | Multer memory overflow với file lớn (>50MB) | Medium | Giới hạn file size 20MB, presigned URL upload trực tiếp MinIO |
| R7 | PDF export mất formatting | Low | Test nhiều content type, fallback về DOCX |
| R8 | RBAC matrix phức tạp dễ sai | High | Viết test matrix 5×4=20 cases trước, dùng helper function `assertAccess()` |
| R9 | Auto-meeting doc fail lặng lẽ | Medium | Logging, retry queue, manual button "Tạo biên bản" |
| R10 | Versioning tăng DB size nhanh | Low | Chỉ lưu version khi content thay đổi, soft-delete version cũ sau 90 ngày |

---

## 11. THỨ TỰ TRIỂN KHAI & TIMELINE

### 11.1. Sequence (7 phases)

| Phase | Nội dung | Effort | Phụ thuộc |
|-------|----------|--------|-----------|
| 1 | Schema + MinIO Docker + setup | 2h | (không) |
| 2 | Backend Core (CRUD + Versioning + FTS + RBAC) | 4h | Phase 1 |
| 3 | Backend Attachments (MinIO + presigned URL) | 3h | Phase 1 |
| 4 | Backend Auto-doc (U1 task req, U4 meeting minutes) | 3h | Phase 2 |
| 5 | Frontend Tiptap Editor + Pages (CRUD + Search) | 6h | Phase 2, 3 |
| 6 | Frontend Real-time + Templates + Export | 4h | Phase 5 |
| 7 | AI Summary + Tests + Polish | 4h | All |

**TỔNG: ~28h (7 ngày làm việc)**

### 11.2. Sprint đề xuất

- **Sprint 1 (3 ngày)**: Phase 1, 2, 3, 4 — Backend hoàn chỉnh
- **Sprint 2 (3 ngày)**: Phase 5, 6 — Frontend
- **Sprint 3 (1 ngày)**: Phase 7 — AI + Tests

---

## 12. ACCEPTANCE CRITERIA TOÀN BỘ M6

### 12.1. Core (Bắt buộc)
- [ ] 14+ REST endpoints hoạt động đúng
- [ ] Tiptap editor load & save thành công
- [ ] Versioning: mỗi lần save lưu DocumentVersion, restore được về version cũ
- [ ] RBAC matrix 5×4 đúng cho mọi scope
- [ ] Full-text search trả về ranked results
- [ ] MinIO upload/download file thành công (PDF, ảnh, .docx, .xlsx, .zip)
- [ ] Real-time collab: 2 user edit cùng lúc thấy nội dung cập nhật < 1s
- [ ] Tags & filter hoạt động
- [ ] Recent Documents Widget ở Dashboard

### 12.2. Templates
- [ ] 3 system templates: Meeting Minutes, Project Proposal, Weekly Report
- [ ] Custom template (Admin/PM tạo được)
- [ ] Apply template → sinh doc mới với content từ template

### 12.3. Export
- [ ] Export PDF: layout đúng, giữ formatting cơ bản
- [ ] Export DOCX: editable trong MS Word

### 12.4. AI Summary
- [ ] Click "Tạo AI Summary" → sinh summary 3-5 đoạn bằng Gemini
- [ ] Cache summary, không gọi lại Gemini nếu đã có
- [ ] Error handling: nếu API fail, hiển thị retry button

### 12.5. U1 (Task Requirement)
- [ ] PM tạo tài liệu yêu cầu trong task
- [ ] Assignee xem được trong TaskDetailModal
- [ ] Sau task DONE, tài liệu vẫn ở Project Documents, có badge

### 12.6. U2 (Task Submission)
- [ ] Assignee upload file khi task DONE
- [ ] Files lưu MinIO, link với task
- [ ] PM nhận notification, xem/download được

### 12.7. U4 (Meeting Minutes Auto)
- [ ] Khi meeting COMPLETED, auto sinh Document
- [ ] Linked với meeting, attendees có quyền xem
- [ ] AI Summary auto-generate (background)

### 12.8. U5 (Company Documents)
- [ ] Admin CRUD tại `/admin/documents`
- [ ] Mọi role xem được tại `/documents/company`
- [ ] Versioning cho quy chế

### 12.9. Kỹ thuật
- [ ] Zero `any` (ts-strict-engineering)
- [ ] Zod validation cho mọi input
- [ ] Build xanh backend & frontend
- [ ] ≥ 52 backend tests + 15 frontend tests pass
- [ ] Vietnamese comments cho file mới
- [ ] WebSocket gateway handle 100+ concurrent users

---

## 13. LIÊN KẾT

- **Plan M3.5 (liên quan - Tasks):** `docs/M3.5-SPRINT-PROJECT-WORKFLOW-PLAN.md`
- **Plan M5 (liên quan - Meetings):** `.agents/memory/PLAN-2026-10-14-M5-MEETINGS.md`
- **Roadmap tổng:** `docs/00-MASTER-ROADMAP.md`
- **Tiến độ:** `docs/99-PROGRESS-LOG.md`
- **Active context:** `.agents/memory/ACTIVE_CONTEXT.md`
- **Database Schema (hiện có Document model):** `docs/03-DATABASE.md` (line 27-31)
- **Tech Stack:** `docs/05-TECH-STACK.md`

---

**KẾT THÚC PLAN M6**

> Khi triển khai, AI khác chỉ cần đọc file này + theo dõi section "Acceptance Criteria" để verify.
> Tất cả code M6 **CHƯA ĐƯỢC VIẾT** — chỉ có plan chi tiết để triển khai.
