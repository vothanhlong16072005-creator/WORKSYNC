import React, { useEffect, useState, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  Flame,
  Layout,
  Plus,
  Settings,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  AlertCircle,
  ExternalLink,
  Layers,
  Inbox,
  UserPlus,
  AlertTriangle,
  TableProperties,
  FileText,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/api-client';
import { projectApi } from '../api/project.api';
import { documentApi } from '@/features/documents/api/document.api';
import type { DocumentItem } from '@/features/documents/types/document.types';
import { DocumentCard } from '@/features/documents/components/DocumentCard';
import type { ProjectItem } from '../types/project.types';
import { WorkflowTypeBadge } from '../components/WorkflowTypeBadge';
import { SprintCard } from '@/features/sprints/components/SprintCard';
import { CreateSprintModal } from '@/features/sprints/components/CreateSprintModal';
import { StartSprintDialog } from '@/features/sprints/components/StartSprintDialog';
import { CompleteSprintDialog } from '@/features/sprints/components/CompleteSprintDialog';
import { AddMemberModal } from '../components/AddMemberModal';
import { ProjectKanbanBoard } from '../components/ProjectKanbanBoard';
import { ProjectTasksTableView } from '../components/ProjectTasksTableView';
import {
  TaskDetailModal,
  type TaskDetailModalTask,
} from '@/features/tasks/components/TaskDetailModal';
import { useSprintStore } from '@/features/sprints/stores/sprint.store';
import type { Sprint } from '@/features/sprints/types/sprint.types';

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isEn = i18n.language.startsWith('en');

  const { user } = useAuthStore();
  const { sprints, fetchSprintsByProject, removeSprint } = useSprintStore();

  const [project, setProject] = useState<ProjectItem | null>(null);
  const [tasks, setTasks] = useState<TaskDetailModalTask[]>([]);
  const [activeTab, setActiveTab] = useState<
    'overview' | 'kanban' | 'backlog' | 'sprints' | 'all_tasks' | 'members' | 'documents' | 'settings'
  >('overview');
  const [projectDocs, setProjectDocs] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected task for full details popup modal
  const [selectedTaskForModal, setSelectedTaskForModal] = useState<TaskDetailModalTask | null>(
    null,
  );

  // Modals & Dialogs
  const [isCreateSprintOpen, setIsCreateSprintOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [sprintToStart, setSprintToStart] = useState<Sprint | null>(null);
  const [sprintToComplete, setSprintToComplete] = useState<Sprint | null>(null);

  // Settings form state
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editColor, setEditColor] = useState('#3B82F6');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const fetchProjectData = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await projectApi.getById(id);
      setProject(data);
      setEditName(data.name);
      setEditDesc(data.description || '');
      setEditColor(data.color || '#3B82F6');

      // Fetch sprints if SCRUM
      if (data.workflowType === 'SCRUM') {
        fetchSprintsByProject(id);
      }

      // Fetch full project tasks
      const tasksRes = await apiClient.get<TaskDetailModalTask[]>('/tasks', {
        params: { scope: 'project', projectId: id },
      });
      setTasks(tasksRes.data || []);

      // Fetch project documents
      try {
        const docsRes = await documentApi.fetchProjectDocuments(id);
        setProjectDocs(docsRes.items || []);
      } catch {
        // quiet fail on docs load
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : isEn
          ? 'Error loading project information'
          : 'Lỗi khi tải thông tin dự án';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  // Dynamic Metrics computed directly from tasks
  const metrics = useMemo(() => {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === 'DONE').length;
    const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
    const blocked = tasks.filter((t) => t.status === 'BLOCKED').length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, done, inProgress, blocked, percent };
  }, [tasks]);

  if (isLoading && !project) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Link
          to="/projects"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-6 font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> {t('projects.back_to_list', 'Quay lại danh sách dự án')}
        </Link>
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          <div>
            <h4 className="font-bold">{t('projects.not_found', 'Không tìm thấy dự án')}</h4>
            <p className="text-sm mt-1">
              {error ||
                t(
                  'projects.not_found_desc',
                  'Dự án không tồn tại hoặc bạn không có quyền xem.',
                )}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // RBAC checks
  const isPM = project.pmId === user?.id || project.pm?.id === user?.id;
  const isDeptHead = user?.role === 'DEPARTMENT_HEAD';
  const isAdmin = user?.role === 'ADMIN';
  const isEmployee = user?.role === 'EMPLOYEE' && !isPM;
  const canManageProject = isAdmin || isPM || isDeptHead;
  const canManageSprint = isAdmin || isPM; // DEPT_HEAD is read-only for sprints!

  // Backlog tasks (tasks not in any sprint)
  const backlogTasks = tasks.filter((t) => !t.sprintId);

  // Quick task status change from modal
  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      await apiClient.patch(`/tasks/${taskId}`, { status: newStatus });
      await fetchProjectData();
      setSelectedTaskForModal((prev) =>
        prev && prev.id === taskId ? { ...prev, status: newStatus } : prev,
      );
    } catch (err: unknown) {
      console.error('Failed to change status:', err);
    }
  };

  // Move task on Kanban board
  const handleMoveTaskOnBoard = async (
    taskId: string,
    newStatus: string,
    destinationIndex: number,
  ) => {
    try {
      await apiClient.patch(`/tasks/${taskId}/board-position`, {
        status: newStatus,
        destinationIndex,
      });
      await fetchProjectData();
    } catch (err: unknown) {
      console.error('Failed to move task:', err);
    }
  };

  // Assign task to a sprint
  const handleAssignTaskToSprint = async (taskId: string, targetSprintId: string) => {
    try {
      await apiClient.patch(`/tasks/${taskId}`, { sprintId: targetSprintId });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, sprintId: targetSprintId } : t)),
      );
      if (id) fetchSprintsByProject(id);
    } catch (err: unknown) {
      alert(
        (isEn ? 'Cannot assign task to sprint: ' : 'Không thể gán task vào sprint: ') +
          (err instanceof Error ? err.message : 'Error'),
      );
    }
  };

  // Remove member
  const handleRemoveMember = async (userId: string) => {
    if (
      !confirm(
        t(
          'projects.remove_member_confirm',
          'Bạn có chắc muốn xóa thành viên này khỏi dự án?',
        ),
      )
    )
      return;
    try {
      await projectApi.removeMember(project.id, userId);
      fetchProjectData();
    } catch (err: unknown) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Cannot remove'));
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      await projectApi.update(project.id, {
        name: editName,
        description: editDesc,
        color: editColor,
      });
      fetchProjectData();
      alert(isEn ? 'Project settings updated successfully!' : 'Cập nhật cài đặt dự án thành công!');
    } catch (err: unknown) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Cannot save'));
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Delete Project
  const handleDeleteProject = async () => {
    if (
      !confirm(
        t(
          'projects.delete_project_confirm',
          'Bạn có chắc chắn muốn xóa dự án này? Thao tác này không thể hoàn tác.',
        ),
      )
    )
      return;
    try {
      await projectApi.remove(project.id);
      navigate('/projects');
    } catch (err: unknown) {
      alert('Error: ' + (err instanceof Error ? err.message : 'Cannot delete'));
    }
  };

  const isScrum = project.workflowType === 'SCRUM';
  const isKanban = project.workflowType === 'KANBAN';

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{t('projects.back_to_list', 'Quay lại danh sách dự án')}</span>
          </Link>

          {/* Direct link to Kanban task board (/tasks?project=...) */}
          <Link
            to={`/tasks?project=${project.id}`}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-md active:scale-98 transition-all"
          >
            <Layout className="w-4 h-4" />
            <span>{t('projects.open_kanban', 'Mở Bảng Việc Kanban (/tasks)')}</span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </Link>
        </div>

        {/* Project Command Header Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2.5 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <WorkflowTypeBadge type={project.workflowType} />
                <span className="text-slate-300">•</span>
                <span
                  className="w-3.5 h-3.5 rounded-full inline-block shadow-xs"
                  style={{ backgroundColor: project.color || '#3B82F6' }}
                />
                {project.department && (
                  <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-100 text-slate-700">
                    {t('projects.department', 'Phòng: {{name}}', { name: project.department.name })}
                  </span>
                )}
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                  {project.kind === 'TEAM'
                    ? t('projects.team_project', 'Team Project')
                    : t('projects.personal_project', 'Personal Project')}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {project.name}
              </h1>

              {project.description && (
                <p className="text-sm text-slate-600 leading-relaxed max-w-2xl">
                  {project.description}
                </p>
              )}
            </div>

            {/* PM Card Snapshot */}
            <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              {project.pm?.avatar ? (
                <img
                  src={project.pm.avatar}
                  alt={project.pm.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                  PM
                </div>
              )}
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  {t('projects.pm', 'Chủ nhiệm PM')}
                </span>
                <span className="text-sm font-bold text-slate-900">
                  {project.pm?.name || t('projects.unassigned_pm', 'Chưa chỉ định')}
                </span>
              </div>
            </div>
          </div>

          {/* Active Sprint highlight (if SCRUM) */}
          {project.activeSprint && (
            <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-white border border-emerald-200 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                      {t('projects.active_sprint', 'Sprint Đang Chạy (Active Sprint)')}
                    </span>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{project.activeSprint.name}</h4>
                </div>
              </div>

              <Link
                to={`/projects/${project.id}/sprints/${project.activeSprint.id}`}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs active:scale-98 transition-all flex items-center gap-1.5"
              >
                <span>{t('projects.view_sprint_burndown', 'Xem Sprint & Burndown')}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}

          {/* Navigation Tabs Bar */}
          <div className="flex flex-wrap items-center gap-1.5 mt-6 pt-6 border-t border-slate-100">
            {/* Tab 1: Overview */}
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'overview'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t('projects.tabs.overview', 'Tổng Quan')}</span>
            </button>

            {/* Tab: Integrated Kanban Board (for Non-Scrum projects) */}
            {!isScrum && (
              <button
                onClick={() => setActiveTab('kanban')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                  activeTab === 'kanban'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Layout className="w-3.5 h-3.5" />
                <span>
                  {t('projects.tabs.kanban', 'Bảng Kanban')} ({tasks.length})
                </span>
              </button>
            )}

            {/* Tab: Backlog (only SCRUM) */}
            {isScrum && (
              <button
                onClick={() => setActiveTab('backlog')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                  activeTab === 'backlog'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Inbox className="w-3.5 h-3.5" />
                <span>
                  {t('projects.tabs.backlog', 'Backlog')} ({backlogTasks.length})
                </span>
              </button>
            )}

            {/* Tab: Sprints (only SCRUM) */}
            {isScrum && (
              <button
                onClick={() => setActiveTab('sprints')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                  activeTab === 'sprints'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>
                  {t('projects.tabs.sprints', 'Sprints')} ({sprints.length})
                </span>
              </button>
            )}

            {/* Tab: Members */}
            <button
              onClick={() => setActiveTab('members')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'members'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>
                {t('projects.tabs.members', 'Thành Viên')} ({project.members?.length || 0})
              </span>
            </button>

            {/* Tab: All Tasks Table View (Beside Members Tab) */}
            <button
              onClick={() => setActiveTab('all_tasks')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'all_tasks'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <TableProperties className="w-3.5 h-3.5 text-blue-500" />
              <span>
                {t('projects.tabs.all_tasks', 'Tất Cả Công Việc')} ({tasks.length})
              </span>
            </button>

            {/* Tab: Project Documents (Tài liệu & Hồ sơ dự án) */}
            <button
              onClick={() => setActiveTab('documents')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                activeTab === 'documents'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              <span>
                {isEn ? 'Documents & Specs' : 'Tài Liệu & Hồ Sơ'} ({projectDocs.length})
              </span>
            </button>

            {/* Tab: Settings (PM/Admin/DeptHead) */}
            {canManageProject && (
              <button
                onClick={() => setActiveTab('settings')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
                  activeTab === 'settings'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>{t('projects.tabs.settings', 'Cài Đặt')}</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Metrics Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {t('projects.stats.total_tasks', 'TỔNG NHIỆM VỤ')}
                </span>
                <p className="text-2xl font-black text-slate-900 mt-1">{metrics.total}</p>
                <span className="text-xs text-slate-400 mt-1 block">
                  {t('projects.stats.in_all_project', 'Trong toàn bộ dự án')}
                </span>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-emerald-200/80 shadow-xs">
                <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">
                  {t('projects.stats.completed', 'ĐÃ HOÀN THÀNH')}
                </span>
                <p className="text-2xl font-black text-emerald-700 mt-1">{metrics.done}</p>
                <span className="text-xs text-emerald-600 mt-1 block">
                  {t('projects.stats.progress_rate', 'Đạt {{rate}}% tiến độ', {
                    rate: metrics.percent,
                  })}
                </span>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-blue-200/80 shadow-xs">
                <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">
                  {t('projects.stats.in_progress', 'ĐANG THỰC HIỆN')}
                </span>
                <p className="text-2xl font-black text-blue-700 mt-1">{metrics.inProgress}</p>
                <span className="text-xs text-blue-600 mt-1 block">
                  {t('projects.stats.in_process', 'Đang trong tiến trình')}
                </span>
              </div>

              <div className="p-5 rounded-3xl bg-white border border-rose-200/80 shadow-xs">
                <span className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
                  {t('projects.stats.blocked', 'ĐIỂM NGHẼN / BLOCKED')}
                </span>
                <p className="text-2xl font-black text-rose-700 mt-1">{metrics.blocked}</p>
                <span className="text-xs text-rose-600 mt-1 block">
                  {t('projects.stats.needs_support', 'Cần hỗ trợ gỡ vướng')}
                </span>
              </div>
            </div>

            {/* Workflow Specific Highlight Card */}
            {isKanban && (
              <div className="p-6 bg-gradient-to-br from-emerald-50/60 to-white rounded-3xl border border-emerald-200/80 shadow-xs flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    {t(
                      'projects.continuous_flow_title',
                      'QUY TRÌNH KANBAN LIÊN TỤC (CONTINUOUS FLOW)',
                    )}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    {t(
                      'projects.continuous_flow_heading',
                      'Bảng Kanban Dự Án & Quản Trị WIP Limit',
                    )}
                  </h3>
                  <p className="text-xs text-slate-600 max-w-xl">
                    {t(
                      'projects.continuous_flow_desc',
                      'Dự án áp dụng cơ chế luồng công việc liên tục, không chia Sprint cố định. Bạn có thể tương tác trực tiếp với các task trên Bảng Kanban dưới đây.',
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveTab('kanban')}
                    className="px-5 py-2.5 text-xs font-bold rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-all flex items-center gap-2"
                  >
                    <Layout className="w-4 h-4" />
                    <span>{t('projects.switch_to_kanban_tab', 'Mở Tab Bảng Kanban')}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('all_tasks')}
                    className="px-4 py-2.5 text-xs font-bold rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-all flex items-center gap-1.5"
                  >
                    <TableProperties className="w-4 h-4 text-slate-500" />
                    <span>{t('projects.tabs.all_tasks', 'Xem Bảng Task')}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Project Team Members Snapshot */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>
                    {t('projects.team_members', 'Đội Ngũ Thực Hiện ({{count}})', {
                      count: project.members?.length || 0,
                    })}
                  </span>
                </h3>
                <button
                  onClick={() => setActiveTab('members')}
                  className="text-xs font-semibold text-blue-600 hover:underline"
                >
                  {isEn ? 'View all' : 'Xem chi tiết'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {project.members?.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 rounded-2xl bg-slate-50/70 border border-slate-200/60 flex items-center justify-between gap-2.5"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {m.user.avatar ? (
                        <img
                          src={m.user.avatar}
                          alt={m.user.name}
                          className="w-8 h-8 rounded-full object-cover border border-slate-200"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                          {m.user.name.charAt(0)}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{m.user.name}</p>
                        <span className="text-[10px] text-slate-400 block truncate">
                          {m.user.email}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-700 shrink-0">
                      {m.projectRole}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: INTEGRATED KANBAN BOARD (FOR NON-SCRUM) */}
        {activeTab === 'kanban' && !isScrum && (
          <ProjectKanbanBoard
            projectId={project.id}
            projectName={project.name}
            tasks={tasks}
            members={project.members}
            isEmployeeOnly={isEmployee}
            onTaskClick={(task) => setSelectedTaskForModal(task)}
            onTaskMove={handleMoveTaskOnBoard}
            onRefresh={fetchProjectData}
          />
        )}

        {/* TAB 3: ALL TASKS TABLE VIEW (BESIDE MEMBERS TAB) */}
        {activeTab === 'all_tasks' && (
          <ProjectTasksTableView
            tasks={tasks}
            members={project.members}
            onTaskClick={(task) => setSelectedTaskForModal(task)}
          />
        )}

        {/* TAB 4: BACKLOG (SCRUM ONLY) */}
        {activeTab === 'backlog' && isScrum && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Inbox className="w-5 h-5 text-blue-600" />
                  <span>Product Backlog</span>
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700">
                    {backlogTasks.length} {isEn ? 'unassigned tasks' : 'task chưa gán sprint'}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {isEn
                    ? 'Pending tasks awaiting allocation into upcoming sprints'
                    : 'Kho nhiệm vụ chờ phân bổ vào các Sprint tiếp theo'}
                </p>
              </div>

              <Link
                to={`/tasks?project=${project.id}`}
                className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{isEn ? 'Add Task to Project' : 'Thêm Task Vào Dự Án'}</span>
              </Link>
            </div>

            {backlogTasks.length === 0 ? (
              <div className="p-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                <Inbox className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
                <p className="text-sm font-semibold text-slate-600">
                  {isEn ? 'Backlog is empty' : 'Backlog hiện đang trống'}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {isEn
                    ? 'All tasks have been allocated to sprints or no new tasks exist.'
                    : 'Tất cả các task đều đã được đưa vào Sprint hoặc chưa có task mới.'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden">
                {backlogTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={() => setSelectedTaskForModal(t)}
                  >
                    <div className="flex items-center gap-3 min-w-[240px] flex-1">
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700">
                        {t.status}
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900 line-clamp-1 hover:text-blue-600 transition-colors">
                          {t.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <span>{t.priority}</span>
                          {t.storyPoints && (
                            <span className="text-amber-700 font-medium">({t.storyPoints} SP)</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Assign to Sprint Dropdown for PM */}
                    {canManageSprint && sprints.length > 0 && (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <span className="text-xs text-slate-400">{isEn ? 'Assign:' : 'Gán vào:'}</span>
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleAssignTaskToSprint(t.id, e.target.value);
                            }
                          }}
                          className="px-2.5 py-1 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden focus:ring-1 focus:ring-blue-500 text-slate-800"
                        >
                          <option value="" disabled>
                            -- {isEn ? 'Select Sprint' : 'Chọn Sprint'} --
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
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: SPRINTS (SCRUM ONLY) */}
        {activeTab === 'sprints' && isScrum && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  <span>{isEn ? 'Manage Sprint Cycles' : 'Quản Lý Các Chu Kỳ Sprint'}</span>
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700">
                    {sprints.length}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {isEn
                    ? 'Scrum 2-week development cycle planning, burndown and velocity tracking'
                    : 'Kế hoạch chu kỳ phát triển Scrum 2 tuần, theo dõi burndown và velocity'}
                </p>
              </div>

              {canManageSprint ? (
                <button
                  onClick={() => setIsCreateSprintOpen(true)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs active:scale-98 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isEn ? 'Create New Sprint' : 'Tạo Sprint Mới'}</span>
                </button>
              ) : isDeptHead ? (
                <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                  {isEn
                    ? 'Department Head: Monitor Sprint Progress (Read-only)'
                    : 'Trưởng phòng: Giám sát tiến độ Sprint (Read-only)'}
                </span>
              ) : null}
            </div>

            {sprints.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400">
                <Flame className="w-12 h-12 mx-auto mb-3 opacity-30 text-orange-500" />
                <h4 className="text-base font-bold text-slate-700">
                  {isEn ? 'No Sprints Available' : 'Chưa có Sprint nào'}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  {isEn
                    ? 'Create your first sprint to activate the Agile Scrum process for this project.'
                    : 'Bắt đầu khởi tạo Sprint đầu tiên để kích hoạt quy trình Agile Scrum cho dự án.'}
                </p>
                {canManageSprint && (
                  <button
                    onClick={() => setIsCreateSprintOpen(true)}
                    className="mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white shadow-xs hover:bg-blue-700"
                  >
                    + {isEn ? 'Create First Sprint' : 'Tạo Sprint Đầu Tiên'}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sprints.map((sprint) => (
                  <SprintCard
                    key={sprint.id}
                    sprint={sprint}
                    projectId={project.id}
                    isPMOrAdmin={canManageSprint}
                    onStart={(s) => setSprintToStart(s)}
                    onComplete={(s) => setSprintToComplete(s)}
                    onDelete={async (s) => {
                      if (
                        confirm(
                          isEn
                            ? `Are you sure you want to delete sprint "${s.name}"?`
                            : `Bạn có chắc muốn xóa sprint "${s.name}"?`,
                        )
                      ) {
                        await removeSprint(s.id);
                        fetchSprintsByProject(project.id);
                      }
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 6: MEMBERS */}
        {activeTab === 'members' && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <span>{isEn ? 'Project Members List' : 'Danh Sách Thành Viên Tham Gia'}</span>
                  <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700">
                    {project.members?.length || 0}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {isEn
                    ? 'Assigned personnel authorized to view and execute tasks in this project'
                    : 'Nhân sự trực thuộc dự án được phân quyền tạo và thực hiện nhiệm vụ'}
                </p>
              </div>

              {canManageProject && (
                <button
                  onClick={() => setIsAddMemberOpen(true)}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs active:scale-98 transition-all flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{isEn ? 'Add Member' : 'Thêm Thành Viên'}</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {project.members?.map((m) => (
                <div
                  key={m.id}
                  className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/70 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {m.user.avatar ? (
                      <img
                        src={m.user.avatar}
                        alt={m.user.name}
                        className="w-10 h-10 rounded-full object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center">
                        {m.user.name.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="text-sm font-bold text-slate-900 truncate">{m.user.name}</h4>
                      <p className="text-xs text-slate-400 truncate">{m.user.email}</p>
                      <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700 uppercase">
                        {m.projectRole}
                      </span>
                    </div>
                  </div>

                  {canManageProject &&
                    m.projectRole !== 'DEPT_HEAD' &&
                    m.userId !== project.pmId && (
                      <button
                        onClick={() => handleRemoveMember(m.userId)}
                        title={isEn ? 'Remove member' : 'Xóa thành viên'}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 7: SETTINGS */}
        {activeTab === 'settings' && canManageProject && (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-8 max-w-3xl">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                {isEn ? 'Project Settings' : 'Cài Đặt Dự Án'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {isEn
                  ? 'Update project details, identification color and settings'
                  : 'Chỉnh sửa thông tin cơ bản hoặc thiết lập trạng thái vận hành'}
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {isEn ? 'Project Name' : 'Tên Dự Án'}
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {isEn ? 'Description & Goals' : 'Mô Tả & Mục Tiêu Dự Án'}
                </label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50/70 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  {isEn ? 'Theme Accent Color' : 'Màu Nhận Diện Dự Án'}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                    className="w-10 h-10 rounded-xl border border-slate-200 cursor-pointer p-0.5"
                  />
                  <span className="text-xs font-mono text-slate-600">{editColor}</span>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-5 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
                >
                  {isSavingSettings
                    ? isEn
                      ? 'Saving...'
                      : 'Đang lưu...'
                    : isEn
                    ? 'Save Changes'
                    : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>

            {/* Danger Zone */}
            <div className="pt-6 border-t border-slate-200 space-y-4">
              <h4 className="text-sm font-bold text-rose-600 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                {isEn ? 'Danger Zone' : 'Vùng Nguy Hiểm (Danger Zone)'}
              </h4>
              <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h5 className="text-xs font-bold text-rose-900">
                    {isEn ? 'Delete Project' : 'Xóa Dự Án'}
                  </h5>
                  <p className="text-xs text-rose-700 mt-0.5">
                    {isEn
                      ? 'Project will be soft-deleted and all sprint activity stopped.'
                      : 'Dự án sẽ được chuyển vào thùng rác và ngưng mọi hoạt động Sprint.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleDeleteProject}
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors"
                >
                  {isEn ? 'Delete Project' : 'Xóa Dự Án'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB: DOCUMENTS (Tài liệu & Hồ sơ dự án) */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  {isEn ? 'Project Documentation & Deliverables' : 'Tài Liệu & Hồ Sơ Dự Án'}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {isEn
                    ? 'Architecture specs, requirements, meeting minutes, and task deliverables for this project.'
                    : 'Quản lý tài liệu kiến trúc, đặc tả yêu cầu (Spec), biên bản họp và bằng chứng nghiệm thu của dự án.'}
                </p>
              </div>

              <Link
                to="/documents"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                {isEn ? 'Create Document' : 'Soạn Tài Liệu Mới'}
              </Link>
            </div>

            {projectDocs.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-12 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                  <FileText className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  {isEn ? 'No documents for this project yet' : 'Chưa có tài liệu nào trong dự án này'}
                </h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {isEn
                    ? 'Create technical architecture documents or attach specs to tasks to build your project knowledge base.'
                    : 'Hãy tạo tài liệu đặc tả kiến trúc hoặc đính kèm spec vào task để lưu trữ tri thức dự án.'}
                </p>
                <Link
                  to="/documents"
                  className="inline-flex items-center gap-1 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {isEn ? 'Go to Documents' : 'Vào Kho Tài Liệu'}
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {projectDocs.map((doc) => (
                  <DocumentCard key={doc.id} document={doc} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Pop-up Modal: Task Detail (Accessible by all members) */}
      <TaskDetailModal
        task={selectedTaskForModal}
        onClose={() => setSelectedTaskForModal(null)}
        onStatusChange={handleTaskStatusChange}
        canChangeStatus={
          canManageProject || selectedTaskForModal?.assignee?.id === user?.id
        }
      />

      {/* Sprints Modals */}
      <CreateSprintModal
        projectId={project.id}
        isOpen={isCreateSprintOpen}
        onClose={() => setIsCreateSprintOpen(false)}
        onSuccess={() => {
          fetchSprintsByProject(project.id);
        }}
      />

      <StartSprintDialog
        sprint={sprintToStart}
        isOpen={Boolean(sprintToStart)}
        onClose={() => setSprintToStart(null)}
        onSuccess={() => {
          fetchSprintsByProject(project.id);
          fetchProjectData();
        }}
      />

      <CompleteSprintDialog
        sprint={sprintToComplete}
        isOpen={Boolean(sprintToComplete)}
        onClose={() => setSprintToComplete(null)}
        onSuccess={() => {
          fetchSprintsByProject(project.id);
          fetchProjectData();
        }}
      />

      {/* Add Member Modal */}
      <AddMemberModal
        projectId={project.id}
        existingMemberIds={project.members?.map((m) => m.userId) || []}
        isOpen={isAddMemberOpen}
        onClose={() => setIsAddMemberOpen(false)}
        onSuccess={() => {
          fetchProjectData();
        }}
      />
    </div>
  );
};
