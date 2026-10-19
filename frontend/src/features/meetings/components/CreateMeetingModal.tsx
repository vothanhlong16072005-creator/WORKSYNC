import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Briefcase,
  Building2,
  Users,
  X,
  Check,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
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
  position?: string;
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
  const { t } = useTranslation();
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
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
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
    setSelectedUserIds([]);
    setUserSearchQuery('');

    // Fetch projects
    apiClient
      .get<ProjectOption[]>('/projects')
      .then((res) => setProjects(res.data))
      .catch(() => {});

    // Fetch users for custom / internal meetings
    apiClient
      .get<UserOption[]>('/users')
      .then((res) => setAllUsers(res.data.filter((u) => u.id !== user?.id)))
      .catch(() => {});
  }, [isOpen, user?.id]);

  if (!isOpen) return null;

  const toggleSelectUser = (id: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const filteredUsers = allUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearchQuery.toLowerCase()),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error(t('meetings.error_title_required', 'Vui lòng nhập tiêu đề cuộc họp'));
      return;
    }

    if (scopeType === 'PROJECT' && !projectId) {
      toast.error(t('meetings.error_project_required', 'Vui lòng chọn dự án cho cuộc họp'));
      return;
    }

    if (scopeType === 'ONE_ON_ONE' && selectedUserIds.length === 0) {
      toast.error(t('meetings.error_colleagues_required', 'Vui lòng chọn ít nhất 1 đồng nghiệp để mời'));
      return;
    }

    const startIso = new Date(startTime).toISOString();
    const endIso = new Date(endTime).toISOString();

    if (new Date(endIso) <= new Date(startIso)) {
      toast.error(t('meetings.error_end_time_invalid', 'Thời gian kết thúc phải sau thời gian bắt đầu'));
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
        attendeeIds: scopeType === 'ONE_ON_ONE' ? selectedUserIds : [],
      };

      await createMeeting(payload);
      toast.success(t('meetings.create_success', 'Đã lên lịch cuộc họp thành công!'));
      onClose();
    } catch (err: any) {
      toast.error(err.message || t('meetings.create_failed', 'Lỗi khi tạo cuộc họp'));
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6 text-foreground animate-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-border shrink-0">
          <div>
            <h2 className="text-base font-bold text-foreground">
              {t('meetings.create_modal_title', 'Lên lịch cuộc họp')}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t('meetings.create_modal_desc', 'Tạo phòng họp trực tuyến với phân quyền tự động theo phạm vi')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Scope Selector */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-2">
              {t('meetings.scope_label', 'Phạm vi cuộc họp')}
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
                  <span className="font-semibold">{t('meetings.scope_project', 'Dự án')}</span>
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
                  <span className="font-semibold">{t('meetings.scope_department', 'Phòng ban')}</span>
                  <span className="text-[10px] text-muted-foreground">Toàn phòng</span>
                </button>
              )}

              {/* ⭐ Requirement 1: Rebranded from 1-on-1 to Cuộc họp tự do (Custom/Colleagues) */}
              <button
                type="button"
                onClick={() => setScopeType('ONE_ON_ONE')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${
                  scopeType === 'ONE_ON_ONE'
                    ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 ring-2 ring-blue-600/20'
                    : 'border-border text-muted-foreground hover:bg-muted/50'
                }`}
              >
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span className="font-semibold">{t('meetings.scope_custom', 'Cuộc họp tự do')}</span>
                <span className="text-[10px] text-muted-foreground">{t('meetings.scope_custom_sub', 'Tự chọn người')}</span>
              </button>
            </div>
          </div>

          {/* Scope-specific inputs: PROJECT */}
          {scopeType === 'PROJECT' && (
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                {t('meetings.select_project', 'Chọn Dự án')} <span className="text-rose-500">*</span>
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs sm:text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
                required
              >
                <option value="">-- {t('meetings.choose_project', 'Chọn dự án')} --</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.code ? `(${p.code})` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-muted-foreground mt-1">
                {t('meetings.project_auto_invite', 'Thành viên dự án và Trưởng phòng sẽ được tự động mời.')}
              </p>
            </div>
          )}

          {/* Scope-specific inputs: DEPARTMENT */}
          {scopeType === 'DEPARTMENT' && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
              <p className="font-semibold flex items-center gap-1.5 mb-0.5">
                <Building2 className="w-3.5 h-3.5" /> {t('meetings.department_meeting', 'Cuộc họp toàn phòng ban')}
              </p>
              <p>{t('meetings.department_auto_invite', 'Tất cả nhân sự trong phòng ban sẽ được tự động thêm vào danh sách mời.')}</p>
            </div>
          )}

          {/* Scope-specific inputs: CUSTOM / COLLEAGUES (Replaced 1-on-1) */}
          {scopeType === 'ONE_ON_ONE' && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-foreground">
                  {t('meetings.select_attendees', 'Chọn người tham gia')} <span className="text-rose-500">*</span>
                </label>
                <span className="text-[11px] text-blue-600 font-semibold">
                  {selectedUserIds.length} {t('meetings.attendees_selected', 'người đã chọn')}
                </span>
              </div>

              {/* Colleague Search Filter */}
              <div className="relative mb-2">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder={t('meetings.search_colleagues', 'Tìm theo tên, email hoặc vai trò...')}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
                />
              </div>

              {/* Colleague Selectable List */}
              <div className="max-h-36 overflow-y-auto border border-border rounded-xl p-1.5 space-y-1 bg-background">
                {filteredUsers.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground">
                    {t('meetings.no_colleagues_found', 'Không tìm thấy đồng nghiệp phù hợp')}
                  </div>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelected = selectedUserIds.includes(u.id);
                    return (
                      <div
                        key={u.id}
                        onClick={() => toggleSelectUser(u.id)}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-all ${
                          isSelected
                            ? 'bg-blue-50 text-blue-900 border border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800'
                            : 'hover:bg-muted text-foreground'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-bold flex items-center justify-center shrink-0">
                            {u.avatar ? (
                              <img src={u.avatar} alt={u.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              u.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{u.name}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{u.email} • {u.role}</p>
                          </div>
                        </div>

                        <div
                          className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'bg-blue-600 border-blue-600 text-white'
                              : 'border-slate-300 dark:border-slate-600'
                          }`}
                        >
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              {t('meetings.title_label', 'Tiêu đề cuộc họp')} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('meetings.title_placeholder', 'VD: Daily Standup, Trao đổi công việc...')}
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs sm:text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">
              {t('meetings.agenda_label', 'Mục tiêu / Agenda')}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder={t('meetings.agenda_placeholder', 'Nội dung tóm tắt hoặc mục tiêu cuộc họp...')}
              className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs sm:text-sm text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
            />
          </div>

          {/* Date & Time Pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                {t('meetings.start_time', 'Bắt đầu')}
              </label>
              <input
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-input bg-background text-xs text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">
                {t('meetings.end_time', 'Kết thúc')}
              </label>
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
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-border shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
            >
              {t('common.cancel', 'Hủy')}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-colors disabled:opacity-50 shadow-xs"
            >
              {submitting ? t('common.creating', 'Đang tạo...') : t('meetings.create_btn', 'Tạo cuộc họp')}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
};
