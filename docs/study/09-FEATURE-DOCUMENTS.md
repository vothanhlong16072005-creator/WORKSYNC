# 09 — Feature M6: Quản Lý Tài Liệu Doanh Nghiệp (DMS)

> **Module:** `backend/src/documents/` — 18 file
> **Frontend:** `frontend/src/features/documents/` — 14 file
> **Mô phỏng:** ClickUp Docs / Google Docs nhưng có phân quyền theo scope doanh nghiệp.

---

## 1. Bối Cảnh

Tài liệu dự án nằm rải rác: Google Docs (chia sẻ ngoài, không kiểm soát), file tải lên Drive (không liên kết task), biên bản họp trong file Word (không tìm kiếm được).

**Mục tiêu:** kho tài liệu có cấu trúc, liên kết trực tiếp với task/dự án/họp, phân quyền theo phạm vi, có lịch sử phiên bản, tìm kiếm toàn văn, tóm tắt AI.

---

## 2. 5 Loại Tài Liệu (Use Case)

```prisma
enum DocumentType {
  STANDARD           // ← tài liệu thường
  TASK_REQUIREMENT   // ← U1: Đặc tả yêu cầu công việc (gắn task)
  TASK_SUBMISSION    // ← U2: Báo cáo nghiệm thu / deliverables (gắn task)
  PROJECT            // ← Tài liệu thiết kế & kiến trúc dự án
  MEETING_MINUTES    // ← Biên bản họp, tự đồng bộ từ M5
  COMPANY_POLICY     // ← Quy chế, chính sách toàn công ty
  TEMPLATE           // ← Mẫu tài liệu
}
```

| Loại | Ai tạo | Gắn với | Ai đọc |
|------|---------|----------|--------|
| `TASK_REQUIREMENT` | PM, DEPT_HEAD | `linkedTaskId` | Thành viên dự án |
| `TASK_SUBMISSION` | Assignee của task | `linkedTaskId` | PM, DEPT_HEAD |
| `PROJECT` | PM | `projectId` | Thành viên dự án |
| `MEETING_MINUTES` | Host (auto từ AI) | `linkedMeetingId` | Attendees |
| `COMPANY_POLICY` | ADMIN | `scope=COMPANY` | **Tất cả** |

---

## 3. 4 Scope — Trục Phân Quyền

```prisma
enum DocumentScope { PERSONAL  PROJECT  DEPARTMENT  COMPANY }
```

```
COMPANY    ← ai cũng đọc được (quy chế công ty)
   ↑
DEPARTMENT ← phòng ban
   ↑
PROJECT    ← dự án (thành viên mới đọc được)
   ↑
PERSONAL   ← bản nhân
```

**Quy tắc:** mỗi scope có **bộ quyền riêng**, quyền được **kế thừa theo phạm vi hẹp hơn**.

---

## 4. `DocumentsAccessService` — Trái Tim Phân Quyền

### 4.1 Kiểm tra tạo tài liệu

```typescript
async canCreateDocument(
  actor: CurrentActor,
  scope: DocumentScope,
  type: DocumentType,
  projectId?: string | null,
  departmentId?: string | null,
  linkedTaskId?: string | null,
): Promise<boolean> {
  if (actor.role === Role.ADMIN) return true;         // ★ Admin bypass

  // ★ U2: Task submission — assignee của task được nộp
  if (type === DocumentType.TASK_SUBMISSION && linkedTaskId) {
    const task = await this.prisma.task.findUnique({
      where: { id: linkedTaskId },
      select: { id: true, assigneeId: true, deletedAt: true },
    });
    if (!task || task.deletedAt) return false;
    return task.assigneeId === actor.id
        || actor.role === Role.PM
        || actor.role === Role.DEPARTMENT_HEAD;
  }

  switch (scope) {
    case DocumentScope.COMPANY:
      return false;                                   // chỉ Admin (đã xử lý ở trên)

    case DocumentScope.DEPARTMENT:
      if (actor.role === Role.DEPARTMENT_HEAD) {
        if (!departmentId) return true;
        return actor.departmentId === departmentId;    // ★ chỉ phòng ban của mình
      }
      return false;

    case DocumentScope.PROJECT:
      if (!projectId) return false;
      return this.canManageProjectDocuments(actor, projectId);

    case DocumentScope.PERSONAL:
      return true;                                    // ai cũng tạo được tài liệu cá nhân

    default:
      return false;
  }
}
```

**Điểm hay:** `TASK_SUBMISSION` được xử lý **trước** `switch` vì quyền của nó phụ thuộc `linkedTaskId` chứ không phụ thuộc `scope`.

### 4.2 Kiểm tra xem tài liệu

