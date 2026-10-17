import { useState } from 'react';
import { Sparkles, AlertTriangle, ArrowRight, UserCheck, ShieldAlert, Check, X } from 'lucide-react';
import type { AiSprintInsight } from '../../types/dashboard.types';
import { toast } from 'sonner';

interface Props {
  insight?: AiSprintInsight;
}

export function AiSprintHealthWidget({ insight }: Props) {
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [reassigned, setReassigned] = useState(false);

  if (!insight) return null;

  const handleReassign = () => {
    setReassigned(true);
    setShowReassignModal(false);
    toast.success('Đã gửi đề xuất điều phối thêm Đặng Quốc Bảo (DevOps) vào TASK-104!', {
      description: 'Thông báo đã được gửi đến Team Lead và Kỹ sư liên quan.',
    });
  };

  return (
    <>
      <div className="relative overflow-hidden bg-slate-950 text-white rounded-2xl border border-slate-800 shadow-md p-5 sm:p-6 transition-all hover:border-slate-700">
        {/* Decorative ambient aura */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          {/* Header Tag */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5 mb-3.5 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-bold text-xs shadow-xs">
                <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                <span>AI Sprint Intelligence</span>
              </span>
              <span className="text-xs font-semibold text-slate-400">
                Khuyến nghị thời gian thực
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-mono font-bold">
                Sprint Goal: {insight.completionRate}%
              </span>
            </div>
          </div>

          {/* Natural Language Summary */}
          <div className="space-y-3 mb-4">
            <p className="text-sm md:text-[15px] font-normal leading-relaxed text-slate-200">
              {insight.recommendation}
            </p>

            {insight.blockedTaskTitle && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <div className="flex-1 truncate">
                  <span className="font-semibold text-rose-400">Điểm nghẽn nghiêm trọng: </span>
                  <span className="font-mono text-rose-300">{insight.blockedTaskId}</span> - {insight.blockedTaskTitle}
                </div>
                <span className="px-2 py-0.5 rounded-md bg-rose-900/60 text-rose-300 border border-rose-700/50 text-[10px] font-mono shrink-0">
                  Nghẽn {insight.blockedDays} ngày
                </span>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => setShowReassignModal(true)}
              disabled={reassigned}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-colors ${
                reassigned
                  ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 cursor-default'
                  : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
              }`}
            >
              {reassigned ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Đã gửi đề xuất điều phối</span>
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  <span>Gợi ý phân công lại</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() =>
                toast.info('Chi tiết điểm nghẽn TASK-104', {
                  description:
                    'Cụm máy chủ STUN/TURN WebRTC tại FPT Complex đang chờ cấp phát dải IP tĩnh từ Network Admin.',
                })
              }
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-semibold text-xs transition-colors"
            >
              <span>Xem chi tiết điểm nghẽn</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal Đề xuất điều phối nhân lực thông minh */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full p-6 text-slate-900">
            <div className="flex items-start justify-between pb-3.5 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Đề Xuất Phân Bổ Nhân Sự Gỡ Điểm Nghẽn
                  </h3>
                  <p className="text-[11px] text-slate-500">Khuyến nghị từ WorkSync AI Engine</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReassignModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 mb-6 text-xs">
              <div className="p-3.5 bg-rose-50/70 rounded-xl border border-rose-200/80">
                <span className="text-[11px] font-bold uppercase text-rose-800 block mb-1">
                  Task đang bị nghẽn (Blocked 2 ngày):
                </span>
                <p className="font-bold text-slate-900 text-sm">
                  {insight.blockedTaskId}: {insight.blockedTaskTitle}
                </p>
                <p className="text-slate-600 mt-1">
                  Lý do: Hạ tầng mạng WebRTC chưa thông dải IP nội bộ FPT Complex.
                </p>
              </div>

              <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200/80">
                <span className="text-[11px] font-bold uppercase text-blue-800 block mb-1">
                  Nhân sự AI khuyến nghị bổ sung:
                </span>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">Đặng Quốc Bảo (DevOps Engineer)</p>
                    <p className="text-slate-600">Capacity hiện tại: <strong>16h rảnh tuần này</strong> (Đã xong 80% tasks)</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                    Khả dụng cao
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowReassignModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleReassign}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-xs transition-colors"
              >
                Xác nhận điều phối ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
