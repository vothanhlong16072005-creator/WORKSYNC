import React, { useRef, useState } from 'react';
import { Paperclip, UploadCloud, Download, Trash2, File, Loader2, ExternalLink } from 'lucide-react';
import type { DocumentAttachment } from '../types/document.types';

interface DocumentAttachmentPanelProps {
  documentId: string;
  attachments: DocumentAttachment[];
  onUpload: (file: File) => Promise<void>;
  onDelete: (attId: string) => Promise<void>;
  onDownload: (attId: string, fileName: string) => Promise<void>;
  onPreview?: (attId: string, fileName: string) => Promise<void>;
  canEdit?: boolean;
}

export const DocumentAttachmentPanel: React.FC<DocumentAttachmentPanelProps> = ({
  documentId: _documentId,
  attachments,
  onUpload,
  onDelete,
  onDownload,
  onPreview,
  canEdit = true,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await onUpload(file);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!canEdit) return;
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      await onUpload(file);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          File đính kèm ({attachments.length})
        </h3>
      </div>

      {/* Upload Zone */}
      {canEdit && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all mb-4 ${
            isDragging
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-850/50'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelected}
            className="hidden"
          />
          {isUploading ? (
            <div className="flex items-center justify-center gap-2 text-sm text-blue-600 font-medium py-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Đang tải file lên...
            </div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 py-1">
              <UploadCloud className="w-6 h-6 text-slate-400" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nhấp để chọn hoặc kéo thả file vào đây
              </p>
              <p className="text-[11px] text-slate-400">PDF, Word, Excel, Hình ảnh, ZIP (Tối đa 25MB)</p>
            </div>
          )}
        </div>
      )}

      {/* Files List */}
      <div className="space-y-2">
        {attachments.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">Chưa có file đính kèm nào.</p>
        ) : (
          attachments.map((att) => (
            <div
              key={att.id}
              className="group flex items-center justify-between p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 hover:bg-slate-100/80 dark:hover:bg-slate-800/80 hover:border-blue-200 dark:hover:border-blue-900/50 transition-all"
            >
              <div
                onClick={() => (onPreview ? onPreview(att.id, att.fileName) : onDownload(att.id, att.fileName))}
                className="flex items-center gap-2.5 min-w-0 pr-2 cursor-pointer flex-1"
                title={`Nhấp để mở / xem ${att.fileName}`}
              >
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 shrink-0 group-hover:scale-105 transition-transform">
                  <File className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate transition-colors">
                    {att.fileName}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {formatFileSize(att.fileSize)} • {att.uploadedBy?.name || 'Tác giả'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {onPreview && (
                  <button
                    type="button"
                    onClick={() => onPreview(att.id, att.fileName)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                    title="Mở trong tab mới"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDownload(att.id, att.fileName)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                  title="Tải về máy"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => onDelete(att.id)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-white dark:hover:bg-slate-700 transition-colors"
                    title="Xóa file"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
