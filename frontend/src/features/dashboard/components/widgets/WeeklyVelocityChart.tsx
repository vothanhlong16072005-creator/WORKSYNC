import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import { Zap, TrendingUp } from 'lucide-react';
import type { WeeklyVelocityPoint } from '../../types/dashboard.types';

interface Props {
  data: WeeklyVelocityPoint[];
  completionRate: number;
  weeklyDone: number;
}

export function WeeklyVelocityChart({ data, completionRate, weeklyDone }: Props) {
  const { t } = useTranslation();

  return (
    <div className="p-5 bg-white border-2 border-slate-900 shadow-[3px_3px_0px_0px_rgba(15,23,42,1)]">
      <div className="flex items-center justify-between pb-3 mb-4 border-b-2 border-slate-900">
        <div className="flex items-center gap-2">
          <span className="p-1 text-white bg-amber-500 border border-slate-900">
            <Zap className="w-4 h-4" />
          </span>
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
            {t('dashboard.weekly_velocity', 'Năng suất 7 ngày qua')}
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 px-2 py-0.5 bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-black">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{completionRate}% {t('dashboard.completion_rate', 'hoàn thành')}</span>
          </div>
          <span className="text-xs font-bold text-slate-500">
            +{weeklyDone} {t('dashboard.done_this_week', 'việc tuần này')}
          </span>
        </div>
      </div>

      <div className="h-44 w-full p-2 bg-slate-50 border border-slate-200">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <XAxis dataKey="dayName" tick={{ fontSize: 11, fontWeight: 700, fill: '#0f172a' }} />
            <YAxis tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '2px solid #0f172a',
                borderRadius: '0px',
                boxShadow: '3px 3px 0px 0px rgba(15,23,42,1)',
                fontWeight: 700,
                fontSize: '12px',
              }}
              formatter={(val, name) => [
                val,
                name === 'doneCount'
                  ? t('dashboard.chart_done', 'Hoàn thành')
                  : t('dashboard.chart_created', 'Mới tạo'),
              ]}
              labelFormatter={(label) => `${t('dashboard.day', 'Ngày')}: ${label}`}
            />
            <Bar dataKey="doneCount" fill="#10b981" radius={[0, 0, 0, 0]} />
            <Bar dataKey="createdCount" fill="#cbd5e1" radius={[0, 0, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-between mt-3 text-[11px] text-slate-500 font-bold">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-emerald-500 border border-slate-900 inline-block" />
            {t('dashboard.chart_done', 'Đã hoàn thành')}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 bg-slate-300 border border-slate-900 inline-block" />
            {t('dashboard.chart_created', 'Mới giao/tạo')}
          </span>
        </div>
        <span className="italic">{t('dashboard.updated_realtime', 'Cập nhật theo thời gian thực')}</span>
      </div>
    </div>
  );
}
