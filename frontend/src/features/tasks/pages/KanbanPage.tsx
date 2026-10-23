import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock3,
  Eye,
  EyeOff,
  Filter,
  ListOrdered,
  ListTodo,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  X,
  RotateCcw,
  User as UserIcon,
  UserPlus,
  FolderKanban,
  Flag,
  Flame,
  Zap,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTaskStore } from '@/stores/task.store';
import { useProjectStore } from '@/stores/project.store';
import { useAuthStore } from '@/stores/auth.store';
import type { BoardTask as Task, TaskStatus } from '@/stores/task.store';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { projectApi } from '@/features/projects/api/project.api';
import { usersApi } from '@/features/users/api/users.api';

interface KanbanColumn {
  id: TaskStatus;
  title: string;
  className: string;
}

const COLUMNS: KanbanColumn[] = [
  { id: 'TODO', title: 'Cần làm', className: '' },
  { id: 'IN_PROGRESS', title: 'Đang làm', className: 'kanban-column--progress' },
  { id: 'IN_REVIEW', title: 'Đánh giá', className: 'kanban-column--review' },
  { id: 'BLOCKED', title: 'Bị chặn', className: 'kanban-column--blocked' },
  { id: 'DONE', title: 'Hoàn thành', className: 'kanban-column--done' },
];

const PRIORITY_LABELS: Record<Task['priority'], string> = {
  URGENT: 'Khẩn cấp',
  HIGH: 'Cao',
  MEDIUM: 'Trung bình',
  LOW: 'Thấp',
};

const PRIORITY_CLASSES: Record<Task['priority'], string> = {
  URGENT: 'kanban-priority--urgent',
  HIGH: 'kanban-priority--high',
  MEDIUM: 'kanban-priority--medium',
  LOW: 'kanban-priority--low',
};

const PRIORITY_CARD_FRAME: Record<Task['priority'], string> = {
  URGENT: 'kanban-task--urgent',
  HIGH: 'kanban-task--high',
  MEDIUM: 'kanban-task--medium',
  LOW: 'kanban-task--low',
};

const TAG_CLASSES: Record<string, string> = {
  BUG: 'kanban-tag--bug',
  INFRA: 'kanban-tag--infra',
  DESIGN: 'kanban-tag--design',
  UI: 'kanban-tag--ui',
  SAAS: 'kanban-tag--saas',
  FEATURE: 'kanban-tag--feature',
};

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  }
  return (words[0]?.slice(0, 2) ?? '?').toUpperCase();
}

function getColumnTitle(status: TaskStatus): string {
  return COLUMNS.find((column) => column.id === status)?.title ?? status;
}

function formatDate(dateStr?: string | null, lang: string = 'vi'): string {
  if (!dateStr) return lang === 'en' ? 'Not set' : 'Chưa thiết lập';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(dateStr);
  }
}

function formatShortDate(dateStr?: string | null, lang: string = 'vi'): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'vi-VN', {
      day: '2-digit',
      month: '2-digit',
    });
  } catch {
    return '';
  }
}

function getDeadlineInfo(dueDateStr?: string | null, t?: (key: string, options?: any) => string, lang: string = 'vi') {
  if (!dueDateStr) return null;
  try {
    const now = new Date();
    const due = new Date(dueDateStr);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: t ? t('kanban.deadline_overdue', { count: Math.abs(diffDays) }) : `Quá hạn ${Math.abs(diffDays)} ngày`,
        isOverdue: true,
        className: 'bg-rose-50 text-rose-700 border-rose-200 font-medium',
      };
    }
    if (diffDays === 0) {
      return {
        text: t ? t('kanban.deadline_today') : 'Hết hạn hôm nay',
        isNear: true,
        className: 'bg-amber-50 text-amber-800 border-amber-200 font-medium',
      };
    }
    if (diffDays <= 2) {
      return {
        text: t ? t('kanban.deadline_left', { count: diffDays }) : `Còn ${diffDays} ngày`,
        isNear: true,
        className: 'bg-amber-50 text-amber-800 border-amber-200 font-medium',
      };
    }
    return {
      text: formatShortDate(dueDateStr, lang),
      className: 'bg-slate-50 text-slate-600 border-slate-200 font-normal',
    };
  } catch {
    return null;
  }
}

