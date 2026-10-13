import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock3,
  Filter,
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useTaskStore } from '@/stores/task.store';
import { useProjectStore } from '@/stores/project.store';
import type { BoardTask as Task, TaskStatus } from '@/stores/task.store';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

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

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'Chưa thiết lập';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
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

function formatShortDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
    });
  } catch {
    return '';
  }
}

function getDeadlineInfo(dueDateStr?: string | null) {
  if (!dueDateStr) return null;
  try {
    const now = new Date();
    const due = new Date(dueDateStr);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        text: `Quá hạn ${Math.abs(diffDays)} ngày`,
        isOverdue: true,
        className: 'bg-red-100 text-red-800 border-red-500 font-black',
      };
    }
    if (diffDays === 0) {
      return {
        text: 'Hết hạn hôm nay',
        isNear: true,
        className: 'bg-amber-100 text-amber-900 border-amber-500 font-bold',
      };
    }
    if (diffDays <= 2) {
      return {
        text: `Còn ${diffDays} ngày`,
        isNear: true,
        className: 'bg-amber-100 text-amber-900 border-amber-500 font-bold',
      };
    }
    return {
      text: formatShortDate(dueDateStr),
      className: 'bg-slate-100 text-slate-700 border-slate-300',
    };
  } catch {
    return null;
  }
}

