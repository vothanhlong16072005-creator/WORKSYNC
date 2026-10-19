import React, { useEffect, useState, useMemo } from 'react';
import {
  FolderKanban,
  Plus,
  Search,
  Layers,
  Sparkles,
  Trophy,
  Kanban,
  UserCheck,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { projectApi } from '../api/project.api';
import type { ProjectItem, ProjectWorkflowType } from '../types/project.types';
import { ProjectCard } from '../components/ProjectCard';
import { CreateProjectModal } from '../components/CreateProjectModal';

export const ProjectListPage: React.FC = () => {
  const { user } = useAuthStore();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [workflowFilter, setWorkflowFilter] = useState<'ALL' | ProjectWorkflowType | 'MY_PROJECTS'>('ALL');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchProjects = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await projectApi.getAll();
      setProjects(data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi khi tải danh sách dự án';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const canCreateProject =
    user?.role === 'ADMIN' ||
    user?.role === 'DEPARTMENT_HEAD';

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesDesc = p.description?.toLowerCase().includes(q);
        const matchesPm = p.pm?.name.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesPm) return false;
      }

      // 2. Workflow / Mine Filter
      if (workflowFilter === 'MY_PROJECTS') {
        const isCreator = p.createdBy?.id === user?.id;
        const isPM = p.pm?.id === user?.id || p.pmId === user?.id;
        const isMember = p.members?.some((m) => m.userId === user?.id);
        return isCreator || isPM || isMember;
      }

      if (workflowFilter !== 'ALL') {
        return p.workflowType === workflowFilter;
      }

      return true;
    });
  }, [projects, searchQuery, workflowFilter, user?.id]);

  const stats = useMemo(() => {
    const total = projects.length;
    const scrumCount = projects.filter((p) => p.workflowType === 'SCRUM').length;
    const kanbanCount = projects.filter((p) => p.workflowType === 'KANBAN').length;
    const myCount = projects.filter(
      (p) =>
        p.createdBy?.id === user?.id ||
        p.pmId === user?.id ||
        p.members?.some((m) => m.userId === user?.id),
    ).length;
    return { total, scrumCount, kanbanCount, myCount };
  }, [projects, user?.id]);

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Hero Command Banner */}
        <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
          <div className="absolute -right-8 -bottom-8 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute right-12 top-6 opacity-10 hidden sm:block">
            <FolderKanban className="w-48 h-48" />
          </div>

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>WorkSync Enterprise Portfolio Management</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Danh Mục Dự Án Doanh Nghiệp
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                Điều phối linh hoạt các dự án theo mô hình Agile Scrum, Kanban liên tục hoặc quản lý
                vận hành hàng ngày. Theo dõi tiến độ, phân công PM và kiểm soát quân số tập trung.
              </p>
            </div>

            {canCreateProject && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-5 py-3 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 active:scale-98 rounded-2xl shadow-lg shadow-blue-600/25 transition-all flex items-center gap-2.5 shrink-0"
              >
                <Plus className="w-5 h-5" />
                <span>Tạo Dự Án Mới</span>
              </button>
            )}
          </div>

          {/* Quick Metrics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Layers className="w-4 h-4 text-blue-400" />
              <span>Tổng dự án:</span>
              <strong className="text-white font-bold text-sm">{stats.total}</strong>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Scrum / Sprint:</span>
              <strong className="text-white font-bold text-sm">{stats.scrumCount}</strong>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Kanban className="w-4 h-4 text-emerald-400" />
              <span>Kanban Board:</span>
              <strong className="text-white font-bold text-sm">{stats.kanbanCount}</strong>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <UserCheck className="w-4 h-4 text-purple-400" />
              <span>Dự án của bạn:</span>
              <strong className="text-white font-bold text-sm">{stats.myCount}</strong>
            </div>
          </div>
        </div>

        {/* Filter and Search Command Ribbon */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-wrap items-center justify-between gap-4">
          {/* Search box */}
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm theo tên dự án, mô tả hoặc PM..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9.5 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-slate-900"
            />
          </div>

          {/* Workflow Tabs Filter */}
          <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'SCRUM', label: 'Scrum' },
              { id: 'KANBAN', label: 'Kanban' },
              { id: 'DAILY', label: 'Daily' },
              { id: 'MY_PROJECTS', label: 'Dự án của tôi' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setWorkflowFilter(tab.id as typeof workflowFilter)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  workflowFilter === tab.id
                    ? 'bg-white text-slate-900 font-semibold shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Projects Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-center">
            {error}
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-400 text-center">
            <FolderKanban className="w-12 h-12 mb-3 opacity-40 text-slate-400" />
            <h3 className="text-base font-bold text-slate-700">Chưa có dự án nào phù hợp</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">
              Không tìm thấy dự án theo từ khóa hoặc bộ lọc đã chọn. Thử thay đổi điều kiện lọc hoặc tạo dự án mới.
            </p>
            {canCreateProject && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="mt-4 px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
              >
                + Tạo Dự Án Mới
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProjects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          fetchProjects();
        }}
      />
    </div>
  );
};
