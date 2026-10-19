import React, { useState } from 'react';
import {
  AlertTriangle,
  UserX,
  X,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  UserCheck,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ProjectMemberItem } from '../types/project.types';
import type { TaskDetailModalTask } from '@/features/tasks/components/TaskDetailModal';

interface RemoveMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: ProjectMemberItem | null;
  pendingTasks: TaskDetailModalTask[];
  availableMembers: ProjectMemberItem[];
  onConfirm: (reassignToUserId?: string) => Promise<void>;
}

export const RemoveMemberModal: React.FC<RemoveMemberModalProps> = ({
  isOpen,
  onClose,
  member,
  pendingTasks,
  availableMembers,
  onConfirm,
}) => {
  const { i18n } = useTranslation();
  const isEn = i18n.language.startsWith('en');

  const [reassignToUserId, setReassignToUserId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !member) return null;

  const hasPendingTasks = pendingTasks.length > 0;

  const handleConfirm = async () => {
    if (hasPendingTasks && !reassignToUserId) {
      setErrorMsg(
        isEn
          ? 'Please select a member to reassign pending tasks before removing.'
          : 'Vui lòng chọn thành viên tiếp nhận các nhiệm vụ chưa hoàn thành trước khi xóa.',
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await onConfirm(reassignToUserId || undefined);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : isEn
          ? 'Failed to remove member'
          : 'Không thể xóa thành viên khỏi dự án',
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                hasPendingTasks ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
              }`}
            >
              {hasPendingTasks ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <UserX className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEn ? 'Remove Project Member' : 'Xác Nhận Xóa Thành Viên'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEn ? 'Review member responsibilities and handover' : 'Kiểm tra nhiệm vụ và chuyển giao công việc'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Member info card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-center gap-3">
            {member.user.avatar ? (
              <img
                src={member.user.avatar}
                alt={member.user.name}
                className="w-11 h-11 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center">
                {member.user.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-slate-900 truncate">{member.user.name}</h4>
              <p className="text-xs text-slate-500 truncate">{member.user.email}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 uppercase">
                  {member.projectRole}
                </span>
                <span className="text-[11px] text-slate-500">
                  {pendingTasks.length}{' '}
                  {isEn ? 'active tasks in project' : 'nhiệm vụ đang phụ trách'}
                </span>
              </div>
            </div>
          </div>

          {/* Warning and pending tasks notice */}
          {hasPendingTasks ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs space-y-2">
                <div className="font-bold flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>
                    {isEn
                      ? `This member is currently assigned ${pendingTasks.length} unfinished task(s)!`
                      : `Thành viên này đang phụ trách ${pendingTasks.length} nhiệm vụ chưa hoàn thành!`}
                  </span>
                </div>
                <p className="text-amber-700 leading-relaxed">
                  {isEn
                    ? 'To maintain project continuity, you must select another team member to receive these tasks before removing.'
                    : 'Để đảm bảo tiến độ dự án không bị gián đoạn, bạn cần chỉ định một thành viên khác trong nhóm tiếp nhận các nhiệm vụ này trước khi xóa.'}
                </p>
              </div>

              {/* Tasks List */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  {isEn ? 'Unfinished Tasks to Reassign' : 'Danh Sách Nhiệm Vụ Cần Bàn Giao'} (
                  {pendingTasks.length})
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {pendingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-2.5 rounded-xl bg-white border border-slate-200 text-xs flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {task.status}
                          </span>
                          <span>•</span>
                          <span className="font-medium text-slate-600">{task.priority}</span>
                        </div>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-100 text-slate-600 shrink-0">
                        Pending
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Reassign dropdown selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                  <span>
                    {isEn
                      ? 'Reassign All Tasks To *'
                      : 'Chuyển Giao Toàn Bộ Nhiệm Vụ Cho *'}
                  </span>
                </label>
                <select
                  value={reassignToUserId}
                  onChange={(e) => setReassignToUserId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:border-blue-500 font-medium text-slate-800"
                >
                  <option value="">
                    {isEn ? '-- Select a replacement member --' : '-- Chọn thành viên tiếp nhận --'}
                  </option>
                  {availableMembers.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user.name} ({m.projectRole}) - {m.user.email}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  {isEn
                    ? 'The selected member will immediately receive notifications about their newly assigned tasks.'
                    : 'Thành viên được chọn sẽ nhận được thông báo về các nhiệm vụ được bàn giao này.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-slate-800">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  {isEn
                    ? 'This member has no active/unfinished tasks.'
                    : 'Thành viên này hiện không có nhiệm vụ chưa hoàn thành nào.'}
                </span>
              </div>
              <p className="leading-relaxed">
                {isEn
                  ? 'They will lose access to this project board, tasks, and private project documentation.'
                  : 'Thành viên sẽ bị gỡ quyền truy cập vào bảng công việc, tài liệu và các hoạt động của dự án này.'}
              </p>
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-xs font-bold rounded-xl text-slate-600 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            {isEn ? 'Cancel' : 'Hủy Bỏ'}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || (hasPendingTasks && !reassignToUserId)}
            className={`px-5 py-2.5 text-xs font-bold rounded-xl text-white shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
              hasPendingTasks
                ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                : 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
            }`}
          >
            {hasPendingTasks ? (
              <>
                <ArrowRight className="w-3.5 h-3.5" />
                <span>
                  {isSubmitting
                    ? isEn
                      ? 'Reassigning & Removing...'
                      : 'Đang Bàn Giao & Xóa...'
                    : isEn
                    ? 'Reassign Tasks & Remove'
                    : 'Bàn Giao Nhiệm Vụ & Xóa'}
                </span>
              </>
            ) : (
              <>
                <UserX className="w-3.5 h-3.5" />
                <span>
                  {isSubmitting
                    ? isEn
                      ? 'Removing Member...'
                      : 'Đang Xóa...'
                    : isEn
                    ? 'Confirm Removal'
                    : 'Xác Nhận Xóa'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
