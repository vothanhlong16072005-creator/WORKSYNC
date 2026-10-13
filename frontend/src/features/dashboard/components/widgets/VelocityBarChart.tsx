import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useTranslation } from 'react-i18next';
import type { WeeklyVelocityPoint } from '../../types/dashboard.types';

interface Props {
  velocity: WeeklyVelocityPoint[];
}

export function VelocityBarChart({ velocity }: Props) {
  const { t } = useTranslation();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 flex flex-col justify-between">
      <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900">7-day Velocity</h3>
          <p className="text-[11px] font-medium text-slate-400">
            {t('dashboard.velocity_subtext', 'Completed vs Assigned rate')}
          </p>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-bold">
          <span className="flex items-center gap-1.5 text-blue-600">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" />
            Cobalt (Done)
          </span>
          <span className="flex items-center gap-1.5 text-amber-700">
            <span className="w-2.5 h-2.5 rounded-sm bg-amber-600 inline-block" />
            Sand (New)
          </span>
        </div>
      </div>

      <div className="h-44 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={velocity} margin={{ top: 8, right: 0, left: -25, bottom: 0 }}>
            <XAxis dataKey="dayName" tick={{ fontSize: 11, fontWeight: 600, fill: '#64748b' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                fontSize: '12px',
                fontWeight: 600,
              }}
              formatter={(val, name) => [
                val,
                name === 'doneCount' ? t('dashboard.chart_done', 'Completed') : t('dashboard.chart_created', 'Assigned'),
              ]}
            />
            <Bar dataKey="doneCount" fill="#2563EB" radius={[4, 4, 0, 0]} />
            <Bar dataKey="createdCount" fill="#C95D43" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
        <span>Mon - Sun weekly cadence</span>
        <span className="text-emerald-600 font-bold">● High momentum</span>
      </div>
    </div>
  );
}
