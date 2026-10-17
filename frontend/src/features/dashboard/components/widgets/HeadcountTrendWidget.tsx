import { Users, UserPlus, HeartHandshake, ArrowUpRight } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { HeadcountTrendPoint } from '../../types/dashboard.types';

interface Props {
  trend?: HeadcountTrendPoint[];
}

export function HeadcountTrendWidget({ trend = [] }: Props) {
  const currentHeadcount = trend.length > 0 ? trend[trend.length - 1].headcount : 15;
  const latestNewHires = trend.length > 0 ? trend[trend.length - 1].newHires : 1;
  const retentionRate = trend.length > 0 ? trend[trend.length - 1].retentionRate : 98.2;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 transition-all hover:border-slate-300">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100/80 shadow-xs">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600 block">
              Quy mô tổ chức
            </span>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              Biến động Nhân sự theo Tháng (Headcount Growth & Turnover)
            </h2>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 text-xs font-semibold">
          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
          <span>Tăng trưởng +36% năm</span>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70">
          <div className="flex items-center gap-1.5 text-slate-500 text-xs font-semibold">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Tổng nhân sự</span>
          </div>
          <div className="text-xl font-bold font-mono text-slate-900 mt-1">
            {currentHeadcount} <span className="text-xs font-normal text-slate-500">người</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/70">
          <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-semibold">
            <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tuyển mới tháng này</span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-900 mt-1">
            +{latestNewHires} <span className="text-xs font-normal text-emerald-700">thành viên</span>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-indigo-50/60 border border-indigo-200/70">
          <div className="flex items-center gap-1.5 text-indigo-800 text-xs font-semibold">
            <HeartHandshake className="w-3.5 h-3.5 text-indigo-600" />
            <span>Tỷ lệ giữ chân</span>
          </div>
          <div className="text-xl font-bold font-mono text-indigo-900 mt-1">
            {retentionRate}% <span className="text-xs font-normal text-indigo-600">retention</span>
          </div>
        </div>
      </div>

      {/* Composed Chart: Bar (Headcount) + Line (Trend) */}
      <div className="h-56 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="month"
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 600 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              domain={[0, 'auto']}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as HeadcountTrendPoint;
                  return (
                    <div className="bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-800 text-xs space-y-1">
                      <div className="font-bold text-slate-200">{data.month}</div>
                      <div className="text-blue-400 font-mono">
                        Tổng quy mô: <strong>{data.headcount}</strong> nhân viên
                      </div>
                      <div className="text-emerald-400 font-mono">
                        Tuyển mới: +{data.newHires}
                      </div>
                      <div className="text-amber-400 font-mono">
                        Tỷ lệ gắn kết: {data.retentionRate}%
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="headcount"
              fill="#2563eb"
              radius={[6, 6, 0, 0]}
              barSize={28}
              name="Tổng quy mô nhân sự"
            />
            <Line
              type="monotone"
              dataKey="headcount"
              stroke="#f59e0b"
              strokeWidth={3}
              dot={{ r: 4, fill: '#f59e0b', stroke: '#ffffff', strokeWidth: 2 }}
              activeDot={{ r: 6 }}
              name="Xu hướng tăng trưởng"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-blue-600 rounded-sm" />
            <span>Cột: Tổng số lượng nhân viên</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5 bg-amber-500 rounded-full" />
            <span>Đường: Xu hướng quy mô</span>
          </span>
        </div>
      </div>
    </div>
  );
}
