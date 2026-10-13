import { FileText, FileSpreadsheet, FileCode, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { RecentDocument } from '../../types/dashboard.types';

interface Props {
  documents?: RecentDocument[];
}

export function RecentDocumentsHub({ documents }: Props) {
  const { t } = useTranslation();

  const list = documents && documents.length > 0 ? documents : [
    { id: 'd1', title: 'Q4 Product Roadmap & Architecture Strategy.pdf', type: 'pdf', updatedAt: '09:00 PM' },
    { id: 'd2', title: 'API Contract v3.1 & IDOR Protection Guide.docx', type: 'docx', updatedAt: '04:15 PM' },
    { id: 'd3', title: 'WorkSync Coding Standards & Bauhaus Tokens.spec', type: 'spec', updatedAt: 'Yesterday' },
  ];

  const handleOpenDoc = (title: string) => {
    toast.info(`${t('dashboard.opening_doc', 'Đang mở tài liệu:')} ${title}`);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-900">
          {t('dashboard.recent_documents', 'Recent Documents')}
        </h3>

        <div className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors">
          <span>Hub</span>
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </div>
      </div>

      <div className="space-y-2.5 py-1">
        {list.slice(0, 3).map((doc) => {
          const isPdf = doc.type === 'pdf' || doc.title.endsWith('.pdf');
          const isDocx = doc.type === 'docx' || doc.title.endsWith('.docx');

          return (
            <div
              key={doc.id}
              role="button"
              tabIndex={0}
              onClick={() => handleOpenDoc(doc.title)}
              onKeyDown={(e) => e.key === 'Enter' && handleOpenDoc(doc.title)}
              className="group flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  isPdf ? 'bg-red-50 text-red-600' : isDocx ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'
                }`}>
                  {isPdf ? <FileText className="w-4 h-4" /> : isDocx ? <FileSpreadsheet className="w-4 h-4" /> : <FileCode className="w-4 h-4" />}
                </div>

                <div className="min-w-0">
                  <h4 className="text-xs font-medium text-slate-800 truncate group-hover:text-blue-600">
                    {doc.title}
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    Documents • {doc.updatedAt.includes('T') ? new Date(doc.updatedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : doc.updatedAt}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
        <span>Knowledge Base synced</span>
        <span className="text-blue-600 font-bold hover:underline cursor-pointer">
          Open Docs →
        </span>
      </div>
    </div>
  );
}
