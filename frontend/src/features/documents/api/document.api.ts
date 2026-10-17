import { apiClient } from '@/lib/api-client';
import type {
  DocumentItem,
  DocumentScope,
  DocumentType,
  DocumentVersion,
  DocumentAttachment,
  DocumentPermission,
  DocumentTemplate,
  DocumentSearchResult,
} from '../types/document.types';

export interface DocumentQueryParams {
  scope?: DocumentScope;
  type?: DocumentType;
  projectId?: string;
  departmentId?: string;
  linkedTaskId?: string;
  linkedMeetingId?: string;
  search?: string;
  tag?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DocumentListResponse {
  items: DocumentItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const documentApi = {
  async fetchDocuments(params?: DocumentQueryParams): Promise<DocumentListResponse> {
    const res = await apiClient.get<DocumentListResponse>('/documents', { params });
    return res.data;
  },

  async fetchRecentDocuments(limit: number = 10): Promise<DocumentListResponse> {
    const res = await apiClient.get<DocumentListResponse>('/documents/recent', { params: { limit } });
    return res.data;
  },

  async fetchCompanyDocuments(): Promise<DocumentListResponse> {
    const res = await apiClient.get<DocumentListResponse>('/documents/company');
    return res.data;
  },

  async fetchProjectDocuments(projectId: string): Promise<DocumentListResponse> {
    const res = await apiClient.get<DocumentListResponse>(`/documents/project/${projectId}`);
    return res.data;
  },

  async fetchTaskDocuments(taskId: string): Promise<DocumentListResponse> {
    const res = await apiClient.get<DocumentListResponse>(`/documents/task/${taskId}`);
    return res.data;
  },

  async fetchMeetingDocuments(meetingId: string): Promise<DocumentListResponse> {
    const res = await apiClient.get<DocumentListResponse>(`/documents/meeting/${meetingId}`);
    return res.data;
  },

  async searchDocuments(params: {
    q: string;
    scope?: DocumentScope;
    projectId?: string;
    departmentId?: string;
    tag?: string;
    limit?: number;
  }): Promise<DocumentSearchResult[]> {
    const res = await apiClient.get<DocumentSearchResult[]>('/documents/search/fulltext', { params });
    return res.data;
  },

  async fetchDocumentById(id: string): Promise<DocumentItem> {
    const res = await apiClient.get<DocumentItem>(`/documents/${id}`);
    return res.data;
  },

  async createDocument(data: {
    title: string;
    content?: unknown;
    contentText?: string;
    scope?: DocumentScope;
    type?: DocumentType;
    projectId?: string | null;
    departmentId?: string | null;
    linkedTaskId?: string | null;
    linkedMeetingId?: string | null;
    templateKey?: string | null;
    parentId?: string | null;
    tags?: string[];
  }): Promise<DocumentItem> {
    const res = await apiClient.post<DocumentItem>('/documents', data);
    return res.data;
  },

  async updateDocument(
    id: string,
    data: {
      title?: string;
      content?: unknown;
      contentText?: string;
      scope?: DocumentScope;
      type?: DocumentType;
      projectId?: string | null;
      departmentId?: string | null;
      tags?: string[];
      changeNote?: string | null;
      saveVersion?: boolean;
    },
  ): Promise<DocumentItem> {
    const res = await apiClient.patch<DocumentItem>(`/documents/${id}`, data);
    return res.data;
  },

  async deleteDocument(id: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/documents/${id}`);
    return res.data;
  },

  async fetchVersions(id: string): Promise<DocumentVersion[]> {
    const res = await apiClient.get<DocumentVersion[]>(`/documents/${id}/versions`);
    return res.data;
  },

  async fetchVersion(id: string, version: number): Promise<DocumentVersion> {
    const res = await apiClient.get<DocumentVersion>(`/documents/${id}/versions/${version}`);
    return res.data;
  },

  async restoreVersion(id: string, version: number): Promise<DocumentItem> {
    const res = await apiClient.post<DocumentItem>(`/documents/${id}/versions/${version}/restore`);
    return res.data;
  },

  async fetchTemplates(): Promise<DocumentTemplate[]> {
    const res = await apiClient.get<DocumentTemplate[]>('/documents/templates/all');
    return res.data;
  },

  async createFromTemplate(data: {
    templateKey: string;
    title: string;
    scope: DocumentScope;
    projectId?: string | null;
    departmentId?: string | null;
    linkedTaskId?: string | null;
  }): Promise<DocumentItem> {
    const res = await apiClient.post<DocumentItem>('/documents/from-template', data);
    return res.data;
  },

  async submitTaskDeliverable(data: {
    taskId: string;
    title: string;
    note?: string;
    content?: unknown;
    tags?: string[];
  }): Promise<DocumentItem> {
    const res = await apiClient.post<DocumentItem>('/documents/task/submit', data);
    return res.data;
  },

  async uploadAttachment(documentId: string, file: File): Promise<DocumentAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<DocumentAttachment>(`/documents/${documentId}/attachments`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  async fetchAttachments(documentId: string): Promise<DocumentAttachment[]> {
    const res = await apiClient.get<DocumentAttachment[]>(`/documents/${documentId}/attachments`);
    return res.data;
  },

  async downloadAttachment(attId: string, fileName: string): Promise<void> {
    const res = await apiClient.get(`/documents/attachments/${attId}/download`, {
      responseType: 'blob',
    });
    const contentType = res.headers['content-type'] || 'application/octet-stream';
    const blob = new Blob([res.data], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    }, 200);
  },

  async previewAttachment(attId: string, fileName?: string): Promise<void> {
    const res = await apiClient.get(`/documents/attachments/${attId}/download`, {
      responseType: 'blob',
    });
    const contentType = res.headers['content-type'] || (fileName?.endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
    const blob = new Blob([res.data], { type: contentType });
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
    }, 60000);
  },

  async deleteAttachment(attId: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/documents/attachments/${attId}`);
    return res.data;
  },

  async generateAiSummary(id: string): Promise<{ summary: string; keyPoints: string[] }> {
    const res = await apiClient.post<{ summary: string; keyPoints: string[] }>(`/documents/${id}/ai-summary`);
    return res.data;
  },

  async exportPdf(id: string, fileName: string): Promise<void> {
    const res = await apiClient.get(`/documents/${id}/export/pdf`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  },

  async exportDocx(id: string, fileName: string): Promise<void> {
    const res = await apiClient.get(`/documents/${id}/export/docx`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(
      new Blob([res.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      }),
    );
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName.endsWith('.docx') ? fileName : `${fileName}.docx`);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
  },

  async shareDocument(id: string, data: { userId: string; canEdit: boolean; canComment: boolean }): Promise<DocumentPermission> {
    const res = await apiClient.post<DocumentPermission>(`/documents/${id}/share`, data);
    return res.data;
  },

  async unshareDocument(id: string, userId: string): Promise<{ success: boolean; message: string }> {
    const res = await apiClient.delete<{ success: boolean; message: string }>(`/documents/${id}/share/${userId}`);
    return res.data;
  },

  async fetchShares(id: string): Promise<DocumentPermission[]> {
    const res = await apiClient.get<DocumentPermission[]>(`/documents/${id}/share`);
    return res.data;
  },
};
