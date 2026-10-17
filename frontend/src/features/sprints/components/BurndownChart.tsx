import React from 'react';
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
import { TrendingDown, Zap, CheckCircle2 } from 'lucide-react';
import type { SprintBurndown } from '../types/sprint.types';

interface BurndownChartProps {
  burndown: SprintBurndown | null;
  height?: number;
}

export const BurndownChart: React.FC<BurndownChartProps> = ({ burndown, height = 300 }) => {
  if (!burndown || !burndown.dailyData || burndown.dailyData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 text-slate-400">
        <TrendingDown className="w-8 h-8 mb-2 opacity-50" />
        <p className="text-sm">Chưa có dữ liệu Burndown cho Sprint này</p>
      </div>
    );
  }

  // Format short date: MM/DD
  const formattedData = burndown.dailyData.map((d) => {
    const parts = d.date.split('-');
    const label = parts.length === 3 ? `${parts[2]}/${parts[1]}` : d.date;
    return {
      ...d,
      shortDate: label,
    };
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
      {/* Header stats */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <TrendingDown className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">Sprint Burndown Chart</h4>
            <p className="text-xs text-slate-500">
              Đường lý tưởng (Ideal) vs Tiến độ thực tế (Actual) theo Story Points
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Tổng SP:</span>
            <strong className="text-slate-900 font-semibold">{burndown.totalStoryPoints}</strong>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Đã xong:</span>
            <strong className="font-semibold">{burndown.completedStoryPoints} SP</strong>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800">
            <span>Còn lại:</span>
            <strong className="font-semibold">{burndown.remainingStoryPoints} SP</strong>
          </div>
        </div>
      </div>

      {/* Chart container */}
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formattedData} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis
              dataKey="shortDate"
              tick={{ fontSize: 11, fill: '#64748B' }}
              stroke="#CBD5E1"
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748B' }}
              stroke="#CBD5E1"
              domain={[0, 'auto']}
              label={{ value: 'Story Points', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#94A3B8' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#0F172A',
                color: '#fff',
                borderRadius: '12px',
                border: 'none',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                fontSize: '12px',
                padding: '8px 12px',
              }}
              formatter={(value: unknown, name: unknown) => [
                `${value} SP`,
                name === 'ideal' ? 'Lý tưởng (Ideal)' : 'Thực tế (Actual)',
              ]}
              labelFormatter={(label: unknown) => `Ngày ${label}`}
            />
            <Legend
              verticalAlign="top"
              align="right"
              wrapperStyle={{ paddingBottom: 10, fontSize: 12 }}
              formatter={(value) => (value === 'ideal' ? 'Lý tưởng (Ideal)' : 'Thực tế (Actual)')}
            />
            <Line
              type="linear"
              dataKey="ideal"
              name="ideal"
              stroke="#94A3B8"
              strokeDasharray="4 4"
              strokeWidth={2}
              dot={{ r: 3, fill: '#94A3B8' }}
            />
            <Line
              type="monotone"
              dataKey="actual"
              name="actual"
              stroke="#2563EB"
              strokeWidth={3}
              dot={{ r: 4, fill: '#2563EB', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
