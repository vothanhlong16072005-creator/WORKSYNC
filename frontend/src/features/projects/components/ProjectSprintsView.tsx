import React, { useState, useMemo } from 'react';
import {
  Flame,
  Plus,
  Play,
  CheckCircle2,
  Trash2,
  Calendar,
  User,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Inbox,
  Search,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Sprint } from '@/features/sprints/types/sprint.types';
import type { TaskDetailModalTask } from '@/features/tasks/components/TaskDetailModal';
import type { ProjectMemberItem } from '../types/project.types';

interface ProjectSprintsViewProps {
  projectId: string;
  projectName: string;
  sprints: Sprint[];
  tasks: TaskDetailModalTask[];
  members?: ProjectMemberItem[];
  canManageSprint: boolean;
  canManageProject: boolean;
  onCreateSprint: () => void;
  onStartSprint: (sprint: Sprint) => void;
  onCompleteSprint: (sprint: Sprint) => void;
  onDeleteSprint: (sprint: Sprint) => void;
  onCreateTaskInSprint: (sprintId?: string) => void;
  onTaskClick: (task: TaskDetailModalTask) => void;
  onTaskStatusChange: (taskId: string, newStatus: string) => void;
  onAssignTaskToSprint: (taskId: string, targetSprintId: string) => void;
}

const STATUS_CONFIG: Record<
  string,
  { labelVi: string; labelEn: string; badgeClass: string; dotClass: string }
