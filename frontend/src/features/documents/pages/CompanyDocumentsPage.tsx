import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building, Plus, Search, ShieldCheck, Loader2 } from 'lucide-react';
import { useDocumentStore } from '../stores/document.store';
import { DocumentCard } from '../components/DocumentCard';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';

export const CompanyDocumentsPage: React.FC = () => {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'ADMIN';

  const {
    companyDocuments,
    isLoading,
    fetchCompanyDocuments,
    createDocument,
  } = useDocumentStore();

  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchCompanyDocuments();
  }, []);

  const handleCreatePolicy = async () => {
    if (!isAdmin) return;
    setIsCreating(true);
    try {
      const doc = await createDocument({
        title: 'Quy chế công ty mới',
        scope: 'COMPANY',
        type: 'COMPANY_POLICY',
        content: { type: 'doc', content: [] },
      });
      toast.success('Đã tạo tài liệu quy chế công ty mới');
      navigate(`/documents/${doc.id}`);
    } catch {
      toast.error('Không thể tạo quy chế công ty');
    } finally {
      setIsCreating(false);
    }
  };

  const filteredDocs = companyDocuments.filter(
    (d) =>
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.contentText.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <Building className="w-3.5 h-3.5" /> Toàn công ty (U5)
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Quy chế & Chính sách Công ty
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Tài liệu lưu trữ nội quy, quy chế làm việc, chính sách đãi ngộ áp dụng cho toàn thể nhân sự WorkSync.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            disabled={isCreating}
            onClick={handleCreatePolicy}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-500/20 disabled:opacity-50 transition-all shrink-0"
          >
            {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Thêm quy chế mới
          </button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Tìm kiếm quy chế, chính sách..."
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
        />
      </div>

      {/* Documents List */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-2" />
          <p className="text-sm">Đang tải tài liệu quy chế...</p>
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <ShieldCheck className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">
            Chưa có tài liệu quy chế nào
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {isAdmin
              ? 'Quản trị viên có thể nhấp nút "Thêm quy chế mới" để tạo nội quy đầu tiên.'
              : 'Hiện chưa có quy chế hoặc chính sách công ty nào được ban hành.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDocs.map((doc) => (
            <DocumentCard key={doc.id} document={doc} />
          ))}
        </div>
      )}
    </div>
  );
};
