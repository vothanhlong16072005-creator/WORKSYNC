import React from 'react';
import {
  X,
  Mail,
  Copy,
  Check,
  Zap,
  FolderKanban,
  ExternalLink,
  Shield,
  Layers,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ProjectMemberItem } from '../types/project.types';
import type { TaskDetailModalTask } from '@/features/tasks/components/TaskDetailModal';

interface MemberProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: ProjectMemberItem | null;
  projectName?: string;
  memberTasks: TaskDetailModalTask[];
  onSelectTask?: (task: TaskDetailModalTask) => void;
}

export const MemberProfileModal: React.FC<MemberProfileModalProps> = ({
  isOpen,
  onClose,
  member,
  projectName,
  memberTasks,
  onSelectTask,
}) => {
  const { i18n } = useTranslation();
  const isEn = i18n.language.startsWith('en');
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !member) return null;

  const totalTasks = memberTasks.length;
  const doneTasks = memberTasks.filter((t) => t.status === 'DONE').length;
  const inProgressTasks = memberTasks.filter(
    (t) => t.status === 'IN_PROGRESS' || t.status === 'IN_REVIEW',
  ).length;
  const completionRate = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const totalStoryPoints = memberTasks.reduce(
    (acc, t) => acc + (typeof t.storyPoints === 'number' ? t.storyPoints : 0),
    0,
  );

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(member.user.email);
    setCopied(true);
    toast.success(
      isEn ? 'Email copied to clipboard' : 'Đã sao chép địa chỉ email vào bộ nhớ tạm',
    );
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Banner with gradient */}
        <div className="relative h-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-4 flex items-start justify-end">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white backdrop-blur-md transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Header */}
        <div className="px-6 pb-4 pt-0 relative border-b border-slate-100">
          <div className="flex flex-wrap items-end justify-between gap-4 -mt-12 mb-3">
            <div className="relative">
              {member.user.avatar ? (
                <img
                  src={member.user.avatar}
                  alt={member.user.name}
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-white shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black text-2xl flex items-center justify-center border-4 border-white shadow-md">
                  {member.user.name.charAt(0)}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyEmail}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? (isEn ? 'Copied' : 'Đã sao chép') : isEn ? 'Copy Email' : 'Sao chép Email'}</span>
              </button>
              <a
                href={`mailto:${member.user.email}`}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{isEn ? 'Send Email' : 'Gửi Mail'}</span>
              </a>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">{member.user.name}</h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 uppercase flex items-center gap-1">
                <Shield className="w-3 h-3" />
                {member.projectRole}
              </span>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>{member.user.email}</span>
            </p>
            {projectName && (
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                <FolderKanban className="w-3.5 h-3.5" />
                <span>{projectName}</span>
              </p>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="p-6 space-y-5 overflow-y-auto">
          <div>
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2.5">
              {isEn ? 'Project Contribution & Metrics' : 'Đóng Góp Trong Dự Án'}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {isEn ? 'Total Tasks' : 'Tổng Nhiệm Vụ'}
                </span>
                <p className="text-xl font-black text-slate-900 mt-0.5">{totalTasks}</p>
              </div>

              <div className="p-3 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
                <span className="text-[10px] font-bold text-emerald-600 uppercase">
                  {isEn ? 'Completed' : 'Đã Hoàn Thành'}
                </span>
                <p className="text-xl font-black text-emerald-700 mt-0.5">
                  {doneTasks}{' '}
                  <span className="text-xs font-bold text-emerald-600">({completionRate}%)</span>
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200/80">
                <span className="text-[10px] font-bold text-blue-600 uppercase">
                  {isEn ? 'In Progress' : 'Đang Làm'}
                </span>
                <p className="text-xl font-black text-blue-700 mt-0.5">{inProgressTasks}</p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200/80">
                <span className="text-[10px] font-bold text-amber-600 uppercase">
                  {isEn ? 'Story Points' : 'Story Points'}
                </span>
                <p className="text-xl font-black text-amber-700 mt-0.5">{totalStoryPoints}</p>
              </div>
            </div>
          </div>

          {/* Assigned Tasks List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>
                  {isEn ? 'Assigned Tasks' : 'Danh Sách Nhiệm Vụ Được Giao'} ({memberTasks.length})
                </span>
              </h4>
            </div>

            {memberTasks.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                {isEn ? 'No tasks assigned yet in this project.' : 'Chưa có nhiệm vụ nào được giao trong dự án này.'}
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {memberTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => {
                      if (onSelectTask) {
                        onClose();
                        onSelectTask(task);
                      }
                    }}
                    className={`p-3 rounded-xl border text-xs flex items-center justify-between gap-3 transition-all ${
                      onSelectTask ? 'cursor-pointer hover:border-blue-400 hover:bg-blue-50/20' : ''
                    } ${
                      task.status === 'DONE'
                        ? 'bg-emerald-50/30 border-emerald-200/70'
                        : 'bg-white border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400">#{task.id.slice(-4)}</span>
                        <p className="font-semibold text-slate-800 truncate">{task.title}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                        <span className="font-medium text-slate-600">{task.priority}</span>
                        {task.storyPoints ? (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 text-amber-600 font-bold">
                              <Zap className="w-2.5 h-2.5" />
                              {task.storyPoints} SP
                            </span>
                          </>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          task.status === 'DONE'
                            ? 'bg-emerald-100 text-emerald-700'
                            : task.status === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-700'
                            : task.status === 'BLOCKED'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {task.status}
                      </span>
                      {onSelectTask && <ExternalLink className="w-3.5 h-3.5 text-slate-400" />}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-end bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors cursor-pointer"
          >
            {isEn ? 'Close' : 'Đóng'}
          </button>
        </div>
      </div>
    </div>
  );
};
