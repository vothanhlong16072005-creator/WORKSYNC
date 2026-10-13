import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import { PieChart as PieIcon } from 'lucide-react';
import type { DistributionItem } from '../../types/dashboard.types';

interface Props {
  distribution: DistributionItem[];
}

export function TaskDonutChart({ distribution }: Props) {
  const { t } = useTranslation();

  const data = distribution.length > 0 ? distribution : [
    { name: 'URGENT', label: 'Urgent', count: 4, percent: 25, color: '#2563EB' },
    { name: 'IN_PROGRESS', label: 'In Progress', count: 5, percent: 35, color: '#F59E0B' },
    { name: 'IN_REVIEW', label: 'In Review', count: 3, percent: 20, color: '#38BDF8' },
    { name: 'BLOCKED', label: 'Blocked', count: 2, percent: 12, color: '#C95D43' },
    { name: 'DONE', label: 'Completed', count: 6, percent: 40, color: '#10B981' },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <PieIcon className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">
            {t('dashboard.task_distribution', 'Task Distribution')}
          </h3>
        </div>

        <span className="text-[11px] font-bold text-slate-400">Status breakdown</span>
      </div>

      <div className="grid grid-cols-2 gap-2 items-center py-2">
        <div className="h-32 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={30}
                outerRadius={55}
                paddingAngle={2}
                dataKey="count"
              >
                {data.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-1.5">
          {data.slice(0, 4).map((item) => (
            <div key={item.name} className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium text-slate-700 truncate max-w-[80px]">
                  {item.label}
                </span>
              </div>
              <span className="font-mono font-bold text-slate-900">{item.count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
        <span>Balanced workload</span>
        <span className="text-blue-600 font-bold">● Normal variance</span>
      </div>
    </div>
  );
}
