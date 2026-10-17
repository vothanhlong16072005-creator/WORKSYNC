export type DocumentScope = 'PERSONAL' | 'PROJECT' | 'DEPARTMENT' | 'COMPANY';

export type DocumentType =
  | 'STANDARD'
  | 'TASK_REQUIREMENT'
  | 'TASK_SUBMISSION'
  | 'MEETING_MINUTES'
  | 'COMPANY_POLICY'
  | 'TEMPLATE';

export interface DocumentUser {
  id: string;
  name: string;
  avatar?: string | null;
  email?: string;
}

export interface DocumentAttachment {
  id: string;
  documentId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  minioKey: string;
  minioBucket: string;
  uploadedById: string;
  uploadedBy?: DocumentUser;
  createdAt: string;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  title: string;
  content: unknown;
  contentText: string;
  changeNote?: string | null;
  savedById: string;
  savedBy?: DocumentUser;
  createdAt: string;
}

export interface DocumentPermission {
  id: string;
  documentId: string;
  userId: string;
  user?: DocumentUser;
  canEdit: boolean;
  canComment: boolean;
  canShare: boolean;
  grantedById: string;
  grantedBy?: DocumentUser;
  createdAt: string;
}

export interface DocumentTemplate {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  content: unknown;
  scope: DocumentScope;
  isSystem: boolean;
  createdById: string;
  createdBy?: DocumentUser;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentItem {
  id: string;
  title: string;
  content: unknown;
  contentText: string;
  scope: DocumentScope;
  type: DocumentType;
  ownerId: string;
  owner: DocumentUser;
  projectId?: string | null;
  project?: { id: string; name: string; color: string; pmId?: string | null } | null;
  departmentId?: string | null;
  department?: { id: string; name: string } | null;
  linkedTaskId?: string | null;
  linkedTask?: { id: string; title: string; status: string; assigneeId?: string | null } | null;
  linkedMeetingId?: string | null;
  linkedMeeting?: { id: string; title: string; startTime: string } | null;
  aiSummary?: string | null;
  templateKey?: string | null;
  parentId?: string | null;
  tags: string[];
  currentVersion: number;
  viewCount: number;
  lastViewedAt?: string | null;
  canEdit?: boolean;
  canDelete?: boolean;
  attachments?: DocumentAttachment[];
  permissions?: DocumentPermission[];
  versions?: DocumentVersion[];
  _count?: {
    versions: number;
    attachments: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DocumentSearchResult {
  id: string;
  title: string;
  scope: DocumentScope;
  type: DocumentType;
  snippet: string;
  tags: string[];
  owner: DocumentUser;
  project?: { id: string; name: string; color: string } | null;
  department?: { id: string; name: string } | null;
  currentVersion: number;
  viewCount: number;
  updatedAt: string;
  attachmentsCount: number;
  versionsCount: number;
}

export interface CollaboratorInfo {
  userId: string;
  name: string;
  avatar?: string | null;
  socketId: string;
}
