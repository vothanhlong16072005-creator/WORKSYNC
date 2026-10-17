import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Play,
  CheckCircle2,
  Clock,
  Flag,
  Layout,
  User,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { useSprintStore } from '../stores/sprint.store';
import { useAuthStore } from '@/stores/auth.store';
import { SprintStatusBadge } from '../components/SprintStatusBadge';
import { BurndownChart } from '../components/BurndownChart';
import { StartSprintDialog } from '../components/StartSprintDialog';
import { CompleteSprintDialog } from '../components/CompleteSprintDialog';
import type { SprintTask } from '../types/sprint.types';

export const SprintDetailPage: React.FC = () => {
  const { id: projectId, sprintId } = useParams<{ id: string; sprintId: string }>();
  const { user } = useAuthStore();
  const {
    currentSprint,
    burndown,
    isLoading,
    error,
    fetchSprintDetail,
    fetchBurndown,
  } = useSprintStore();

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE'>('ALL');
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);

  useEffect(() => {
    if (sprintId) {
      fetchSprintDetail(sprintId);
      fetchBurndown(sprintId);
    }
  }, [sprintId, fetchSprintDetail, fetchBurndown]);

  if (isLoading && !currentSprint) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !currentSprint) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Link
          to={`/projects/${projectId}`}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 mb-6 font-medium"
        >
          <ArrowLeft className="w-4 h-4" /> Quay lại dự án
        </Link>
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          <div>
            <h4 className="font-bold">Không tìm thấy Sprint</h4>
            <p className="text-sm mt-1">{error || 'Sprint không tồn tại hoặc đã bị xóa.'}</p>
          </div>
        </div>
      </div>
    );
  }

  const isPMOrAdmin =
    user?.role === 'ADMIN' ||
    (user?.role === 'PM' && currentSprint.project?.pmId === user.id) ||
    (user?.role === 'PM' && currentSprint.createdBy?.id === user.id);

  const tasks = currentSprint.tasks || [];
  const filteredTasks = tasks.filter((t) => {
    if (activeFilter === 'ALL') return true;
    return t.status === activeFilter;
  });

  const progress = currentSprint.progress || {
    totalTasks: tasks.length,
    doneTasks: tasks.filter((t) => t.status === 'DONE').length,
    totalStoryPoints: tasks.reduce((sum, t) => sum + (t.storyPoints || 0), 0),
    completedStoryPoints: tasks.filter((t) => t.status === 'DONE').reduce((sum, t) => sum + (t.storyPoints || 0), 0),
    remainingStoryPoints: 0,
    percent: 0,
  };

  const getPriorityBadge = (priority: SprintTask['priority']) => {
    switch (priority) {
      case 'URGENT':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-rose-100 text-rose-700">KHẨN CẤP</span>;
      case 'HIGH':
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-amber-100 text-amber-700">CAO</span>;
      case 'MEDIUM':
        return <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-sky-100 text-sky-700">TRUNG BÌNH</span>;
      case 'LOW':
        return <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-100 text-slate-600">THẤP</span>;
    }
  };

  const getStatusBadge = (status: SprintTask['status']) => {
    switch (status) {
      case 'DONE':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">ĐÃ XONG</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-700 border border-blue-200">ĐANG LÀM</span>;
      case 'BLOCKED':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-rose-50 text-rose-700 border border-rose-200">BỊ NGHẼN</span>;
      case 'TODO':
        return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-slate-100 text-slate-700 border border-slate-200">CẦN LÀM</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to={`/projects/${projectId}`}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại dự án {currentSprint.project?.name || ''}</span>
          </Link>

          <Link
            to={`/tasks?project=${projectId}`}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-white border border-slate-200/80 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-xs transition-all"
          >
            <Layout className="w-3.5 h-3.5 text-blue-600" />
            <span>Mở Bảng Kanban Chi Tiết</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </Link>
        </div>

        {/* Sprint Command Header */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2.5">
                <SprintStatusBadge status={currentSprint.status} />
                <span className="text-slate-300">•</span>
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  Chu kỳ {currentSprint.durationDays} ngày
                </span>
                {currentSprint.startDate && (
                  <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-200">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Bắt đầu: {new Date(currentSprint.startDate).toLocaleDateString('vi-VN')}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {currentSprint.name}
              </h1>

              {currentSprint.goal && (
                <div className="flex items-start gap-2 text-sm text-slate-600 bg-blue-50/60 p-3 rounded-2xl border border-blue-100">
                  <Flag className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <p className="italic">
                    <strong>Mục tiêu Sprint:</strong> {currentSprint.goal}
                  </p>
                </div>
              )}
            </div>

            {/* Action CTAs for PM/Admin */}
            <div className="flex flex-wrap items-center gap-2.5">
              {isPMOrAdmin && currentSprint.status === 'PLANNING' && (
                <button
                  onClick={() => setShowStartDialog(true)}
                  className="px-5 py-2.5 text-sm font-semibold rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-98 transition-all flex items-center gap-2"
                >
                  <Play className="w-4 h-4 fill-white" />
                  <span>Bắt Đầu Sprint</span>
                </button>
              )}

              {isPMOrAdmin && currentSprint.status === 'ACTIVE' && (
                <button
                  onClick={() => setShowCompleteDialog(true)}
                  className="px-5 py-2.5 text-sm font-semibold rounded-2xl bg-blue-600 hover:bg-blue-700 text-white shadow-md active:scale-98 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Hoàn Thành Sprint</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
            <div className="p-3.5 rounded-2xl bg-slate-50/70 border border-slate-100">
              <span className="text-xs text-slate-500 font-medium">Tổng Công Việc</span>
              <p className="text-xl font-bold text-slate-900 mt-0.5">{progress.totalTasks} task</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50/50 border border-emerald-100">
              <span className="text-xs text-emerald-700 font-medium">Đã Hoàn Thành</span>
              <p className="text-xl font-bold text-emerald-800 mt-0.5">{progress.doneTasks} task</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-100">
              <span className="text-xs text-amber-700 font-medium">Tổng Story Points</span>
              <p className="text-xl font-bold text-amber-800 mt-0.5">{progress.totalStoryPoints} SP</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-blue-50/50 border border-blue-100">
              <span className="text-xs text-blue-700 font-medium">Tiến Độ Hoàn Thành</span>
              <p className="text-xl font-bold text-blue-800 mt-0.5">{progress.percent}%</p>
            </div>
          </div>
        </div>

        {/* Burndown Chart Section */}
        <BurndownChart burndown={burndown} height={320} />

        {/* Sprint Tasks Section */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Danh Sách Tasks Thuộc Sprint</span>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-slate-100 text-slate-700">
                  {tasks.length}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Các nhiệm vụ cam kết thực hiện trong chu kỳ này
              </p>
            </div>

            {/* Status Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-2xl">
              {(
                [
                  { id: 'ALL', label: 'Tất cả' },
                  { id: 'TODO', label: 'Cần làm' },
                  { id: 'IN_PROGRESS', label: 'Đang làm' },
                  { id: 'BLOCKED', label: 'Bị nghẽn' },
                  { id: 'DONE', label: 'Đã xong' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-all ${
                    activeFilter === tab.id
                      ? 'bg-white text-slate-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tasks List */}
          {filteredTasks.length === 0 ? (
            <div className="p-10 text-center bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
              <p className="text-sm">Không có task nào phù hợp với bộ lọc hiện tại</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200/80 rounded-2xl overflow-hidden">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-4 flex flex-wrap items-center justify-between gap-3 hover:bg-slate-50/80 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-[240px] flex-1">
                    <div className="shrink-0">{getStatusBadge(task.status)}</div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 line-clamp-1">
                        {task.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                        {getPriorityBadge(task.priority)}
                        {task.storyPoints !== null && (
                          <span className="font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[11px]">
                            {task.storyPoints} SP
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {task.assignee ? (
                      <div className="flex items-center gap-2">
                        {task.assignee.avatar ? (
                          <img
                            src={task.assignee.avatar}
                            alt={task.assignee.name}
                            className="w-7 h-7 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                            {task.assignee.name.charAt(0)}
                          </div>
                        )}
                        <span className="text-xs text-slate-700 font-medium">
                          {task.assignee.name}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <User className="w-3.5 h-3.5" /> Chưa gán
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialogs */}
      <StartSprintDialog
        sprint={currentSprint}
        isOpen={showStartDialog}
        onClose={() => setShowStartDialog(false)}
        onSuccess={() => {
          if (sprintId) {
            fetchSprintDetail(sprintId);
            fetchBurndown(sprintId);
          }
        }}
      />

      <CompleteSprintDialog
        sprint={currentSprint}
        isOpen={showCompleteDialog}
        onClose={() => setShowCompleteDialog(false)}
        onSuccess={() => {
          if (sprintId) {
            fetchSprintDetail(sprintId);
            fetchBurndown(sprintId);
          }
        }}
      />
    </div>
  );
};
