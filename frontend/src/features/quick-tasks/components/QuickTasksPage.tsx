/**
 * QuickTasksPage — M3.5 Enterprise Task Management
 *
 * Quản lý Quick Task theo phong cách Enterprise SaaS (Linear / Notion / Jira):
 *  1. Header Command Bar: Tiêu đề gọn gàng, ô tìm kiếm nhanh, chuyển đổi chế độ xem (Bảng dữ liệu vs Dạng thẻ), nút + Giao việc mới.
 *  2. KPI Summary Ribbon: 5 chỉ số then chốt (Tổng, Hôm nay, Quá hạn, Đang làm, Hoàn thành).
 *  3. Bộ lọc trạng thái trực quan kèm số đếm thời gian thực.
 *  4. Chế độ xem Bảng dữ liệu (Data Table - Mặc định):
 *     - Trạng thái tương tác trực tiếp (đổi nhanh TODO / IN_PROGRESS / DONE / BLOCKED)
 *     - Tiêu đề & Dự án liên quan
 *     - Người nhận & Người giao việc
 *     - Hạn chót cảnh báo quá hạn rõ ràng
 *     - Mức độ ưu tiên
 *     - Thao tác xóa task
 *  5. Chế độ xem Thẻ (Grid View): Bố cục thẻ trực quan cho ai thích phong cách Kanban.
 */
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Zap,
  RefreshCw,
  Inbox,
  Plus,
  Search,
  Table as TableIcon,
  LayoutGrid,
  Calendar,
  AlertCircle,
  Trash2,
} from 'lucide-react';
import { useQuickTaskStore } from '../stores/quick-task.store';
import { useAuthStore } from '@/stores/auth.store';
import { QuickTaskCard } from './QuickTaskCard';
import { QuickTaskModal } from './QuickTaskModal';
import type { TaskStatus, Priority } from '../types/quick-task.types';

const FILTERS: { value: TaskStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'TODO', label: 'Cần làm' },
  { value: 'IN_PROGRESS', label: 'Đang làm' },
  { value: 'IN_REVIEW', label: 'Đang duyệt' },
  { value: 'BLOCKED', label: 'Bị chặn' },
  { value: 'DONE', label: 'Hoàn thành' },
];

