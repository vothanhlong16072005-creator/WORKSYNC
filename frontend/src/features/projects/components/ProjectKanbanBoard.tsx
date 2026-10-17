import React, { useState, useMemo } from 'react';
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from '@hello-pangea/dnd';
import {
  Search,
  Flame,
  Calendar,
  Lock,
  ArrowRight,
  ExternalLink,
  FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TaskDetailModalTask } from '@/features/tasks/components/TaskDetailModal';
import type { ProjectMemberItem } from '../types/project.types';

interface ProjectKanbanBoardProps {
  projectId: string;
  projectName: string;
  tasks: TaskDetailModalTask[];
  members?: ProjectMemberItem[];
  isEmployeeOnly: boolean;
  onTaskClick: (task: TaskDetailModalTask) => void;
  onTaskMove?: (taskId: string, newStatus: string, destinationIndex: number) => Promise<void>;
  onRefresh?: () => void;
}

const KANBAN_COLUMNS = [
  { id: 'TODO', labelVi: 'Cần làm', labelEn: 'To Do', color: 'border-slate-300 text-slate-700 bg-slate-50' },
  { id: 'IN_PROGRESS', labelVi: 'Đang làm', labelEn: 'In Progress', color: 'border-blue-400 text-blue-700 bg-blue-50/50' },
  { id: 'BLOCKED', labelVi: 'Điểm nghẽn', labelEn: 'Blocked', color: 'border-rose-400 text-rose-700 bg-rose-50/50' },
  { id: 'DONE', labelVi: 'Hoàn thành', labelEn: 'Done', color: 'border-emerald-400 text-emerald-700 bg-emerald-50/50' },
];

const PRIORITY_BORDER: Record<string, string> = {
  URGENT: 'border-l-4 border-l-rose-500 bg-rose-50/20',
  HIGH: 'border-l-4 border-l-amber-500 bg-amber-50/20',
  MEDIUM: 'border-l-4 border-l-blue-500 bg-blue-50/20',
  LOW: 'border-l-4 border-l-slate-400 bg-slate-50/20',
};

const PRIORITY_BADGE: Record<string, { labelVi: string; labelEn: string; class: string }> = {
  URGENT: { labelVi: 'Khẩn cấp', labelEn: 'Urgent', class: 'bg-rose-100 text-rose-700 border-rose-300' },
  HIGH: { labelVi: 'Cao', labelEn: 'High', class: 'bg-amber-100 text-amber-700 border-amber-300' },
  MEDIUM: { labelVi: 'Trung bình', labelEn: 'Medium', class: 'bg-blue-100 text-blue-700 border-blue-300' },
  LOW: { labelVi: 'Thấp', labelEn: 'Low', class: 'bg-slate-100 text-slate-600 border-slate-300' },
};

