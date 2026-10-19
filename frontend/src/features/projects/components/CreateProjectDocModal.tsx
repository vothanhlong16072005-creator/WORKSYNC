import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  FileText,
  Sparkles,
  AlertCircle,
  Bookmark,
  Tag,
  Paperclip,
  UploadCloud,
  File,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { documentApi } from '@/features/documents/api/document.api';
import type { DocumentType } from '@/features/documents/types/document.types';

interface CreateProjectDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
  projectName?: string;
}

const DOC_TYPES: { value: DocumentType; labelVi: string; labelEn: string; desc: string }[] = [
  {
    value: 'STANDARD',
    labelVi: 'Tài liệu kiến trúc & Đặc tả kỹ thuật (ADR / Spec)',
    labelEn: 'Standard Architecture Spec / ADR',
    desc: 'Đặc tả hệ thống, thiết kế module hoặc quyết định kỹ thuật',
  },
  {
    value: 'TASK_REQUIREMENT',
    labelVi: 'Yêu cầu nghiệp vụ & Spec chức năng (PRD)',
    labelEn: 'Task & Feature Requirements (PRD)',
    desc: 'Mô tả chi tiết yêu cầu, phạm vi và tiêu chí nghiệm thu của tính năng',
  },
  {
    value: 'MEETING_MINUTES',
    labelVi: 'Biên bản họp dự án',
    labelEn: 'Meeting Minutes',
    desc: 'Nội dung thống nhất, phân công hành động trong các buổi họp nhóm',
  },
  {
    value: 'TASK_SUBMISSION',
    labelVi: 'Hồ sơ nghiệm thu / Bàn giao tính năng',
    labelEn: 'Delivery & Submission Memo',
    desc: 'Bằng chứng bàn giao tính năng, kiểm thử và nghiệm thu sản phẩm',
  },
];

