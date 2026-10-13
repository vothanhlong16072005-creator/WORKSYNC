import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BarChart3, PieChart, TrendingUp, CheckCircle2, AlertTriangle, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart as RPieChart, Pie, Cell, Legend, CartesianGrid } from 'recharts';
import { calculateWorkHours } from '../utils/time-calculator';
import type { AttendanceRecord, AttendanceStatus } from '../types/attendance.types';

interface StatsSummaryViewProps {
  records: AttendanceRecord[];
  /** YYYY-MM start date for filtering (e.g., '2026-10') */
  monthStart?: string;
}

const STATUS_COLORS_HEX: Record<AttendanceStatus, string> = {
  ON_TIME: '#10b981',
  LATE: '#f59e0b',
  VERY_LATE: '#ef4444',
  WFH: '#3b82f6',
  BUSINESS_TRIP: '#8b5cf6',
  ABSENT_APPROVED: '#94a3b8',
  ABSENT_UNAPPROVED: '#f43f5e',
  EARLY_LEAVE_APPROVED: '#06b6d4',
  EARLY_LEAVE_UNAPPROVED: '#e11d48',
};

const STATUS_LABELS: Record<AttendanceStatus, { vi: string; en: string }> = {
  ON_TIME: { vi: 'Đúng giờ', en: 'On Time' },
  LATE: { vi: 'Đi muộn', en: 'Late' },
  VERY_LATE: { vi: 'Rất muộn', en: 'Very Late' },
  WFH: { vi: 'WFH', en: 'WFH' },
  BUSINESS_TRIP: { vi: 'Công tác', en: 'Business Trip' },
  ABSENT_APPROVED: { vi: 'Nghỉ phép', en: 'Approved Leave' },
  ABSENT_UNAPPROVED: { vi: 'Vắng mặt', en: 'Absent' },
  EARLY_LEAVE_APPROVED: { vi: 'Về sớm (OK)', en: 'Early Leave (OK)' },
  EARLY_LEAVE_UNAPPROVED: { vi: 'Về sớm (No permit)', en: 'Early Leave (No permit)' },
};

export function StatsSummaryView({ records, monthStart }: StatsSummaryViewProps) {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  // Filter by month
  const filteredRecords = useMemo(() => {
    if (!monthStart) return records;
    return records.filter((r) => r.date.startsWith(monthStart));
  }, [records, monthStart]);

  // Compute summary stats
  const summary = useMemo(() => {
    const counts: Record<string, number> = {};
    let totalWorkHours = 0;
    let totalRecords = 0;
    for (const r of filteredRecords) {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
      if (r.checkInTime && r.checkOutTime) {
        totalWorkHours += calculateWorkHours(r.checkInTime, r.checkOutTime);
        totalRecords++;
      }
    }
    const onTimeCount = counts.ON_TIME ?? 0;
    const presentCount = onTimeCount + (counts.LATE ?? 0) + (counts.VERY_LATE ?? 0) +
      (counts.WFH ?? 0) + (counts.BUSINESS_TRIP ?? 0) +
      (counts.EARLY_LEAVE_APPROVED ?? 0) + (counts.EARLY_LEAVE_UNAPPROVED ?? 0);
    const onTimeRate = presentCount > 0 ? (onTimeCount / presentCount) * 100 : 0;
    const avgHours = totalRecords > 0 ? totalWorkHours / totalRecords : 0;
    return {
      counts,
      onTimeCount,
      presentCount,
      onTimeRate,
      avgHours,
      totalRecords: filteredRecords.length,
    };
  }, [filteredRecords]);

  // Hours per day data (last 30 days)
  const hoursPerDay = useMemo(() => {
    return filteredRecords
      .filter((r) => r.checkInTime && r.checkOutTime)
      .slice(-30)
      .map((r) => {
        const hours = calculateWorkHours(r.checkInTime!, r.checkOutTime!);
        const dayLabel = r.date.slice(5); // MM-DD
        return { day: dayLabel, hours, status: r.status };
      });
  }, [filteredRecords]);

  // Status distribution for pie chart
  const statusDistribution = useMemo(() => {
    return Object.entries(summary.counts)
      .filter(([, count]) => count > 0)
      .map(([status, count]) => ({
        name: isVi ? STATUS_LABELS[status as AttendanceStatus].vi : STATUS_LABELS[status as AttendanceStatus].en,
        value: count,
        status: status as AttendanceStatus,
        color: STATUS_COLORS_HEX[status as AttendanceStatus],
      }));
  }, [summary.counts, isVi]);

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label={isVi ? 'Tổng ngày' : 'Total Days'}
          value={summary.totalRecords}
          icon={<BarChart3 className="w-4 h-4" />}
          color="blue"
        />
        <StatCard
          label={isVi ? 'Đúng giờ' : 'On Time'}
          value={`${summary.onTimeCount}`}
          subValue={summary.presentCount > 0 ? `${summary.onTimeRate.toFixed(1)}%` : undefined}
          icon={<CheckCircle2 className="w-4 h-4" />}
          color="emerald"
        />
        <StatCard
          label={isVi ? 'Đi muộn' : 'Late'}
          value={`${(summary.counts.LATE ?? 0) + (summary.counts.VERY_LATE ?? 0)}`}
          icon={<AlertTriangle className="w-4 h-4" />}
          color="amber"
        />
        <StatCard
          label={isVi ? 'TB giờ/ngày' : 'Avg Hours/Day'}
          value={`${summary.avgHours.toFixed(1)}h`}
          icon={<Clock className="w-4 h-4" />}
          color="indigo"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bar chart - Hours per day */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              {isVi ? 'Số giờ làm việc / ngày' : 'Working Hours per Day'}
            </h3>
          </div>
          <div className="h-64">
            {hoursPerDay.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-slate-400 font-semibold">
                {isVi ? 'Chưa có dữ liệu' : 'No data'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hoursPerDay} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 10, fontWeight: 600, fill: '#64748b' }} domain={[0, 12]} />
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    formatter={(value) => [`${Number(value).toFixed(2)}h`, isVi ? 'Giờ' : 'Hours']}
                  />
                  <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Donut - Status distribution */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <PieChart className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              {isVi ? 'Phân bố trạng thái' : 'Status Distribution'}
            </h3>
          </div>
          <div className="h-64">
            {statusDistribution.length === 0 ? (
              <div className="flex items-center justify-center h-full text-xs text-slate-400 font-semibold">
                {isVi ? 'Chưa có dữ liệu' : 'No data'}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <RPieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                  />
                  <Legend
                    iconType="circle"
                    wrapperStyle={{ fontSize: 10, fontWeight: 600, paddingTop: 8 }}
                  />
                </RPieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
  color: 'blue' | 'emerald' | 'amber' | 'indigo' | 'red' | 'slate';
}

function StatCard({ label, value, subValue, icon, color }: StatCardProps) {
  const colorMap: Record<StatCardProps['color'], string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200/60',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200/60',
    amber: 'bg-amber-50 text-amber-600 border-amber-200/60',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200/60',
    red: 'bg-red-50 text-red-600 border-red-200/60',
    slate: 'bg-slate-50 text-slate-600 border-slate-200/60',
  };
  return (
    <div className={`p-4 rounded-2xl border ${colorMap[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</div>
        {icon}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-black tabular-nums">{value}</span>
        {subValue && <span className="text-xs font-bold opacity-80">{subValue}</span>}
      </div>
    </div>
  );
}