> = {
  TODO: {
    labelVi: 'Cần làm',
    labelEn: 'To Do',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    dotClass: 'bg-slate-400',
  },
  IN_PROGRESS: {
    labelVi: 'Đang làm',
    labelEn: 'In Progress',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  IN_REVIEW: {
    labelVi: 'Đang duyệt',
    labelEn: 'In Review',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
    dotClass: 'bg-purple-500',
  },
  BLOCKED: {
    labelVi: 'Điểm nghẽn',
    labelEn: 'Blocked',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
    dotClass: 'bg-rose-500',
  },
  DONE: {
    labelVi: 'Hoàn thành',
    labelEn: 'Done',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotClass: 'bg-emerald-500',
  },
};

const PRIORITY_CONFIG: Record<
  string,
  { labelVi: string; labelEn: string; class: string }
> = {
  URGENT: {
    labelVi: 'Khẩn cấp',
    labelEn: 'Urgent',
    class: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  HIGH: {
    labelVi: 'Cao',
    labelEn: 'High',
    class: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  MEDIUM: {
    labelVi: 'Trung bình',
    labelEn: 'Medium',
    class: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  LOW: {
    labelVi: 'Thấp',
    labelEn: 'Low',
    class: 'bg-slate-50 text-slate-600 border-slate-200',
  },
};

export const ProjectSprintsView: React.FC<ProjectSprintsViewProps> = ({
  projectName,
  sprints,
  tasks,
  canManageSprint,
  canManageProject,
  onCreateSprint,
  onStartSprint,
  onCompleteSprint,
  onDeleteSprint,
  onCreateTaskInSprint,
  onTaskClick,
  onTaskStatusChange,
  onAssignTaskToSprint,
}) => {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith('en');

  // Search keyword inside Sprints view
  const [searchTerm, setSearchTerm] = useState('');

  // Sprints collapsed/expanded state (Default: ACTIVE & PLANNING are expanded, COMPLETED collapsed)
  const [collapsedSprintIds, setCollapsedSprintIds] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    sprints.forEach((s) => {
      if (s.status === 'COMPLETED') {
        initial[s.id] = true;
      }
    });
    return initial;
  });

  const toggleCollapse = (sprintId: string) => {
    setCollapsedSprintIds((prev) => ({
      ...prev,
      [sprintId]: !prev[sprintId],
    }));
  };

  // Group and sort sprints: ACTIVE first, then PLANNING, then COMPLETED
  const sortedSprints = useMemo(() => {
    return [...sprints].sort((a, b) => {
      const order: Record<string, number> = { ACTIVE: 0, PLANNING: 1, COMPLETED: 2 };
      const diff = (order[a.status] ?? 3) - (order[b.status] ?? 3);
      if (diff !== 0) return diff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [sprints]);

  // Backlog tasks (tasks not in any sprint)
  const backlogTasks = useMemo(() => {
    return tasks.filter((t) => !t.sprintId);
  }, [tasks]);

  // Filter tasks by search term
  const filterTaskBySearch = (task: TaskDetailModalTask) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      task.title.toLowerCase().includes(q) ||
      task.id.toLowerCase().includes(q) ||
      task.assignee?.name.toLowerCase().includes(q) ||
      task.priority.toLowerCase().includes(q)
    );
  };

  // Metrics summary
  const summary = useMemo(() => {
    const activeCount = sprints.filter((s) => s.status === 'ACTIVE').length;
    const planningCount = sprints.filter((s) => s.status === 'PLANNING').length;
    const completedCount = sprints.filter((s) => s.status === 'COMPLETED').length;
    return { activeCount, planningCount, completedCount, totalSprints: sprints.length };
  }, [sprints]);

  // Format short date
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

  // Check if date is overdue
  const isOverdue = (dueDate?: string | null, status?: string) => {
    if (!dueDate || status === 'DONE') return false;
    const d = new Date(dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d < today;
  };

  return (
    <div className="space-y-6">
      {/* Top Control Bar */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-5 sm:p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
              <Flame className="w-4 h-4" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              {isEn ? 'Sprint Planning & Iteration Hub' : 'Kế Hoạch Chu Kỳ Sprint & Công Việc'}
            </h2>
          </div>
          <p className="text-xs text-slate-500 pl-10">
            {isEn
              ? `Manage iterations, track sprint burndown progress and allocate tasks for ${projectName}`
              : `Quản lý các chu kỳ sprint, theo dõi tiến độ hoàn thành và phân bổ công việc cho ${projectName}`}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={isEn ? 'Search tasks...' : 'Tìm kiếm công việc...'}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-44 sm:w-56 transition-all"
            />
          </div>

          {canManageSprint && (
            <button
              id="btn-create-sprint-main"
              type="button"
              onClick={onCreateSprint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs active:scale-98 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isEn ? 'Create Sprint' : 'Tạo Sprint Mới'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Ribbon Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            {isEn ? 'Total Sprints' : 'Tổng Số Sprint'}
          </span>
          <span className="text-xl font-black text-slate-900 mt-0.5 block">
            {summary.totalSprints}
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-emerald-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
            {isEn ? 'Active Sprint' : 'Đang Chạy (Active)'}
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xl font-black text-emerald-700">{summary.activeCount}</span>
            {summary.activeCount > 0 && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
          </div>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-amber-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">
            {isEn ? 'Planned Sprints' : 'Dự Kiến (Planned)'}
          </span>
          <span className="text-xl font-black text-amber-700 mt-0.5 block">
            {summary.planningCount}
          </span>
        </div>

        <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            {isEn ? 'Completed' : 'Đã Hoàn Thành'}
          </span>
          <span className="text-xl font-black text-slate-600 mt-0.5 block">
            {summary.completedCount}
          </span>
        </div>
      </div>

      {/* Empty State when no Sprints exist */}
      {sprints.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 shadow-xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto">
            <Flame className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            {isEn ? 'No Sprints Created Yet' : 'Dự Án Chưa Có Chu Kỳ Sprint Nào'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {isEn
              ? 'Organize your development cycle into 1-4 week sprints, set iteration goals, and track member velocity.'
              : 'Chia nhỏ lộ trình phát triển thành các chu kỳ 1-4 tuần, đặt mục tiêu sprint và theo dõi tiến độ hoàn thành.'}
          </p>
          {canManageSprint && (
            <button
              type="button"
              onClick={onCreateSprint}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isEn ? 'Create First Sprint' : 'Tạo Sprint Đầu Tiên'}</span>
            </button>
          )}
        </div>
      ) : (
        /* SPRINTS LIST */
        <div className="space-y-5">
          {sortedSprints.map((sprint) => {
            const sprintTasks = tasks
              .filter((t) => t.sprintId === sprint.id)
              .filter(filterTaskBySearch);

            const totalTasks = sprintTasks.length;
            const doneTasks = sprintTasks.filter((t) => t.status === 'DONE').length;
            const inProgressTasks = sprintTasks.filter((t) => t.status === 'IN_PROGRESS').length;
            const blockedTasks = sprintTasks.filter((t) => t.status === 'BLOCKED').length;

            const totalSP = sprintTasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0);
            const doneSP = sprintTasks
              .filter((t) => t.status === 'DONE')
              .reduce((sum, t) => sum + (t.storyPoints || 0), 0);

            const percent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
            const isCollapsed = Boolean(collapsedSprintIds[sprint.id]);

            return (
              <div
                key={sprint.id}
                className="bg-white rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden transition-all"
              >
                {/* Sprint Header Banner */}
                <div
                  onClick={() => toggleCollapse(sprint.id)}
                  className={`p-5 sm:p-6 cursor-pointer select-none transition-colors ${
                    sprint.status === 'ACTIVE'
                      ? 'bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-white hover:bg-emerald-50/90'
                      : sprint.status === 'PLANNING'
                      ? 'bg-gradient-to-r from-amber-50/50 via-slate-50/30 to-white hover:bg-amber-50/70'
                      : 'bg-slate-50/60 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    {/* Sprint Title & Info */}
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status Badge */}
                        {sprint.status === 'ACTIVE' && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                            </span>
                            {isEn ? 'ACTIVE SPRINT' : 'ĐANG CHẠY'}
                          </span>
                        )}
                        {sprint.status === 'PLANNING' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Calendar className="w-3 h-3" />
                            {isEn ? 'PLANNING' : 'DỰ KIẾN'}
                          </span>
                        )}
                        {sprint.status === 'COMPLETED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
                            <CheckCircle2 className="w-3 h-3 text-slate-600" />
                            {isEn ? 'COMPLETED' : 'HOÀN THÀNH'}
                          </span>
                        )}

                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-500 font-medium">
                          {formatDate(sprint.startDate)} – {formatDate(sprint.endDate)}
                        </span>
                        {sprint.durationDays ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600">
                            {sprint.durationDays} {isEn ? 'days' : 'ngày'}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-slate-900 truncate">
                          {sprint.name}
                        </h3>
                      </div>

                      {sprint.goal && (
                        <p className="text-xs text-slate-600 italic line-clamp-1">
                          "{sprint.goal}"
                        </p>
                      )}
                    </div>

                    {/* Actions and Chevron */}
                    <div
                      className="flex items-center gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Add Task directly to this sprint */}
                      {canManageProject && sprint.status !== 'COMPLETED' && (
                        <button
                          type="button"
                          onClick={() => onCreateTaskInSprint(sprint.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-2xs active:scale-98 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>{isEn ? 'Add Task' : 'Thêm Công Việc'}</span>
                        </button>
                      )}

                      {/* Start Sprint Button */}
                      {canManageSprint && sprint.status === 'PLANNING' && (
                        <button
                          type="button"
                          onClick={() => onStartSprint(sprint)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xs active:scale-98 transition-all cursor-pointer"
                        >
                          <Play className="w-3 h-3 fill-white" />
                          <span>{isEn ? 'Start Sprint' : 'Bắt Đầu'}</span>
                        </button>
                      )}

                      {/* Complete Sprint Button */}
                      {canManageSprint && sprint.status === 'ACTIVE' && (
                        <button
                          type="button"
                          onClick={() => onCompleteSprint(sprint)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-2xs active:scale-98 transition-all cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{isEn ? 'Complete' : 'Hoàn Thành Sprint'}</span>
                        </button>
                      )}

                      {/* Delete Sprint Button (only if not completed) */}
                      {canManageSprint && sprint.status !== 'COMPLETED' && (
                        <button
                          type="button"
                          onClick={() => onDeleteSprint(sprint)}
                          title={isEn ? 'Delete Sprint' : 'Xóa Sprint'}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Collapse/Expand Toggle */}
                      <button
                        type="button"
                        onClick={() => toggleCollapse(sprint.id)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer ml-1"
                        aria-label="Toggle sprint visibility"
                      >
                        {isCollapsed ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronUp className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar Container */}
                  <div className="mt-4 pt-3 border-t border-slate-200/60 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-700">
                          {percent}% {isEn ? 'Completed' : 'hoàn thành'}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-600 font-medium">
                          {doneTasks}/{totalTasks} {isEn ? 'tasks' : 'công việc'}
                        </span>
                        {totalSP > 0 && (
                          <>
                            <span className="text-slate-300">•</span>
                            <span className="text-amber-800 font-semibold">
                              {doneSP}/{totalSP} SP
                            </span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500">
                        {inProgressTasks > 0 && (
                          <span className="text-blue-600 font-medium">
                            {inProgressTasks} {isEn ? 'in progress' : 'đang làm'}
                          </span>
                        )}
                        {blockedTasks > 0 && (
                          <span className="text-rose-600 font-bold">
                            ⚠️ {blockedTasks} {isEn ? 'blocked' : 'bị nghẽn'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress Track */}
                    <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 rounded-full ${
                          percent === 100
                            ? 'bg-emerald-500'
                            : percent >= 50
                            ? 'bg-gradient-to-r from-blue-500 to-emerald-500'
                            : 'bg-blue-600'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Sprint Tasks Table (Expanded Body) */}
                {!isCollapsed && (
                  <div className="border-t border-slate-100">
                    {sprintTasks.length === 0 ? (
                      <div className="p-8 text-center bg-slate-50/50 space-y-2">
                        <Inbox className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-xs font-semibold text-slate-600">
                          {isEn
                            ? 'No tasks assigned to this sprint yet.'
                            : 'Chưa có công việc nào trong sprint này.'}
                        </p>
                        {canManageProject && (
                          <button
                            type="button"
                            onClick={() => onCreateTaskInSprint(sprint.id)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>{isEn ? 'Add first task' : 'Thêm công việc đầu tiên'}</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100">
                        {sprintTasks.map((task) => {
                          const isDone = task.status === 'DONE';
                          const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.TODO;
                          const priorityCfg =
                            PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
                          const overdue = isOverdue(task.dueDate, task.status);

                          return (
                            <div
                              key={task.id}
                              className={`p-3.5 sm:px-6 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors group cursor-pointer ${
                                isDone ? 'bg-slate-50/40 opacity-80' : ''
                              }`}
                              onClick={() => onTaskClick(task)}
                            >
                              {/* Left: Checkbox + Status + Title */}
                              <div className="flex items-center gap-3 min-w-[280px] flex-1">
                                {/* One-touch checkbox toggle */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onTaskStatusChange(task.id, isDone ? 'TODO' : 'DONE');
                                  }}
                                  className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
                                    isDone
                                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                                      : 'border-slate-300 hover:border-blue-500 bg-white'
                                  }`}
                                  title={
                                    isDone
                                      ? isEn
                                        ? 'Mark uncompleted'
                                        : 'Đánh dấu chưa hoàn thành'
                                      : isEn
                                      ? 'Mark as completed'
                                      : 'Đánh dấu đã hoàn thành'
                                  }
                                >
                                  {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                                </button>

                                {/* Status Pill */}
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${statusCfg.badgeClass}`}
                                >
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`}
                                  />
                                  <span>{isEn ? statusCfg.labelEn : statusCfg.labelVi}</span>
                                </span>

                                {/* Title & Labels */}
                                <div className="min-w-0">
                                  <h4
                                    className={`text-xs font-bold transition-colors line-clamp-1 ${
                                      isDone
                                        ? 'line-through text-slate-400'
                                        : 'text-slate-900 group-hover:text-blue-600'
                                    }`}
                                  >
                                    {task.title}
                                  </h4>
                                </div>
                              </div>

                              {/* Right Details: Assignee, Priority, Dates, SP, Move dropdown */}
                              <div
                                className="flex items-center gap-3 sm:gap-4 shrink-0 text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* Priority */}
                                <span
                                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${priorityCfg.class}`}
                                >
                                  {isEn ? priorityCfg.labelEn : priorityCfg.labelVi}
                                </span>

                                {/* Assignee */}
                                <div className="flex items-center gap-1.5 min-w-[120px]">
                                  {task.assignee?.avatar ? (
                                    <img
                                      src={task.assignee.avatar}
                                      alt={task.assignee.name}
                                      className="w-5 h-5 rounded-full object-cover border border-slate-200"
                                    />
                                  ) : task.assignee?.name ? (
                                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center">
                                      {task.assignee.name.charAt(0)}
                                    </div>
                                  ) : (
                                    <User className="w-3.5 h-3.5 text-slate-300" />
                                  )}
                                  <span className="text-xs text-slate-700 font-medium truncate max-w-[90px]">
                                    {task.assignee?.name || (isEn ? 'Unassigned' : 'Chưa giao')}
                                  </span>
                                </div>

                                {/* Timeline: Deadline */}
                                <div className="min-w-[90px] text-right">
                                  {task.dueDate ? (
                                    <span
                                      className={`text-[11px] font-medium flex items-center justify-end gap-1 ${
                                        overdue
                                          ? 'text-rose-600 font-bold'
                                          : 'text-slate-500'
                                      }`}
                                    >
                                      {overdue && <AlertCircle className="w-3 h-3 text-rose-600" />}
                                      {formatDate(task.dueDate)}
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-slate-400">–</span>
                                  )}
                                </div>

                                {/* Story Points */}
                                <div className="min-w-[45px] text-center">
                                  {task.storyPoints ? (
                                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                                      {task.storyPoints} SP
                                    </span>
                                  ) : (
                                    <span className="text-[11px] text-slate-300">–</span>
                                  )}
                                </div>

                                {/* Quick Reassign to another Sprint or Backlog */}
                                {canManageSprint && (
                                  <div className="shrink-0">
                                    <select
                                      defaultValue={sprint.id}
                                      onChange={(e) => {
                                        onAssignTaskToSprint(task.id, e.target.value);
                                      }}
                                      className="px-2 py-0.5 text-[11px] bg-white border border-slate-200 rounded-lg text-slate-600 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
                                      title={isEn ? 'Move task to sprint' : 'Chuyển task sang sprint khác'}
                                    >
                                      <option value="">{isEn ? 'Backlog' : '📦 Backlog'}</option>
                                      {sprints
                                        .filter((s) => s.status !== 'COMPLETED')
                                        .map((s) => (
                                          <option key={s.id} value={s.id}>
                                            {s.name}
                                          </option>
                                        ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* PRODUCT BACKLOG SECTION */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
              <Inbox className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Product Backlog</h3>
                <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700">
                  {backlogTasks.length} {isEn ? 'tasks unassigned' : 'việc chưa gán sprint'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {isEn
                  ? 'Reserve of tasks awaiting allocation to upcoming sprints'
                  : 'Danh mục công việc tồn đọng chờ phân bổ vào các Sprint tiếp theo'}
              </p>
            </div>
          </div>

          {canManageProject && (
            <button
              type="button"
              onClick={() => onCreateTaskInSprint('')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-2xs active:scale-98 transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isEn ? 'Add to Backlog' : 'Thêm Vào Backlog'}</span>
            </button>
          )}
        </div>

        {backlogTasks.length === 0 ? (
          <div className="p-8 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
            <Inbox className="w-8 h-8 mx-auto mb-1 text-slate-300" />
            <p className="text-xs font-semibold text-slate-600">
              {isEn ? 'Backlog is empty' : 'Backlog hiện đang trống'}
            </p>
            <p className="text-[11px] text-slate-400">
              {isEn
                ? 'All project tasks are assigned to sprints.'
                : 'Mọi nhiệm vụ của dự án đều đã được phân bổ vào các Sprint.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden">
            {backlogTasks.filter(filterTaskBySearch).map((task) => {
              const statusCfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.TODO;
              const priorityCfg = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
              const isDone = task.status === 'DONE';

              return (
                <div
                  key={task.id}
                  className="p-3.5 sm:px-5 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors cursor-pointer"
                  onClick={() => onTaskClick(task)}
                >
                  <div className="flex items-center gap-3 min-w-[280px] flex-1">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${statusCfg.badgeClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dotClass}`} />
                      <span>{isEn ? statusCfg.labelEn : statusCfg.labelVi}</span>
                    </span>

                    <h4
                      className={`text-xs font-bold transition-colors line-clamp-1 ${
                        isDone
                          ? 'line-through text-slate-400'
                          : 'text-slate-900 hover:text-blue-600'
                      }`}
                    >
                      {task.title}
                    </h4>
                  </div>

                  <div
                    className="flex items-center gap-3 shrink-0 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${priorityCfg.class}`}
                    >
                      {isEn ? priorityCfg.labelEn : priorityCfg.labelVi}
                    </span>

                    <div className="flex items-center gap-1.5 min-w-[120px]">
                      {task.assignee?.avatar ? (
                        <img
                          src={task.assignee.avatar}
                          alt={task.assignee.name}
                          className="w-5 h-5 rounded-full object-cover border border-slate-200"
                        />
                      ) : task.assignee?.name ? (
                        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold text-[10px] flex items-center justify-center">
                          {task.assignee.name.charAt(0)}
                        </div>
                      ) : (
                        <User className="w-3.5 h-3.5 text-slate-300" />
                      )}
                      <span className="text-xs text-slate-700 font-medium truncate max-w-[90px]">
                        {task.assignee?.name || (isEn ? 'Unassigned' : 'Chưa giao')}
                      </span>
                    </div>

                    {task.storyPoints ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                        {task.storyPoints} SP
                      </span>
                    ) : null}

                    {canManageSprint && sprints.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">
                          {isEn ? 'Assign to:' : 'Gán vào:'}
                        </span>
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              onAssignTaskToSprint(task.id, e.target.value);
                            }
                          }}
                          className="px-2 py-1 text-[11px] bg-white border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800 cursor-pointer"
                        >
                          <option value="" disabled>
                            -- {isEn ? 'Choose Sprint' : 'Chọn Sprint'} --
                          </option>
                          {sprints
                            .filter((s) => s.status !== 'COMPLETED')
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.status})
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