```typescript
async canViewDocument(document: Document, actor: CurrentActor): Promise<boolean> {
  if (actor.role === Role.ADMIN) return true;
  if (document.deletedAt) return false;

  // ① Owner / Creator luôn có quyền
  if (document.ownerId === actor.id || document.createdById === actor.id) return true;

  // ② Quyền được cấp trực tiếp
  const permission = await this.prisma.documentPermission.findUnique({
    where: { documentId_userId: { documentId: document.id, userId: actor.id } },
  });
  if (permission) return true;

  // ③ Tài liệu công ty — ai cũng đọc được
  if (document.scope === DocumentScope.COMPANY) return true;

  // ④ Theo scope: phòng ban / dự án
  // ...
}
```

**Thứ tự kiểm tra** từ cụ thể → tổng quát: owner → permission riêng → company → theo scope.

### 4.3 `DocumentPermission` — Quyền chi tiết từng user

```prisma
model DocumentPermission {
  documentId String
  userId     String
  canEdit    Boolean @default(false)
  canComment Boolean @default(true)
  canShare   Boolean @default(false)
  grantedById String
  @@unique([documentId, userId])
}
```

**3 quyền tách biệt** thay vì 1 cờ `canEdit`:
- `canEdit` — sửa nội dung
- `canComment` — bình luận (mặc định true)
- `canShare` — chia sẻ tiếp

VD: nhân viên được mời review tài liệu → `canEdit=false, canComment=true` → góp ý mà không sửa được.

---

## 5. Rich-Text Editor — Tiptap

### 5.1 Vì sao Tiptap?

| Lựa chọn | Đánh giá |
|----------|----------|
| `contenteditable` thuần | Không có API, không quản lý document model, không có extension |
| **Tiptap** | ★ Dựa trên ProseMirror — mạnh, mở rộng, có TypeScript types |
| Slate | Mạnh nhưng learning curve cao |
| Quill | Cũ, không hỗ trợ React tốt |

### 5.2 Extensions Đã Dùng

```typescript
// frontend/src/features/documents/components/editor/TiptapEditor.tsx
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import TextAlign from '@tiptap/extension-text-align';
```

| Extension | Chức năng |
|-----------|------------|
| `StarterKit` | Bold, italic, heading, list, blockquote, code... |
| `Image` | Chèn ảnh |
| `Link` | Liên kết ngoài |
| `Placeholder` | Text placeholder khi editor rỗng |
| `Table` + 3 phần | Bảng (header, row, cell) |
| `TextAlign` | Căn trái/giữa/phải/justify |

**Toolbar** (`EditorToolbar.tsx`) là custom component gọi `editor.chain().focus().toggleBold().run()`.

### 5.3 Lưu 2 Dạng: JSON + Plain Text

```typescript
// documents.service.ts
export function extractTextFromTiptap(node: unknown): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  const obj = node as { text?: string; content?: unknown[] };
  if (obj.text) return obj.text;
  if (Array.isArray(obj.content)) {
    return obj.content.map(extractTextFromTiptap).filter(Boolean).join(' ');
  }
  return '';
}
```

```typescript
const plainText = dto.contentText?.trim() || extractTextFromTiptap(dto.content);

const doc = await this.prisma.document.create({
  data: {
    content: (dto.content ?? { type: 'doc', content: [] }) as Prisma.InputJsonValue,  // ← JSON
    contentText: plainText,                                                          // ← Text
    // ...
  },
});
```

**Tại sao lưu cả 2?**

| Cột | Dùng cho | Lý do |
|-----|----------|-------|
| `content Json` | Render lại tài liệu | Giữ cấu trúc (bold, table, image) |
| `contentText String @db.Text` | **Tìm kiếm toàn văn** | JSONB không index text tốt bằng text thuần |

**`extractTextFromTiptap`** là hàm đệ quy duyệt cây Tiptap → gom mọi node có `text`.

---

## 6. Versioning — Lịch Sử Phiên Bản

### 6.1 Cấu trúc

```prisma
model DocumentVersion {
  documentId  String
  version     Int
  title       String
  content     Json
  contentText String   @db.Text
  changeNote  String?
  savedById   String
  createdAt   DateTime @default(now())
  @@unique([documentId, version])
}
```

### 6.2 Tạo phiên bản mới

```typescript
// documents.service.ts — update()
const newVersion = (document.currentVersion || 1) + 1;

await this.prisma.$transaction([
  this.prisma.document.update({
    where: { id },
    data: {
      title: dto.title,
      content: dto.content,
      contentText: plainText,
      currentVersion: newVersion,       // ← tăng counter
      updatedById: actor.id,
    },
  }),
  this.prisma.documentVersion.create({
    data: {
      documentId: id,
      version: newVersion,
      title: dto.title,
      content: dto.content,
      contentText: plainText,
      changeNote: dto.changeNote || 'Cập nhật nội dung',
      savedById: actor.id,
    },
  }),
]);
```

