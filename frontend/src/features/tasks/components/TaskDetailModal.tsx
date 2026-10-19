import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  X,
  User as UserIcon,
  UserPlus,
  Calendar,
  Zap,
  Clock3,
  Flame,
  FolderKanban,
  CheckCircle2,
  FileText,
  ExternalLink,
  PlusCircle,
  UploadCloud,
  Edit3,
  Save,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api-client';
import { documentApi } from '@/features/documents/api/document.api';
import type { DocumentItem } from '@/features/documents/types/document.types';
import { toast } from 'sonner';

export interface TaskDetailModalTask {
  id: string;
  title: string;
  description?: string | null;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'BLOCKED' | 'DONE' | string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  storyPoints?: number | null;
  timeEstimate?: number | null;
  timeTracked?: number;
  dueDate?: string | null;
  labels?: string[];
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string | null;
  completedBy?: {
    id: string;
    name: string;
    avatar?: string | null;
  } | null;
  assignee?: {
    id: string;
    name: string;
    avatar?: string | null;
  } | null;
  createdBy?: {
    id: string;
    name: string;
    avatar?: string | null;
  } | null;
  project?: {
    id: string;
    name: string;
    color?: string | null;
  } | null;
  sprint?: {
    id: string;
    name: string;
  } | null;
  sprintId?: string | null;
  epic?: {
    id: string;
    title: string;
  } | null;
  linkedDocuments?: Array<{
    id: string;
    title: string;
    type: string;
  }>;
}

interface TaskDetailModalProps {
  task: TaskDetailModalTask | null;
  onClose: () => void;
  onStatusChange?: (taskId: string, newStatus: string) => void;
  canChangeStatus?: boolean;
  projectMembers?: Array<{
    id: string;
    userId: string;
    projectRole?: string;
    user: { id: string; name: string; avatar?: string | null; email: string };
  }>;
  onTaskUpdated?: (updatedTask: TaskDetailModalTask) => void;
  onTaskDeleted?: (taskId: string) => void;
}

const COLUMNS = [
  { id: 'TODO', labelVi: 'Cần làm', labelEn: 'To Do' },
  { id: 'IN_PROGRESS', labelVi: 'Đang làm', labelEn: 'In Progress' },
  { id: 'BLOCKED', labelVi: 'Bị chặn', labelEn: 'Blocked' },
  { id: 'DONE', labelVi: 'Hoàn thành', labelEn: 'Done' },
];

const PRIORITY_CONFIG: Record<
  string,
  { labelVi: string; labelEn: string; bg: string; text: string; border: string; dot: string }