export default function KanbanPage() {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');
  const { projectId } = useParams<{ projectId?: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTaskId = searchParams.get('taskId') || useParams<{ taskId?: string }>().taskId;

  const getPriorityLabel = (priority: Task['priority']) => t(`kanban.priorities.${priority}`, PRIORITY_LABELS[priority]);

  const { projects, loadMine } = useProjectStore();
  const { tasks, status, error, loadBoard, moveTask, createTask, retry } = useTaskStore();

  useEffect(() => {
    loadMine();
  }, [loadMine]);

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = useMemo(() => tasks.find((t) => t.id === selectedTaskId) || null, [tasks, selectedTaskId]);
  const [searchQuery, setSearchQuery] = useState('');
  const [teamScopeMode, setTeamScopeMode] = useState<'project' | 'mine'>('project');

  // View Mode: Kanban Board vs Table / List View
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  // Feature: Hide completed tasks to keep the workspace clean
  const [hideCompleted, setHideCompleted] = useState<boolean>(false);
  // Feature: Overdue quick filter
  const [filterOverdueOnly, setFilterOverdueOnly] = useState<boolean>(false);

  // Sync selected task with URL taskId (e.g. from notification clicks or direct links)
  useEffect(() => {
    if (urlTaskId) {
      setSelectedTaskId(urlTaskId);
    }
  }, [urlTaskId]);

  const handleCloseDetailModal = () => {
    setSelectedTaskId(null);
    if (searchParams.has('taskId')) {
      const next = new URLSearchParams(searchParams);
      next.delete('taskId');
      setSearchParams(next, { replace: true });
    }
  };

  // Filter & Sort States
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterLabel, setFilterLabel] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'DEFAULT' | 'DEADLINE' | 'PRIORITY' | 'CREATED'>('DEFAULT');

  // Create Task Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [createProjectId, setCreateProjectId] = useState('');
  const [createStatus, setCreateStatus] = useState<TaskStatus>('TODO');
  const [createPriority, setCreatePriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [createDueDate, setCreateDueDate] = useState('');
  const [createStoryPoints, setCreateStoryPoints] = useState<string>('');
  const [createTimeEstimate, setCreateTimeEstimate] = useState<string>('');
  const [createLabelsInput, setCreateLabelsInput] = useState('');
  const [createAssigneeId, setCreateAssigneeId] = useState<string>('');
  const [projectMembers, setProjectMembers] = useState<{ id: string; name: string; email: string; role?: string }[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const { user } = useAuthStore();
  const currentProject = useMemo(() => {
    return projects.find((p) => p.id === projectId);
  }, [projects, projectId]);

  const isPersonalProject = currentProject?.kind === 'PERSONAL';
  const isPersonalScope = !projectId || isPersonalProject;
  const isAdmin = user?.role === 'ADMIN';
  const isDeptHead = user?.role === 'DEPARTMENT_HEAD';
  const isPM = user?.role === 'PM';

  const canCreateTask = isPersonalScope || isAdmin || isDeptHead || isPM;

  /**
   * Quyền kéo thả công việc trên bảng Kanban:
   * 1. Dự án cá nhân (isPersonalScope) -> Người dùng tự do kéo thả tất cả
   * 2. Quản trị viên (ADMIN), PM hoặc Trưởng phòng (DEPT_HEAD) -> Kéo thả được mọi việc
   * 3. Nhân viên: ĐƯỢC kéo thả task được giao cho mình (assignee) hoặc do mình tạo (createdBy)
   */
  const canDragTask = (task: Task): boolean => {
    if (isPersonalScope) return true;
    if (isAdmin || isPM || isDeptHead) return true;
    const currentUserId = user?.id;
    if (!currentUserId) return false;
    return (
      task.assignee?.id === currentUserId ||
      (task as any).assigneeId === currentUserId ||
      (task as any).createdById === currentUserId
    );
  };

  const creatableProjects = useMemo(() => {
    const list = projects.filter((p) => {
      if (p.kind === 'PERSONAL') return true;
      return isAdmin || isDeptHead || isPM;
    });
    return list.sort((a, b) => {
      if (a.kind === 'PERSONAL') return -1;
      if (b.kind === 'PERSONAL') return 1;
      return a.name.localeCompare(b.name);
    });
  }, [projects, isAdmin, isDeptHead, isPM]);

  // Load project members when createProjectId changes
  useEffect(() => {
    if (!createProjectId) {
      setProjectMembers([]);
      return;
    }
    const proj = projects.find((p) => p.id === createProjectId);
    if (proj?.kind === 'PERSONAL') {
      setCreateAssigneeId(user?.id || '');
      setProjectMembers([]);
      return;
    }

    let isMounted = true;
    projectApi
      .getById(createProjectId)
      .then((detail) => {
        if (!isMounted) return;
        if (detail.members && detail.members.length > 0) {
          const list = detail.members.map((m) => ({
            id: m.userId,
            name: m.user?.name || m.userId,
            email: m.user?.email || '',
            role: m.projectRole,
          }));
          setProjectMembers(list);
          setCreateAssigneeId((prev) => (prev && list.some((x) => x.id === prev) ? prev : user?.id || list[0]?.id || ''));
        } else {
          usersApi
            .getAssignable()
            .then((users) => {
              if (!isMounted) return;
              const list = users.map((u) => ({
                id: u.id,
                name: u.name,
                email: u.email,
                role: u.role,
              }));
              setProjectMembers(list);
            })
            .catch(() => {});
        }
      })
      .catch(() => {
        usersApi
          .getAssignable()
          .then((users) => {
            if (!isMounted) return;
            const list = users.map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
            }));
            setProjectMembers(list);
          })
          .catch(() => {});
      });

    return () => {
      isMounted = false;
    };
  }, [createProjectId, projects, user?.id]);

  useEffect(() => {
    if (projectId) {
      if (isPersonalProject) {
        loadBoard({ scope: 'mine', projectId });
      } else {
        loadBoard({ scope: teamScopeMode, projectId });
      }
    } else {
      loadBoard({ scope: 'mine' });
    }
  }, [projectId, isPersonalProject, teamScopeMode, loadBoard]);

  // Overdue check
  const isTaskOverdue = (task: Task) => {
    if (!task.dueDate || task.status === 'DONE') return false;
    return new Date(task.dueDate).getTime() < Date.now();
  };

  const overdueCount = useMemo(() => {
    return tasks.filter(isTaskOverdue).length;
  }, [tasks]);

  // If user navigated to a project that resulted in 403, or invalid
  useEffect(() => {
    if (status === 'error' && error && (error.includes('403') || error.includes('access'))) {
      toast.error('Truy cập bị từ chối', {
        description: 'Bạn không có quyền xem dự án này. Đã quay lại bảng cá nhân.',
      });
      navigate('/tasks');
    }
  }, [status, error, navigate]);

  // Get dynamic unique labels from all loaded tasks
  const availableLabels = useMemo(() => {
    const set = new Set<string>();
    tasks.forEach((t) => t.labels?.forEach((l) => set.add(l)));
    return Array.from(set).sort();
  }, [tasks]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterPriority !== 'ALL') count++;
    if (filterStatus !== 'ALL') count++;
    if (filterLabel !== 'ALL') count++;
    if (filterOverdueOnly) count++;
    return count;
  }, [filterPriority, filterStatus, filterLabel, filterOverdueOnly]);

  const handleResetFilters = () => {
    setFilterPriority('ALL');
    setFilterStatus('ALL');
    setFilterLabel('ALL');
    setFilterOverdueOnly(false);
    setSearchQuery('');
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const task = tasks.find((t) => t.id === draggableId);
    if (task && !canDragTask(task)) {
      toast.warning(
        isVi
          ? 'Bạn chỉ có thể cập nhật trạng thái công việc được giao cho chính mình'
          : 'You can only update tasks assigned to you'
      );
      return;
    }

    const nextStatus = destination.droppableId as TaskStatus;

    try {
      await moveTask(draggableId, {
        status: nextStatus,
        destinationIndex: destination.index,
      });
      toast.success('Cập nhật thành công', {
        description: 'Đã chuyển công việc sang cột ' + getColumnTitle(nextStatus),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể di chuyển công việc';
      toast.error('Lỗi thao tác', {
        description: msg,
      });
    }
  };

  const handleQuickStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await moveTask(taskId, {
        status: newStatus,
        destinationIndex: 0,
      });
      toast.success('Đã cập nhật trạng thái', {
        description: `Chuyển sang cột ${getColumnTitle(newStatus)}`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể cập nhật trạng thái';
      toast.error('Lỗi thao tác', { description: msg });
    }
  };

  const handleOpenCreateModal = () => {
    setCreateTitle('');
    setCreateDescription('');
    const personalProj = projects.find((p) => p.kind === 'PERSONAL');
    const defaultProjId = (projectId && creatableProjects.some((p) => p.id === projectId))
      ? projectId
      : (!projectId && personalProj ? personalProj.id : (creatableProjects[0]?.id || ''));
    setCreateProjectId(defaultProjId);
    setCreateStatus('TODO');
    setCreatePriority('MEDIUM');
    setCreateDueDate('');
    setCreateStoryPoints('');
    setCreateTimeEstimate('');
    setCreateLabelsInput('');
    setCreateAssigneeId(user?.id || '');
    setIsCreateModalOpen(true);
  };

  const handleCreateTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) {
      toast.error('Thiếu thông tin', { description: 'Vui lòng nhập tiêu đề công việc.' });
      return;
    }
    if (!createProjectId) {
      toast.error('Thiếu thông tin', { description: 'Vui lòng chọn dự án.' });
      return;
    }

    const parsedLabels = createLabelsInput
      .split(',')
      .map((l) => l.trim().toUpperCase())
      .filter(Boolean);

    setIsCreating(true);
    try {
      await createTask({
        title: createTitle.trim(),
        description: createDescription.trim() || undefined,
        projectId: createProjectId,
        status: createStatus,
        priority: createPriority,
        labels: parsedLabels,
        dueDate: createDueDate ? new Date(createDueDate).toISOString() : undefined,
        storyPoints: createStoryPoints ? parseInt(createStoryPoints, 10) : undefined,
        timeEstimate: createTimeEstimate ? parseInt(createTimeEstimate, 10) : undefined,
        assigneeId: createAssigneeId || undefined,
      });

      toast.success('Tạo công việc thành công', {
        description: `Đã thêm "${createTitle.trim()}" vào cột ${getColumnTitle(createStatus)}`,
      });
      setIsCreateModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Không thể tạo công việc';
      toast.error('Lỗi tạo công việc', { description: msg });
    } finally {
      setIsCreating(false);
    }
  };

  const getTagClass = (tag: string) => TAG_CLASSES[tag.toUpperCase()] ?? '';

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // 0. Hide completed tasks
      if (hideCompleted && task.status === 'DONE') {
        return false;
      }

      // 1. Overdue only filter
      if (filterOverdueOnly && !isTaskOverdue(task)) {
        return false;
      }

      // 2. Text Search Query — title / mã task / nhãn / mô tả / người phụ trách
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title?.toLowerCase().includes(q);
        const matchesId = task.id?.toLowerCase().includes(q);
        const matchesLabel = task.labels && task.labels.some((l) => l?.toLowerCase().includes(q));
        const matchesDescription = task.description?.toLowerCase().includes(q);
        const matchesAssignee = task.assignee?.name?.toLowerCase().includes(q);
        if (
          !matchesTitle &&
          !matchesId &&
          !matchesLabel &&
          !matchesDescription &&
          !matchesAssignee
        ) {
          return false;
        }
      }

      // 3. Priority Filter
      if (filterPriority !== 'ALL' && task.priority !== filterPriority) {
        return false;
      }

      // 4. Status Filter
      if (filterStatus !== 'ALL' && task.status !== filterStatus) {
        return false;
      }

      // 5. Label Filter
      if (filterLabel !== 'ALL') {
        if (!task.labels || !task.labels.includes(filterLabel)) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, hideCompleted, filterOverdueOnly, searchQuery, filterPriority, filterStatus, filterLabel]);

  const getColumnTasks = (status: TaskStatus) => {
    return filteredTasks
      .filter((task) => task.status === status)
      .sort((a, b) => {
        if (sortBy === 'PRIORITY') {
          const weights: Record<Task['priority'], number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
          return weights[b.priority] - weights[a.priority];
        }
        if (sortBy === 'DEADLINE') {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (sortBy === 'CREATED') {
          const da = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const db = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return db - da;
        }
        return a.position - b.position;
      });
  };

  const todoCount = filteredTasks.filter((task) => task.status === 'TODO').length;
  const activeCount = filteredTasks.filter((task) => task.status === 'IN_PROGRESS').length;
  const doneCount = filteredTasks.filter((task) => task.status === 'DONE').length;

  const headerTitle = !projectId
    ? t('kanban.my_tasks', 'Việc của tôi')
    : isPersonalProject
    ? t('kanban.personal_work', 'Việc cá nhân')
    : currentProject?.name || t('kanban.project_board', 'Bảng dự án');

  const headerKicker = !projectId
    ? t('kanban.header_kicker_all', 'WorkSync / Việc được giao & Cá nhân')
    : isPersonalProject
    ? t('kanban.header_kicker_personal', 'WorkSync / Dự án riêng tư')
    : `${t('kanban.header_kicker_project', 'WorkSync / Dự án')} / ${currentProject?.name || ''}`;

  return (
    <section className="kanban-page" aria-labelledby="kanban-page-title">
      <header className="kanban-header">
        <div className="kanban-heading">
          <div className="kanban-kicker">
            <span className="kanban-kicker__mark" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            {headerKicker}
          </div>
          <h1 className="kanban-title" id="kanban-page-title">{headerTitle}</h1>
          <div className="kanban-sprint-line">
            <span className="kanban-sprint-badge">
              {!projectId ? t('kanban.all_projects_badge', 'TẤT CẢ DỰ ÁN') : isPersonalProject ? t('kanban.personal', 'CÁ NHÂN') : t('kanban.team_project', 'DỰ ÁN NHÓM')}
            </span>
            <span>{t('kanban.tasks_count', { count: tasks.length })}</span>
            {projectId && !isPersonalProject && (
              <div className="inline-flex ml-2 rounded-xl border border-slate-200 bg-slate-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setTeamScopeMode('project')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    teamScopeMode === 'project'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t('kanban.all_members', 'Tất cả thành viên')}
                </button>
                <button
                  type="button"
                  onClick={() => setTeamScopeMode('mine')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    teamScopeMode === 'mine'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t('kanban.only_my_tasks', 'Chỉ việc của tôi')}
                </button>
              </div>
            )}
            {!isPersonalScope && (
              <span className="inline-flex items-center gap-1.5 ml-2 px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200/80 rounded-lg">
                <Users className="w-3.5 h-3.5 text-blue-500" />
                {t('kanban.team_project_badge', isVi ? 'Dự án nhóm' : 'Team Project')}
              </span>
            )}
          </div>
        </div>

        {canCreateTask && (
          <Button
            onClick={handleOpenCreateModal}
            className="h-10 gap-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs hover:shadow-sm transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            {t('kanban.create_task_button', 'Tạo công việc')}
          </Button>
        )}
      </header>

      <section className="kanban-summary grid grid-cols-2 md:grid-cols-4 gap-3.5" aria-label="Tóm tắt công việc">
        <div className="kanban-stat rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all">
          <span className="kanban-stat__number">{tasks.length}</span>
          <span className="kanban-stat__label">{t('kanban.kpi_total', 'Tổng công việc')}</span>
          <ListTodo className="ml-auto h-5 w-5 text-slate-400" aria-hidden="true" />
        </div>
        <div className="kanban-stat kanban-stat--active rounded-2xl border border-amber-200/80 shadow-2xs hover:shadow-xs transition-all">
          <span className="kanban-stat__number text-amber-600">{activeCount}</span>
          <span className="kanban-stat__label text-amber-800">{t('kanban.kpi_active', 'Đang thực hiện')}</span>
          <Clock3 className="ml-auto h-5 w-5 text-amber-500" aria-hidden="true" />
        </div>
        <div
          onClick={() => setFilterOverdueOnly((prev) => !prev)}
          className={`kanban-stat kanban-stat--overdue rounded-2xl border transition-all cursor-pointer ${
            filterOverdueOnly
              ? 'ring-2 ring-rose-500 bg-rose-50/80 border-rose-300 shadow-xs'
              : overdueCount > 0
              ? 'border-rose-200/90 bg-rose-50/30 hover:bg-rose-50/60 shadow-2xs'
              : 'border-slate-200/90 shadow-2xs'
          }`}
          title={t('kanban.kpi_filter_overdue_title', 'Bấm để lọc các công việc quá hạn')}
        >
          <span className="kanban-stat__number text-rose-600">{overdueCount}</span>
          <div className="flex flex-col">
            <span className="kanban-stat__label text-rose-700">{t('kanban.kpi_overdue', 'Đã quá hạn')}</span>
            <span className="text-[10px] text-rose-500 font-semibold">
              {filterOverdueOnly
                ? t('kanban.kpi_filtering_overdue', 'Đang lọc quá hạn ✕')
                : overdueCount > 0
                ? t('kanban.kpi_click_to_filter', 'Bấm để lọc')
                : t('kanban.kpi_no_late_tasks', 'Không có việc trễ')}
            </span>
          </div>
          <AlertCircle className="ml-auto h-5 w-5 text-rose-500" aria-hidden="true" />
        </div>
        <div className="kanban-stat kanban-stat--done rounded-2xl border border-emerald-200/80 shadow-2xs hover:shadow-xs transition-all">
          <span className="kanban-stat__number text-emerald-600">{doneCount}</span>
          <span className="kanban-stat__label text-emerald-700">{t('kanban.kpi_completed', 'Hoàn thành')}</span>
          <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-500" aria-hidden="true" />
        </div>
      </section>

      <div className="kanban-toolbar flex-wrap gap-2.5">
        <label className="kanban-toolbar__search">
          <Search className="kanban-toolbar__search-icon h-4 w-4" aria-hidden="true" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('kanban.search_placeholder', 'Tìm theo tên, mã task hoặc nhãn...')}
            aria-label="Tìm công việc"
            className="kanban-search-input"
          />
          {searchQuery.trim() && (
            <span className="kanban-toolbar__search-count" aria-live="polite">
              {filteredTasks.length}
            </span>
          )}
        </label>

        {/* View Mode Switcher: Board vs List */}
        <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-0.5 shrink-0 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode('board')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              viewMode === 'board'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FolderKanban className="w-3.5 h-3.5 text-blue-600" />
            <span>{t('kanban.view_board', 'Bảng Kanban')}</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
              viewMode === 'list'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListOrdered className="w-3.5 h-3.5 text-indigo-600" />
            <span>{t('kanban.view_list', 'Bảng danh sách')}</span>
          </button>
        </div>

        {/* Hide Completed Toggle */}
        <button
          type="button"
          onClick={() => setHideCompleted((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl border transition-all ${
            hideCompleted
              ? 'bg-indigo-50 border-indigo-300 text-indigo-700 shadow-2xs'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
          title="Ẩn bớt các công việc đã hoàn thành để tập trung vào việc đang cần làm"
        >
          {hideCompleted ? <EyeOff className="w-3.5 h-3.5 text-indigo-600" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
          <span>{hideCompleted ? `${t('kanban.hide_completed', 'Ẩn việc đã xong')} (${doneCount})` : t('kanban.hide_completed', 'Ẩn việc đã xong')}</span>
        </button>

        {/* Quick Overdue Filter Chip */}
        {overdueCount > 0 && (
          <button
            type="button"
            onClick={() => setFilterOverdueOnly((prev) => !prev)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border transition-all ${
              filterOverdueOnly
                ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                : 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100'
            }`}
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{filterOverdueOnly ? 'Bỏ lọc quá hạn' : `Quá hạn (${overdueCount})`}</span>
          </button>
        )}

        <Button
          variant="outline"
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`gap-2 px-3.5 h-10 rounded-xl border border-slate-200 text-xs font-bold shadow-xs hover:border-slate-300 transition-all ${
            isFilterOpen || activeFilterCount > 0 ? 'bg-slate-900 text-white hover:bg-slate-800 hover:text-white' : 'bg-white text-slate-700'
          }`}
        >
          <Filter className="h-4 w-4" aria-hidden="true" />
          {t('kanban.filter_button', 'Lọc')} {activeFilterCount > 0 && `(${activeFilterCount})`}
        </Button>

        {/* Modern Sort Control */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs font-bold text-slate-500 hidden sm:inline">{t('kanban.sort_label', 'Sắp xếp')}:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'DEFAULT' | 'DEADLINE' | 'PRIORITY' | 'CREATED')}
            className="h-10 px-3 text-xs font-bold border border-slate-200 bg-white rounded-xl shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none cursor-pointer"
            aria-label="Sắp xếp công việc"
          >
            <option value="DEFAULT">{t('kanban.sort_default', 'Mặc định (Vị trí kéo thả)')}</option>
            <option value="DEADLINE">{t('kanban.sort_deadline', 'Hạn chót (Gấp nhất trước)')}</option>
            <option value="PRIORITY">{t('kanban.sort_priority', 'Độ ưu tiên (Cao nhất trước)')}</option>
            <option value="CREATED">{t('kanban.sort_created', 'Mới tạo gần đây nhất')}</option>
          </select>
        </div>
      </div>

      {/* Modern Filter Panel */}
      {isFilterOpen && (
        <div className="rounded-2xl p-4 my-2 border border-slate-200 bg-slate-50/80 shadow-sm flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">{t('kanban.filter_priority', 'Độ ưu tiên')}:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="h-9 px-3 text-xs font-bold border border-slate-200 bg-white rounded-xl shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="ALL">{t('kanban.all_priorities', 'Tất cả ưu tiên')}</option>
              <option value="URGENT">{t('kanban.priorities.URGENT', 'Khẩn cấp')}</option>
              <option value="HIGH">{t('kanban.priorities.HIGH', 'Cao')}</option>
              <option value="MEDIUM">{t('kanban.priorities.MEDIUM', 'Trung bình')}</option>
              <option value="LOW">{t('kanban.priorities.LOW', 'Thấp')}</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">{t('kanban.task_status_column', 'Trạng thái')}:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-9 px-3 text-xs font-bold border border-slate-200 bg-white rounded-xl shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="ALL">{t('kanban.all_columns', 'Tất cả cột')}</option>
              <option value="TODO">{t('kanban.columns.TODO', 'Cần làm')}</option>
              <option value="IN_PROGRESS">{t('kanban.columns.IN_PROGRESS', 'Đang làm')}</option>
              <option value="IN_REVIEW">{t('kanban.columns.IN_REVIEW', 'Đánh giá')}</option>
              <option value="BLOCKED">{t('kanban.columns.BLOCKED', 'Bị chặn')}</option>
              <option value="DONE">{t('kanban.columns.DONE', 'Hoàn thành')}</option>
            </select>
          </div>

          {availableLabels.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">{t('kanban.filter_label', 'Nhãn')}:</span>
              <select
                value={filterLabel}
                onChange={(e) => setFilterLabel(e.target.value)}
                className="h-9 px-3 text-xs font-bold border border-slate-200 bg-white rounded-xl shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              >
                <option value="ALL">{t('kanban.all_labels', 'Tất cả nhãn')}</option>
                {availableLabels.map((lbl) => (
                  <option key={lbl} value={lbl}>{lbl}</option>
                ))}
              </select>
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700 select-none">
            <input
              type="checkbox"
              checked={filterOverdueOnly}
              onChange={(e) => setFilterOverdueOnly(e.target.checked)}
              className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500"
            />
            <span>{t('kanban.only_overdue', 'Chỉ xem việc đã quá hạn')}</span>
          </label>

          {(activeFilterCount > 0 || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="ml-auto h-9 px-3 text-xs font-bold gap-1.5 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t('kanban.clear_filters', 'Xóa bộ lọc')}
            </Button>
          )}
        </div>
      )}

      {status === 'error' && (
        <div className="bauhaus-card p-6 my-4 border-2 border-red-600 bg-red-50 flex items-center justify-between">
          <div className="flex items-center gap-3 text-red-900 font-bold">
            <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
            <span>Đã có lỗi khi tải danh sách công việc: {error}</span>
          </div>
          <Button onClick={() => retry()} variant="outline" className="gap-2 border-red-900 text-red-900 hover:bg-red-100">
            <RefreshCw className="h-4 w-4" />
            Thử lại
          </Button>
        </div>
      )}

      {status === 'loading' && tasks.length === 0 ? (
        <div className="kanban-board animate-pulse" aria-label="Đang tải dữ liệu">
          {COLUMNS.map((col) => (
            <section key={col.id} className="kanban-column opacity-75">
              <header className="kanban-column__header">
                <div className="h-5 w-24 bg-slate-200 border border-slate-300" />
              </header>
              <div className="kanban-column__body space-y-3 p-2">
                <div className="h-24 bg-slate-100 border-2 border-slate-200" />
                <div className="h-24 bg-slate-100 border-2 border-slate-200" />
              </div>
            </section>
          ))}
        </div>
      ) : viewMode === 'list' ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-extrabold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">{t('kanban.table_col_id', 'Mã việc')}</th>
                  <th className="py-3 px-4">{t('kanban.table_col_title', 'Tiêu đề & Nhãn')}</th>
                  <th className="py-3 px-4">{t('kanban.table_col_project', 'Dự án')}</th>
                  <th className="py-3 px-4">{t('kanban.table_col_priority', 'Ưu tiên')}</th>
                  <th className="py-3 px-4">{t('kanban.table_col_assignee', 'Người thực hiện')}</th>
                  <th className="py-3 px-4">{t('kanban.table_col_deadline', 'Hạn chót & Cảnh báo')}</th>
                  <th className="py-3 px-4">{t('kanban.table_col_status', 'Trạng thái')}</th>
                  <th className="py-3 px-4 text-right">{t('kanban.table_col_actions', 'Thao tác')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-14 text-center text-slate-400">
                      <ListTodo className="w-9 h-9 mx-auto mb-2 opacity-40 text-slate-500" />
                      <p className="font-bold text-slate-700 text-sm">{t('kanban.table_empty', 'Không có công việc nào phù hợp với bộ lọc')}</p>
                      {hideCompleted && (
                        <p className="text-xs text-slate-400 mt-1">
                          {t('kanban.table_empty_hint', '(Bạn đang bật tính năng ẩn việc đã xong. Hãy bấm "Hiện việc đã xong" để xem lại)')}
                        </p>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => {
                    const deadline = getDeadlineInfo(task.dueDate, t, i18n.language);
                    const isOverdue = isTaskOverdue(task);
                    return (
                      <tr
                        key={task.id}
                        onClick={() => setSelectedTaskId(task.id)}
                        className={`group cursor-pointer transition-colors ${
                          isOverdue
                            ? 'bg-rose-50/30 hover:bg-rose-50/60'
                            : task.status === 'DONE'
                            ? 'bg-slate-50/40 hover:bg-slate-50/80 opacity-75'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Mã việc */}
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-[11px] shadow-2xs">
                            {task.id}
                          </span>
                        </td>

                        {/* Tiêu đề & Nhãn */}
                        <td className="py-3.5 px-4 min-w-[240px]">
                          <div className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                            {task.title}
                          </div>
                          {task.labels && task.labels.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {task.labels.map((lbl) => (
                                <span
                                  key={lbl}
                                  className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200/80 shadow-2xs"
                                >
                                  {lbl}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Dự án */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {task.project ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200/80 shadow-2xs">
                              {task.project.name}
                            </span>
                          ) : (
                            <span className="text-slate-400">–</span>
                          )}
                        </td>

                        {/* Ưu tiên */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-2xs ${
                            task.priority === 'URGENT'
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : task.priority === 'HIGH'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : task.priority === 'MEDIUM'
                              ? 'bg-blue-100 text-blue-800 border border-blue-200'
                              : 'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              task.priority === 'URGENT' ? 'bg-rose-600' : task.priority === 'HIGH' ? 'bg-amber-600' : task.priority === 'MEDIUM' ? 'bg-blue-600' : 'bg-slate-500'
                            }`} />
                            {getPriorityLabel(task.priority)}
                          </span>
                        </td>

                        {/* Người thực hiện */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {task.assignee ? (
                            <div className="flex items-center gap-2">
                              {task.assignee.avatar ? (
                                <img src={task.assignee.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 font-bold text-[10px] flex items-center justify-center">
                                  {getInitials(task.assignee.name)}
                                </div>
                              )}
                              <span className="font-medium text-slate-800">{task.assignee.name}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">{t('kanban.unassigned', 'Chưa giao')}</span>
                          )}
                        </td>

                        {/* Hạn chót & Quá hạn */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {deadline ? (
                            <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs ${deadline.className}`}>
                              <Calendar className="w-3 h-3 shrink-0" />
                              {deadline.text}
                            </span>
                          ) : (
                            <span className="text-slate-400">–</span>
                          )}
                        </td>

                        {/* Trạng thái (Quick Dropdown if permitted, else static pill) */}
                        <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {(isPersonalScope || task.assignee?.id === user?.id || isAdmin || isPM) ? (
                            <select
                              value={task.status}
                              onChange={(e) => handleQuickStatusChange(task.id, e.target.value as TaskStatus)}
                              className={`text-xs font-semibold rounded-lg px-2.5 py-1 border transition-all cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                                task.status === 'DONE'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : task.status === 'IN_PROGRESS'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
                                  : task.status === 'IN_REVIEW'
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                                  : task.status === 'BLOCKED'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              <option value="TODO">{t('kanban.status_todo', 'Cần làm')}</option>
                              <option value="IN_PROGRESS">{t('kanban.status_in_progress', 'Đang làm')}</option>
                              <option value="IN_REVIEW">{t('kanban.status_in_review', 'Đánh giá')}</option>
                              <option value="BLOCKED">{t('kanban.status_blocked', 'Bị chặn')}</option>
                              <option value="DONE">{t('kanban.status_done', 'Hoàn thành')}</option>
                            </select>
                          ) : (
                            <span
                              className={`inline-flex items-center text-xs font-medium rounded-lg px-2.5 py-1 border ${
                                task.status === 'DONE'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : task.status === 'IN_PROGRESS'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : task.status === 'IN_REVIEW'
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : task.status === 'BLOCKED'
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {t(`kanban.columns.${task.status}`, getColumnTitle(task.status))}
                            </span>
                          )}
                        </td>

                        {/* Thao tác */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTaskId(task.id);
                            }}
                            className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            {t('kanban.view_detail', 'Chi tiết ↗')}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer info */}
          <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>{t('kanban.showing_tasks_count', { count: filteredTasks.length })}</span>
            {hideCompleted && doneCount > 0 && (
              <span className="text-indigo-600 font-semibold">
                {t('kanban.hidden_done_badge', { count: doneCount })}
              </span>
            )}
          </div>
        </div>
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="kanban-board" aria-label="Bảng Kanban">
            {COLUMNS.map((column) => {
              const columnTasks = getColumnTasks(column.id);

              // If hideCompleted is true and column is DONE, show collapsed column
              if (hideCompleted && column.id === 'DONE') {
                return (
                  <section className="kanban-column opacity-85 border-dashed" key={column.id} aria-label={column.title}>
                    <header className="kanban-column__header justify-between">
                      <div className="kanban-column__title-wrap">
                        <h2 className="kanban-column__title text-slate-400">{t('kanban.columns.DONE', 'Hoàn thành')}</h2>
                        <span className="kanban-column__count bg-slate-100 text-slate-500 font-bold">{doneCount}</span>
                      </div>
                    </header>
                    <div className="kanban-column__body items-center justify-center p-6 text-center space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto shadow-2xs">
                        <EyeOff className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">
                        {t('kanban.hidden_done_tasks', 'Đã ẩn {{count}} việc hoàn thành', { count: doneCount })}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {t('kanban.hidden_done_hint', 'Giúp bạn tập trung vào các việc đang cần làm')}
                      </p>
                      <button
                        type="button"
                        onClick={() => setHideCompleted(false)}
                        className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline pt-1"
                      >
                        {t('kanban.show_done_column', 'Hiện lại cột hoàn thành')}
                      </button>
                    </div>
                  </section>
                );
              }

              return (
                <section className={'kanban-column ' + column.className} key={column.id} aria-label={column.title}>
                  <header className="kanban-column__header">
                    <div className="kanban-column__title-wrap">
                      <h2 className="kanban-column__title">{t(`kanban.columns.${column.id}`, column.title)}</h2>
                      <span className="kanban-column__count" aria-label={columnTasks.length + ' tasks'}>
                        {columnTasks.length}
                      </span>
                    </div>
                    <button type="button" className="kanban-column__menu" aria-label={'Column options ' + column.title}>
                      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </header>

                  <Droppable droppableId={column.id} isDropDisabled={false}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={
                          'kanban-column__body' +
                          (snapshot.isDraggingOver ? ' kanban-column__body--drag-over' : '')
                        }
                      >
                        {columnTasks.length === 0 && (
                          <div className="kanban-empty">{t('kanban.no_tasks', 'Chưa có công việc')}</div>
                        )}
                        {columnTasks.map((task, index) => {
                          const deadline = getDeadlineInfo(task.dueDate, t, i18n.language);
                          const cardPriorityClass = PRIORITY_CARD_FRAME[task.priority];
                          const isMovable = canDragTask(task);

                          return (
                            <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={!isMovable}>
                              {(draggable, dragSnapshot) => {
                                const dragHandleProps = draggable.dragHandleProps;
                                return (
                                  <article
                                    ref={draggable.innerRef}
                                    {...draggable.draggableProps}
                                    {...dragHandleProps}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={'Mở chi tiết công việc ' + task.title}
                                    onClick={() => setSelectedTaskId(task.id)}
                                    onKeyDown={(event) => {
                                      if (event.key === 'Enter') setSelectedTaskId(task.id);
                                    }}
                                    title={
                                      !isMovable
                                        ? (isVi ? 'Công việc này do nhân sự khác phụ trách' : 'Assigned to another member')
                                        : undefined
                                    }
                                    className={
                                      'kanban-task transition-shadow ' +
                                      cardPriorityClass +
                                      (dragSnapshot.isDragging ? ' kanban-task--dragging' : '') +
                                      (!isMovable ? ' opacity-85 cursor-default' : ' cursor-grab active:cursor-grabbing')
                                    }
                                  >
                                    <div className="kanban-task__meta flex flex-wrap items-center gap-1.5">
                                      <span className="kanban-task__id">{task.id}</span>
                                      {!projectId && task.project && (
                                        <span
                                          className="inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-md border border-slate-200/90 text-slate-700 bg-slate-100/90 shadow-2xs"
                                        >
                                          {task.project.name}
                                        </span>
                                      )}
                                      <span className={'kanban-priority ml-auto ' + PRIORITY_CLASSES[task.priority]}>
                                        <span className="kanban-priority__dot" aria-hidden="true" />
                                        {getPriorityLabel(task.priority)}
                                      </span>
                                    </div>

                                    <h3 className="kanban-task__title">{task.title}</h3>

                                    {/* Labels & Due date row */}
                                    <div className="flex flex-wrap items-center gap-1.5 my-1.5">
                                      {task.labels && task.labels.length > 0 && (
                                        task.labels.map((label) => (
                                          <span key={label} className={'kanban-tag ' + getTagClass(label)}>{label}</span>
                                        ))
                                      )}
                                      {deadline && (
                                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs ${deadline.className}`}>
                                          <Calendar className="h-3 w-3 shrink-0" />
                                          {deadline.text}
                                        </span>
                                      )}
                                      {task.storyPoints && (
                                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border border-amber-200 bg-amber-50 text-amber-800 shadow-2xs">
                                          <Zap className="h-2.5 w-2.5 text-amber-500" />
                                          {task.storyPoints} SP
                                        </span>
                                      )}
                                    </div>

                                    <div className="kanban-task__footer">
                                      {task.assignee ? (
                                        <span className="kanban-task__assignee">
                                          {task.assignee.avatar ? (
                                            <img
                                              className="kanban-avatar"
                                              src={task.assignee.avatar}
                                              alt=""
                                            />
                                          ) : (
                                            <span className="kanban-avatar" aria-hidden="true">
                                              {getInitials(task.assignee.name)}
                                            </span>
                                          )}
                                          <span>{task.assignee.name}</span>
                                        </span>
                                      ) : (
                                        <span className="kanban-task__assignee">
                                          <span className="kanban-avatar kanban-avatar--empty" aria-hidden="true">–</span>
                                          {t('kanban.unassigned', 'Chưa phân công')}
                                        </span>
                                      )}
                                      <span className="kanban-task__id">{t('kanban.view_detail', 'Chi tiết ↗')}</span>
                                    </div>
                                  </article>
                                );
                              }}
                            </Draggable>
                          );
                        })}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </section>
              );
            })}
          </div>
        </DragDropContext>
      )}

      {/* Modal Tạo Công Việc (Create Task Modal) */}
      {isCreateModalOpen && (
        <div className="kanban-modal-overlay">
          <section
            className="kanban-modal max-w-lg w-full border border-slate-200/90 bg-white rounded-2xl shadow-2xl overflow-hidden p-0 animate-in fade-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="kanban-create-modal-title"
          >
            <header className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Plus className="h-4 w-4" />
                </div>
                <h2 className="text-base font-bold text-slate-900" id="kanban-create-modal-title">
                  {t('kanban.create_modal_title', 'Tạo công việc mới')}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </header>

            <form onSubmit={handleCreateTaskSubmit}>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    {t('kanban.task_title', 'Tiêu đề công việc')} <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder={t('kanban.task_title_placeholder', 'VD: Thiết kế API xác thực JWT...')}
                    className="h-10 px-3 text-xs font-medium border border-slate-200 rounded-xl bg-white shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>

                {/* Project Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    {t('kanban.task_project', 'Dự án')} <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={createProjectId}
                    onChange={(e) => setCreateProjectId(e.target.value)}
                    className="w-full h-10 px-3 text-xs font-medium border border-slate-200 bg-white rounded-xl shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  >
                    {creatableProjects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.kind === 'PERSONAL' ? t('kanban.personal_work', 'Việc cá nhân') : p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Assignee Selection (Giao việc cho thành viên khi là PM / Admin / Dept Head) */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                    <UserIcon className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t('kanban.task_assignee', 'Người phụ trách')}</span>
                  </label>
                  {projects.find((p) => p.id === createProjectId)?.kind === 'PERSONAL' ? (
                    <div className="flex items-center gap-2 h-10 px-3 text-xs font-medium border border-slate-200 bg-slate-50 text-slate-700 rounded-xl">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span>{t('kanban.task_assignee_personal', 'Tôi (Việc cá nhân)')}</span>
                    </div>
                  ) : (
                    <>
                      <select
                        value={createAssigneeId}
                        onChange={(e) => setCreateAssigneeId(e.target.value)}
                        className="w-full h-10 px-3 text-xs font-medium border border-slate-200 bg-white rounded-xl shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                      >
                        <option value="">{t('kanban.task_assignee_placeholder', '-- Chọn người phụ trách --')}</option>
                        {projectMembers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} {m.role ? `(${m.role})` : ''} - {m.email}
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {t('kanban.task_assignee_hint', 'Thành viên được chọn sẽ nhận thông báo tức thời ngay khi tạo.')}
                      </p>
                    </>
                  )}
                </div>

                {/* Status & Priority Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      {t('kanban.task_status_column', 'Cột trạng thái')}
                    </label>
                    <select
                      value={createStatus}
                      onChange={(e) => setCreateStatus(e.target.value as TaskStatus)}
                      className="w-full h-10 px-3 text-xs font-bold border border-slate-200 bg-white rounded-xl shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    >
                      <option value="TODO">{t('kanban.columns.TODO', 'Cần làm')}</option>
                      <option value="IN_PROGRESS">{t('kanban.columns.IN_PROGRESS', 'Đang làm')}</option>
                      <option value="IN_REVIEW">{t('kanban.columns.IN_REVIEW', 'Đánh giá')}</option>
                      <option value="BLOCKED">{t('kanban.columns.BLOCKED', 'Bị chặn')}</option>
                      <option value="DONE">{t('kanban.columns.DONE', 'Hoàn thành')}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      {t('kanban.task_priority', 'Mức độ ưu tiên')}
                    </label>
                    <select
                      value={createPriority}
                      onChange={(e) => setCreatePriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT')}
                      className="w-full h-10 px-3 text-xs font-bold border border-slate-200 bg-white rounded-xl shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    >
                      <option value="LOW">{t('kanban.priorities.LOW', 'Thấp (LOW)')}</option>
                      <option value="MEDIUM">{t('kanban.priorities.MEDIUM', 'Trung bình (MEDIUM)')}</option>
                      <option value="HIGH">{t('kanban.priorities.HIGH', 'Cao (HIGH)')}</option>
                      <option value="URGENT">{t('kanban.priorities.URGENT', 'Khẩn cấp (URGENT)')}</option>
                    </select>
                  </div>
                </div>

                {/* Due Date & Estimates Row */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      {t('kanban.task_deadline', 'Hạn chót (Deadline)')}
                    </label>
                    <Input
                      type="date"
                      value={createDueDate}
                      onChange={(e) => setCreateDueDate(e.target.value)}
                      className="h-10 px-3 text-xs font-medium border border-slate-200 rounded-xl bg-white shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      {t('kanban.task_story_points', 'Story Points')}
                    </label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={createStoryPoints}
                      onChange={(e) => setCreateStoryPoints(e.target.value)}
                      placeholder="VD: 5"
                      className="h-10 px-3 text-xs font-medium border border-slate-200 rounded-xl bg-white shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      {t('kanban.task_time_estimate', 'Ước tính (giờ)')}
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={createTimeEstimate}
                      onChange={(e) => setCreateTimeEstimate(e.target.value)}
                      placeholder="VD: 8"
                      className="h-10 px-3 text-xs font-medium border border-slate-200 rounded-xl bg-white shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Labels / Tags */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    {t('kanban.task_labels', 'Nhãn (phân tách bằng dấu phẩy)')}
                  </label>
                  <Input
                    value={createLabelsInput}
                    onChange={(e) => setCreateLabelsInput(e.target.value)}
                    placeholder={t('kanban.task_labels_placeholder', 'VD: UI, BACKEND, BUG...')}
                    className="h-10 px-3 text-xs font-medium border border-slate-200 rounded-xl bg-white shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    {t('kanban.task_description', 'Mô tả chi tiết')}
                  </label>
                  <textarea
                    rows={3}
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    placeholder={t('kanban.task_description_placeholder', 'Chi tiết công việc cần giải quyết...')}
                    className="w-full p-3 text-xs font-medium border border-slate-200 bg-white rounded-xl shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>
              </div>

              <footer className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="h-10 px-4 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  {t('kanban.cancel', 'Hủy')}
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="h-10 px-5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all active:scale-95 gap-1.5"
                >
                  {isCreating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  {isCreating ? t('kanban.creating', 'Đang tạo...') : t('kanban.create_submit', 'Tạo công việc')}
                </Button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {/* Modal Chi tiết Task (Redesigned Enterprise Linear/Jira Style) */}
      {selectedTask && (
        <div className="kanban-modal-overlay">
          <section
            className="kanban-modal max-w-4xl w-full border border-slate-200/90 bg-white rounded-2xl shadow-2xl overflow-hidden p-0 animate-in fade-in zoom-in-95 duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="kanban-modal-title"
          >
            {/* Modal Header */}
            <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/70">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-2.5 py-1 text-xs font-mono font-bold text-slate-800 bg-white border border-slate-300 rounded shadow-sm">
                  {selectedTask.id}
                </span>
                {selectedTask.project && (
                  <span
                    className="px-2.5 py-1 text-xs font-bold uppercase rounded border shadow-sm"
                    style={{
                      backgroundColor: selectedTask.project.color ? `${selectedTask.project.color}15` : '#F1F5F9',
                      borderColor: selectedTask.project.color ? `${selectedTask.project.color}40` : '#CBD5E1',
                      color: selectedTask.project.color || '#334155',
                    }}
                  >
                    {selectedTask.project.name}
                  </span>
                )}
                <span className={'inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold rounded border ' + PRIORITY_CLASSES[selectedTask.priority]}>
                  <span className="kanban-priority__dot" aria-hidden="true" />
                  {getPriorityLabel(selectedTask.priority)}
                </span>
              </div>

              <button
                type="button"
                onClick={handleCloseDetailModal}
                className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                aria-label="Đóng chi tiết công việc"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            {/* Modal Body - 2 Columns Layout */}
            <div className="p-6 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                
                {/* Cột trái (Nội dung chính - 7 cols) */}
                <div className="md:col-span-7 space-y-5">
                  {/* Tiêu đề */}
                  <h2 className="text-xl md:text-2xl font-bold text-slate-900 leading-snug tracking-tight" id="kanban-modal-title">
                    {selectedTask.title}
                  </h2>

                  {/* Thanh tiến trình trạng thái (Workflow Status Pipeline) */}
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      {t('taskDetail.status_pipeline')}
                    </span>
                    <div className="grid grid-cols-5 gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
                      {COLUMNS.map((col) => {
                        const isCurrent = selectedTask.status === col.id;
                        const localizedTitle = t(`kanban.columns.${col.id}`, col.title);
                        return (
                          <button
                            key={col.id}
                            type="button"
                            onClick={() => handleQuickStatusChange(selectedTask.id, col.id)}
                            className={`py-1.5 px-1 text-[11px] font-bold rounded transition-all text-center truncate ${
                              isCurrent
                                ? 'bg-white text-slate-900 shadow-sm border border-slate-300 font-extrabold'
                                : 'text-slate-500 hover:text-slate-800 hover:bg-white/50'
                            }`}
                            title={localizedTitle}
                          >
                            {localizedTitle}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mô tả công việc */}
                  <div className="space-y-1.5">
                    <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                      {t('taskDetail.description')}
                    </span>
                    <div className="p-4 bg-slate-50/70 rounded-lg border border-slate-200/80 min-h-[100px]">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                        {selectedTask.description || t('taskDetail.no_description')}
                      </p>
                    </div>
                  </div>

                  {/* Nhãn công việc */}
                  {selectedTask.labels && selectedTask.labels.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                        {t('taskDetail.labels')}
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedTask.labels.map((label) => (
                          <span
                            key={label}
                            className="px-2.5 py-0.5 text-xs font-semibold rounded bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            {label}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Cột phải (Bảng thông số thuộc tính - 5 cols) */}
                <div className="md:col-span-5">
                  <div className="p-4 bg-slate-50/60 rounded-xl border border-slate-200/90 space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      {t('taskDetail.properties')}
                    </h3>

                    {/* Người phụ trách */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <UserIcon className="h-4 w-4 text-slate-400" />
                        {t('taskDetail.assignee')}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {selectedTask.assignee ? (
                          <>
                            {selectedTask.assignee.avatar ? (
                              <img src={selectedTask.assignee.avatar} className="h-5 w-5 rounded-full object-cover" alt="" />
                            ) : (
                              <span className="h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold bg-primary text-white">
                                {getInitials(selectedTask.assignee.name)}
                              </span>
                            )}
                            <span className="text-xs font-semibold text-slate-800">{selectedTask.assignee.name}</span>
                          </>
                        ) : (
                          <span className="text-xs text-slate-400 italic">{t('taskDetail.unassigned')}</span>
                        )}
                      </div>
                    </div>

                    {/* Người tạo */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <UserPlus className="h-4 w-4 text-slate-400" />
                        {t('taskDetail.creator')}
                      </span>
                      <span className="text-xs font-semibold text-slate-800">
                        {selectedTask.createdBy?.name || 'Hệ thống'}
                      </span>
                    </div>

                    {/* Hạn chót */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <Calendar className="h-4 w-4 text-slate-400" />
                        {t('taskDetail.deadline')}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-semibold text-slate-800">
                          {selectedTask.dueDate ? formatShortDate(selectedTask.dueDate, i18n.language) : t('taskDetail.no_deadline')}
                        </span>
                        {selectedTask.dueDate && (() => {
                          const dl = getDeadlineInfo(selectedTask.dueDate, t, i18n.language);
                          return dl ? (
                            <span className={`px-1.5 py-0.5 text-[10px] rounded font-bold border ${dl.className}`}>
                              {dl.text}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </div>

                    {/* Ước tính */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <Zap className="h-4 w-4 text-amber-500" />
                        {t('taskDetail.estimate')}
                      </span>
                      <span className="text-xs font-semibold text-slate-800">
                        {selectedTask.timeEstimate ? `${selectedTask.timeEstimate} ${i18n.language === 'en' ? 'hrs' : 'giờ'}` : '–'}
                      </span>
                    </div>

                    {/* Đã làm */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <Clock3 className="h-4 w-4 text-blue-500" />
                        {t('taskDetail.tracked')}
                      </span>
                      <span className="text-xs font-semibold text-slate-800">
                        {selectedTask.timeTracked ? `${selectedTask.timeTracked} ${i18n.language === 'en' ? 'hrs' : 'giờ'}` : `0 ${i18n.language === 'en' ? 'hrs' : 'giờ'}`}
                      </span>
                    </div>

                    {/* Story Points */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <Flame className="h-4 w-4 text-red-500" />
                        {t('taskDetail.story_points')}
                      </span>
                      <span className="text-xs font-semibold text-slate-800">
                        {selectedTask.storyPoints ? `${selectedTask.storyPoints} SP` : '0 SP'}
                      </span>
                    </div>

                    {/* Dự án */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <FolderKanban className="h-4 w-4 text-slate-400" />
                        {t('taskDetail.project')}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 truncate max-w-[150px]">
                        {selectedTask.project?.name || '–'}
                      </span>
                    </div>

                    {/* Sprint */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <Flag className="h-4 w-4 text-slate-400" />
                        {t('taskDetail.sprint')}
                      </span>
                      <span className="text-xs font-semibold text-slate-800 truncate max-w-[150px]">
                        {selectedTask.sprint?.name || selectedTask.epic?.title || t('taskDetail.no_sprint')}
                      </span>
                    </div>

                    {/* Timestamps footer */}
                    <div className="pt-2 text-[11px] text-slate-400 space-y-0.5">
                      <div>{t('taskDetail.created_at')}: {formatDate(selectedTask.createdAt, i18n.language)}</div>
                      <div>{t('taskDetail.updated_at')}: {formatDate(selectedTask.updatedAt, i18n.language)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <footer className="flex justify-end px-6 py-3 border-t border-slate-200 bg-slate-50/70">
              <Button
                variant="outline"
                onClick={handleCloseDetailModal}
                className="h-9 px-5 text-xs font-bold rounded-lg border-slate-300 hover:bg-slate-100"
              >
                {t('taskDetail.close')}
              </Button>
            </footer>
          </section>
        </div>
      )}

      <span className="sr-only" aria-live="polite">
        {todoCount} công việc cần làm, {activeCount} đang làm, {doneCount} hoàn thành
      </span>
    </section>
  );
}
