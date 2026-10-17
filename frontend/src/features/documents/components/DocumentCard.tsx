import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Paperclip,
  Eye,
  History,
  Building,
  FolderKanban,
  User,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import type { DocumentItem, DocumentScope, DocumentType } from '../types/document.types';

interface DocumentCardProps {
  document: DocumentItem;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({ document }) => {
  const navigate = useNavigate();

  const getScopeBadge = (scope: DocumentScope) => {
    switch (scope) {
      case 'COMPANY':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800">
            <Building className="w-3 h-3" /> Công ty
          </span>
        );
      case 'DEPARTMENT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800">
            <ShieldCheck className="w-3 h-3" /> Phòng ban
          </span>
        );
      case 'PROJECT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800">
            <FolderKanban className="w-3 h-3" /> Dự án
          </span>
        );
      case 'PERSONAL':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <User className="w-3 h-3" /> Cá nhân
          </span>
        );
    }
  };

  const getTypeBadge = (type: DocumentType) => {
    switch (type) {
      case 'TASK_REQUIREMENT':
        return (
          <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            Yêu cầu (Spec)
          </span>
        );
      case 'TASK_SUBMISSION':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
            <CheckCircle2 className="w-3 h-3" /> Bằng chứng (Nộp)
          </span>
        );
      case 'MEETING_MINUTES':
        return (
          <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            Biên bản họp
          </span>
        );
      case 'COMPANY_POLICY':
        return (
          <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
            Quy chế
          </span>
        );
      default:
        return null;
    }
  };

  const attachmentsCount = document._count?.attachments ?? document.attachments?.length ?? 0;
  const versionsCount = document._count?.versions ?? document.versions?.length ?? document.currentVersion;

  return (
    <div
      onClick={() => navigate(`/documents/${document.id}`)}
      className="group relative bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-600 transition-all cursor-pointer flex flex-col justify-between"
    >
      <div>
        {/* Badges row */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {getScopeBadge(document.scope)}
          {getTypeBadge(document.type)}
          {document.project && (
            <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 truncate max-w-[150px]">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: document.project.color || '#3b82f6' }}
              />
              {document.project.name}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 mb-2">
          {document.title}
        </h3>

        {/* Snippet */}
        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
          {document.contentText || 'Chưa có nội dung văn bản...'}
        </p>

        {/* Tags */}
        {document.tags && document.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4">
            {document.tags.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="px-1.5 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
              >
                #{tag}
              </span>
            ))}
            {document.tags.length > 3 && (
              <span className="text-[11px] text-slate-400">+{document.tags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <div className="flex items-center gap-2">
          {document.owner?.avatar ? (
            <img
              src={document.owner.avatar}
              alt={document.owner.name}
              className="w-5 h-5 rounded-full object-cover"
            />
          ) : (
            <div className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 text-[10px] flex items-center justify-center font-bold">
              {document.owner?.name?.charAt(0) || 'U'}
            </div>
          )}
          <span className="truncate max-w-[100px] font-medium text-slate-700 dark:text-slate-300">
            {document.owner?.name || 'Tác giả'}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {attachmentsCount > 0 && (
            <span className="flex items-center gap-1" title={`${attachmentsCount} file đính kèm`}>
              <Paperclip className="w-3.5 h-3.5 text-slate-400" />
              {attachmentsCount}
            </span>
          )}
          <span className="flex items-center gap-1" title={`Phiên bản v${versionsCount}`}>
            <History className="w-3.5 h-3.5 text-slate-400" />v{versionsCount}
          </span>
          <span className="flex items-center gap-1" title={`${document.viewCount} lượt xem`}>
            <Eye className="w-3.5 h-3.5 text-slate-400" />
            {document.viewCount}
          </span>
        </div>
      </div>
    </div>
  );
};