> = {
  URGENT: {
    labelVi: 'Khẩn cấp',
    labelEn: 'Urgent',
    bg: 'bg-rose-50',
    text: 'text-rose-700',
    border: 'border-rose-300',
    dot: 'bg-rose-500',
  },
  HIGH: {
    labelVi: 'Cao',
    labelEn: 'High',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-300',
    dot: 'bg-amber-500',
  },
  MEDIUM: {
    labelVi: 'Trung bình',
    labelEn: 'Medium',
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-300',
    dot: 'bg-blue-500',
  },
  LOW: {
    labelVi: 'Thấp',
    labelEn: 'Low',
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-300',
    dot: 'bg-slate-400',
  },
};

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  task,
  onClose,
  onStatusChange,
  canChangeStatus = true,
  projectMembers = [],
  onTaskUpdated,
  onTaskDeleted,
}) => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const { i18n } = useTranslation();
  const isEn = i18n.language.startsWith('en');

  const [localTask, setLocalTask] = useState<TaskDetailModalTask | null>(task);
  const [taskDocs, setTaskDocs] = useState<DocumentItem[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [showSubmissionForm, setShowSubmissionForm] = useState(false);
  const [submissionTitle, setSubmissionTitle] = useState('');
  const [submissionNote, setSubmissionNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Mode state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPriority, setEditPriority] = useState<string>('MEDIUM');
  const [editAssigneeId, setEditAssigneeId] = useState('');
  const [editDueDate, setEditDueDate] = useState('');
  const [editStoryPoints, setEditStoryPoints] = useState<string>('');
  const [isSavingTask, setIsSavingTask] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  useEffect(() => {
    setLocalTask(task);
    if (task) {
      setEditTitle(task.title);
      setEditDesc(task.description || '');
      setEditPriority(task.priority);
      setEditAssigneeId(task.assignee?.id || '');
      setEditDueDate(task.dueDate ? task.dueDate.split('T')[0] : '');
      setEditStoryPoints(
        task.storyPoints !== null && task.storyPoints !== undefined
          ? String(task.storyPoints)
          : '',
      );
      setIsEditing(false);
      setIsConfirmingDelete(false);
    }
  }, [task]);
  // Fetch task-linked documents (U1 & U2)
  useEffect(() => {
    if (!task?.id) return;
    setIsLoadingDocs(true);
    documentApi
      .fetchTaskDocuments(task.id)
      .then((res) => setTaskDocs(res.items))
      .catch(() => {})
      .finally(() => setIsLoadingDocs(false));
  }, [task?.id]);

  // ESC to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const activeTask = localTask || task;
  if (!activeTask) return null;

  const isAssignee = currentUser?.id === activeTask.assignee?.id;
  const isPMOrAdmin =
    currentUser?.role === 'ADMIN' ||
    currentUser?.role === 'PM' ||
    currentUser?.role === 'DEPARTMENT_HEAD';
  const canEdit = isPMOrAdmin || isAssignee;

  const handleSaveTask = async () => {
    if (!activeTask) return;
    if (!editTitle.trim()) {
      toast.error(isEn ? 'Task title cannot be empty' : 'Tiêu đề không được để trống');
      return;
    }
    setIsSavingTask(true);
    try {
      const payload: Record<string, unknown> = {
        title: editTitle.trim(),
        description: editDesc.trim() || null,
        priority: editPriority,
        assigneeId: editAssigneeId || null,
        dueDate: editDueDate ? new Date(editDueDate).toISOString() : null,
        storyPoints: editStoryPoints.trim() ? parseInt(editStoryPoints, 10) : null,
      };
      const res = await apiClient.patch(`/tasks/${activeTask.id}`, payload);
      const updated = res.data as TaskDetailModalTask;
      setLocalTask(updated);
      setIsEditing(false);
      toast.success(isEn ? 'Task updated successfully' : 'Đã cập nhật nhiệm vụ thành công');
      if (onTaskUpdated) onTaskUpdated(updated);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Cập nhật thất bại');
    } finally {
      setIsSavingTask(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!activeTask) return;
    setIsDeletingTask(true);
    try {
      await apiClient.delete(`/tasks/${activeTask.id}`);
      toast.success(isEn ? 'Task deleted successfully' : 'Đã xóa nhiệm vụ');
      onClose();
      if (onTaskDeleted) onTaskDeleted(activeTask.id);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Không thể xóa nhiệm vụ');
    } finally {
      setIsDeletingTask(false);
    }
  };

  const handleCreateSpec = async () => {
    try {
      const newDoc = await documentApi.createDocument({
        title: `Đặc tả yêu cầu: ${activeTask.title}`,
        scope: 'PROJECT',
        type: 'TASK_REQUIREMENT',
        linkedTaskId: activeTask.id,
        projectId: activeTask.project?.id || null,
        tags: ['spec', 'requirement'],
      });
      toast.success('Đã tạo tài liệu đặc tả');
      onClose();
      navigate(`/documents/${newDoc.id}`);
    } catch {
      toast.error('Không thể tạo tài liệu đặc tả');
    }
  };

  const handleSubmitDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionTitle.trim()) return;
    setIsSubmitting(true);
    try {
      const doc = await documentApi.submitTaskDeliverable({
        taskId: activeTask.id,
        title: submissionTitle.trim(),
        note: submissionNote.trim(),
      });
      setTaskDocs((prev) => [...prev, doc]);
      setShowSubmissionForm(false);
      setSubmissionTitle('');
      setSubmissionNote('');
      toast.success('Đã nộp bằng chứng hoàn thành task');
    } catch {
      toast.error('Nộp bằng chứng thất bại');
    } finally {
      setIsSubmitting(false);
    }
  };

  const prio = PRIORITY_CONFIG[activeTask.priority] || PRIORITY_CONFIG.MEDIUM;

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return isEn ? 'Not set' : 'Chưa thiết lập';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(isEn ? 'en-US' : 'vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return String(dateStr);
    }
  };

  const formatShortDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(isEn ? 'en-US' : 'vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  const getDeadlineInfo = (dueDateStr?: string | null) => {
    if (!dueDateStr) return null;
    try {
      const now = new Date();
      const due = new Date(dueDateStr);
      const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        return {
          text: isEn ? `Overdue by ${Math.abs(diffDays)}d` : `Quá hạn ${Math.abs(diffDays)} ngày`,
          isOverdue: true,
          className: 'bg-red-100 text-red-800 border-red-300 font-bold',
        };
      }
      if (diffDays === 0) {
        return {
          text: isEn ? 'Due today' : 'Hết hạn hôm nay',
          isNear: true,
          className: 'bg-amber-100 text-amber-900 border-amber-300 font-bold',
        };
      }
      if (diffDays <= 2) {
        return {
          text: isEn ? `Due in ${diffDays}d` : `Còn ${diffDays} ngày`,
          isNear: true,
          className: 'bg-amber-50 text-amber-800 border-amber-200 font-medium',
        };
      }
      return null;
    } catch {
      return null;
    }
  };

  const deadline = getDeadlineInfo(activeTask.dueDate);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-2.5 py-1 text-xs font-mono font-bold text-slate-800 bg-white border border-slate-200 rounded-lg shadow-2xs">
              #{activeTask.id.slice(-8)}
            </span>
            {activeTask.project && (
              <span
                className="px-2.5 py-1 text-xs font-bold rounded-lg border shadow-2xs flex items-center gap-1.5"
                style={{
                  backgroundColor: activeTask.project.color ? `${activeTask.project.color}15` : '#F1F5F9',
                  borderColor: activeTask.project.color ? `${activeTask.project.color}40` : '#CBD5E1',
                  color: activeTask.project.color || '#334155',
                }}
              >
                <FolderKanban className="w-3.5 h-3.5" />
                {activeTask.project.name}
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded-lg border ${prio.bg} ${prio.text} ${prio.border}`}
            >
              <span className={`w-2 h-2 rounded-full ${prio.dot}`} />
              {isEn ? prio.labelEn : prio.labelVi}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {canEdit && !isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 text-xs font-bold rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title={isEn ? 'Edit Task' : 'Chỉnh sửa nhiệm vụ'}
              >
                <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                <span>{isEn ? 'Edit' : 'Sửa'}</span>
              </button>
            )}

            {isEditing && (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isSavingTask}
                  className="px-3 py-1.5 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
                >
                  {isEn ? 'Cancel' : 'Hủy'}
                </button>
                <button
                  type="button"
                  onClick={handleSaveTask}
                  disabled={isSavingTask}
                  className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingTask ? (isEn ? 'Saving...' : 'Đang lưu...') : isEn ? 'Save' : 'Lưu'}</span>
                </button>
              </>
            )}

            {isPMOrAdmin && !isEditing && (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                title={isEn ? 'Delete Task' : 'Xóa nhiệm vụ'}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </header>

        {/* Delete Confirmation Banner */}
        {isConfirmingDelete && (
          <div className="p-3.5 bg-rose-50 border-b border-rose-200 flex flex-wrap items-center justify-between gap-3 text-xs text-rose-900 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="font-semibold">
                {isEn
                  ? 'Are you sure you want to delete this task? This action cannot be undone.'
                  : 'Bạn có chắc chắn muốn xóa nhiệm vụ này? Hành động này không thể hoàn tác.'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(false)}
                disabled={isDeletingTask}
                className="px-3 py-1 rounded-lg text-slate-600 hover:bg-rose-100 transition-colors font-medium cursor-pointer"
              >
                {isEn ? 'Cancel' : 'Hủy bỏ'}
              </button>
              <button
                type="button"
                onClick={handleDeleteTask}
                disabled={isDeletingTask}
                className="px-3.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDeletingTask ? (isEn ? 'Deleting...' : 'Đang xóa...') : isEn ? 'Confirm Delete' : 'Xác nhận xóa'}
              </button>
            </div>
          </div>
        )}

        {/* Content Body (2 Columns) */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Left Column (Main Info - 7 cols) */}
            <div className="md:col-span-7 space-y-5">
              {isEditing ? (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                    {isEn ? 'Task Title *' : 'Tiêu Đề Nhiệm Vụ *'}
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3.5 py-2 text-base font-bold bg-slate-50 border border-blue-400 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-slate-900"
                    placeholder={isEn ? 'Task title...' : 'Tiêu đề công việc...'}
                  />
                </div>
              ) : (
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 leading-snug tracking-tight">
                  {activeTask.title}
                </h2>
              )}

              {/* Status Pipeline */}
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {isEn ? 'Status Workflow Pipeline' : 'Quy trình trạng thái'}
                </span>
                <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                  {COLUMNS.map((col) => {
                    const isCurrent = activeTask.status === col.id;
                    return (
                      <button
                        key={col.id}
                        type="button"
                        disabled={!canChangeStatus || !onStatusChange}
                        onClick={() => onStatusChange && onStatusChange(activeTask.id, col.id)}
                        className={`py-2 px-1 text-xs font-bold rounded-lg transition-all text-center truncate ${
                          isCurrent
                            ? 'bg-white text-slate-900 shadow-xs border border-slate-300 font-black scale-102'
                            : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
                        } ${!canChangeStatus ? 'cursor-default opacity-80' : 'cursor-pointer active:scale-95'}`}
                      >
                        {isEn ? col.labelEn : col.labelVi}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                  {isEn ? 'Description' : 'Mô tả công việc'}
                </span>
                {isEditing ? (
                  <textarea
                    rows={4}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 text-slate-800 leading-relaxed"
                    placeholder={isEn ? 'Detailed description...' : 'Mô tả chi tiết công việc...'}
                  />
                ) : (
                  <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200/80 min-h-[110px]">
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {activeTask.description || (isEn ? 'No description provided.' : 'Chưa có mô tả chi tiết.')}
                    </p>
                  </div>
                )}
              </div>

              {/* Labels */}
              {activeTask.labels && activeTask.labels.length > 0 && (
                <div className="space-y-1.5">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                    {isEn ? 'Labels & Tags' : 'Nhãn công việc'}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {activeTask.labels.map((label) => (
                      <span
                        key={label}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 border border-slate-200"
                      >
                        #{label}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Task Documents & Deliverables (U1 & U2) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                    {isEn ? 'Documents & Deliverables' : 'Tài liệu & Nghiệm thu'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isPMOrAdmin && (
                      <button
                        type="button"
                        onClick={handleCreateSpec}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        + {isEn ? 'Attach Spec' : 'Đính kèm Spec'}
                      </button>
                    )}
                    {(isAssignee || isPMOrAdmin) && (
                      <button
                        type="button"
                        onClick={() => setShowSubmissionForm((prev) => !prev)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        + {isEn ? 'Submit Proof' : 'Nộp bằng chứng'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline Deliverable Submission Form */}
                {showSubmissionForm && (
                  <form
                    onSubmit={handleSubmitDeliverable}
                    className="p-3.5 bg-teal-50/70 border border-teal-200/80 rounded-xl space-y-2.5 animate-fade-in"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-teal-900">
                        {isEn ? 'Submit Deliverable / Proof of Work' : 'Nộp bằng chứng hoàn thành'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSubmissionForm(false)}
                        className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                    <input
                      type="text"
                      value={submissionTitle}
                      onChange={(e) => setSubmissionTitle(e.target.value)}
                      placeholder={isEn ? 'Deliverable title / document name...' : 'Tiêu đề bằng chứng / báo cáo nghiệm thu...'}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-teal-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                      required
                    />
                    <textarea
                      value={submissionNote}
                      onChange={(e) => setSubmissionNote(e.target.value)}
                      placeholder={isEn ? 'Notes / summary of deliverables...' : 'Ghi chú tóm tắt kết quả, link kiểm thử, mô tả hoàn thành...'}
                      rows={2}
                      className="w-full px-3 py-1.5 text-xs bg-white border border-teal-300 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-teal-500"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setShowSubmissionForm(false)}
                        className="px-2.5 py-1 text-xs text-slate-600 hover:bg-white rounded-lg cursor-pointer"
                      >
                        {isEn ? 'Cancel' : 'Hủy'}
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="px-3 py-1 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs disabled:opacity-50 cursor-pointer"
                      >
                        {isSubmitting ? (isEn ? 'Submitting...' : 'Đang gửi...') : (isEn ? 'Submit' : 'Nộp ngay')}
                      </button>
                    </div>
                  </form>
                )}

                {/* Documents List */}
                <div className="space-y-2">
                  {isLoadingDocs ? (
                    <p className="text-xs text-slate-400 text-center py-2">
                      {isEn ? 'Loading documents...' : 'Đang tải tài liệu...'}
                    </p>
                  ) : taskDocs.length === 0 ? (
                    <div className="p-3 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 text-center">
                      <p className="text-xs text-slate-400">
                        {isEn ? 'No documents attached to this task.' : 'Chưa có tài liệu hoặc bằng chứng nào đính kèm task này.'}
                      </p>
                    </div>
                  ) : (
                    taskDocs.map((doc) => (
                      <div
                        key={doc.id}
                        onClick={() => {
                          onClose();
                          navigate(`/documents/${doc.id}`);
                        }}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/90 bg-white hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <div
                            className={`p-1.5 rounded-lg ${
                              doc.type === 'TASK_SUBMISSION'
                                ? 'bg-teal-50 text-teal-600'
                                : 'bg-blue-50 text-blue-600'
                            }`}
                          >
                            {doc.type === 'TASK_SUBMISSION' ? (
                              <CheckCircle2 className="w-4 h-4" />
                            ) : (
                              <FileText className="w-4 h-4" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-800 group-hover:text-blue-600 truncate transition-colors">
                              {doc.title}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              {doc.type === 'TASK_SUBMISSION' ? 'Bằng chứng nghiệm thu' : 'Tài liệu yêu cầu (Spec)'} • v{doc.currentVersion} • {doc.owner?.name}
                            </p>
                          </div>
                        </div>

                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-600 shrink-0" />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Right Column (Properties Card - 5 cols) */}
            <div className="md:col-span-5">
              <div className="p-4 bg-slate-50/60 rounded-2xl border border-slate-200/90 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  {isEn ? 'Properties' : 'Thuộc tính công việc'}
                </h3>

                {/* Priority (Editable) */}
                {isEditing ? (
                  <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                    <span className="text-xs text-slate-500 font-medium">
                      {isEn ? 'Priority' : 'Độ ưu tiên'}
                    </span>
                    <select
                      value={editPriority}
                      onChange={(e) => setEditPriority(e.target.value)}
                      className="px-2 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-800"
                    >
                      <option value="LOW">{isEn ? 'Low' : 'Thấp'}</option>
                      <option value="MEDIUM">{isEn ? 'Medium' : 'Trung bình'}</option>
                      <option value="HIGH">{isEn ? 'High' : 'Cao'}</option>
                      <option value="URGENT">{isEn ? 'Urgent' : 'Khẩn cấp'}</option>
                    </select>
                  </div>
                ) : null}

                {/* Assignee */}
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <UserIcon className="h-4 w-4 text-slate-400" />
                    {isEn ? 'Assignee' : 'Người phụ trách'}
                  </span>
                  <div className="flex items-center gap-2">
                    {isEditing ? (
                      <select
                        value={editAssigneeId}
                        onChange={(e) => setEditAssigneeId(e.target.value)}
                        className="px-2 py-1 text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-800 max-w-[170px]"
                      >
                        <option value="">{isEn ? '-- Unassigned --' : '-- Chưa phân công --'}</option>
                        {projectMembers.map((m) => (
                          <option key={m.userId} value={m.userId}>
                            {m.user.name} ({m.projectRole || 'MEMBER'})
                          </option>
                        ))}
                      </select>
                    ) : activeTask.assignee ? (
                      <>
                        {activeTask.assignee.avatar ? (
                          <img
                            src={activeTask.assignee.avatar}
                            className="h-6 w-6 rounded-full object-cover shadow-2xs"
                            alt=""
                          />
                        ) : (
                          <span className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold bg-blue-600 text-white">
                            {activeTask.assignee.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                        <span className="text-xs font-bold text-slate-800">{activeTask.assignee.name}</span>
                      </>
                    ) : (
                      <span className="text-xs text-slate-400 italic">
                        {isEn ? 'Unassigned' : 'Chưa phân công'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Creator */}
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <UserPlus className="h-4 w-4 text-slate-400" />
                    {isEn ? 'Created By' : 'Người tạo'}
                  </span>
                  <span className="text-xs font-semibold text-slate-800">
                    {activeTask.createdBy?.name || (isEn ? 'System' : 'Hệ thống')}
                  </span>
                </div>

                {/* Due Date */}
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    {isEn ? 'Due Date' : 'Hạn chót'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {isEditing ? (
                      <input
                        type="date"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                        className="px-2 py-1 text-xs font-semibold rounded-lg border border-slate-300 bg-white text-slate-800"
                      />
                    ) : (
                      <>
                        <span className="text-xs font-semibold text-slate-800">
                          {activeTask.dueDate ? formatShortDate(activeTask.dueDate) : isEn ? 'No deadline' : 'Không có hạn'}
                        </span>
                        {deadline && (
                          <span className={`px-2 py-0.5 text-[10px] rounded-md border ${deadline.className}`}>
                            {deadline.text}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Estimate */}
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <Zap className="h-4 w-4 text-amber-500" />
                    {isEn ? 'Estimate' : 'Ước tính'}
                  </span>
                  <span className="text-xs font-semibold text-slate-800">
                    {activeTask.timeEstimate ? `${activeTask.timeEstimate} ${isEn ? 'hours' : 'giờ'}` : '–'}
                  </span>
                </div>

                {/* Tracked */}
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <Clock3 className="h-4 w-4 text-blue-500" />
                    {isEn ? 'Time Tracked' : 'Đã làm'}
                  </span>
                  <span className="text-xs font-semibold text-slate-800">
                    {activeTask.timeTracked ? `${activeTask.timeTracked} ${isEn ? 'hours' : 'giờ'}` : `0 ${isEn ? 'hours' : 'giờ'}`}
                  </span>
                </div>

                {/* Story Points */}
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
                  <span className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                    <Flame className="h-4 w-4 text-red-500" />
                    Story Points
                  </span>
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={editStoryPoints}
                      onChange={(e) => setEditStoryPoints(e.target.value)}
                      placeholder="SP"
                      className="w-20 px-2 py-1 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-800 text-right"
                    />
                  ) : (
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                      {activeTask.storyPoints ? `${activeTask.storyPoints} SP` : '0 SP'}
                    </span>
                  )}
                </div>

                {/* Completion Details (If Completed) */}
                {activeTask.status === 'DONE' && (
                  <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 space-y-2 mt-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>{isEn ? 'Completion Details' : 'Chi tiết hoàn thành'}</span>
                    </div>
                    <div className="text-xs text-slate-700 flex items-center justify-between">
                      <span className="text-slate-500">{isEn ? 'Completed Date' : 'Ngày hoàn thành'}:</span>
                      <span className="font-semibold">{formatDate(activeTask.completedAt)}</span>
                    </div>
                    {activeTask.completedBy && (
                      <div className="text-xs text-slate-700 flex items-center justify-between">
                        <span className="text-slate-500">{isEn ? 'Completed By' : 'Người hoàn thành'}:</span>
                        <div className="flex items-center gap-1 font-semibold text-emerald-900">
                          {activeTask.completedBy.avatar && (
                            <img src={activeTask.completedBy.avatar} className="w-4 h-4 rounded-full" alt="" />
                          )}
                          <span>{activeTask.completedBy.name}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Timestamps footer */}
                <div className="pt-2 text-[11px] text-slate-400 space-y-0.5">
                  <div>
                    {isEn ? 'Created at' : 'Khởi tạo'}: {formatDate(activeTask.createdAt)}
                  </div>
                  <div>
                    {isEn ? 'Updated at' : 'Cập nhật'}: {formatDate(activeTask.updatedAt)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
