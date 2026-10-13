import { useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import { PieChart as PieIcon } from 'lucide-react';
import type { DistributionItem } from '../../types/dashboard.types';

interface Props {
  statusDistribution: DistributionItem[];
  priorityDistribution: DistributionItem[];
}

export function DistributionDonutWidget({
  statusDistribution,
  priorityDistribution,
}: Props) {
  const { t } = useTranslation();
  const [view, setView] = useState<'status' | 'priority'>('status');

  const currentData = view === 'status' ? statusDistribution : priorityDistribution;
  const filteredData = currentData.filter((d) => d.count > 0);

  return (
    <div className="p-5 bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
      <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-slate-900">
        <div className="flex items-center gap-2">
          <span className="p-1 text-white bg-blue-600 border border-slate-900">
            <PieIcon className="w-4 h-4" />
          </span>
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
            {t('dashboard.task_breakdown', 'Phân bổ công việc')}
          </h2>
        </div>

        {/* Tab switch between Status and Priority */}
        <div className="flex border-2 border-slate-900 bg-slate-100 text-xs font-black">
          <button
            type="button"
            onClick={() => setView('status')}
            className={`px-2 py-1 uppercase transition-all ${
              view === 'status'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('dashboard.by_status', 'Trạng thái')}
          </button>
          <button
            type="button"
            onClick={() => setView('priority')}
            className={`px-2 py-1 uppercase transition-all ${
              view === 'priority'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('dashboard.by_priority', 'Ưu tiên')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
        {/* Donut chart */}
        <div className="h-40 w-full">
          {filteredData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs font-bold text-slate-400 italic">
              {t('dashboard.no_data', 'Chưa có dữ liệu')}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={filteredData}
                  cx="50%"
                  cy="50%"
                  innerRadius={36}
                  outerRadius={65}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {filteredData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="#0f172a" strokeWidth={1.5} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '2px solid #0f172a',
                    boxShadow: '3px 3px 0px 0px rgba(15,23,42,1)',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                  formatter={(val, _name, item) => [
                    `${val} (${item.payload.percent}%)`,
                    item.payload.label,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Legend stats */}
        <div className="space-y-2">
          {currentData.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 border border-slate-900 shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-bold text-slate-700">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-slate-900">{item.count}</span>
                <span className="font-mono text-[11px] text-slate-400 w-9 text-right">
                  {item.percent}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