**Transaction bắt buộc:** document và version phải đồng bộ. Nếu update document xong nhưng version lỗi → `currentVersion` sai → khôi phục phiên bản cũ bị lệch.

### 6.3 Khôi phục phiên bản cũ

```
DocumentVersionHistoryModal.tsx
  ↓ chọn version
  ↓ khôi phục
  → TẠO PHIÊN BẢN MỚI với nội dung cũ  (không xóa lịch sử)
  → currentVersion++
```

> **Quyết định quan trọng:** khôi phục **không ghi đè** lịch sử, mà tạo phiên bản mới. Lịch sử phải **append-only** — đây là nguyên tắc audit trail.

### 6.4 Tự tạo version 1

```typescript
versions: {
  create: {
    version: 1,
    title: dto.title,
    content: dto.content,
    contentText: plainText,
    changeNote: 'Khởi tạo tài liệu',
    savedById: actor.id,
  },
},
```

→ Mỗi document **luôn có ít nhất 1 phiên bản**, không có "tài liệu không có lịch sử".

---

## 7. Cây Tài Liệu — Folder Hierarchy

```prisma
model Document {
  parentId  String?
  parent    Document?  @relation("DocumentTree", fields: [parentId], references: [id])
  children  Document[] @relation("DocumentTree")
}
```

**Self-relation 2 chiều** — như `Task.parentTaskId`. Cho phép:
```
Quy chế công ty (COMPANY)
├── Nhân sự
│   ├── Chính sách nghỉ phép
│   └── Quy trình onboarding
└── Bảo mật
    └── Quy chế bảo mật thông tin
```

---

## 8. Đính Kèm File 25MB

### 8.1 Upload

```typescript
// documents.controller.ts
@Post(':id/attachments')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
async uploadAttachment(
  @Param('id') documentId: string,
  @UploadedFile() file: Express.Multer.File,
  @CurrentUser() user: any,
) {
  return this.attachmentsService.upload(documentId, file, user);
}
```

### 8.2 Lưu trữ

```prisma
model DocumentAttachment {
  fileName      String
  fileSize      Int      // bytes
  mimeType      String
  minioKey      String   // ← path trong MinIO/S3
  minioBucket   String   @default("worksync-documents")
  uploadedById  String
}
```

**Dùng `minioKey` (không phải `storagePath`)** → tương thích S3-compatible. Đổi từ local FS sang MinIO/S3 chỉ cần đổi adapter, không đổi schema.

**Giới hạn 25MB** enforce 2 tầng:
1. `Multer` `limits.fileSize` → chặn ở tầng upload
2. Kiểm tra `mimeType` → chặn file không an toàn

---

## 9. Tìm Kiếm Toàn Văn

```typescript
// document-search.service.ts
const where: Prisma.DocumentWhereInput = {
  deletedAt: null,
  ...(trimmedSearch ? {
    OR: [
      { title: { contains: trimmedSearch, mode: 'insensitive' } },
      { contentText: { contains: trimmedSearch, mode: 'insensitive' } },
    ],
  } : {}),
  // ...filter scope, type, project...
};
```

**Tìm trên `contentText`** (đã flatten) → đơn giản, nhanh, hỗ trợ tiếng Việt (Postgres `ILIKE`).

**Postgres full-text search** (`tsvector`) sẽ nhanh hơn cho dữ liệu lớn nhưng cần cấu hình thêm. Đây là hướng mở rộng.

---

## 10. AI Tóm Tắt Tài Liệu

```typescript
// document-ai.service.ts
async summarize(documentId: string, actor: CurrentActor) {
  const document = await this.prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, title: true, contentText: true },
  });

  // Gọi Gemini với contentText
  const summary = await this.callGemini(document.contentText);

  await this.prisma.document.update({
    where: { id: documentId },
    data: { aiSummary: summary },
  });

  return summary;
}
```

**Cùng pattern với M5.1** — cùng thư viện `@google/generative-ai`, cùng cơ chế fallback.

**Lưu `aiSummary` vào DB** (không chỉ trả về) → hiển thị được luôn trong card, không phải gọi API mỗi lần mở tài liệu.

---

## 11. Template — Mẫu Tài Liệu

```prisma
model DocumentTemplate {
  templateKey String   // 'meeting_minutes', 'project_proposal', ...
  // ...
}
```

```typescript
// document-templates.service.ts — 316 dòng
// Tạo tài liệu từ template:
// 1. Lấy template theo templateKey
// 2. Copy nội dung + thay placeholder {{title}}, {{project}}, {{date}}
// 3. Tạo Document mới với version 1
```

