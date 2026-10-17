import React, { useState } from 'react';
import { X, Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface DocumentAiSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  summaryText: string | null | undefined;
  onGenerate: () => Promise<string>;
}

export const DocumentAiSummaryModal: React.FC<DocumentAiSummaryModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  summaryText,
  onGenerate,
}) => {
  const [currentSummary, setCurrentSummary] = useState<string | null>(summaryText || null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const result = await onGenerate();
      setCurrentSummary(result);
      toast.success('Đã tạo tóm tắt AI thành công');
    } catch {
      toast.error('Không thể tạo tóm tắt AI vào lúc này');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!currentSummary) return;
    navigator.clipboard.writeText(currentSummary);
    setCopied(true);
    toast.success('Đã sao chép tóm tắt vào clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-r from-blue-50/60 to-purple-50/60 dark:from-blue-950/20 dark:to-purple-950/20">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Trợ lý AI Tóm tắt (Gemini 1.5 Flash)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md">
                {documentTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {currentSummary ? (
            <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Nội dung tóm tắt điều hành
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Đã sao chép' : 'Sao chép'}
                </button>
              </div>
              <div className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                {currentSummary}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 px-4">
              <Sparkles className="w-10 h-10 text-indigo-400 mx-auto mb-3 opacity-60" />
              <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Tài liệu chưa có tóm tắt AI
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-5">
                Sử dụng Gemini 1.5 Flash để tự động đọc toàn bộ nội dung tài liệu, rút ra các quyết định quan trọng và danh sách hành động chỉ trong vài giây.
              </p>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 disabled:opacity-50 transition-all"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Đang phân tích & tóm tắt...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Tạo tóm tắt AI ngay
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {currentSummary && (
          <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors disabled:opacity-50"
            >
              {isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Tạo lại tóm tắt
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
