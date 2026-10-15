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
      <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 text-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] p-5">
        {/* Decorative Bauhaus background accent */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10">
          {/* Header Tag */}
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-wider border border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
                AI Sprint Intelligence
              </span>
              <span className="text-xs font-bold text-slate-400">
                Khuyến nghị thời gian thực
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-xs font-mono font-bold">
                Sprint Goal: {insight.completionRate}%
              </span>
            </div>
          </div>

          {/* Natural Language Summary */}
          <div className="space-y-3 mb-4">
            <p className="text-sm md:text-[15px] font-medium leading-relaxed text-slate-100">
              {insight.recommendation}
            </p>

            {insight.blockedTaskTitle && (
              <div className="flex items-center gap-2.5 p-2.5 bg-rose-950/40 border border-rose-500/40 rounded-none text-rose-200 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <div className="flex-1 truncate">
                  <span className="font-bold text-rose-300">Điểm nghẽn nghiêm trọng: </span>
                  <span className="font-mono underline">{insight.blockedTaskId || 'TASK-104'}</span> - {insight.blockedTaskTitle}
                </div>
                <span className="px-2 py-0.5 bg-rose-900/60 text-rose-300 text-[10px] font-bold uppercase shrink-0 border border-rose-700">
                  Nghẽn {insight.blockedDays || 2} ngày
                </span>
              </div>
            )}
          </div>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowReassignModal(true)}
              disabled={reassigned}
              className={`flex items-center gap-2 px-3.5 py-2 text-xs font-black uppercase tracking-wider transition-all duration-150 border-2 border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                reassigned
                  ? 'bg-emerald-500 text-slate-950 cursor-default'
                  : 'bg-amber-400 hover:bg-amber-300 text-slate-950 hover:-translate-y-0.5'
              }`}
            >
              {reassigned ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  Đã đề xuất điều phối
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 stroke-[2.5]" />
                  Gợi ý phân công lại
                </>
              )}
            </button>

            <a
              href="#project-tasks"
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById('project-tasks') || document.querySelector('[data-widget="project-tasks"]');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
                toast.info(`Chi tiết task nghẽn: ${insight.blockedTaskTitle}`, {
                  description: 'Đã định vị đến danh sách tác vụ của Sprint hiện tại.',
                });
              }}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border-2 border-slate-700 text-xs font-bold transition-colors"
            >
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>Xem chi tiết điểm nghẽn</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>
        </div>
      </div>

      {/* Modal Gợi ý phân công lại */}
      {showReassignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] max-w-lg w-full p-6 text-slate-900">
            <div className="flex items-start justify-between pb-3 mb-4 border-b-2 border-slate-900">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-400 border border-slate-900">
                  <UserCheck className="w-5 h-5 text-slate-900" />
                </span>
                <div>
                  <h3 className="text-base font-black uppercase text-slate-900">
                    AI Đề Xuất Điều Phối Nhân Lực
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Giải tỏa điểm nghẽn WebRTC & SFU Mesh
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReassignModal(false)}
                className="p-1 hover:bg-slate-100 border border-transparent hover:border-slate-900"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="space-y-3.5 text-sm mb-6">
              <div className="p-3 bg-amber-50 border-2 border-amber-300">
                <div className="text-xs font-black uppercase text-amber-800 mb-1">
                  Task đang bị chặn (Blocked)
                </div>
                <div className="font-bold text-slate-900">
                  {insight.blockedTaskId || 'TASK-104'}: {insight.blockedTaskTitle}
                </div>
                <div className="text-xs text-slate-600 mt-1">
                  Đang phụ trách: <strong>Đặng Quốc Bảo</strong> (Đang quá tải hạ tầng Docker/K8s)
                </div>
              </div>

              <div className="p-3 bg-indigo-50 border-2 border-indigo-300">
                <div className="text-xs font-black uppercase text-indigo-800 mb-1">
                  Đề xuất tối ưu từ AI Engine
                </div>
                <div className="text-xs text-slate-700 leading-relaxed">
                  Phối hợp thêm <strong>Hoàng Văn Nam</strong> (Senior Backend) vào gỡ vướng API Gateway, hoặc phân công <strong>Đặng Quốc Bảo</strong> tập trung 100% capacity vào task này trong 2 ngày để kịp release ngày <strong>{insight.releaseDate || '20/10'}</strong>.
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t-2 border-slate-900">
              <button
                type="button"
                onClick={() => setShowReassignModal(false)}
                className="px-4 py-2 text-xs font-bold uppercase text-slate-600 hover:text-slate-900 border-2 border-transparent hover:border-slate-900"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleReassign}
                className="px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs uppercase tracking-wider border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]"
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