export function QuickTasksPage() {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');
  const { user, hasAnyRole } = useAuthStore();
  const { state, filterStatus, setFilter, loadAll, statsState, update, remove } = useQuickTaskStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'TABLE' | 'GRID'>('TABLE');
  const [searchQuery, setSearchQuery] = useState('');

  const canAssign = hasAnyRole(['PM', 'DEPARTMENT_HEAD', 'ADMIN']);

  useEffect(() => {
    void loadAll(filterStatus === 'ALL' ? undefined : { status: filterStatus });
  }, [loadAll, filterStatus]);

  const rawData = state.status === 'success' ? state.data : [];
  const stats = statsState.status === 'success' ? statsState.data : null;
  const loading = state.status === 'loading';
  const error = state.status === 'error' ? state.error : null;

  // Filter by search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return rawData;
    const q = searchQuery.toLowerCase();
    return rawData.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q)) ||
        (t.assignee && t.assignee.name.toLowerCase().includes(q)) ||
        (t.project && t.project.name.toLowerCase().includes(q)),
    );
  }, [rawData, searchQuery]);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      await update(taskId, { status: newStatus });
    } catch (e) {
      console.error('Failed to update task status:', e);
    }
  };

  const handleDeleteTask = async (taskId: string, taskTitle: string) => {
    if (window.confirm(isVi ? `Bạn có chắc muốn xóa công việc "${taskTitle}"?` : `Delete task "${taskTitle}"?`)) {
      try {
        await remove(taskId);
      } catch (e) {
        console.error('Failed to remove task:', e);
      }
    }
  };

  const getPriorityBadge = (priority: Priority) => {
    switch (priority) {
      case 'URGENT':
        return { label: isVi ? 'Khẩn cấp' : 'Urgent', color: 'bg-rose-100 text-rose-800 border-rose-300' };
      case 'HIGH':
        return { label: isVi ? 'Cao' : 'High', color: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'MEDIUM':
        return { label: isVi ? 'Trung bình' : 'Medium', color: 'bg-blue-100 text-blue-800 border-blue-300' };
      default:
        return { label: isVi ? 'Thấp' : 'Low', color: 'bg-slate-100 text-slate-700 border-slate-300' };
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 p-4 sm:p-6 lg:p-8 space-y-6 max-w-[1600px] mx-auto">
      {/* 1. Header Command Ribbon (Tinh tế, loại bỏ banner cồng kềnh) */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-5 sm:p-6 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <Zap className="w-6 h-6 fill-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {isVi ? 'Quản Lý Quick Tasks' : 'Quick Tasks Management'}
              </h1>
              <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                Ad-hoc
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {isVi
                ? 'Giao việc trực tiếp & theo dõi tiến độ công việc hàng ngày không qua chu kỳ Sprint'
                : 'Direct task delegation and tracking without sprint overhead'}
            </p>
          </div>
        </div>

        {/* Controls: Search, View Mode Toggle, Create Task CTA */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative min-w-[220px] sm:min-w-[260px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isVi ? 'Tìm việc, người nhận, dự án...' : 'Search tasks, assignees...'}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
            />
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('TABLE')}
              title={isVi ? 'Xem dạng Bảng dữ liệu' : 'Table view'}
              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold ${
                viewMode === 'TABLE'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <TableIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{isVi ? 'Bảng' : 'Table'}</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('GRID')}
              title={isVi ? 'Xem dạng Thẻ' : 'Grid view'}
              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-bold ${
                viewMode === 'GRID'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">{isVi ? 'Thẻ' : 'Grid'}</span>
            </button>
          </div>

          {/* Action CTA */}
          {canAssign && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs sm:text-sm shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" strokeWidth={2.5} />
              <span>{isVi ? 'Giao việc mới' : 'New Task'}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. KPI Summary Ribbon */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <KpiPill
            label={isVi ? 'Tổng số task' : 'Total'}
            value={stats.total}
            color="bg-white text-slate-900 border-slate-200"
          />
          <KpiPill
            label={isVi ? 'Hạn chót hôm nay' : 'Due Today'}
            value={stats.today}
            color="bg-white text-blue-700 border-blue-200"
          />
          <KpiPill
            label={isVi ? 'Quá hạn cam kết' : 'Overdue'}
            value={stats.overdue}
            color={stats.overdue > 0 ? 'bg-rose-50 text-rose-700 border-rose-300 ring-2 ring-rose-500/20' : 'bg-white text-slate-500 border-slate-200'}
            isWarning={stats.overdue > 0}
          />
          <KpiPill
            label={isVi ? 'Đang thực hiện' : 'In Progress'}
            value={stats.byStatus.IN_PROGRESS ?? 0}
            color="bg-white text-amber-700 border-amber-200"
          />
          <KpiPill
            label={isVi ? 'Đã hoàn thành' : 'Done'}
            value={stats.byStatus.DONE ?? 0}
            color="bg-white text-emerald-700 border-emerald-200"
          />
        </div>
      )}

      {/* 3. Filter tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-x-auto">
        {FILTERS.map((f) => {
          const active = filterStatus === f.value;
          const count =
            f.value === 'ALL'
              ? stats?.total ?? rawData.length
              : (stats?.byStatus[f.value] ?? rawData.filter((t) => t.status === f.value).length);
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                active
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{f.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${
                  active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* 4. Content Area: Data Table or Grid */}
      {loading && (
        <div className="flex flex-col items-center justify-center min-h-[35vh] gap-3 bg-white rounded-3xl border border-slate-200/80 p-12">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-xs font-bold text-slate-500">
            {isVi ? 'Đang tải danh sách Quick Tasks...' : 'Loading quick tasks...'}
          </p>
        </div>
      )}

      {error && (
        <div className="p-6 bg-rose-50/80 rounded-3xl border border-rose-200 shadow-sm text-center">
          <AlertCircle className="w-8 h-8 text-rose-600 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-rose-900 mb-1">
            {isVi ? 'Không thể tải dữ liệu Quick Tasks' : 'Failed to load quick tasks'}
          </h3>
          <p className="text-xs text-rose-600 mb-4">{error}</p>
          <button
            type="button"
            onClick={() => loadAll(filterStatus === 'ALL' ? undefined : { status: filterStatus })}
            className="px-4 py-2 bg-rose-600 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-rose-700 transition-colors"
          >
            {isVi ? 'Thử lại' : 'Retry'}
          </button>
        </div>
      )}

      {!loading && !error && filteredData.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[35vh] gap-3 bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Inbox className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            {isVi ? 'Không có Quick Task nào' : 'No quick tasks found'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md">
            {searchQuery
              ? isVi ? `Không tìm thấy kết quả nào khớp với "${searchQuery}"` : 'No matching results found'
              : canAssign
              ? isVi ? 'Chưa có công việc nào trong danh mục này. Hãy tạo task mới để giao việc.' : 'Create your first task.'
              : isVi ? 'Bạn không có công việc nào được giao trong mục này.' : 'You have no assigned tasks.'}
          </p>
          {canAssign && (
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs shadow-xs hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {isVi ? 'Giao việc ngay' : 'Assign task now'}
            </button>
          )}
        </div>
      )}

      {/* VIEW 1: DATA TABLE VIEW (Modern Enterprise List) */}
      {!loading && !error && filteredData.length > 0 && viewMode === 'TABLE' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-black uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4 w-36">{isVi ? 'Trạng thái' : 'Status'}</th>
                  <th className="py-3.5 px-4 min-w-[280px]">{isVi ? 'Công việc & Dự án' : 'Task & Project'}</th>
                  <th className="py-3.5 px-4 min-w-[180px]">{isVi ? 'Người thực hiện' : 'Assignee'}</th>
                  <th className="py-3.5 px-4 min-w-[160px]">{isVi ? 'Người giao việc' : 'Assigned By'}</th>
                  <th className="py-3.5 px-4 min-w-[140px]">{isVi ? 'Hạn chót' : 'Due Date'}</th>
                  <th className="py-3.5 px-4 w-28">{isVi ? 'Độ ưu tiên' : 'Priority'}</th>
                  <th className="py-3.5 px-4 w-20 text-right">{isVi ? 'Thao tác' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredData.map((task) => {
                  const isDone = task.status === 'DONE';
                  const isOverdue = !isDone && new Date(task.dueDate) < new Date();
                  const priorityBadge = getPriorityBadge(task.priority);
                  const canDelete =
                    user?.role === 'ADMIN' ||
                    user?.role === 'DEPARTMENT_HEAD' ||
                    task.assignedById === user?.id;

                  return (
                    <tr
                      key={task.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Trạng thái Dropdown */}
                      <td className="py-3.5 px-4">
                        <select
                          value={task.status}
                          onChange={(e) => handleStatusChange(task.id, e.target.value as TaskStatus)}
                          className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-xl border outline-none cursor-pointer transition-colors ${
                            task.status === 'DONE'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : task.status === 'IN_PROGRESS'
                              ? 'bg-blue-50 text-blue-800 border-blue-200'
                              : task.status === 'BLOCKED'
                              ? 'bg-rose-50 text-rose-800 border-rose-200'
                              : task.status === 'IN_REVIEW'
                              ? 'bg-purple-50 text-purple-800 border-purple-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <option value="TODO">{isVi ? 'Cần làm' : 'Todo'}</option>
                          <option value="IN_PROGRESS">{isVi ? 'Đang làm' : 'In Prog'}</option>
                          <option value="IN_REVIEW">{isVi ? 'Đang duyệt' : 'Review'}</option>
                          <option value="BLOCKED">{isVi ? 'Bị chặn' : 'Blocked'}</option>
                          <option value="DONE">{isVi ? 'Hoàn thành' : 'Done'}</option>
                        </select>
                      </td>

                      {/* Tiêu đề & Dự án */}
                      <td className="py-3.5 px-4">
                        <div className="font-black text-slate-900 group-hover:text-blue-600 transition-colors">
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                            {task.description}
                          </div>
                        )}
                        {task.project && (
                          <div className="inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold"
                            style={{
                              backgroundColor: `${task.project.color}15`,
                              color: task.project.color,
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: task.project.color }} />
                            <span>{task.project.name}</span>
                          </div>
                        )}
                      </td>

                      {/* Người thực hiện */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          {task.assignee?.avatar ? (
                            <img
                              src={task.assignee.avatar}
                              alt={task.assignee.name}
                              className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 font-black text-[10px] flex items-center justify-center shrink-0">
                              {(task.assignee?.name || 'U').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-bold text-slate-800 truncate">{task.assignee?.name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{task.assignee?.position || task.assignee?.email}</div>
                          </div>
                        </div>
                      </td>

                      {/* Người giao việc */}
                      <td className="py-3.5 px-4 text-slate-600 font-semibold">
                        <div className="flex items-center gap-2">
                          {task.assignedBy?.avatar ? (
                            <img
                              src={task.assignedBy.avatar}
                              alt={task.assignedBy.name}
                              className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[9px] flex items-center justify-center shrink-0">
                              {(task.assignedBy?.name || 'A').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="truncate">{task.assignedBy?.name || 'Hệ thống'}</span>
                        </div>
                      </td>

                      {/* Hạn chót */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <Calendar className={`w-3.5 h-3.5 shrink-0 ${isOverdue ? 'text-rose-600' : 'text-slate-400'}`} />
                          <span className={`font-bold ${isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>
                            {new Date(task.dueDate).toLocaleDateString('vi-VN', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        {isOverdue && (
                          <span className="inline-block text-[10px] font-black text-rose-700 bg-rose-100 px-1.5 py-0.2 rounded-md mt-0.5">
                            {isVi ? 'Quá hạn' : 'Overdue'}
                          </span>
                        )}
                      </td>

                      {/* Độ ưu tiên */}
                      <td className="py-3.5 px-4">
                        <span className={`inline-block text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${priorityBadge.color}`}>
                          {priorityBadge.label}
                        </span>
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-right">
                        {canDelete && (
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task.id, task.title)}
                            title={isVi ? 'Xóa công việc này' : 'Delete task'}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-6 py-4 bg-slate-50/60 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              {isVi
                ? `Tổng cộng ${filteredData.length} công việc trong danh sách`
                : `Total ${filteredData.length} tasks in view`}
            </span>
            <span className="text-[11px] text-slate-400">
              {isVi ? 'Click vào cột Trạng thái để cập nhật nhanh tiến độ' : 'Click status to update inline'}
            </span>
          </div>
        </div>
      )}

      {/* VIEW 2: GRID VIEW (Visual Cards) */}
      {!loading && !error && filteredData.length > 0 && viewMode === 'GRID' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filteredData.map((task) => (
            <QuickTaskCard key={task.id} task={task} />
          ))}
        </div>
      )}

      <QuickTaskModal isOpen={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}

interface KpiPillProps {
  label: string;
  value: number;
  color: string;
  isWarning?: boolean;
}

function KpiPill({ label, value, color, isWarning }: KpiPillProps) {
  return (
    <div className={`rounded-2xl border p-4 shadow-2xs transition-all ${color}`}>
      <div className="flex items-center justify-between mb-1">
        <div className="text-[10px] font-black uppercase tracking-wider opacity-70 truncate">{label}</div>
        {isWarning && (
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
        )}
      </div>
      <div className="text-2xl font-black tabular-nums tracking-tight">{value}</div>
    </div>
  );
}
