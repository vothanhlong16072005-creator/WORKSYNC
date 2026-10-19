import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Filter, X, RotateCcw, Check, Search } from 'lucide-react';
import { useCalendarStore } from '../stores/calendar.store';
import { useProjectStore } from '@/stores/project.store';
import type { ItemKind } from '../types/calendar.types';

export const TimelineFilters: React.FC = () => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const { filters, setFilter, resetFilters } = useCalendarStore();
  const { projects, loadMine } = useProjectStore();

  useEffect(() => {
    if (projects.length === 0) {
      loadMine();
    }
  }, [projects.length, loadMine]);

  // Compute active filters count (excluding full types list)
  let activeCount = 0;
  if (filters.projectId) activeCount++;
  if (filters.assigneeId) activeCount++;
  if (filters.status.length > 0) activeCount++;
  if (filters.priority.length > 0) activeCount++;
  if (filters.query) activeCount++;
  if (filters.types.length < 6) activeCount++;

  const allItemKinds: { kind: ItemKind; label: string; color: string }[] = [
    { kind: 'task', label: 'Tasks', color: 'bg-blue-500' },
    { kind: 'sprint', label: 'Sprints', color: 'bg-indigo-500' },
    { kind: 'meeting', label: 'Cuộc họp', color: 'bg-purple-500' },
    { kind: 'leave', label: 'Nghỉ phép', color: 'bg-amber-500' },
    { kind: 'wfh', label: 'WFH', color: 'bg-emerald-500' },
    { kind: 'overtime', label: 'Tăng ca', color: 'bg-rose-500' },
  ];

  const statuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE'];
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

  const toggleType = (kind: ItemKind) => {
    const exists = filters.types.includes(kind);
    const updated = exists ? filters.types.filter((k) => k !== kind) : [...filters.types, kind];
    setFilter('types', updated);
  };

  const toggleStatus = (st: string) => {
    const exists = filters.status.includes(st);
    const updated = exists ? filters.status.filter((s) => s !== st) : [...filters.status, st];
    setFilter('status', updated);
  };

  const togglePriority = (pr: string) => {
    const exists = filters.priority.includes(pr);
    const updated = exists ? filters.priority.filter((p) => p !== pr) : [...filters.priority, pr];
    setFilter('priority', updated);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer shadow-2xs ${
          isOpen || activeCount > 0
            ? 'bg-blue-50 text-blue-700 border-blue-200 ring-2 ring-blue-500/10'
            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
        }`}
      >
        <Filter className={`w-3.5 h-3.5 ${activeCount > 0 ? 'text-blue-600' : 'text-slate-500'}`} />
        <span>{t('calendar.filter.title', 'Bộ lọc')}</span>
        {activeCount > 0 && (
          <span className="w-4 h-4 rounded-full bg-blue-600 text-white text-[10px] flex items-center justify-center font-bold">
            {activeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 p-4 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 space-y-4 text-xs animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-600" />
                <h4 className="font-bold text-slate-900 text-sm">
                  {t('calendar.filter.title', 'Bộ lọc nâng cao')}
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                {t('calendar.filter.search', 'Tìm kiếm')}
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={filters.query}
                  onChange={(e) => setFilter('query', e.target.value)}
                  placeholder={t('calendar.filter.search', 'Tìm kiếm tiêu đề...')}
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Project Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                {t('calendar.filter.project', 'Dự án')}
              </label>
              <select
                value={filters.projectId || ''}
                onChange={(e) => setFilter('projectId', e.target.value || null)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-hidden"
              >
                <option value="">{t('calendar.filter.all_projects', 'Tất cả dự án')}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Event Types Toggle Pills */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                {t('calendar.filter.types', 'Loại sự kiện')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {allItemKinds.map((k) => {
                  const isChecked = filters.types.includes(k.kind);
                  return (
                    <button
                      key={k.kind}
                      type="button"
                      onClick={() => toggleType(k.kind)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${k.color}`} />
                      <span>{k.label}</span>
                      {isChecked && <Check className="w-3 h-3 text-white ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Statuses Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                {t('calendar.filter.status', 'Trạng thái Task')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {statuses.map((st) => {
                  const isChecked = filters.status.includes(st);
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => toggleStatus(st)}
                      className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                {t('calendar.filter.priority', 'Độ ưu tiên')}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {priorities.map((pr) => {
                  const isChecked = filters.priority.includes(pr);
                  return (
                    <button
                      key={pr}
                      type="button"
                      onClick={() => togglePriority(pr)}
                      className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold transition-all cursor-pointer ${
                        isChecked
                          ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {pr}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reset Footer */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>{t('calendar.filter.reset', 'Đặt lại')}</span>
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
              >
                Hoàn tất
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
