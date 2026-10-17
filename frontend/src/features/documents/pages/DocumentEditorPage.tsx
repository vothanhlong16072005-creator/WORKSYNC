import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import {
  ArrowLeft,
  Save,
  Sparkles,
  History,
  Download,
  Trash2,
  Loader2,
  Building,
  FolderKanban,
  User,
  ShieldCheck,
  Tag,
  Link as LinkIcon,
  Printer,
} from 'lucide-react';
import { useDocumentStore } from '../stores/document.store';
import { documentApi } from '../api/document.api';
import { TiptapEditor } from '../components/editor/TiptapEditor';
import { DocumentVersionHistoryModal } from '../components/DocumentVersionHistoryModal';
import { DocumentAttachmentPanel } from '../components/DocumentAttachmentPanel';
import { DocumentAiSummaryModal } from '../components/DocumentAiSummaryModal';
import { useAuthStore } from '@/stores/auth.store';
import { toast } from 'sonner';

export const DocumentEditorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.accessToken);

  const {
    activeDocument,
    versions,
    attachments,
    collaborators,
    isLoading,
    isSaving,
    fetchDocumentById,
    updateDocument,
    deleteDocument,
    fetchVersions,
    restoreVersion,
    uploadAttachment,
    deleteAttachment,
    setCollaborators,
  } = useDocumentStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState<unknown>(null);
  const [contentText, setContentText] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');

  // Modals state
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Auto-save debounce timer
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const socketRef = useRef<Socket | null>(null);

  // Load document on mount
  useEffect(() => {
    if (!id) return;
    fetchDocumentById(id).then((doc) => {
      setTitle(doc.title);
      setContent(doc.content);
      setContentText(doc.contentText);
      setTags(doc.tags || []);
    }).catch(() => {
      toast.error('Không tìm thấy tài liệu hoặc không có quyền truy cập');
      navigate('/documents');
    });
  }, [id]);

  // WebSocket Collaboration Setup
  useEffect(() => {
    if (!id) return;

    const wsUrl = import.meta.env.VITE_WS_URL || 'http://localhost:4000';
    const socket = io(`${wsUrl}/documents`, {
      auth: { token },
      query: { token },
      transports: ['websocket', 'polling'],
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join_document', { documentId: id });
    });

    socket.on('active_collaborators', (list) => {
      setCollaborators(list);
    });

    socket.on('collaborator_update', (data) => {
      if (data?.content) {
        setContent(data.content);
        toast.info(`${data.senderUser?.name || 'Cộng tác viên'} vừa cập nhật tài liệu`);
      }
    });

    return () => {
      socket.emit('leave_document', { documentId: id });
      socket.disconnect();
    };
  }, [id, token]);

  // Handle auto-save changes
  const handleContentChange = useCallback((jsonContent: unknown, plainText: string) => {
    setContent(jsonContent);
    setContentText(plainText);

    // Broadcast change to socket peers
    if (socketRef.current && id) {
      socketRef.current.emit('document_change', {
        documentId: id,
        content: jsonContent,
      });
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(async () => {
      if (!id) return;
      try {
        await updateDocument(id, {
          content: jsonContent,
          contentText: plainText,
          saveVersion: false,
        });
      } catch {
        // quiet fail on background auto-save
      }
    }, 1500);
  }, [id, updateDocument]);

  const handleTitleBlur = async () => {
    if (!id || !title.trim()) return;
    try {
      await updateDocument(id, { title: title.trim() });
    } catch {
      toast.error('Không thể cập nhật tiêu đề');
    }
  };

  const handleAddTag = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim() && id) {
      e.preventDefault();
      const nextTags = Array.from(new Set([...tags, tagInput.trim().toLowerCase()]));
      setTags(nextTags);
      setTagInput('');
      await updateDocument(id, { tags: nextTags });
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!id) return;
    const nextTags = tags.filter((t) => t !== tagToRemove);
    setTags(nextTags);
    await updateDocument(id, { tags: nextTags });
  };

  const handleManualSaveVersion = async () => {
    if (!id) return;
    const note = window.prompt('Nhập ghi chú cho phiên bản này (tùy chọn):', 'Cập nhật nội dung');
    try {
      await updateDocument(id, {
        title,
        content,
        contentText,
        saveVersion: true,
        changeNote: note || 'Lưu phiên bản thủ công',
      });
      await fetchVersions(id);
      toast.success('Đã lưu phiên bản mới');
    } catch {
      toast.error('Không thể lưu phiên bản mới');
    }
  };

  const handleRestoreVersion = async (version: number) => {
    if (!id) return;
    setIsRestoring(true);
    try {
      await restoreVersion(id, version);
      const updated = await fetchDocumentById(id);
      setTitle(updated.title);
      setContent(updated.content);
      setContentText(updated.contentText);
      setIsVersionModalOpen(false);
      toast.success(`Đã khôi phục về phiên bản v${version}`);
    } catch {
      toast.error('Khôi phục phiên bản thất bại');
    } finally {
      setIsRestoring(false);
    }
  };

  const handleExportPdf = async () => {
    if (!id) return;
    setIsExporting(true);
    try {
      await documentApi.exportPdf(id, title || 'tai-lieu');
      toast.success('Đã xuất file PDF');
    } catch {
      toast.error('Không thể xuất PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportDocx = async () => {
    if (!id) return;
    setIsExporting(true);
    try {
      await documentApi.exportDocx(id, title || 'tai-lieu');
      toast.success('Đã xuất file Word (DOCX)');
    } catch {
      toast.error('Không thể xuất Word');
    } finally {
      setIsExporting(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (window.confirm('Bạn có chắc chắn muốn xóa tài liệu này không?')) {
      try {
        await deleteDocument(id);
        toast.success('Đã xóa tài liệu');
        navigate('/documents');
      } catch {
        toast.error('Không thể xóa tài liệu');
      }
    }
  };

  const handleGenerateAi = async () => {
    if (!id) throw new Error('No id');
    const res = await documentApi.generateAiSummary(id);
    return res.summary;
  };

  if (isLoading || !activeDocument) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <p className="text-sm font-medium">Đang tải tài liệu...</p>
      </div>
    );
  }

  const canEdit = activeDocument.canEdit ?? true;
  const canDelete = activeDocument.canDelete ?? false;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Navbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 flex-1 min-w-0 mr-2">
          <button
            type="button"
            onClick={() => navigate('/documents')}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors shrink-0"
            title="Quay lại danh sách"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {activeDocument.scope === 'COMPANY' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <Building className="w-3 h-3" /> Công ty
                </span>
              )}
              {activeDocument.scope === 'PROJECT' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                  <FolderKanban className="w-3 h-3" /> Dự án
                </span>
              )}
              {activeDocument.scope === 'DEPARTMENT' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                  <ShieldCheck className="w-3 h-3" /> Phòng ban
                </span>
              )}
              {activeDocument.scope === 'PERSONAL' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <User className="w-3 h-3" /> Cá nhân
                </span>
              )}
              <span className="text-xs text-slate-400">
                v{activeDocument.currentVersion} • Tác giả: {activeDocument.owner?.name}
              </span>
            </div>

            <input
              type="text"
              value={title}
              disabled={!canEdit}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="Tiêu đề tài liệu..."
              title={title}
              className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white bg-transparent border-none p-0 focus:outline-none focus:ring-0 w-full"
            />
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Real-time Presence Avatars */}
          {collaborators.length > 0 && (
            <div className="flex items-center -space-x-1.5 mr-2" title={`${collaborators.length} người đang trực tuyến`}>
              {collaborators.slice(0, 4).map((c) => (
                <div
                  key={c.socketId}
                  className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center"
                  title={c.name}
                >
                  {c.avatar ? (
                    <img src={c.avatar} alt={c.name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    c.name.charAt(0)
                  )}
                </div>
              ))}
              {collaborators.length > 4 && (
                <div className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center">
                  +{collaborators.length - 4}
                </div>
              )}
            </div>
          )}

          {/* AI Summary Button */}
          <button
            type="button"
            onClick={() => setIsAiModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            AI Tóm tắt
          </button>

          {/* Versions Button */}
          <button
            type="button"
            onClick={() => {
              if (id) fetchVersions(id);
              setIsVersionModalOpen(true);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 transition-colors"
          >
            <History className="w-3.5 h-3.5 text-slate-500" />
            Lịch sử (v{activeDocument.currentVersion})
          </button>

          {/* Export Dropdown */}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-colors"
            title="In hoặc Lưu Báo Cáo PDF Chuẩn (Ctrl+P)"
          >
            <Printer className="w-3.5 h-3.5" /> In / Lưu PDF
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            title="Tải file PDF thô"
          >
            <Download className="w-3.5 h-3.5" /> Tải PDF
          </button>

          <button
            type="button"
            disabled={isExporting}
            onClick={handleExportDocx}
            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 disabled:opacity-50 transition-colors"
            title="Xuất file Word DOCX"
          >
            <Download className="w-3.5 h-3.5" /> Word (.docx)
          </button>

          {/* Save Version button */}
          {canEdit && (
            <button
              type="button"
              disabled={isSaving}
              onClick={handleManualSaveVersion}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-500/20 disabled:opacity-50 transition-all"
            >
              {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Lưu phiên bản
            </button>
          )}

          {/* Delete Button */}
          {canDelete && (
            <button
              type="button"
              onClick={handleDelete}
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              title="Xóa tài liệu"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Editor on left, Panels on right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Editor Area (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          <TiptapEditor
            content={content}
            editable={canEdit}
            onChange={handleContentChange}
            placeholder="Viết nội dung tài liệu với định dạng tiêu đề, danh sách, trích dẫn, bảng biểu..."
          />

          {/* Tags bar */}
          <div className="flex flex-wrap items-center gap-1.5 pt-2">
            <Tag className="w-3.5 h-3.5 text-slate-400 mr-1" />
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              >
                #{tag}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-rose-500 text-slate-400 text-xs ml-0.5"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
            {canEdit && (
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="+ Thêm thẻ..."
                className="px-2 py-1 text-xs bg-transparent border-none focus:outline-none text-slate-600 dark:text-slate-300 placeholder:text-slate-400"
              />
            )}
          </div>
        </div>

        {/* Sidebar Panel (1 col) */}
        <div className="lg:col-span-1 space-y-5">
          {/* Linked Task Card (U1 & U2) */}
          {activeDocument.linkedTask && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <LinkIcon className="w-3.5 h-3.5 text-blue-500" />
                Đính kèm với Task
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 mb-1">
                {activeDocument.linkedTask.title}
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2">
                <span>Trạng thái: {activeDocument.linkedTask.status}</span>
                <span className="font-semibold text-blue-600">
                  {activeDocument.type === 'TASK_REQUIREMENT' ? 'Đặc tả yêu cầu' : 'Bằng chứng hoàn thành'}
                </span>
              </div>
            </div>
          )}

          {/* Linked Meeting Card (U4) */}
          {activeDocument.linkedMeeting && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                <LinkIcon className="w-3.5 h-3.5 text-purple-500" />
                Biên bản cuộc họp (M5)
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2 mb-1">
                {activeDocument.linkedMeeting.title}
              </p>
              <p className="text-[11px] text-slate-500">
                Bắt đầu: {new Date(activeDocument.linkedMeeting.startTime).toLocaleString('vi-VN')}
              </p>
            </div>
          )}

          {/* Attachments Panel */}
          <DocumentAttachmentPanel
            documentId={activeDocument.id}
            attachments={attachments}
            canEdit={canEdit}
            onUpload={async (file) => {
              if (id) {
                await uploadAttachment(id, file);
                toast.success('Đã tải file đính kèm lên');
              }
            }}
            onDelete={async (attId) => {
              await deleteAttachment(attId);
              toast.success('Đã xóa file đính kèm');
            }}
            onDownload={async (attId, fileName) => {
              try {
                await documentApi.downloadAttachment(attId, fileName);
                toast.success(`Đang tải về: ${fileName}`);
              } catch {
                toast.error('Không thể tải file đính kèm');
              }
            }}
            onPreview={async (attId, fileName) => {
              try {
                await documentApi.previewAttachment(attId, fileName);
              } catch {
                toast.error('Không thể mở xem file');
              }
            }}
          />
        </div>
      </div>

      {/* Modals */}
      <DocumentVersionHistoryModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        versions={versions}
        currentVersion={activeDocument.currentVersion}
        onRestore={handleRestoreVersion}
        isRestoring={isRestoring}
      />

      <DocumentAiSummaryModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        documentTitle={title}
        summaryText={activeDocument.aiSummary}
        onGenerate={handleGenerateAi}
      />
    </div>
  );
};
