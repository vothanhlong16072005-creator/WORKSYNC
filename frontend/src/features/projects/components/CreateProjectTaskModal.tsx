import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  X,
  CheckSquare,
  User,
  Calendar,
  Flag,
  Layers,
  Tag,
  Clock,
  Sparkles,
  AlertCircle,
  Hash,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import type { Sprint } from '@/features/sprints/types/sprint.types';

interface ProjectMemberUser {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
}

interface ProjectMemberItem {
  userId: string;
  projectRole: string;
  user: ProjectMemberUser;
}

interface CreateProjectTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
  projectName?: string;
  members: ProjectMemberItem[];
  sprints?: Sprint[];
  defaultSprintId?: string;
}

const COMMON_TAGS = ['FEATURE', 'BUG', 'UI/UX', 'BACKEND', 'FRONTEND', 'DEVOPS', 'API'];

export const CreateProjectTaskModal: React.FC<CreateProjectTaskModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  projectName,
  members,
  sprints = [],
  defaultSprintId,
}) => {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [status, setStatus] = useState<'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE'>('TODO');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [storyPoints, setStoryPoints] = useState<string>('');
  const [timeEstimate, setTimeEstimate] = useState<string>('');
  const [sprintId, setSprintId] = useState<string>(defaultSprintId || '');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setSprintId(defaultSprintId || '');
    }
  }, [defaultSprintId, isOpen]);

  if (!isOpen) return null;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const handleAddCustomTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && customTagInput.trim()) {
      e.preventDefault();
      const formatted = customTagInput.trim().toUpperCase();
      if (!selectedTags.includes(formatted)) {
        setSelectedTags((prev) => [...prev, formatted]);
      }
      setCustomTagInput('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg(isEn ? 'Task title is required' : 'Vui lòng nhập tiêu đề công việc');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || undefined,
        projectId,
        status,
        priority,
        labels: selectedTags,
      };

      if (assigneeId) {
        payload.assigneeId = assigneeId;
      }
      if (sprintId) {
        payload.sprintId = sprintId;
      }
      if (dueDate) {
        payload.dueDate = new Date(dueDate).toISOString();
      }
      if (storyPoints) {
        payload.storyPoints = parseInt(storyPoints, 10);
      }
      if (timeEstimate) {
        payload.timeEstimate = parseInt(timeEstimate, 10);
      }

      await apiClient.post('/tasks', payload);

      const assignedMember = members.find((m) => m.userId === assigneeId)?.user;
      const successMsg = isEn ? 'Task created successfully' : 'Tạo công việc thành công';
      const descMsg = assignedMember
        ? isEn
          ? `Assigned to ${assignedMember.name} (Notification sent)`
          : `Đã phân công cho ${assignedMember.name} và gửi thông báo trực tiếp`
        : isEn
        ? 'Added to project task backlog'
        : 'Đã thêm vào danh sách công việc dự án';

      toast.success(successMsg, { description: descMsg });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : isEn
          ? 'Failed to create task'
          : 'Không thể tạo công việc';
      setErrorMsg(message);
      toast.error(isEn ? 'Creation failed' : 'Lỗi khi tạo công việc', { description: message });
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
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden z-10 my-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                {isEn ? 'Create Project Task' : 'Tạo Công Việc Dự Án'}
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label htmlFor="input-task-title" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {isEn ? 'Task Title' : 'Tiêu Đề Công Việc'}{' '}
              <span className="text-rose-500">*</span>
            </label>
            <input
              id="input-task-title"
              type="text"
              required
              autoFocus
              placeholder={isEn ? 'e.g. Implement authentication middleware...' : 'Ví dụ: Thiết kế giao diện báo cáo tổng hợp...'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 font-medium placeholder:text-slate-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              {isEn ? 'Description & Acceptance Criteria' : 'Mô Tả & Tiêu Chí Nghiệm Thu'}
            </label>
            <textarea
              rows={3}
              placeholder={isEn ? 'Detailed requirements, deliverables, or checklist...' : 'Mô tả chi tiết nội dung, hướng dẫn thực hiện hoặc tiêu chí nghiệm thu...'}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 placeholder:text-slate-400 leading-relaxed"
            />
          </div>

          {/* Grid: Assignee & Sprint */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Assignee */}
            <div>
              <label htmlFor="select-task-assignee" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>{isEn ? 'Assign To (Member)' : 'Giao Cho Thành Viên'}</span>
              </label>
              <select
                id="select-task-assignee"
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 font-medium"
              >
                <option value="">{isEn ? '-- Unassigned --' : '-- Chưa phân công --'}</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.user.name} ({m.projectRole}) - {m.user.email}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                {isEn
                  ? 'The assignee will immediately receive a real-time notification.'
                  : 'Thành viên được giao sẽ nhận được thông báo tức thời ngay khi tạo.'}
              </p>
            </div>

            {/* Sprint (if SCRUM) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-400" />
                <span>{isEn ? 'Sprint / Backlog' : 'Sprint / Phân Bổ'}</span>
              </label>
              <select
                value={sprintId}
                onChange={(e) => setSprintId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 font-medium"
              >
                <option value="">{isEn ? 'Backlog (No Sprint)' : 'Backlog (Chưa vào Sprint)'}</option>
                {sprints.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Grid: Status & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <CheckSquare className="w-3.5 h-3.5 text-slate-400" />
                <span>{isEn ? 'Initial Status' : 'Trạng Thái Ban Đầu'}</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 font-medium"
              >
                <option value="TODO">Cần làm (TODO)</option>
                <option value="IN_PROGRESS">Đang làm (IN_PROGRESS)</option>
                <option value="REVIEW">Đang duyệt (REVIEW)</option>
                <option value="DONE">Hoàn thành (DONE)</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-slate-400" />
                <span>{isEn ? 'Priority' : 'Độ Ưu Tiên'}</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 font-medium"
              >
                <option value="LOW">{isEn ? 'Low' : 'Thấp (LOW)'}</option>
                <option value="MEDIUM">{isEn ? 'Medium' : 'Trung bình (MEDIUM)'}</option>
                <option value="HIGH">{isEn ? 'High' : 'Cao (HIGH)'}</option>
                <option value="URGENT">{isEn ? 'Urgent' : 'Khẩn cấp (URGENT)'}</option>
              </select>
            </div>
          </div>

          {/* Grid: Due Date, Story Points, Time Estimate */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Due Date */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{isEn ? 'Deadline' : 'Hạn Chót'}</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 font-medium"
              />
            </div>

            {/* Story Points */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                <span>Story Points</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="1, 2, 3, 5, 8..."
                value={storyPoints}
                onChange={(e) => setStoryPoints(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 font-medium"
              />
            </div>

            {/* Time Estimate */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>{isEn ? 'Est. Hours' : 'Ước Lượng (Giờ)'}</span>
              </label>
              <input
                type="number"
                min="0"
                max="500"
                placeholder="Số giờ..."
                value={timeEstimate}
                onChange={(e) => setTimeEstimate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900 font-medium"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span>{isEn ? 'Tags / Labels' : 'Nhãn / Phân Loại'}</span>
            </label>
            <div className="flex flex-wrap items-center gap-1.5 mb-2">
              {COMMON_TAGS.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
            <input
              type="text"
              placeholder={isEn ? 'Type custom tag and press Enter...' : 'Gõ tag tự do và nhấn Enter...'}
              value={customTagInput}
              onChange={(e) => setCustomTagInput(e.target.value)}
              onKeyDown={handleAddCustomTag}
              className="w-full px-3 py-1.5 text-xs bg-slate-50/60 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-500 text-slate-900"
            />
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
              id="btn-submit-create-task"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white shadow-md shadow-blue-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {isSubmitting
                  ? isEn
                    ? 'Creating Task...'
                    : 'Đang Tạo Task...'
                  : isEn
                  ? 'Create Task'
                  : 'Tạo Công Việc'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
