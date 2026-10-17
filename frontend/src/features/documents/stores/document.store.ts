import { create } from 'zustand';
import { documentApi, type DocumentQueryParams } from '../api/document.api';
import type {
  DocumentItem,
  DocumentScope,
  DocumentType,
  DocumentVersion,
  DocumentAttachment,
  DocumentTemplate,
  DocumentSearchResult,
  CollaboratorInfo,
} from '../types/document.types';

interface DocumentState {
  documents: DocumentItem[];
  recentDocuments: DocumentItem[];
  companyDocuments: DocumentItem[];
  activeDocument: DocumentItem | null;
  templates: DocumentTemplate[];
  versions: DocumentVersion[];
  attachments: DocumentAttachment[];
  collaborators: CollaboratorInfo[];
  searchResults: DocumentSearchResult[];
  isLoading: boolean;
  isSaving: boolean;
  filterScope: DocumentScope | 'ALL';
  filterType: DocumentType | 'ALL';
  searchQuery: string;
  total: number;
  page: number;
  totalPages: number;

  setFilterScope: (scope: DocumentScope | 'ALL') => void;
  setFilterType: (type: DocumentType | 'ALL') => void;
  setSearchQuery: (query: string) => void;
  setCollaborators: (collaborators: CollaboratorInfo[]) => void;
  setActiveDocument: (doc: DocumentItem | null) => void;

  fetchDocuments: (params?: DocumentQueryParams) => Promise<void>;
  fetchRecent: (limit?: number) => Promise<void>;
  fetchCompanyDocuments: () => Promise<void>;
  fetchDocumentById: (id: string) => Promise<DocumentItem>;
  createDocument: (data: Parameters<typeof documentApi.createDocument>[0]) => Promise<DocumentItem>;
  updateDocument: (id: string, data: Parameters<typeof documentApi.updateDocument>[1]) => Promise<DocumentItem>;
  deleteDocument: (id: string) => Promise<void>;
  fetchVersions: (id: string) => Promise<void>;
  restoreVersion: (id: string, version: number) => Promise<void>;
  fetchTemplates: () => Promise<void>;
  createFromTemplate: (data: Parameters<typeof documentApi.createFromTemplate>[0]) => Promise<DocumentItem>;
  uploadAttachment: (documentId: string, file: File) => Promise<DocumentAttachment>;
  deleteAttachment: (attId: string) => Promise<void>;
  searchDocuments: (q: string) => Promise<void>;
}

export const useDocumentStore = create<DocumentState>((set, get) => ({
  documents: [],
  recentDocuments: [],
  companyDocuments: [],
  activeDocument: null,
  templates: [],
  versions: [],
  attachments: [],
  collaborators: [],
  searchResults: [],
  isLoading: false,
  isSaving: false,
  filterScope: 'ALL',
  filterType: 'ALL',
  searchQuery: '',
  total: 0,
  page: 1,
  totalPages: 1,

  setFilterScope: (filterScope) => set({ filterScope }),
  setFilterType: (filterType) => set({ filterType }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setCollaborators: (collaborators) => set({ collaborators }),
  setActiveDocument: (activeDocument) => set({ activeDocument }),

  fetchDocuments: async (params) => {
    set({ isLoading: true });
    try {
      const scopeFilter = get().filterScope !== 'ALL' ? (get().filterScope as DocumentScope) : undefined;
      const typeFilter = get().filterType !== 'ALL' ? (get().filterType as DocumentType) : undefined;
      const searchFilter = get().searchQuery.trim() || undefined;

      const res = await documentApi.fetchDocuments({
        scope: scopeFilter,
        type: typeFilter,
        search: searchFilter,
        ...params,
      });

      set({
        documents: res.items,
        total: res.total,
        page: res.page,
        totalPages: res.totalPages,
        isLoading: false,
      });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  fetchRecent: async (limit = 10) => {
    try {
      const res = await documentApi.fetchRecentDocuments(limit);
      set({ recentDocuments: res.items });
    } catch {
      // non-blocking
    }
  },

  fetchCompanyDocuments: async () => {
    set({ isLoading: true });
    try {
      const res = await documentApi.fetchCompanyDocuments();
      set({ companyDocuments: res.items, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  fetchDocumentById: async (id: string) => {
    set({ isLoading: true });
    try {
      const doc = await documentApi.fetchDocumentById(id);
      set({
        activeDocument: doc,
        attachments: doc.attachments || [],
        versions: doc.versions || [],
        isLoading: false,
      });
      return doc;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  createDocument: async (data) => {
    set({ isSaving: true });
    try {
      const doc = await documentApi.createDocument(data);
      set((state) => ({
        documents: [doc, ...state.documents],
        isSaving: false,
      }));
      return doc;
    } catch (err) {
      set({ isSaving: false });
      throw err;
    }
  },

  updateDocument: async (id, data) => {
    set({ isSaving: true });
    try {
      const updated = await documentApi.updateDocument(id, data);
      set((state) => ({
        activeDocument: state.activeDocument?.id === id ? { ...state.activeDocument, ...updated } : state.activeDocument,
        documents: state.documents.map((d) => (d.id === id ? { ...d, ...updated } : d)),
        isSaving: false,
      }));
      return updated;
    } catch (err) {
      set({ isSaving: false });
      throw err;
    }
  },

  deleteDocument: async (id) => {
    await documentApi.deleteDocument(id);
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
      companyDocuments: state.companyDocuments.filter((d) => d.id !== id),
      recentDocuments: state.recentDocuments.filter((d) => d.id !== id),
      activeDocument: state.activeDocument?.id === id ? null : state.activeDocument,
    }));
  },

  fetchVersions: async (id) => {
    const versions = await documentApi.fetchVersions(id);
    set({ versions });
  },

  restoreVersion: async (id, version) => {
    set({ isSaving: true });
    try {
      const doc = await documentApi.restoreVersion(id, version);
      set((state) => ({
        activeDocument: doc,
        documents: state.documents.map((d) => (d.id === id ? doc : d)),
        isSaving: false,
      }));
    } catch (err) {
      set({ isSaving: false });
      throw err;
    }
  },

  fetchTemplates: async () => {
    try {
      const templates = await documentApi.fetchTemplates();
      set({ templates });
    } catch {
      // non-blocking
    }
  },

  createFromTemplate: async (data) => {
    set({ isSaving: true });
    try {
      const doc = await documentApi.createFromTemplate(data);
      set((state) => ({
        documents: [doc, ...state.documents],
        isSaving: false,
      }));
      return doc;
    } catch (err) {
      set({ isSaving: false });
      throw err;
    }
  },

  uploadAttachment: async (documentId, file) => {
    const attachment = await documentApi.uploadAttachment(documentId, file);
    set((state) => ({
      attachments: [attachment, ...state.attachments],
    }));
    return attachment;
  },

  deleteAttachment: async (attId) => {
    await documentApi.deleteAttachment(attId);
    set((state) => ({
      attachments: state.attachments.filter((a) => a.id !== attId),
    }));
  },

  searchDocuments: async (q) => {
    if (!q.trim()) {
      set({ searchResults: [] });
      return;
    }
    const results = await documentApi.searchDocuments({ q: q.trim() });
    set({ searchResults: results });
  },
}));
