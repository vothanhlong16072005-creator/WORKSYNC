import React, { useState } from 'react';
import { X, FileCode2, ArrowRight, LayoutTemplate, Sparkles, Building, FolderKanban, User } from 'lucide-react';
import type { DocumentTemplate, DocumentScope } from '../types/document.types';

interface DocumentTemplatePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: DocumentTemplate[];
  onSelectTemplate: (templateKey: string, title: string, scope: DocumentScope) => Promise<void>;
  isCreating?: boolean;
}

export const DocumentTemplatePickerModal: React.FC<DocumentTemplatePickerModalProps> = ({
  isOpen,
  onClose,
  templates,
  onSelectTemplate,
  isCreating = false,
}) => {
  const [selectedKey, setSelectedKey] = useState<string>('meeting_minutes');
  const [docTitle, setDocTitle] = useState<string>('');
  const [docScope, setDocScope] = useState<DocumentScope>('PERSONAL');

  if (!isOpen) return null;

  const currentTemplate = templates.find((t) => t.key === selectedKey) || templates[0];

  const handleConfirm = async () => {
    const finalTitle = docTitle.trim() || currentTemplate?.name || 'Tài liệu mới từ mẫu';
    await onSelectTemplate(selectedKey, finalTitle, docScope);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Chọn mẫu tài liệu mẫu (Templates)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Split */}
        <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800">
          {/* Templates list (left 2 cols) */}
          <div className="md:col-span-2 p-4 overflow-y-auto space-y-2 max-h-[500px]">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-1">
              Danh sách mẫu sẵn có
            </p>
            {templates.map((tpl) => (
              <button
                key={tpl.key}
                type="button"
                onClick={() => {
                  setSelectedKey(tpl.key);
                  if (!docTitle) setDocTitle(tpl.name);
                }}
                className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                  selectedKey === tpl.key
                    ? 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-400 dark:border-blue-700 shadow-sm'
                    : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <FileCode2 className={`w-4 h-4 ${selectedKey === tpl.key ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                    {tpl.name}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                  {tpl.description || 'Mẫu cấu trúc tài liệu tiêu chuẩn'}
                </p>
              </button>
            ))}
          </div>

          {/* Form setup & preview (right 3 cols) */}
          <div className="md:col-span-3 p-6 overflow-y-auto space-y-5 max-h-[500px] flex flex-col justify-between">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Tiêu đề tài liệu mới
                </label>
                <input
                  type="text"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder={currentTemplate?.name || 'Nhập tiêu đề tài liệu...'}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Phạm vi tài liệu (Scope)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDocScope('PERSONAL')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                      docScope === 'PERSONAL'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <User className="w-3.5 h-3.5" /> Cá nhân
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocScope('PROJECT')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                      docScope === 'PROJECT'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <FolderKanban className="w-3.5 h-3.5" /> Dự án
                  </button>
                  <button
                    type="button"
                    onClick={() => setDocScope('COMPANY')}
                    className={`flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                      docScope === 'COMPANY'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <Building className="w-3.5 h-3.5" /> Công ty
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  Mô tả mẫu: {currentTemplate?.name}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {currentTemplate?.description || 'Tự động tạo các tiêu đề mục, bảng biểu và cấu trúc nội dung chuyên nghiệp theo chuẩn doanh nghiệp.'}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isCreating}
                onClick={handleConfirm}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 disabled:opacity-50 transition-all"
              >
                Tạo tài liệu từ mẫu
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
