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
    <div className="p-5 bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b-2 border-slate-900">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-blue-600 text-white border border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
            <Users className="w-4 h-4" />
          </span>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700">
              Quy mô tổ chức
            </span>
            <h2 className="text-sm font-black uppercase tracking-tight text-slate-900">
              Biến động Nhân sự theo Tháng (Headcount Growth & Turnover)
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-400 text-xs font-bold font-mono">
          <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
          <span>Tăng trưởng +36% năm</span>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-3 gap-2.5 mb-4">
        <div className="p-3 bg-slate-50 border-2 border-slate-200">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-bold uppercase">
            <Users className="w-3.5 h-3.5 text-blue-600" />
            <span>Tổng nhân sự</span>
          </div>
          <div className="text-xl font-black font-mono text-slate-900 mt-1">
            {currentHeadcount} <span className="text-xs font-medium text-slate-400">người</span>
          </div>
        </div>

        <div className="p-3 bg-emerald-50 border-2 border-emerald-200">
          <div className="flex items-center gap-1.5 text-emerald-700 text-[11px] font-bold uppercase">
            <UserPlus className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tuyển mới tháng này</span>
          </div>
          <div className="text-xl font-black font-mono text-emerald-800 mt-1">
            +{latestNewHires} <span className="text-xs font-medium text-emerald-600">thành viên</span>
          </div>
        </div>

        <div className="p-3 bg-indigo-50 border-2 border-indigo-200">
          <div className="flex items-center gap-1.5 text-indigo-700 text-[11px] font-bold uppercase">
            <HeartHandshake className="w-3.5 h-3.5 text-indigo-600" />
            <span>Tỷ lệ giữ chân</span>
          </div>
          <div className="text-xl font-black font-mono text-indigo-900 mt-1">
            {retentionRate}% <span className="text-xs font-medium text-indigo-500">retention</span>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-56 w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fontWeight: 700, fill: '#475569' }}
              tickLine={{ stroke: '#0f172a' }}
              axisLine={{ stroke: '#0f172a', strokeWidth: 1.5 }}
            />
            <YAxis
              domain={[0, 20]}
              tick={{ fontSize: 11, fontWeight: 600, fill: '#475569' }}
              tickLine={{ stroke: '#0f172a' }}
              axisLine={{ stroke: '#0f172a', strokeWidth: 1.5 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload as HeadcountTrendPoint;
                  return (
                    <div className="bg-white border-2 border-slate-900 p-2.5 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] text-xs">
                      <div className="font-black uppercase text-slate-900 mb-1">
                        Tháng {data.month}
                      </div>
                      <div className="text-blue-700 font-bold">
                        Quy mô: <strong>{data.headcount} nhân sự</strong>
                      </div>
                      <div className="text-emerald-700 font-bold">
                        Tuyển mới: <strong>+{data.newHires} người</strong>
                      </div>
                      <div className="text-indigo-700 font-bold">
                        Tỷ lệ giữ chân: <strong>{data.retentionRate}%</strong>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="headcount" fill="#2563EB" barSize={28} radius={[2, 2, 0, 0]} />
            <Line
              type="monotone"
              dataKey="headcount"
              stroke="#F59E0B"
              strokeWidth={3}
              dot={{ fill: '#F59E0B', r: 4, stroke: '#0f172a', strokeWidth: 1.5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mt-2 pt-2 border-t border-slate-100">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 bg-blue-600 inline-block" /> Cột: Tổng số lượng nhân viên
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-1 bg-amber-500 inline-block" /> Đường: Xu hướng quy mô
        </span>
      </div>
    </div>
  );
}
