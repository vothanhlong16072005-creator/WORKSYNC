import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  LayoutTemplate,
  Building,
  FolderKanban,
  User,
  ShieldCheck,
  Loader2,
  Video,
} from 'lucide-react';
import { useDocumentStore } from '../stores/document.store';
import { DocumentCard } from '../components/DocumentCard';
import { DocumentTemplatePickerModal } from '../components/DocumentTemplatePickerModal';
import type { DocumentScope } from '../types/document.types';
import { toast } from 'sonner';

type ExtendedScope = DocumentScope | 'ALL' | 'MEETINGS';

export const DocumentListPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialScope = (searchParams.get('scope') as DocumentScope) || 'ALL';
  const initialTab = searchParams.get('tab') === 'meetings' ? 'MEETINGS' : initialScope;

  const [currentTab, setCurrentTab] = useState<ExtendedScope>(initialTab);

  const {
    documents,
    isLoading,
    total,
    page,
    totalPages,
    templates,
    filterScope,
    searchQuery,
    setFilterScope,
    setSearchQuery,
    fetchDocuments,
    fetchTemplates,
    createDocument,
    createFromTemplate,
  } = useDocumentStore();

  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (initialScope && initialScope !== filterScope) {
      setFilterScope(initialScope);
    }
    fetchTemplates();
  }, []);

  useEffect(() => {
    fetchDocuments();
  }, [filterScope]);

  const handleTabChange = (scope: ExtendedScope) => {
    setCurrentTab(scope);
    if (scope === 'MEETINGS') {
      setFilterScope('ALL');
      searchParams.set('tab', 'meetings');
    } else {
      setFilterScope(scope);
      searchParams.delete('tab');
      if (scope === 'ALL') {
        searchParams.delete('scope');
      } else {
        searchParams.set('scope', scope);
      }
    }
    setSearchParams(searchParams);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDocuments();
  };

  const handleCreateBlank = async () => {
    setIsCreating(true);
    try {
      const scope = filterScope !== 'ALL' ? filterScope : 'PERSONAL';
      const newDoc = await createDocument({
        title: 'Tài liệu không tên',
        scope,
        content: { type: 'doc', content: [] },
      });
      toast.success('Đã tạo tài liệu mới');
      navigate(`/documents/${newDoc.id}`);
    } catch {
      toast.error('Không thể tạo tài liệu mới');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCreateFromTemplate = async (templateKey: string, title: string, scope: DocumentScope) => {
    setIsCreating(true);
    try {
      const newDoc = await createFromTemplate({
        templateKey,
        title,
        scope,
      });
      toast.success('Đã khởi tạo tài liệu từ mẫu');
      navigate(`/documents/${newDoc.id}`);
    } catch {
      toast.error('Không thể khởi tạo tài liệu từ mẫu');
    } finally {
      setIsCreating(false);
    }
  };

  const tabs: { label: string; value: ExtendedScope; icon: React.ReactNode }[] = [
    { label: 'Tất cả', value: 'ALL', icon: <FileText className="w-4 h-4" /> },
    { label: 'Biên bản cuộc họp', value: 'MEETINGS', icon: <Video className="w-4 h-4 text-purple-600" /> },
    { label: 'Cá nhân', value: 'PERSONAL', icon: <User className="w-4 h-4" /> },
    { label: 'Dự án', value: 'PROJECT', icon: <FolderKanban className="w-4 h-4" /> },
    { label: 'Phòng ban', value: 'DEPARTMENT', icon: <ShieldCheck className="w-4 h-4" /> },
    { label: 'Công ty', value: 'COMPANY', icon: <Building className="w-4 h-4" /> },
  ];

  const displayedDocuments =
    currentTab === 'MEETINGS'
      ? documents.filter(
          (doc) => doc.templateKey === 'meeting_minutes' || doc.linkedMeetingId != null,
        )
      : documents;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-blue-600 text-white shadow-sm shadow-blue-500/20">
              <FileText className="w-6 h-6" />
            </div>
            Quản lý Tài liệu
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Trung tâm tài liệu doanh nghiệp: đặc tả kỹ thuật, bằng chứng nghiệm thu, biên bản họp và quy chế công ty.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsTemplateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all"
          >
            <LayoutTemplate className="w-4 h-4 text-blue-600" />
            Từ mẫu (Templates)
          </button>
          <button
            type="button"
            disabled={isCreating}
            onClick={handleCreateBlank}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 disabled:opacity-50 transition-all"
          >
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Tạo tài liệu mới
          </button>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        {/* Scope Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-850 rounded-2xl overflow-x-auto">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleTabChange(tab.value)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tiêu đề, nội dung, thẻ..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
        </form>
      </div>

      {/* Documents Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
          <p className="text-sm">Đang tải danh sách tài liệu...</p>
        </div>
      ) : displayedDocuments.length === 0 ? (
        <div className="text-center py-20 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
            Không tìm thấy tài liệu nào
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mb-5">
            {currentTab === 'MEETINGS'
              ? 'Chưa có biên bản cuộc họp nào được xuất sang trung tâm tài liệu.'
              : 'Bắt đầu tài liệu đầu tiên bằng cách chọn tạo mới hoặc khởi tạo nhanh từ các mẫu chuẩn có sẵn.'}
          </p>
          {currentTab !== 'MEETINGS' && (
            <button
              type="button"
              onClick={handleCreateBlank}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Tạo tài liệu đầu tiên
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {displayedDocuments.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      )}

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
          <span>Tổng số: {total} tài liệu</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => fetchDocuments({ page: page - 1 })}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
            >
              Trang trước
            </button>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => fetchDocuments({ page: page + 1 })}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40"
            >
              Trang sau
            </button>
          </div>
        </div>
      )}

      {/* Template Picker Modal */}
      <DocumentTemplatePickerModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
        templates={templates}
        onSelectTemplate={handleCreateFromTemplate}
        isCreating={isCreating}
      />
    </div>
  );
};