export default function KanbanPage() {
  const { t } = useTranslation();
  const { projectId } = useParams<{ projectId?: string }>();
  const navigate = useNavigate();
  const { projects } = useProjectStore();
  const { tasks, status, error, loadBoard, moveTask, createTask, retry } = useTaskStore();

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const selectedTask = useMemo(() => tasks.find((t) => t.id === selectedTaskId) || null, [tasks, selectedTaskId]);
  const [searchQuery, setSearchQuery] = useState('');
  const [teamScopeMode, setTeamScopeMode] = useState<'project' | 'mine'>('project');

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
  const [isCreating, setIsCreating] = useState(false);

  const currentProject = useMemo(() => {
    return projects.find((p) => p.id === projectId);
  }, [projects, projectId]);

  const isPersonalProject = currentProject?.kind === 'PERSONAL';

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
    return count;
  }, [filterPriority, filterStatus, filterLabel]);

  const handleResetFilters = () => {
    setFilterPriority('ALL');
    setFilterStatus('ALL');
    setFilterLabel('ALL');
    setSearchQuery('');
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;
    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

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
    setCreateProjectId(projectId || projects[0]?.id || '');
    setCreateStatus('TODO');
    setCreatePriority('MEDIUM');
    setCreateDueDate('');
    setCreateStoryPoints('');
    setCreateTimeEstimate('');
    setCreateLabelsInput('');
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
      // 1. Text Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = task.title.toLowerCase().includes(q);
        const matchesId = task.id.toLowerCase().includes(q);
        const matchesLabel = task.labels && task.labels.some((l) => l.toLowerCase().includes(q));
        if (!matchesTitle && !matchesId && !matchesLabel) return false;
      }

      // 2. Priority Filter
      if (filterPriority !== 'ALL' && task.priority !== filterPriority) {
        return false;
      }

      // 3. Status Filter
      if (filterStatus !== 'ALL' && task.status !== filterStatus) {
        return false;
      }

      // 4. Label Filter
      if (filterLabel !== 'ALL') {
        if (!task.labels || !task.labels.includes(filterLabel)) {
          return false;
        }
      }

      return true;
    });
  }, [tasks, searchQuery, filterPriority, filterStatus, filterLabel]);

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
    ? 'Việc của tôi'
    : isPersonalProject
    ? 'Việc cá nhân'
    : currentProject?.name || 'Bảng dự án';

  const headerKicker = !projectId
    ? 'WorkSync / Việc được giao & Cá nhân'
    : isPersonalProject
    ? 'WorkSync / Dự án riêng tư'
    : `WorkSync / ${currentProject?.name || 'Dự án'}`;

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
              {!projectId ? 'TẤT CẢ DỰ ÁN' : isPersonalProject ? 'CÁ NHÂN' : 'DỰ ÁN NHÓM'}
            </span>
            <span>{tasks.length} công việc</span>
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
                  Tất cả thành viên
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
                  Chỉ việc của tôi
                </button>
              </div>
            )}
          </div>
        </div>

        <Button
          onClick={handleOpenCreateModal}
          className="h-10 gap-2 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm hover:shadow-md transition-all active:scale-95"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Tạo công việc
        </Button>
      </header>

      <section className="kanban-summary" aria-label="Tóm tắt công việc">
        <div className="kanban-stat">
          <span className="kanban-stat__number">{filteredTasks.length}</span>
          <span className="kanban-stat__label">Tổng công việc</span>
          <ListTodo className="ml-auto h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="kanban-stat kanban-stat--active">
          <span className="kanban-stat__number">{activeCount}</span>
          <span className="kanban-stat__label">Đang thực hiện</span>
          <Clock3 className="ml-auto h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="kanban-stat kanban-stat--done">
          <span className="kanban-stat__number">{doneCount}</span>
          <span className="kanban-stat__label">Hoàn thành</span>
          <CheckCircle2 className="ml-auto h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </div>
      </section>

      <div className="kanban-toolbar">
        <label className="kanban-toolbar__search">
          <Search className="kanban-toolbar__search-icon h-4 w-4" aria-hidden="true" />
          <Input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên, mã task hoặc nhãn..."
            aria-label="Tìm công việc"
            className="kanban-search-input"
          />
        </label>
        <Button
          variant="outline"
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className={`gap-2 px-3.5 h-10 rounded-xl border border-slate-200 text-xs font-bold shadow-xs hover:border-slate-300 transition-all ${
            isFilterOpen || activeFilterCount > 0 ? 'bg-slate-900 text-white hover:bg-slate-800 hover:text-white' : 'bg-white text-slate-700'
          }`}
        >
          <Filter className="h-4 w-4" aria-hidden="true" />
          Lọc {activeFilterCount > 0 && `(${activeFilterCount})`}
        </Button>

        {/* Modern Sort Control */}
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="text-xs font-bold text-slate-500 hidden sm:inline">Sắp xếp:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'DEFAULT' | 'DEADLINE' | 'PRIORITY' | 'CREATED')}
            className="h-10 px-3 text-xs font-bold border border-slate-200 bg-white rounded-xl shadow-xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none cursor-pointer"
            aria-label="Sắp xếp công việc"
          >
            <option value="DEFAULT">Mặc định (Vị trí kéo thả)</option>
            <option value="DEADLINE">Hạn chót (Gấp nhất trước)</option>
            <option value="PRIORITY">Độ ưu tiên (Cao nhất trước)</option>
            <option value="CREATED">Mới tạo gần đây nhất</option>
          </select>
        </div>
      </div>

      {/* Modern Filter Panel */}
      {isFilterOpen && (
        <div className="rounded-2xl p-4 my-2 border border-slate-200 bg-slate-50/80 shadow-sm flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Độ ưu tiên:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="h-9 px-3 text-xs font-bold border border-slate-200 bg-white rounded-xl shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="ALL">Tất cả ưu tiên</option>
              <option value="URGENT">Khẩn cấp (URGENT)</option>
              <option value="HIGH">Cao (HIGH)</option>
              <option value="MEDIUM">Trung bình (MEDIUM)</option>
              <option value="LOW">Thấp (LOW)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">Trạng thái:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-9 px-3 text-xs font-bold border border-slate-200 bg-white rounded-xl shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
            >
              <option value="ALL">Tất cả cột</option>
              <option value="TODO">Cần làm</option>
              <option value="IN_PROGRESS">Đang làm</option>
              <option value="IN_REVIEW">Đánh giá</option>
              <option value="BLOCKED">Bị chặn</option>
              <option value="DONE">Hoàn thành</option>
            </select>
          </div>

          {availableLabels.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700">Nhãn:</span>
              <select
                value={filterLabel}
                onChange={(e) => setFilterLabel(e.target.value)}
                className="h-9 px-3 text-xs font-bold border border-slate-200 bg-white rounded-xl shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              >
                <option value="ALL">Tất cả nhãn</option>
                {availableLabels.map((lbl) => (
                  <option key={lbl} value={lbl}>{lbl}</option>
                ))}
              </select>
            </div>
          )}

          {(activeFilterCount > 0 || searchQuery) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="ml-auto h-9 px-3 text-xs font-bold gap-1.5 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Xóa bộ lọc
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
      ) : (
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="kanban-board" aria-label="Bảng Kanban">
            {COLUMNS.map((column) => {
              const columnTasks = getColumnTasks(column.id);

              return (
                <section className={'kanban-column ' + column.className} key={column.id} aria-label={column.title}>
                  <header className="kanban-column__header">
                    <div className="kanban-column__title-wrap">
                      <h2 className="kanban-column__title">{column.title}</h2>
                      <span className="kanban-column__count" aria-label={columnTasks.length + ' công việc'}>
                        {columnTasks.length}
                      </span>
                    </div>
                    <button type="button" className="kanban-column__menu" aria-label={'Tùy chọn cột ' + column.title}>
                      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </header>

                  <Droppable droppableId={column.id}>
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
                          <div className="kanban-empty">Chưa có công việc</div>
                        )}
                        {columnTasks.map((task, index) => {
                          const deadline = getDeadlineInfo(task.dueDate);
                          const cardPriorityClass = PRIORITY_CARD_FRAME[task.priority];

                          return (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
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
                                    className={
                                      'kanban-task transition-shadow ' +
                                      cardPriorityClass +
                                      (dragSnapshot.isDragging ? ' kanban-task--dragging' : '')
                                    }
                                  >
                                    <div className="kanban-task__meta flex flex-wrap items-center gap-1.5">
                                      <span className="kanban-task__id">{task.id}</span>
                                      {!projectId && task.project && (
                                        <span
                                          className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-black uppercase border border-slate-900 shadow-[1px_1px_0px_0px_rgba(15,23,42,1)]"
                                          style={{ backgroundColor: task.project.color ? `${task.project.color}25` : '#F1F5F9' }}
                                        >
                                          {task.project.name}
                                        </span>
                                      )}
                                      <span className={'kanban-priority ml-auto ' + PRIORITY_CLASSES[task.priority]}>
                                        <span className="kanban-priority__dot" aria-hidden="true" />
                                        {PRIORITY_LABELS[task.priority]}
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
                                          Chưa phân công
                                        </span>
                                      )}
                                      <span className="kanban-task__id">Chi tiết <span aria-hidden="true">↗</span></span>
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
                  Tạo công việc mới
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="h-8 w-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                aria-label="Đóng cửa sổ tạo công việc"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </header>

            <form onSubmit={handleCreateTaskSubmit}>
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Tiêu đề công việc <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    value={createTitle}
                    onChange={(e) => setCreateTitle(e.target.value)}
                    placeholder="VD: Thiết kế API xác thực JWT..."
                    className="h-10 px-3 text-xs font-medium border border-slate-200 rounded-xl bg-white shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>

                {/* Project Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Dự án <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={createProjectId}
                    onChange={(e) => setCreateProjectId(e.target.value)}
                    className="w-full h-10 px-3 text-xs font-bold border border-slate-200 bg-white rounded-xl shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.kind === 'PERSONAL' ? 'Việc cá nhân' : p.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status & Priority Row */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      Cột trạng thái
                    </label>
                    <select
                      value={createStatus}
                      onChange={(e) => setCreateStatus(e.target.value as TaskStatus)}
                      className="w-full h-10 px-3 text-xs font-bold border border-slate-200 bg-white rounded-xl shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    >
                      <option value="TODO">Cần làm</option>
                      <option value="IN_PROGRESS">Đang làm</option>
                      <option value="IN_REVIEW">Đánh giá</option>
                      <option value="BLOCKED">Bị chặn</option>
                      <option value="DONE">Hoàn thành</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      Mức độ ưu tiên
                    </label>
                    <select
                      value={createPriority}
                      onChange={(e) => setCreatePriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT')}
                      className="w-full h-10 px-3 text-xs font-bold border border-slate-200 bg-white rounded-xl shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                    >
                      <option value="LOW">Thấp (LOW)</option>
                      <option value="MEDIUM">Trung bình (MEDIUM)</option>
                      <option value="HIGH">Cao (HIGH)</option>
                      <option value="URGENT">Khẩn cấp (URGENT)</option>
                    </select>
                  </div>
                </div>

                {/* Due Date & Estimates Row */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">
                      Hạn chót (Deadline)
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
                      Story Points
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
                      Ước tính (giờ)
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
                    Nhãn (phân tách bằng dấu phẩy)
                  </label>
                  <Input
                    value={createLabelsInput}
                    onChange={(e) => setCreateLabelsInput(e.target.value)}
                    placeholder="VD: UI, BACKEND, BUG..."
                    className="h-10 px-3 text-xs font-medium border border-slate-200 rounded-xl bg-white shadow-2xs focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5">
                    Mô tả chi tiết
                  </label>
                  <textarea
                    rows={3}
                    value={createDescription}
                    onChange={(e) => setCreateDescription(e.target.value)}
                    placeholder="Chi tiết công việc cần giải quyết..."
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
                  Hủy
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating}
                  className="h-10 px-5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-all active:scale-95 gap-1.5"
                >
                  {isCreating ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Tạo công việc
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
                  {PRIORITY_LABELS[selectedTask.priority]}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setSelectedTaskId(null)}
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
                            title={col.title}
                          >
                            {col.title}
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
                          {selectedTask.dueDate ? formatShortDate(selectedTask.dueDate) : t('taskDetail.no_deadline')}
                        </span>
                        {selectedTask.dueDate && (() => {
                          const dl = getDeadlineInfo(selectedTask.dueDate);
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
                        {selectedTask.timeEstimate ? `${selectedTask.timeEstimate} giờ` : '–'}
                      </span>
                    </div>

                    {/* Đã làm */}
                    <div className="flex items-center justify-between py-1 border-b border-slate-100">
                      <span className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                        <Clock3 className="h-4 w-4 text-blue-500" />
                        {t('taskDetail.tracked')}
                      </span>
                      <span className="text-xs font-semibold text-slate-800">
                        {selectedTask.timeTracked ? `${selectedTask.timeTracked} giờ` : '0 giờ'}
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
                      <div>{t('taskDetail.created_at')}: {formatDate(selectedTask.createdAt)}</div>
                      <div>{t('taskDetail.updated_at')}: {formatDate(selectedTask.updatedAt)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <footer className="flex justify-end px-6 py-3 border-t border-slate-200 bg-slate-50/70">
              <Button
                variant="outline"
                onClick={() => setSelectedTaskId(null)}
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
