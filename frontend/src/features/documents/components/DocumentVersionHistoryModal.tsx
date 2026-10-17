import React from 'react';
import { X, History, RotateCcw, Clock, User } from 'lucide-react';
import type { DocumentVersion } from '../types/document.types';

interface DocumentVersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  versions: DocumentVersion[];
  currentVersion: number;
  onRestore: (version: number) => Promise<void>;
  isRestoring?: boolean;
}

export const DocumentVersionHistoryModal: React.FC<DocumentVersionHistoryModalProps> = ({
  isOpen,
  onClose,
  versions,
  currentVersion,
  onRestore,
  isRestoring = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2 text-slate-900 dark:text-white">
            <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold">Lịch sử các phiên bản</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content list */}
        <div className="p-6 overflow-y-auto space-y-3">
          {versions.length === 0 ? (
            <p className="text-center text-slate-500 py-8">Chưa có lịch sử phiên bản nào.</p>
          ) : (
            versions.map((ver) => {
              const isCurrent = ver.version === currentVersion;
              return (
                <div
                  key={ver.id || ver.version}
                  className={`p-4 rounded-xl border transition-all ${
                    isCurrent
                      ? 'bg-blue-50/60 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
                      : 'bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-slate-900 dark:text-white">
                          Phiên bản v{ver.version}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-600 text-white">
                            Hiện tại
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mb-2 font-medium">
                        {ver.changeNote || 'Không có ghi chú thay đổi'}
                      </p>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {ver.savedBy?.name || 'Hệ thống'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(ver.createdAt).toLocaleString('vi-VN')}
                        </span>
                      </div>
                    </div>

                    {!isCurrent && (
                      <button
                        type="button"
                        disabled={isRestoring}
                        onClick={() => onRestore(ver.version)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm disabled:opacity-50 transition-all shrink-0"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-blue-500" />
                        Khôi phục
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
