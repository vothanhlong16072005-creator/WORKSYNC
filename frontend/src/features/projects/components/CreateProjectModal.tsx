/**
 * CreateProjectModal — M3.5
 * Modal cho phép Trưởng phòng (DEPARTMENT_HEAD) hoặc Admin tạo dự án:
 *  - Nhập tên dự án & mô tả yêu cầu dự án
 *  - Chọn định hướng quy trình: SCRUM (Sprint Agile) hoặc KANBAN
 *  - Chỉ định Project Manager (PM) từ nhân sự phòng ban
 *  - Chọn ngày bắt đầu & kết thúc dự kiến
 *  - Tùy chọn gán nhân sự ban đầu cho dự án
 *  - Chọn màu sắc nhận diện
 *
 * Design: Modern Enterprise Bauhaus SaaS
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, FolderPlus, UserCheck, Calendar, Palette, Layers, Users, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { useProjectStore } from '@/stores/project.store';
import { getErrorMessage } from '@/features/attendance/utils/error-handler';

export interface AssignableMember {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  position: string | null;
  role: string;
  departmentId: string | null;
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  departmentId?: string;
}

const COLOR_PALETTE = [
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#06B6D4', // Cyan
  '#F43F5E', // Rose
];

export function CreateProjectModal({ isOpen, onClose, onSuccess, departmentId }: CreateProjectModalProps) {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');
  const { loadMine } = useProjectStore();

  const [members, setMembers] = useState<AssignableMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [workflowType, setWorkflowType] = useState<'SCRUM' | 'KANBAN'>('SCRUM');
  const [pmId, setPmId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [color, setColor] = useState(COLOR_PALETTE[0]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Load assignable users when opened
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void (async () => {
      setLoadingMembers(true);
      try {
        const res = await apiClient.get<AssignableMember[]>('/users/assignable');
        if (!cancelled) {
          setMembers(res.data);
          // Auto select first member or PM as PM
          if (res.data.length > 0 && !pmId) {
            const firstPm = res.data.find((m) => m.role === 'PM') || res.data[0];
            setPmId(firstPm.id);
          }
        }
      } catch (err: unknown) {
        if (!cancelled) {
          toast.error(getErrorMessage(err, isVi ? 'Lỗi tải danh sách nhân viên' : 'Failed to load users'));
        }
      } finally {
        if (!cancelled) setLoadingMembers(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, isVi, pmId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setName('');
      setDescription('');
      setWorkflowType('SCRUM');
      setStartDate('');
      setEndDate('');
      setColor(COLOR_PALETTE[0]);
      setSelectedMemberIds([]);
      setSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleMemberSelection = (id: string) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((mId) => mId !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error(isVi ? 'Vui lòng nhập tên dự án' : 'Please enter project name');
      return;
    }

    setSubmitting(true);
    try {
      await apiClient.post('/projects', {
        name: name.trim(),
        description: description.trim() || undefined,
        workflowType,
        pmId: pmId || undefined,
        departmentId: departmentId || undefined,
        color,
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        endDate: endDate ? new Date(endDate).toISOString() : undefined,
        initialMemberIds: selectedMemberIds,
      });

      toast.success(
        isVi
          ? 'Tạo dự án thành công! PM đã được chỉ định.'
          : 'Project created successfully! PM has been assigned.',
      );
      void loadMine();
      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, isVi ? 'Lỗi tạo dự án' : 'Failed to create project'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden my-8 animate-scale-up">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center shrink-0">
              <FolderPlus className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">
                {isVi ? 'Tạo Dự Án Mới Cho Phòng Ban' : 'Create New Department Project'}
              </h2>
              <p className="text-xs text-blue-100 mt-0.5">
                {isVi
                  ? 'Định hướng yêu cầu, chọn quy trình (Sprint/Kanban) và chỉ định PM quản lý'
                  : 'Define requirements, workflow direction, and assign Project Manager'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
          {/* 1. Tên dự án */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
              {isVi ? 'Tên dự án' : 'Project Name'} <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isVi ? 'VD: Nền tảng chấm công AI Mobile v3.2...' : 'e.g. WorkSync Mobile App'}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm font-semibold text-slate-900 transition-all"
            />
          </div>

          {/* 2. Yêu cầu & Mô tả dự án */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              {isVi ? 'Yêu cầu & Định hướng của Trưởng phòng' : 'Requirements & Scope'}
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                isVi
                  ? 'Nêu rõ mục tiêu kinh doanh, phạm vi công việc, chỉ tiêu chất lượng và yêu cầu kỹ thuật cho PM...'
                  : 'Detail project goals, scope, and technical requirements for the PM...'
              }
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs text-slate-800 transition-all resize-none"
            />
          </div>

          {/* 3. Quy trình & Định hướng: SCRUM vs KANBAN */}
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              {isVi ? 'Định hướng phương pháp làm việc' : 'Workflow Methodology'}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setWorkflowType('SCRUM')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  workflowType === 'SCRUM'
                    ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/30'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    🚀 {isVi ? 'Scrum (Sprint Agile)' : 'Scrum (Agile Sprints)'}
                  </span>
                  {workflowType === 'SCRUM' && (
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  {isVi
                    ? 'Chia theo chu kỳ Sprint 2 tuần, theo dõi Burndown chart, Story points & Velocity.'
                    : '2-week iterative sprints with burndown tracking, story points, and velocity.'}
                </p>
              </button>

              <button
                type="button"
                onClick={() => setWorkflowType('KANBAN')}
                className={`p-3.5 rounded-2xl border text-left transition-all ${
                  workflowType === 'KANBAN'
                    ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/30'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                    📋 {isVi ? 'Kanban (Luồng liên tục)' : 'Kanban (Continuous)'}
                  </span>
                  {workflowType === 'KANBAN' && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  {isVi
                    ? 'Quản lý task trực quan trên bảng Kanban, không gò bó sprint, tối ưu thời gian giao việc.'
                    : 'Flexible continuous flow board, ideal for maintenance and steady operational tasks.'}
                </p>
              </button>
            </div>
          </div>

          {/* 4. Chỉ định PM & Màu nhận diện */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-indigo-600" />
                {isVi ? 'Chỉ định Project Manager (PM)' : 'Assign Project Manager'} <span className="text-rose-500">*</span>
              </label>
              <select
                value={pmId}
                onChange={(e) => setPmId(e.target.value)}
                disabled={loadingMembers}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs font-bold text-slate-800 bg-white transition-all"
              >
                {loadingMembers ? (
                  <option>Đang tải nhân sự...</option>
                ) : members.length === 0 ? (
                  <option value="">Chưa có nhân sự</option>
                ) : (
                  members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.position || m.role})
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-amber-600" />
                {isVi ? 'Màu nhận diện' : 'Project Color'}
              </label>
              <div className="flex items-center gap-2 pt-1">
                {COLOR_PALETTE.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-xl transition-transform ${
                      color === c ? 'scale-110 ring-2 ring-offset-2 ring-slate-800' : 'hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 5. Thời gian dự kiến */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {isVi ? 'Ngày bắt đầu' : 'Start Date'}
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs font-medium text-slate-800 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                {isVi ? 'Hạn hoàn thành (Deadline)' : 'Target End Date'}
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs font-medium text-slate-800 transition-all"
              />
            </div>
          </div>

          {/* 6. Chọn nhân sự ban đầu giao cho PM (Tùy chọn) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                {isVi
                  ? `Nhân sự phòng ban ban đầu (${selectedMemberIds.length}/${members.length})`
                  : `Initial Team Members (${selectedMemberIds.length})`}
              </label>
              <span className="text-[11px] text-slate-500">
                {isVi ? '(PM có thể tùy chỉnh thêm sau)' : '(PM can add more later)'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 rounded-2xl border border-slate-200/80">
              {members.map((m) => {
                const isSelected = selectedMemberIds.includes(m.id) || m.id === pmId;
                const isCurrentPm = m.id === pmId;
                return (
                  <label
                    key={m.id}
                    className={`flex items-center gap-2.5 p-2 rounded-xl cursor-pointer text-xs transition-colors ${
                      isSelected ? 'bg-blue-100/70 text-blue-900 font-bold' : 'hover:bg-slate-200/60 text-slate-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={isCurrentPm}
                      onChange={() => toggleMemberSelection(m.id)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 rounded-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="truncate">
                        {m.name} {isCurrentPm && <span className="text-[10px] text-indigo-700 font-black">(PM)</span>}
                      </p>
                      <p className="text-[10px] text-slate-500 truncate">{m.position || m.email}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {isVi ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {submitting
                ? isVi
                  ? 'Đang khởi tạo...'
                  : 'Creating...'
                : isVi
                ? '+ Tạo dự án & Giao PM'
                : '+ Create Project & Assign PM'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
