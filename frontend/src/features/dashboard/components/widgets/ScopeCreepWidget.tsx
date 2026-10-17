import { TrendingUp, AlertCircle, PlusCircle } from 'lucide-react';
import type { SprintScopeCreep } from '../../types/dashboard.types';

interface Props {
  scopeCreep?: SprintScopeCreep;
}

export function ScopeCreepWidget({ scopeCreep }: Props) {
  if (!scopeCreep) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 transition-all hover:border-slate-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100/80 shadow-xs">
            <TrendingUp className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 block">
              Kiểm soát phạm vi dự án
            </span>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Sprint Scope Creep Tracker
            </h2>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 text-xs font-semibold">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>Scope Change: +{scopeCreep.addedStoryPoints} Story Points</span>
        </div>
      </div>

      {/* Comparison: Initial vs Scope Added vs Current Total */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
          <div className="text-xs font-semibold text-slate-500">
            Cam kết ban đầu
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {scopeCreep.initialStoryPoints} <span className="text-xs font-normal text-slate-500">SP</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {scopeCreep.initialTasksCount} tác vụ đã lập kế hoạch
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200/80">
          <div className="text-xs font-semibold text-amber-800 flex items-center justify-between">
            <span>Phát sinh giữa Sprint</span>
            <span className="text-[10px] bg-amber-200/70 text-amber-900 px-1.5 py-0.5 rounded font-mono font-bold">
              +{scopeCreep.creepPercent}%
            </span>
          </div>
          <div className="text-xl font-bold font-mono text-amber-900 mt-1">
            +{scopeCreep.addedStoryPoints} <span className="text-xs font-normal text-amber-700">SP</span>
          </div>
          <div className="text-[11px] font-semibold text-amber-800 mt-1">
            +{scopeCreep.addedTasksCount} tác vụ được chèn thêm
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80">
          <div className="text-xs font-semibold text-blue-800">
            Tổng Scope hiện tại
          </div>
          <div className="text-xl font-bold font-mono text-blue-900 mt-1">
            {scopeCreep.currentStoryPoints} <span className="text-xs font-normal text-blue-700">SP</span>
          </div>
          <div className="text-[11px] text-blue-600 mt-1">
            {scopeCreep.initialTasksCount + scopeCreep.addedTasksCount} tác vụ đang chạy
          </div>
        </div>
      </div>

      {/* List of Tasks Injected Mid-Sprint */}
      <div>
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
          <PlusCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>Danh sách tác vụ chèn thêm trong Sprint:</span>
        </div>

        <div className="space-y-2">
          {(scopeCreep.addedTasksList || []).map((t) => (
            <div
              key={t.id}
              className="p-3 rounded-xl bg-slate-50/60 border border-slate-200/70 hover:bg-white hover:border-slate-300 hover:shadow-2xs transition-all flex items-center justify-between gap-3 text-xs"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-xs font-mono font-bold shrink-0">
                  {t.id}
                </span>
                <span className="font-semibold text-slate-800 truncate">
                  {t.title}
                </span>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[11px] font-mono font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {t.storyPoints} SP
                </span>
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
                  +{t.addedAt}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
