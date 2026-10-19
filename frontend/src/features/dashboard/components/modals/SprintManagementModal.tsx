import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpRight,
  TrendingDown,
  Loader2,
  Users,
  Ban,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { ModalShell } from './ModalShell';
import { deptHeadApi } from '../../api/dept-head.api';
import type { DeptHeadSprintDetail } from '../../types/dashboard.types';

interface SprintManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  sprintId: string | null;
}

export function SprintManagementModal({
  isOpen,
  onClose,
  sprintId,
}: SprintManagementModalProps) {
  const [data, setData] = useState<DeptHeadSprintDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !sprintId) {
      setData(null);
      return;
    }
    void loadSprint(sprintId);
  }, [isOpen, sprintId]);

  const loadSprint = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await deptHeadApi.getSprintDetail(id);
      setData(res);
    } catch (err: unknown) {
      setError('Không thể tải chi tiết Sprint');
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
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title={data?.name || 'Giám Sát Sprint Real-Time'}
      subtitle={
        data
          ? `Dự án: ${data.project.name} • Còn ${data.daysRemaining} ngày • ${data.progressPercent}% hoàn thành`
          : 'Đang tải...'
      }
      size="xl"
      headerGradient="orange"
      footer={
        data && (
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-slate-500">
              PM phụ trách: <strong>{data.pm?.name || 'Chưa chỉ định'}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-colors"
              >
                Đóng
              </button>
              <Link
                to={`/projects/${data.project.id}/tasks`}
                onClick={onClose}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition-colors shadow-xs"
              >
                <span>Mở Kanban Board</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )
      }
    >
      {loading && (
        <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Loader2 className="w-7 h-7 animate-spin text-orange-500" />
          <span className="text-xs font-semibold">Đang tổng hợp dữ liệu sprint & burndown...</span>
        </div>
      )}

      {error && (
        <div className="py-12 text-center text-rose-600 text-xs font-semibold">
          {error}
        </div>
      )}

      {data && !loading && (
        <div className="space-y-5 text-xs">
          {/* Risk Alert Banner */}
          {data.riskLevel !== 'LOW' && (
            <div
              className={`p-3.5 rounded-2xl border flex items-start gap-3 ${
                riskBadgeColors[data.riskLevel]
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <div>
                <div className="font-black uppercase tracking-wider">
                  Cảnh báo tiến độ Sprint ({data.riskLevel})
                </div>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px]">
                  {data.riskReasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Goal & Stats Ribbon */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            {data.goal && (
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 block mb-0.5">
                  Mục tiêu Sprint (Sprint Goal)
                </span>
                <p className="text-xs font-semibold text-slate-800 italic">
                  &ldquo;{data.goal}&rdquo;
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Tổng Tasks</div>
                <div className="text-base font-black text-slate-900 mt-0.5">
                  {data.doneTasks} / {data.totalTasks}
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Story Points</div>
                <div className="text-base font-black text-amber-700 mt-0.5">
                  {data.doneStoryPoints} / {data.totalStoryPoints} SP
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Thời Gian</div>
                <div className="text-base font-black text-orange-700 mt-0.5">
                  Còn {data.daysRemaining} / {data.daysTotal} ngày
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-white border border-slate-200">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Đang Bị Nghẽn</div>
                <div className="text-base font-black text-rose-700 mt-0.5">
                  {data.blockedTasks} task
                </div>
              </div>
            </div>
          </div>

          {/* Section A: Burndown Chart */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-orange-600" />
                <h4 className="font-black text-slate-900">Sprint Burndown Chart</h4>
              </div>
              <span className="text-[11px] text-slate-400">Đường lý tưởng vs Thực tế</span>
            </div>

            <div className="w-full h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.burndown} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                  <XAxis
                    dataKey="dayName"
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                  />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1px solid #E2E8F0',
                      fontSize: '11px',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Line
                    type="monotone"
                    dataKey="ideal"
                    name="Lý tưởng (Ideal)"
                    stroke="#94A3B8"
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="actual"
                    name="Thực tế (Actual)"
                    stroke="#EA580C"
                    strokeWidth={2.5}
                    dot={{ r: 3, fill: '#EA580C' }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Section B: Member Contribution Table */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <h4 className="font-black text-slate-900">
                  Đóng Góp Thành Viên Trong Sprint (Top {data.memberContribution.length})
                </h4>
              </div>
            </div>

            {data.memberContribution.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs italic">
                Chưa có dữ liệu đóng góp công việc trong sprint này.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.memberContribution.map((c) => (
                  <div key={c.userId} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {c.avatar ? (
                        <img
                          src={c.avatar}
                          alt={c.userName}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {c.userName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{c.userName}</div>
                        <div className="text-[10px] text-slate-400">
                          Đã giao: {c.assignedTasks} task
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="font-bold text-slate-800">
                          {c.doneTasks} task ({c.doneStoryPoints} SP)
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {c.contributionPercent}% tổng đóng góp
                        </div>
                      </div>
                      <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden hidden sm:block">
                        <div
                          className="h-full bg-blue-600 rounded-full"
                          style={{ width: `${c.contributionPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section C: Blocked Tasks List */}
          {data.blockedTasksList && data.blockedTasksList.length > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2.5">
              <div className="flex items-center gap-2 text-rose-800 font-black">
                <Ban className="w-4 h-4" />
                <h4>Công Việc Đang Bị Tắc Nghẽn (Blocked Tasks: {data.blockedTasksList.length})</h4>
              </div>
              <div className="space-y-1.5">
                {data.blockedTasksList.map((t) => (
                  <div
                    key={t.id}
                    className="p-2.5 rounded-xl bg-white border border-rose-200 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 truncate">{t.title}</div>
                      <div className="text-[10px] text-slate-500">
                        Phụ trách: {t.assigneeName || 'Chưa gán'} • Độ ưu tiên: {t.priority}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold text-[10px] shrink-0">
                      Bị nghẽn {t.blockedDays} ngày
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </ModalShell>
  );
}