export const CreateProjectDocModal: React.FC<CreateProjectDocModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  projectName,
}) => {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');

  const [title, setTitle] = useState('');
  const [docType, setDocType] = useState<DocumentType>('STANDARD');
  const [summary, setSummary] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg(isEn ? 'Document title is required' : 'Vui lòng nhập tên tài liệu');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean);

      const newDoc = await documentApi.createDocument({
        title: title.trim(),
        contentText: summary.trim() || undefined,
        scope: 'PROJECT',
        type: docType,
        projectId,
        tags,
      });

      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          try {
            await documentApi.uploadAttachment(newDoc.id, file);
          } catch (uploadErr) {
            console.error('Failed to upload attachment:', file.name, uploadErr);
          }
        }
      }

      toast.success(
        isEn ? 'Project document created' : 'Khởi tạo tài liệu dự án thành công',
        {
          description: selectedFiles.length > 0
            ? (isEn
                ? `Added "${title.trim()}" with ${selectedFiles.length} file(s) attached.`
                : `Đã lưu "${title.trim()}" kèm ${selectedFiles.length} tệp đính kèm.`)
            : (isEn
                ? `Added "${title.trim()}" to project documents.`
                : `Đã lưu "${title.trim()}" vào kho tài liệu dự án.`),
        },
      );
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : isEn
          ? 'Failed to create document'
          : 'Không thể tạo tài liệu';
      setErrorMsg(message);
      toast.error(isEn ? 'Error' : 'Lỗi', { description: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden z-10 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {isEn ? 'Create Project Document' : 'Soạn Tài Liệu & Hồ Sơ Dự Án'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {projectName || (isEn ? 'Current Project' : 'Dự án hiện tại')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-2.5 text-xs text-rose-800 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {isEn ? 'Document Title' : 'Tên Tài Liệu / Đặc Tả'}{' '}
              <span className="text-rose-500">*</span>
            </label>
            <input
              id="input-doc-title"
              type="text"
              required
              autoFocus
              placeholder={
                isEn
                  ? 'e.g. System Architecture Spec v2.0...'
                  : 'Ví dụ: Đặc tả kiến trúc WebRTC & xử lý audio v1.0...'
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 font-medium placeholder:text-slate-400"
            />
          </div>

          {/* Doc Type */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Bookmark className="w-3.5 h-3.5 text-slate-400" />
              <span>{isEn ? 'Document Classification' : 'Phân Loại Tài Liệu'}</span>
            </label>
            <div className="space-y-2">
              {DOC_TYPES.map((type) => {
                const isSelected = docType === type.value;
                return (
                  <label
                    key={type.value}
                    className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-50/60 border-indigo-400 shadow-xs ring-1 ring-indigo-400'
                        : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100/60'
                    }`}
                  >
                    <input
                      type="radio"
                      name="docType"
                      value={type.value}
                      checked={isSelected}
                      onChange={() => setDocType(type.value)}
                      className="mt-1 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">
                        {isEn ? type.labelEn : type.labelVi}
                      </span>
                      <span className="text-[11px] text-slate-500 block mt-0.5 leading-normal">
                        {type.desc}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Summary / Outline */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {isEn ? 'Executive Summary / Outline' : 'Mô Tả Tóm Tắt & Dàn Ý'}
            </label>
            <textarea
              rows={3}
              placeholder={
                isEn
                  ? 'Key objectives, architectural overview, or decision points...'
                  : 'Mục tiêu tài liệu, tóm tắt các điểm quyết định kỹ thuật hoặc yêu cầu nghiệp vụ...'
              }
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 placeholder:text-slate-400 leading-relaxed"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span>{isEn ? 'Tags (comma separated)' : 'Từ Khóa / Tags (cách nhau bằng dấu phẩy)'}</span>
            </label>
            <input
              type="text"
              placeholder="SPEC, ARCHITECTURE, GEMINI, WEBRTC"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              className="w-full px-3.5 py-2 text-xs bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-indigo-500 text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* File Attachments */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                <span>{isEn ? 'Attachments & Specs' : 'Tệp Đính Kèm & Tài Liệu Kỹ Thuật'}</span>
              </label>
              <span className="text-[11px] text-slate-400">
                {selectedFiles.length > 0 ? `${selectedFiles.length} ${isEn ? 'files selected' : 'tệp đã chọn'}` : isEn ? 'PDF, DOCX, ZIP, PNG...' : 'PDF, DOCX, ZIP, hình ảnh...'}
              </span>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className="hidden"
            />

            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 rounded-xl p-4 text-center cursor-pointer transition-all duration-200 group"
            >
              <div className="flex flex-col items-center justify-center gap-1.5">
                <div className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center transition-colors">
                  <UploadCloud className="w-4.5 h-4.5 text-slate-500 group-hover:text-indigo-600 transition-colors" />
                </div>
                <div className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">
                  {isEn ? 'Click to browse files or drag and drop' : 'Nhấp để chọn tệp hoặc kéo thả tệp vào đây'}
                </div>
                <p className="text-[11px] text-slate-400">
                  {isEn ? 'Support PDF, DOCX, XLSX, images, ZIP up to 25MB' : 'Hỗ trợ PDF, Word, Excel, sơ đồ, ảnh, file nén đến 25MB'}
                </p>
              </div>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-2.5 space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={`${file.name}-${idx}`}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200/80 text-xs"
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <File className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span className="font-medium text-slate-700 truncate max-w-[280px]">
                        {file.name}
                      </span>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        ({formatFileSize(file.size)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveFile(idx);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                      title={isEn ? 'Remove file' : 'Xóa tệp'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              {isEn ? 'Cancel' : 'Hủy Bỏ'}
            </button>
            <button
              id="btn-submit-create-doc"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-98 text-white shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {isSubmitting
                  ? isEn
                    ? 'Creating Document...'
                    : 'Đang Khởi Tạo...'
                  : isEn
                  ? 'Create Document'
                  : 'Khởi Tạo Tài Liệu'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