export const ProjectKanbanBoard: React.FC<ProjectKanbanBoardProps> = ({
  projectId,
  tasks,
  members = [],
  isEmployeeOnly,
  onTaskClick,
  onTaskMove,
}) => {
  const { i18n } = useTranslation();
  const isEn = i18n.language.startsWith('en');

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
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
  }, [tasks, searchTerm, priorityFilter, assigneeFilter]);

  // Group by status column
  const columnTasks = useMemo(() => {
    const map: Record<string, TaskDetailModalTask[]> = {
      TODO: [],
      IN_PROGRESS: [],
      BLOCKED: [],
      DONE: [],
    };
    for (const task of filteredTasks) {
      if (map[task.status]) {
        map[task.status].push(task);
      } else {
        // default fallback
        map.TODO.push(task);
      }
    }
    return map;
  }, [filteredTasks]);

  // Drag End handler
  const handleDragEnd = async (result: DropResult) => {
    if (isEmployeeOnly) return;
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    if (onTaskMove) {
      await onTaskMove(draggableId, destination.droppableId, destination.index);
    }
  };

  const formatShortDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(isEn ? 'en-US' : 'vi-VN', {
        day: '2-digit',
        month: '2-digit',
      });
    } catch {
      return '';
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Employee Notice Banner */}
      {isEmployeeOnly && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50/40 to-white border border-amber-200/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5 sm:mt-0">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-950">
                {isEn
                  ? 'Shared Project Board (Employee View)'
                  : 'Bảng Kanban Dự Án Chung (Chế độ Xem Nhân viên)'}
              </h4>
              <p className="text-xs text-amber-800/90 mt-0.5 leading-relaxed">
                {isEn
                  ? 'Employees cannot drag-and-drop tasks directly on the shared project board. To update your personal progress and drag-and-drop your assigned tasks, please open My Tasks.'
                  : 'Nhân viên không thể kéo thả cập nhật bảng dự án chung trực tiếp. Để cập nhật tiến độ công việc được giao của bạn bằng kéo thả, hãy vào trang Việc Của Tôi.'}
              </p>
            </div>
          </div>

          <Link
            to="/tasks"
            className="px-4 py-2 text-xs font-bold rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-98 text-white shadow-xs transition-all flex items-center gap-1.5 shrink-0"
          >
            <span>{isEn ? 'Go to My Tasks' : 'Vào Việc Của Tôi'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Filter and Search Ribbon */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={isEn ? 'Search tasks by title, code, tag...' : 'Tìm kiếm theo tên, mã task, nhãn...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 placeholder-slate-400 transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-50 border border-slate-200 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
          >
            <option value="ALL">{isEn ? 'All Priorities' : 'Tất cả mức ưu tiên'}</option>
            <option value="URGENT">{isEn ? '🔴 Urgent' : '🔴 Khẩn cấp'}</option>
            <option value="HIGH">{isEn ? '🟠 High' : '🟠 Cao'}</option>
            <option value="MEDIUM">{isEn ? '🔵 Medium' : '🔵 Trung bình'}</option>
            <option value="LOW">{isEn ? '⚪ Low' : '⚪ Thấp'}</option>
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
          {(searchTerm || priorityFilter !== 'ALL' || assigneeFilter !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm('');
                setPriorityFilter('ALL');
                setAssigneeFilter('ALL');
              }}
              className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
            >
              {isEn ? 'Clear' : 'Xóa lọc'}
            </button>
          )}

          <div className="h-4 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Open full page kanban button */}
          <Link
            to={`/tasks?project=${projectId}`}
            className="px-3 py-2 text-xs font-bold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all flex items-center gap-1.5"
            title={isEn ? 'Open standalone Kanban page' : 'Mở trang Kanban toàn màn hình'}
          >
            <span>/tasks</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-70" />
          </Link>
        </div>
      </div>

      {/* Kanban Board Grid with DragDropContext */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {KANBAN_COLUMNS.map((col) => {
            const list = columnTasks[col.id] || [];

            return (
              <div
                key={col.id}
                className="flex flex-col bg-slate-100/70 rounded-2xl border border-slate-200/80 p-3 min-h-[500px]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 px-1 border-b border-slate-200/80 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      {isEn ? col.labelEn : col.labelVi}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-white border border-slate-200 text-slate-700 shadow-2xs">
                      {list.length}
                    </span>
                  </div>
                </div>

                {/* Droppable Area */}
                <Droppable droppableId={col.id} isDropDisabled={isEmployeeOnly}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 space-y-2.5 transition-colors rounded-xl p-1 ${
                        snapshot.isDraggingOver ? 'bg-blue-50/60 ring-2 ring-blue-400 ring-dashed' : ''
                      }`}
                    >
                      {list.length === 0 ? (
                        <div className="h-32 flex flex-col items-center justify-center text-center p-3 text-slate-400 border border-dashed border-slate-200 rounded-xl">
                          <p className="text-xs font-medium">
                            {isEn ? 'No tasks' : 'Không có công việc'}
                          </p>
                        </div>
                      ) : (
                        list.map((task, index) => {
                          const prioBadge = PRIORITY_BADGE[task.priority] || PRIORITY_BADGE.MEDIUM;
                          const borderClass = PRIORITY_BORDER[task.priority] || PRIORITY_BORDER.MEDIUM;

                          return (
                            <Draggable
                              key={task.id}
                              draggableId={task.id}
                              index={index}
                              isDragDisabled={isEmployeeOnly}
                            >
                              {(dragProvided, dragSnapshot) => (
                                <div
                                  ref={dragProvided.innerRef}
                                  {...dragProvided.draggableProps}
                                  {...dragProvided.dragHandleProps}
                                  onClick={() => onTaskClick(task)}
                                  className={`bg-white rounded-xl border border-slate-200/80 p-3.5 shadow-2xs hover:shadow-md transition-all cursor-pointer select-none space-y-2.5 ${borderClass} ${
                                    dragSnapshot.isDragging ? 'shadow-xl scale-102 ring-2 ring-blue-500' : ''
                                  }`}
                                >
                                  {/* Task Key & Priority Badge */}
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="font-mono text-[11px] font-bold text-slate-500">
                                      #{task.id.slice(-6)}
                                    </span>
                                    <span
                                      className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${prioBadge.class}`}
                                    >
                                      {isEn ? prioBadge.labelEn : prioBadge.labelVi}
                                    </span>
                                  </div>

                                  {/* Task Title */}
                                  <h4 className="text-xs font-bold text-slate-900 leading-snug line-clamp-2">
                                    {task.title}
                                  </h4>

                                  {/* Labels */}
                                  {task.labels && task.labels.length > 0 && (
                                    <div className="flex flex-wrap gap-1">
                                      {task.labels.slice(0, 3).map((l) => (
                                        <span
                                          key={l}
                                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/60"
                                        >
                                          #{l}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  {/* Footer: Due date + Story Points + Assignee */}
                                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-500">
                                    <div className="flex items-center gap-2">
                                      {task.dueDate && (
                                        <span className="flex items-center gap-1 font-medium">
                                          <Calendar className="w-3 h-3 text-slate-400" />
                                          {formatShortDate(task.dueDate)}
                                        </span>
                                      )}
                                      {task.storyPoints !== null && task.storyPoints !== undefined && (
                                        <span className="flex items-center gap-0.5 font-bold text-red-600">
                                          <Flame className="w-3 h-3" />
                                          {task.storyPoints}
                                        </span>
                                      )}
                                      {task.linkedDocuments && task.linkedDocuments.length > 0 && (
                                        <span
                                          className="flex items-center gap-1 font-semibold text-blue-600 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.5 rounded border border-blue-200/80"
                                          title={`${task.linkedDocuments.length} tài liệu / đặc tả / bằng chứng đính kèm`}
                                        >
                                          <FileText className="w-3 h-3 text-blue-600" />
                                          {task.linkedDocuments.length}
                                        </span>
                                      )}
                                    </div>

                                    {/* Assignee Avatar */}
                                    {task.assignee ? (
                                      <div
                                        className="flex items-center gap-1"
                                        title={task.assignee.name}
                                      >
                                        {task.assignee.avatar ? (
                                          <img
                                            src={task.assignee.avatar}
                                            className="w-5 h-5 rounded-full object-cover"
                                            alt=""
                                          />
                                        ) : (
                                          <span className="w-5 h-5 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[9px]">
                                            {task.assignee.name.slice(0, 2).toUpperCase()}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-[10px] text-slate-400 italic">
                                        {isEn ? 'Unassigned' : 'Chưa gán'}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          );
                        })
                      )}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
};
