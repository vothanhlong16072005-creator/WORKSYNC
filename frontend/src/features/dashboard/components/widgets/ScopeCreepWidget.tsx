import { TrendingUp, AlertCircle, PlusCircle } from 'lucide-react';
import type { SprintScopeCreep } from '../../types/dashboard.types';

interface Props {
  scopeCreep?: SprintScopeCreep;
}

export function ScopeCreepWidget({ scopeCreep }: Props) {
  if (!scopeCreep) return null;

  return (
    <div className="p-5 bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b-2 border-slate-900">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-amber-500 text-slate-950 border border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <TrendingUp className="w-4 h-4 stroke-[2.5]" />
          </span>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">
              Kiểm soát phạm vi dự án
            </span>
            <h2 className="text-sm font-black uppercase tracking-tight text-slate-900">
              Sprint Scope Creep Tracker
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-100 border-2 border-amber-500 text-amber-900 text-xs font-black uppercase tracking-wide">
          <AlertCircle className="w-3.5 h-3.5 text-amber-700" />
          <span>Scope Change: +{scopeCreep.addedStoryPoints} Story Points</span>
        </div>
      </div>

      {/* Comparison: Initial vs Scope Added vs Current Total */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div className="p-3 bg-slate-50 border-2 border-slate-200">
          <div className="text-[11px] font-bold text-slate-500 uppercase">
            Cam kết ban đầu
          </div>
          <div className="text-xl font-black font-mono text-slate-800 mt-0.5">
            {scopeCreep.initialStoryPoints} <span className="text-xs font-bold text-slate-500">SP</span>
          </div>
          <div className="text-[10px] font-medium text-slate-400 mt-1">
            {scopeCreep.initialTasksCount} tác vụ đã lập kế hoạch
          </div>
        </div>

        <div className="p-3 bg-amber-50 border-2 border-amber-300">
          <div className="text-[11px] font-bold text-amber-800 uppercase flex items-center justify-between">
            <span>Phát sinh giữa Sprint</span>
            <span className="text-[10px] bg-amber-200 px-1 font-mono">+{scopeCreep.creepPercent}%</span>
          </div>
          <div className="text-xl font-black font-mono text-amber-700 mt-0.5">
            +{scopeCreep.addedStoryPoints} <span className="text-xs font-bold text-amber-600">SP</span>
          </div>
          <div className="text-[10px] font-bold text-amber-800 mt-1">
            +{scopeCreep.addedTasksCount} tác vụ được chèn thêm
          </div>
        </div>

        <div className="p-3 bg-indigo-50 border-2 border-indigo-300">
          <div className="text-[11px] font-bold text-indigo-800 uppercase">
            Tổng Scope thực tế
          </div>
          <div className="text-xl font-black font-mono text-indigo-900 mt-0.5">
            {scopeCreep.currentStoryPoints} <span className="text-xs font-bold text-indigo-500">SP</span>
          </div>
          <div className="text-[10px] font-bold text-indigo-700 mt-1">
            Cần điều phối để tránh vỡ kế hoạch
          </div>
        </div>
      </div>

      {/* Visual Bar Comparison */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700 mb-1.5">
          <span>Tỷ lệ phân bổ Scope:</span>
          <span className="font-mono text-[11px]">
            Ban đầu ({Math.round((scopeCreep.initialStoryPoints / scopeCreep.currentStoryPoints) * 100)}%) vs Phát sinh ({scopeCreep.creepPercent}%)
          </span>
        </div>
        <div className="w-full h-3 bg-slate-200 border border-slate-900 flex overflow-hidden">
          <div
            className="h-full bg-slate-700"
            style={{
              width: `${(scopeCreep.initialStoryPoints / scopeCreep.currentStoryPoints) * 100}%`,
            }}
          />
          <div
            className="h-full bg-amber-400"
            style={{
              width: `${(scopeCreep.addedStoryPoints / scopeCreep.currentStoryPoints) * 100}%`,
            }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mt-1">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-slate-700 inline-block" /> Cam kết ban đầu
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 bg-amber-400 inline-block" /> Phát sinh sau ngày bắt đầu Sprint
          </span>
        </div>
      </div>

      {/* Newly Added Tasks List */}
      <div className="border-t border-slate-200 pt-3">
        <div className="text-[11px] font-black uppercase text-slate-500 mb-2 flex items-center justify-between">
          <span>Công việc bị thêm vào sau khi Sprint bắt đầu:</span>
          <span className="text-[10px] text-amber-700 font-bold">Chưa nằm trong ước lượng ban đầu</span>
        </div>

        <div className="space-y-2">
          {scopeCreep.addedTasksList.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between p-2.5 bg-amber-50/60 border border-amber-300 hover:border-amber-500 transition-colors text-xs"
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <PlusCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <div className="truncate">
                  <span className="font-mono font-bold text-slate-900 mr-1.5">{task.id}</span>
                  <span className="text-slate-800 font-medium">{task.title}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2 py-0.5 bg-amber-200 border border-amber-400 font-mono font-black text-amber-900 text-[10px]">
                  +{task.storyPoints} SP
                </span>
                <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                  Thêm ngày: {task.addedAt}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
