import React, { useState, useMemo } from 'react';
import {
  Search,
  CheckCircle2,
  Flame,
  Edit2,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TaskDetailModalTask } from '@/features/tasks/components/TaskDetailModal';
import type { ProjectMemberItem } from '../types/project.types';

interface ProjectTasksTableViewProps {
  tasks: TaskDetailModalTask[];
  members?: ProjectMemberItem[];
  onTaskClick: (task: TaskDetailModalTask) => void;
}

const STATUS_BADGE: Record<string, { labelVi: string; labelEn: string; class: string }> = {
  TODO: { labelVi: 'Cần làm', labelEn: 'To Do', class: 'bg-slate-100 text-slate-700 border-slate-200' },
  IN_PROGRESS: { labelVi: 'Đang làm', labelEn: 'In Progress', class: 'bg-blue-100 text-blue-800 border-blue-200' },
  BLOCKED: { labelVi: 'Điểm nghẽn', labelEn: 'Blocked', class: 'bg-rose-100 text-rose-800 border-rose-200' },
  DONE: { labelVi: 'Hoàn thành', labelEn: 'Done', class: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
};

const PRIORITY_BADGE: Record<string, { labelVi: string; labelEn: string; class: string }> = {
  URGENT: { labelVi: 'Khẩn cấp', labelEn: 'Urgent', class: 'bg-rose-50 text-rose-700 border-rose-200' },
  HIGH: { labelVi: 'Cao', labelEn: 'High', class: 'bg-amber-50 text-amber-700 border-amber-200' },
  MEDIUM: { labelVi: 'Trung bình', labelEn: 'Medium', class: 'bg-blue-50 text-blue-700 border-blue-200' },
  LOW: { labelVi: 'Thấp', labelEn: 'Low', class: 'bg-slate-50 text-slate-600 border-slate-200' },
};

export const ProjectTasksTableView: React.FC<ProjectTasksTableViewProps> = ({
  tasks,
  members = [],
  onTaskClick,
}) => {
  const { i18n } = useTranslation();
  const isEn = i18n.language.startsWith('en');

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search keyword
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesId = task.id.toLowerCase().includes(q);
        const matchesLabel = task.labels?.some((l) => l.toLowerCase().includes(q));
        if (!matchesTitle && !matchesId && !matchesLabel) return false;
      }
      // Status filter
      if (statusFilter !== 'ALL' && task.status !== statusFilter) {
        return false;
      }
      // Priority filter
      if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) {
        return false;
      }
      // Assignee filter
      if (assigneeFilter !== 'ALL') {
        if (assigneeFilter === 'UNASSIGNED') {
          if (task.assignee) return false;
        } else if (task.assignee?.id !== assigneeFilter) {
          return false;
        }
      }
      return true;
    });
  }, [tasks, searchTerm, statusFilter, priorityFilter, assigneeFilter]);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return '–';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(isEn ? 'en-US' : 'vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '–';
    }
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '–';
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
      return '–';
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Filter and Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={isEn ? 'Search all tasks...' : 'Tìm kiếm toàn bộ công việc...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400 transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
          >
            <option value="ALL">{isEn ? 'All Statuses' : 'Tất cả trạng thái'}</option>
            <option value="TODO">{isEn ? 'To Do' : 'Cần làm'}</option>
            <option value="IN_PROGRESS">{isEn ? 'In Progress' : 'Đang làm'}</option>
            <option value="BLOCKED">{isEn ? 'Blocked' : 'Điểm nghẽn'}</option>
            <option value="DONE">{isEn ? 'Done' : 'Hoàn thành'}</option>
          </select>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
          >
            <option value="ALL">{isEn ? 'All Priorities' : 'Tất cả độ ưu tiên'}</option>
            <option value="URGENT">{isEn ? 'Urgent' : 'Khẩn cấp'}</option>
            <option value="HIGH">{isEn ? 'High' : 'Cao'}</option>
            <option value="MEDIUM">{isEn ? 'Medium' : 'Trung bình'}</option>
            <option value="LOW">{isEn ? 'Low' : 'Thấp'}</option>
          </select>

          {/* Assignee filter */}
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
          >
            <option value="ALL">{isEn ? 'All Assignees' : 'Tất cả người phụ trách'}</option>
            <option value="UNASSIGNED">{isEn ? 'Unassigned' : 'Chưa phân công'}</option>
            {members.map((m) => (
              <option key={m.userId} value={m.userId}>
                {m.user.name} ({m.projectRole})
              </option>
            ))}
          </select>

          {/* Reset button */}
          {(searchTerm || statusFilter !== 'ALL' || priorityFilter !== 'ALL' || assigneeFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('ALL');
                setPriorityFilter('ALL');
                setAssigneeFilter('ALL');
              }}
              className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
            >
              {isEn ? 'Clear' : 'Xóa lọc'}
            </button>
          )}

          <span className="text-xs font-bold text-slate-400 ml-2">
            {isEn ? `Showing ${filteredTasks.length} of ${tasks.length}` : `Hiển thị ${filteredTasks.length} / ${tasks.length}`}
          </span>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-28">{isEn ? 'Task ID' : 'Mã Task'}</th>
                <th className="py-3 px-4 min-w-[260px]">{isEn ? 'Task Name' : 'Tiêu đề công việc'}</th>
                <th className="py-3 px-4 w-32">{isEn ? 'Status' : 'Trạng thái'}</th>
                <th className="py-3 px-4 w-28">{isEn ? 'Priority' : 'Độ ưu tiên'}</th>
                <th className="py-3 px-4 w-44">{isEn ? 'Assignee' : 'Người phụ trách'}</th>
                <th className="py-3 px-4 w-32">{isEn ? 'Due Date' : 'Hạn chót'}</th>
                <th className="py-3 px-4 w-20 text-center">SP</th>
                <th className="py-3 px-4 w-44 text-emerald-900 bg-emerald-50/30 border-l border-emerald-100/60">
                  {isEn ? 'Completed Date' : 'Ngày hoàn thành'}
                </th>
                <th className="py-3 px-4 w-44 text-emerald-900 bg-emerald-50/30">
                  {isEn ? 'Completed By' : 'Người hoàn thành'}
                </th>
                <th className="py-3 px-4 w-28 text-right">
                  {isEn ? 'Actions' : 'Hành động'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    <p className="font-semibold text-sm">
                      {isEn ? 'No tasks found matching criteria.' : 'Không tìm thấy công việc nào khớp với bộ lọc.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const status = STATUS_BADGE[task.status] || STATUS_BADGE.TODO;
                  const prio = PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.MEDIUM;
                  const isDone = task.status === 'DONE';

                  return (
                    <tr
                      key={task.id}
                      onClick={() => onTaskClick(task)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                    >
                      {/* Key / ID */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-500 group-hover:text-blue-600 transition-colors">
                        #{task.id.slice(-6)}
                      </td>

                      {/* Title & description */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <p className="font-bold text-slate-900 group-hover:text-blue-700 transition-colors leading-snug">
                            {task.title}
                          </p>
                          {task.description && (
                            <p className="text-[11px] text-slate-500 line-clamp-1">
                              {task.description}
                            </p>
                          )}
                          {task.labels && task.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-0.5">
                              {task.labels.map((l) => (
                                <span
                                  key={l}
                                  className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200/60"
                                >
                                  #{l}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${status.class}`}
                        >
                          {isEn ? status.labelEn : status.labelVi}
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${prio.class}`}
                        >
                          {isEn ? prio.labelEn : prio.labelVi}
                        </span>
                      </td>

                      {/* Assignee */}
                      <td className="py-3.5 px-4">
                        {task.assignee ? (
                          <div className="flex items-center gap-2">
                            {task.assignee.avatar ? (
                              <img
                                src={task.assignee.avatar}
                                className="w-5 h-5 rounded-full object-cover shrink-0"
                                alt=""
                              />
                            ) : (
                              <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[9px] shrink-0">
                                {task.assignee.name.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                            <span className="font-semibold text-slate-800 truncate max-w-[120px]">
                              {task.assignee.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            {isEn ? 'Unassigned' : 'Chưa gán'}
                          </span>
                        )}
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-4 font-medium text-slate-600">
                        {formatDate(task.dueDate)}
                      </td>

                      {/* Story Points */}
                      <td className="py-3.5 px-4 text-center">
                        {task.storyPoints !== null && task.storyPoints !== undefined ? (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded font-bold text-red-600 bg-red-50 border border-red-100 text-xs">
                            <Flame className="w-3 h-3" />
                            {task.storyPoints}
                          </span>
                        ) : (
                          <span className="text-slate-400">–</span>
                        )}
                      </td>

                      {/* Completed Date */}
                      <td className="py-3.5 px-4 bg-emerald-50/20 border-l border-emerald-100/60 font-semibold text-slate-800">
                        {isDone && task.completedAt ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{formatDateTime(task.completedAt)}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">–</span>
                        )}
                      </td>

                      {/* Completed By */}
                      <td className="py-3.5 px-4 bg-emerald-50/20 font-semibold text-slate-800">
                        {isDone && task.completedBy ? (
                          <div className="flex items-center gap-2">
                            {task.completedBy.avatar ? (
                              <img
                                src={task.completedBy.avatar}
                                className="w-5 h-5 rounded-full object-cover shrink-0"
                                alt=""
                              />
                            ) : (
                              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-[9px] shrink-0">
                                {task.completedBy.name.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                            <span className="font-semibold text-emerald-950 truncate max-w-[120px]">
                              {task.completedBy.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-normal">–</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onTaskClick(task);
                          }}
                          className="px-2.5 py-1 text-xs font-bold rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 border border-slate-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Edit2 className="w-3 h-3" />
                          <span>{isEn ? 'View / Edit' : 'Xem / Sửa'}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
