import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  UserCog,
  Loader2,
  Flame,
} from 'lucide-react';
import { ModalShell } from './ModalShell';
import { SwapPmModal, type SwapPmCandidate } from './SwapPmModal';
import { deptHeadApi } from '../../api/dept-head.api';
import type { DeptHeadProjectDetail } from '../../types/dashboard.types';

interface ProjectDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string | null;
  canSwapPm?: boolean;
  candidates?: SwapPmCandidate[];
  onProjectUpdated?: () => void;
}

export function ProjectDetailModal({
  isOpen,
  onClose,
  projectId,
  canSwapPm = true,
  candidates = [],
  onProjectUpdated,
}: ProjectDetailModalProps) {
  const [data, setData] = useState<DeptHeadProjectDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'members' | 'tasks' | 'sprints'>('overview');
  const [swapPmOpen, setSwapPmOpen] = useState(false);

  useEffect(() => {
    if (!isOpen || !projectId) {
      setData(null);
      return;
    }
    void loadDetail(projectId);
  }, [isOpen, projectId]);

  const loadDetail = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await deptHeadApi.getProjectDetail(id);
      setData(res);
    } catch (err: unknown) {
      setError('Không thể tải thông tin dự án');
    } finally {
      setLoading(false);
    }
  };

  const riskBadgeColors = {
    LOW: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    MEDIUM: 'bg-amber-50 border-amber-200 text-amber-800',
    HIGH: 'bg-rose-50 border-rose-200 text-rose-800',
    CRITICAL: 'bg-rose-100 border-rose-300 text-rose-900',
  };

  return (
    <>
      <ModalShell
        isOpen={isOpen}
        onClose={onClose}
        title={data?.name || 'Chi Tiết Dự Án'}
        subtitle={
          data
            ? `${data.memberCount} thành viên • ${data.taskCounts.total} công việc • ${data.progressPercent}% hoàn thành`
            : 'Đang tải...'
        }
        size="xl"
        headerGradient="blue"
        footer={
          data && (
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {canSwapPm && (
                  <button
                    type="button"
                    onClick={() => setSwapPmOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition-colors shadow-xs"
                  >
                    <UserCog className="w-4 h-4" />
                    <span>Đổi PM</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-colors"
                >
                  Đóng
                </button>
                <Link
                  to={`/projects/${data.id}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-xs"
                >
                  <span>Mở toàn trang dự án</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )
        }
      >
        {loading && (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
            <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
            <span className="text-xs font-semibold">Đang tải dữ liệu dự án...</span>
          </div>
        )}

        {error && (
          <div className="py-12 text-center text-rose-600 text-xs font-semibold">
            {error}
          </div>
        )}

        {data && !loading && (
          <div className="space-y-4">
            {/* Risk Alert Banner */}
            {data.riskLevel !== 'LOW' && (
              <div
                className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                  riskBadgeColors[data.riskLevel]
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <div className="font-black uppercase tracking-wider">
                    Cảnh báo rủi ro ({data.riskLevel})
                  </div>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
                    {data.riskReasons.map((r, i) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex items-center border-b border-slate-200 gap-2 text-xs">
              {(
                [
                  { id: 'overview', label: 'Tổng quan' },
                  { id: 'members', label: `Thành viên (${data.members.length})` },
                  { id: 'tasks', label: `Công việc gần đây (${data.recentTasks.length})` },
                  { id: 'sprints', label: `Sprints (${data.sprints.length})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-2.5 pt-1 px-3 font-bold transition-colors border-b-2 -mb-px ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab 1: Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* Description */}
                <div>
                  <h4 className="text-[11px] font-black uppercase text-slate-400 mb-1">
                    Mô tả dự án
                  </h4>
                  <p className="text-xs text-slate-700 bg-slate-50 p-3 rounded-2xl border border-slate-200/60 leading-relaxed">
                    {data.description || 'Chưa có mô tả chi tiết cho dự án này.'}
                  </p>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">
                      Project Manager
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      {data.pm?.avatar ? (
                        <img
                          src={data.pm.avatar}
                          alt={data.pm.name}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center">
                          {(data.pm?.name || 'U').charAt(0)}
                        </div>
                      )}
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {data.pm?.name || 'Chưa gán'}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">
                      Quy trình
                    </span>
                    <span className="text-xs font-black text-slate-900 mt-1 inline-block">
                      {data.workflowType === 'SCRUM' ? 'Scrum (Sprint)' : 'Kanban'}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">
                      Trạng thái
                    </span>
                    <span className="text-xs font-black text-slate-900 mt-1 inline-block">
                      {data.status}
                    </span>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">
                      Thời hạn
                    </span>
                    <span className="text-xs font-bold text-slate-900 mt-1 inline-block">
                      {data.endDate
                        ? new Date(data.endDate).toLocaleDateString('vi-VN')
                        : 'Không giới hạn'}
                    </span>
                  </div>
                </div>

                {/* Task counts ribbon */}
                <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-700">Tiến độ hoàn thành</span>
                    <span className="text-blue-700">{data.progressPercent}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500 bg-blue-600"
                      style={{ width: `${data.progressPercent}%` }}
                    />
                  </div>
                  <div className="grid grid-cols-4 gap-2 pt-2 text-center text-xs">
                    <div className="p-2 rounded-xl bg-white border border-slate-200">
                      <div className="text-[10px] text-slate-400 font-bold uppercase">Tổng số</div>
                      <div className="text-sm font-black text-slate-900">{data.taskCounts.total}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                      <div className="text-[10px] text-emerald-700 font-bold uppercase">Xong</div>
                      <div className="text-sm font-black text-emerald-800">{data.taskCounts.done}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-blue-50 border border-blue-100">
                      <div className="text-[10px] text-blue-700 font-bold uppercase">Đang làm</div>
                      <div className="text-sm font-black text-blue-800">{data.taskCounts.inProgress}</div>
                    </div>
                    <div className="p-2 rounded-xl bg-rose-50 border border-rose-100">
                      <div className="text-[10px] text-rose-700 font-bold uppercase">Quá hạn</div>
                      <div className="text-sm font-black text-rose-800">{data.taskCounts.overdue}</div>
                    </div>
                  </div>
                </div>

                {/* Active sprint card if available */}
                {data.activeSprint && (
                  <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Flame className="w-5 h-5 text-amber-500 shrink-0" />
                      <div>
                        <div className="text-xs font-black text-slate-900">
                          {data.activeSprint.name}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Tiến độ: {data.activeSprint.progressPercent}% • Còn{' '}
                          {data.activeSprint.daysRemaining} ngày
                        </div>
                      </div>
                    </div>
                    <Link
                      to={`/projects/${data.id}/tasks`}
                      onClick={onClose}
                      className="text-xs font-bold text-amber-800 hover:text-amber-900 flex items-center gap-1"
                    >
                      <span>Mở bảng Sprint</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Members */}
            {activeTab === 'members' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                {data.members.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400 col-span-2">
                    Dự án chưa có thành viên nào.
                  </div>
                ) : (
                  data.members.map((m) => (
                    <div
                      key={m.id}
                      className="p-3 rounded-2xl border border-slate-200/80 bg-white flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {m.avatar ? (
                          <img
                            src={m.avatar}
                            alt={m.name}
                            className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                            {m.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">{m.name}</div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {m.position || 'Thành viên'}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 shrink-0">
                        {m.projectRole}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: Recent Tasks */}
            {activeTab === 'tasks' && (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {data.recentTasks.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Chưa có công việc nào trong dự án.
                  </div>
                ) : (
                  data.recentTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-2xl border border-slate-200/80 bg-white flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-black text-slate-900 truncate">{t.title}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                          <span>Phụ trách: {t.assigneeName || 'Chưa gán'}</span>
                          <span>•</span>
                          <span>Ưu tiên: {t.priority}</span>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                          t.status === 'DONE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.status === 'IN_PROGRESS'
                            ? 'bg-blue-100 text-blue-800'
                            : t.status === 'BLOCKED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {t.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 4: Sprints */}
            {activeTab === 'sprints' && (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {data.sprints.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">
                    Dự án này chưa kích hoạt chu kỳ Sprint nào.
                  </div>
                ) : (
                  data.sprints.map((s) => (
                    <div
                      key={s.id}
                      className="p-3 rounded-2xl border border-slate-200/80 bg-white flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-black text-slate-900">{s.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          Tiến độ: {s.progressPercent}% • Còn {s.daysRemaining} ngày
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                          s.status === 'ACTIVE'
                            ? 'bg-orange-100 text-orange-800'
                            : s.status === 'COMPLETED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}
      </ModalShell>

      {/* Nested Swap PM Modal */}
      {data && (
        <SwapPmModal
          isOpen={swapPmOpen}
          onClose={() => setSwapPmOpen(false)}
          onSuccess={() => {
            void loadDetail(data.id);
            if (onProjectUpdated) onProjectUpdated();
          }}
          projectId={data.id}
          projectName={data.name}
          currentPmName={data.pm?.name || 'Chưa chỉ định'}
          currentPmId={data.pm?.id}
          candidates={candidates}
        />
      )}
    </>
  );
}
