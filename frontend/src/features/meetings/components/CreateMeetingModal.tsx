import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  Building2,
  MessageSquare,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';
import { useMeetingsStore } from '../stores/meetings.store';
import type { CreateMeetingInput, MeetingScope } from '../types/meeting.types';

interface ProjectOption {
  id: string;
  name: string;
  code?: string;
  departmentId?: string;
  pmId?: string;
}

interface UserOption {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role: string;
}

interface CreateMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultProjectId?: string;
}

export const CreateMeetingModal: React.FC<CreateMeetingModalProps> = ({
  isOpen,
  onClose,
  defaultProjectId,
}) => {
  const { user } = useAuthStore();
  const { createMeeting } = useMeetingsStore();

  const role = user?.role;
  const isDeptHead = role === 'DEPARTMENT_HEAD';
  const isPm = role === 'PM';
  const isAdmin = role === 'ADMIN';

  // Determine allowed scopes based on role
  const canCreateProject = isPm || isDeptHead || isAdmin;
  const canCreateDept = isDeptHead || isAdmin;

  const defaultScope: MeetingScope = canCreateProject
    ? 'PROJECT'
    : canCreateDept
    ? 'DEPARTMENT'
    : 'ONE_ON_ONE';

  const [scopeType, setScopeType] = useState<MeetingScope>(defaultScope);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState(defaultProjectId || '');
  const [oneOnOneUserId, setOneOnOneUserId] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);

  useEffect(() => {
    if (!isOpen) return;

    // Set initial start/end time (Next rounded hour, 1 hour duration in local time)
    const pad = (n: number) => n.toString().padStart(2, '0');
    const toLocalIso = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;

    const now = new Date();
    now.setHours(now.getHours() + 1, 0, 0, 0);
    const startStr = toLocalIso(now);
    const endDate = new Date(now.getTime() + 60 * 60 * 1000);
    const endStr = toLocalIso(endDate);

    setStartTime(startStr);
    setEndTime(endStr);

    // Fetch projects
    apiClient
      .get<ProjectOption[]>('/projects')
      .then((res) => setProjects(res.data))
      .catch(() => {});

    // Fetch users for 1-1
    apiClient
      .get<UserOption[]>('/users')
      .then((res) => setAllUsers(res.data.filter((u) => u.id !== user?.id)))
      .catch(() => {});
  }, [isOpen, user?.id]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Vui lòng nhập tiêu đề cuộc họp');
      return;
    }

    if (scopeType === 'PROJECT' && !projectId) {
      toast.error('Vui lòng chọn dự án cho cuộc họp');
      return;
    }

    if (scopeType === 'ONE_ON_ONE' && !oneOnOneUserId) {
      toast.error('Vui lòng chọn người bạn muốn họp 1-1 cùng');
      return;
    }

    const startIso = new Date(startTime).toISOString();
    const endIso = new Date(endTime).toISOString();

    if (new Date(endIso) <= new Date(startIso)) {
      toast.error('Thời gian kết thúc phải sau thời gian bắt đầu');
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateMeetingInput = {
        title: title.trim(),
        description: description.trim() || null,
        scopeType,
        projectId: scopeType === 'PROJECT' ? projectId : null,
        departmentId: scopeType === 'DEPARTMENT' ? user?.departmentId || null : null,
        startTime: startIso,
        endTime: endIso,
        attendeeIds: scopeType === 'ONE_ON_ONE' ? [oneOnOneUserId] : [],
      };

      await createMeeting(payload);
      toast.success('Đã lên lịch cuộc họp thành công!');
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Lỗi khi tạo cuộc họp');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h2 className="text-lg font-bold text-foreground">Lên lịch cuộc họp</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tạo phòng họp trực tuyến với phân quyền tự động theo phạm vi
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Scope Selector */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-2">
              Phạm vi cuộc họp
            </label>
            <div className="grid grid-cols-3 gap-2">
              {canCreateProject && (
                <button
                  type="button"
                  onClick={() => setScopeType('PROJECT')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                    scopeType === 'PROJECT'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-600 ring-2 ring-blue-600/20'
                      : 'border-border text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <Briefcase className="w-4 h-4 text-blue-600" />
                  <span>Dự án</span>
                  <span className="text-[10px] text-muted-foreground">Team + PM</span>
                </button>
              )}

              {canCreateDept && (
                <button
                  type="button"
                  onClick={() => setScopeType('DEPARTMENT')}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                    scopeType === 'DEPARTMENT'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-600 ring-2 ring-emerald-600/20'
                      : 'border-border text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>Phòng ban</span>
                  <span className="text-[10px] text-muted-foreground">Cả phòng</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setScopeType('ONE_ON_ONE')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                  scopeType === 'ONE_ON_ONE'
                    ? 'border-slate-600 bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-500 ring-2 ring-slate-600/20'
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <MessageSquare className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                <span>1-on-1</span>
                <span className="text-[10px] text-muted-foreground">Cá nhân</span>
              </button>
            </div>
          </div>

          {/* Scope-specific inputs */}
          {scopeType === 'PROJECT' && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Chọn Dự án <span className="text-rose-500">*</span>
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
                required
              >
                <option value="">-- Chọn dự án --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.code ? `(${p.code})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">
                Thành viên dự án và Trưởng phòng sẽ được tự động mời.
              </p>
            </div>
          )}

          {scopeType === 'DEPARTMENT' && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
              <p className="font-semibold flex items-center gap-1.5 mb-0.5">
                <Building2 className="w-3.5 h-3.5" /> Cuộc họp toàn phòng ban
              </p>
              <p>Tất cả nhân sự trong phòng ban sẽ được tự động thêm vào danh sách mời.</p>
            </div>
          )}

          {scopeType === 'ONE_ON_ONE' && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                Chọn người tham gia <span className="text-rose-500">*</span>
              </label>
              <select
                value={oneOnOneUserId}
                onChange={(e) => setOneOnOneUserId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
                required
              >
                <option value="">-- Chọn đồng nghiệp --</option>
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.email} - {u.role})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              Tiêu đề cuộc họp <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Daily Standup, Sprint Planning, 1-1 Review..."
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Mục tiêu / Agenda</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Nội dung tóm tắt hoặc mục tiêu cuộc họp..."
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
            />
          </div>

          {/* Date & Time Pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Bắt đầu</label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Kết thúc</label>
              <input
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
                required
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-colors disabled:opacity-50 shadow-xs"
            >
              {submitting ? 'Đang tạo...' : 'Tạo cuộc họp'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
