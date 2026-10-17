/**
 * QuickTaskModal — M3.5
 * Modal giao việc nhanh cho nhân viên (không qua sprint).
 *
 * Mở từ:
 *  - QuickTaskButton (Header) - dành cho PM/DEPT_HEAD/Admin
 *  - Trang QuickTasksPage
 *
 * Design: Modern Enterprise SaaS + Bauhaus Accents (đồng nhất với LeaveRequestModal)
 */
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Zap, User, Calendar, Flag, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useQuickTaskStore } from '../stores/quick-task.store';
import { usersApi, type AssignableUser } from '@/features/users/api/users.api';
import { useAuthStore } from '@/stores/auth.store';
import { getErrorMessage } from '@/features/attendance/utils/error-handler';
import type { Priority } from '../types/quick-task.types';

interface QuickTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedAssigneeId?: string;
}

const PRIORITY_OPTIONS: { value: Priority; label: string; color: string; dotColor: string }[] = [
  { value: 'LOW', label: 'Thấp', color: 'text-slate-600', dotColor: 'bg-slate-400' },
  { value: 'MEDIUM', label: 'Trung bình', color: 'text-amber-700', dotColor: 'bg-amber-500' },
  { value: 'HIGH', label: 'Cao', color: 'text-orange-700', dotColor: 'bg-orange-500' },
  { value: 'URGENT', label: 'Khẩn cấp', color: 'text-rose-700', dotColor: 'bg-rose-500' },
];

function defaultDueDate(): string {
  // tomorrow 17:00 local
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(17, 0, 0, 0);
  // Format as datetime-local string
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function QuickTaskModal({ isOpen, onClose, preselectedAssigneeId }: QuickTaskModalProps) {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');
  const { user } = useAuthStore();
  const { create } = useQuickTaskStore();

  const [assignableUsers, setAssignableUsers] = useState<AssignableUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [assigneeId, setAssigneeId] = useState<string>(preselectedAssigneeId ?? '');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState<string>(defaultDueDate());
  const [priority, setPriority] = useState<Priority>('MEDIUM');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load assignable users when opened
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void (async () => {
      setLoadingUsers(true);
      try {
        const data = await usersApi.getAssignable();
        if (!cancelled) {
          setAssignableUsers(data);
          // Auto-select preselected or first user
          if (preselectedAssigneeId) {
            setAssigneeId(preselectedAssigneeId);
          } else if (data.length > 0 && !assigneeId) {
            setAssigneeId(data[0].id);
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          toast.error(getErrorMessage(err, isVi ? 'Lỗi tải danh sách nhân viên' : 'Failed to load users'));
        }
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, preselectedAssigneeId, isVi, assigneeId]);

  // Reset form when closed
  useEffect(() => {
    if (!isOpen) {
      setTitle('');
      setDescription('');
      setDueDate(defaultDueDate());
      setPriority('MEDIUM');
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const isOverdue = useMemo(() => {
    if (!dueDate) return false;
    return new Date(dueDate) <= new Date();
  }, [dueDate]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error(isVi ? 'Vui lòng nhập tiêu đề công việc' : 'Please enter a title');
      return;
    }
    if (!assigneeId) {
      toast.error(isVi ? 'Vui lòng chọn người nhận' : 'Please select an assignee');
      return;
    }
    if (isOverdue) {
      toast.error(isVi ? 'Hạn chót phải sau thời điểm hiện tại' : 'Due date must be in the future');
      return;
    }

    setIsSubmitting(true);
    try {
      await create({
        title: title.trim(),
        description: description.trim() || undefined,
        assigneeId,
        dueDate: new Date(dueDate).toISOString(),
        priority,
      });
      toast.success(
        isVi
          ? `Đã giao việc cho ${assignableUsers.find((u) => u.id === assigneeId)?.name ?? 'nhân viên'}!`
          : 'Task assigned successfully!',
      );
      onClose();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, isVi ? 'Lỗi khi giao việc' : 'Failed to assign task'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentRole = user?.role;
  const helpText = isVi
    ? currentRole === 'DEPARTMENT_HEAD'
      ? 'Bạn chỉ có thể giao cho nhân viên cùng phòng ban'
      : currentRole === 'PM'
        ? 'Bạn có thể giao cá nhân hoặc chọn project mình quản lý'
        : 'Bạn có thể giao cho bất kỳ nhân viên nào'
    : 'Pick a teammate and a deadline';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-task-modal-title"
    >
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl max-w-lg w-full overflow-hidden transition-all">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 id="quick-task-modal-title" className="text-sm font-bold text-slate-900">
                {isVi ? 'Giao việc nhanh (Quick Task)' : 'Assign Quick Task'}
              </h3>
              <span className="text-[11px] text-slate-500 font-medium">{helpText}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label={isVi ? 'Đóng' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isVi ? 'Tiêu đề công việc' : 'Task Title'}
              <span className="text-rose-500 ml-0.5">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isVi ? 'VD: Duyệt báo giá nhà cung cấp X' : 'e.g., Review vendor proposal'}
              className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-900"
            />
          </div>

          {/* Description (optional) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              {isVi ? 'Mô tả chi tiết (tuỳ chọn)' : 'Description (optional)'}
            </label>
            <textarea
              rows={2}
              maxLength={2000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={isVi ? 'Thêm ngữ cảnh, link tài liệu, deadline nội bộ...' : 'Add context, links, internal deadlines...'}
              className="w-full p-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-900 resize-none"
            />
          </div>

          {/* Assignee + Due date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <User className="w-3 h-3 text-slate-500" />
                {isVi ? 'Người nhận' : 'Assignee'}
                <span className="text-rose-500 ml-0.5">*</span>
              </label>
              <select
                required
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                disabled={loadingUsers}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-900 bg-white disabled:opacity-50"
              >
                {loadingUsers ? (
                  <option value="">{isVi ? 'Đang tải...' : 'Loading...'}</option>
                ) : assignableUsers.length === 0 ? (
                  <option value="">{isVi ? 'Không có nhân viên khả dụng' : 'No assignable users'}</option>
                ) : (
                  assignableUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                      {u.position ? ` — ${u.position}` : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                {isVi ? 'Hạn chót' : 'Due date'}
              </label>
              <input
                type="datetime-local"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-10 px-3 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium text-slate-900"
              />
            </div>
          </div>

          {/* Priority selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1">
              <Flag className="w-3 h-3 text-slate-500" />
              {isVi ? 'Độ ưu tiên' : 'Priority'}
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {PRIORITY_OPTIONS.map((opt) => {
                const active = priority === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPriority(opt.value)}
                    className={`flex items-center justify-center gap-1.5 h-9 px-2 rounded-xl border text-[11px] font-bold transition-all ${
                      active
                        ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${opt.dotColor}`} />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {isOverdue && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>
                {isVi
                  ? 'Hạn chót phải sau thời điểm hiện tại. Vui lòng chọn lại.'
                  : 'Due date must be in the future. Please adjust.'}
              </span>
            </div>
          )}

          {/* Footer */}
          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              {isVi ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isOverdue || !title.trim() || !assigneeId}
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>
                {isSubmitting
                  ? isVi
                    ? 'Đang giao...'
                    : 'Assigning...'
                  : isVi
                    ? 'Giao việc'
                    : 'Assign Task'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