**Template dùng cho:** biên bản họp, đề xuất dự án, biên bản nghiệm thu, đơn từ.

---

## 12. Endpoint Chính

```
POST   /api/documents                          ALL (giới hạn theo scope)
GET    /api/documents                          ALL (lọc theo scope của user)
GET    /api/documents/:id                      ALL (check canViewDocument)
PATCH  /api/documents/:id                      Owner, Editor
DELETE /api/documents/:id                      Owner, ADMIN      ← soft delete
POST   /api/documents/:id/attachments          Owner, PM         ← 25MB
GET    /api/documents/:id/versions             ALL
POST   /api/documents/:id/versions/:v/restore  Owner, ADMIN
GET    /api/documents/search/fulltext          ALL
POST   /api/documents/:id/ai-summary           ALL
POST   /api/documents/share                    Owner (có canShare)
POST   /api/documents/from-template            ALL
POST   /api/documents/submit-deliverable       Assignee của task
```

---

## 13. Frontend — 3 Trang

| Route | Page | Mô tả |
|-------|------|------|
| `/documents` | `DocumentListPage.tsx` | Danh sách + filter theo scope/type + tìm kiếm |
| `/documents/:id` | `DocumentEditorPage.tsx` | Tiptap editor + panel version + attachment |
| `/documents/company` | `CompanyDocumentsPage.tsx` | Kho quy chế công ty (chỉ ADMIN quản lý) |

**Component:**
- `DocumentCard.tsx` — card hiển thị (icon theo type, badge scope, AI summary preview)
- `DocumentVersionHistoryModal.tsx` — danh sách version + nút khôi phục
- `DocumentAttachmentPanel.tsx` — upload/download
- `DocumentAiSummaryModal.tsx` — hiển thị tóm tắt AI
- `DocumentTemplatePickerModal.tsx` — chọn template khi tạo

---

## 14. Câu Hỏi Thường Gặp

**Q: Vì sao dùng `DocumentScope` + `DocumentType` cùng lúc?**
> **Scope** = "ai được đọc" (phân quyền). **Type** = "tài liệu này dùng để làm gì" (nghiệp vụ). Chúng độc lập: một tài liệu `PERSONAL` có thể có type `TASK_REQUIREMENT`; tài liệu `COMPANY` có type `COMPANY_POLICY`. Tách 2 chiều này giúp lọc linh hoạt ("tôi muốn xem tất cả tài liệu đặc tả của dự án X" = scope=PROJECT + type=TASK_REQUIREMENT).

**Q: Vì sao lưu cả `content` (JSON) và `contentText` (Text)?**
> `content` giữ cấu trúc rich-text để render lại chính xác. `contentText` là bản flatten để **tìm kiếm** — tìm trong JSONB kém hiệu quả hơn nhiều và phức tạp hơn. 2 cột tốn vài KB nhưng giúp tìm kiếm nhanh & đơn giản.

**Q: Khôi phục phiên bản cũ có làm mất lịch sử không?**
> Không — khôi phục **tạo phiên bản mới** chứa nội dung cũ, `currentVersion` tăng. Lịch sử là **append-only**, đúng nguyên tắc audit trail: luôn biết được những gì đã thay đổi.

**Q: Ai tạo được tài liệu công ty?**
> Chỉ `ADMIN` (`DocumentScope.COMPANY` → `return false` cho mọi role khác). Mọi người đều **đọc** được tài liệu công ty.

**Q: Deliverable nộp bởi ai?**
> `TASK_SUBMISSION` — assign của task, hoặc PM/DEPT_HEAD. Đây là nghiệp vụ "nhân viên nộp sản phẩm bàn giao" — nhân viên **không** tạo được tài liệu dự án, chỉ nộp được deliverable cho task được giao.

**Q: File 25MB lưu ở đâu?**
> `minioKey` trong bucket `worksync-documents` (MinIO là S3-compatible). Dùng key thay vì path cứng → có thể chuyển từ MinIO sang AWS S3 chỉ cần đổi config, không migrate schema.

**Q: Tìm kiếm tài liệu hoạt động thế nào?**
> `ILIKE` (case-insensitive) trên `title` và `contentText`. Với dữ liệu hiện tại (~vài nghìn tài liệu) là đủ nhanh. Khi scale lớn hơn → chuyển sang Postgres full-text search với `tsvector` + GIN index.

**Q: Tại sao có `ownerId` và `createdById` cùng lúc?**
> `ownerId` = người **sở hữu** (kế thừa khi share, có thể chuyển). `createdById` = người **tạo ra** (không đổi). Tách để vẫn biết ai là người khởi tạo sau khi quyền sở hữu được nhường.
