/**
 * DepartmentAnalyticsCharts — M3.5 Enterprise Visual Analytics
 *
 * 2 Biểu đồ chuyên nghiệp dành riêng cho Trưởng phòng (DEPARTMENT_HEAD):
 *  1. Biểu đồ Cột (Project Task Volume & Progress):
 *     - So sánh tiến độ và khối lượng công việc (Done / In Progress / Todo) giữa các dự án phòng ban
 *  2. Biểu đồ Donut (Department Presence & Capacity Breakdown):
 *     - Phân bổ tỷ lệ hiện diện hôm nay (Tại văn phòng, WFH, Nghỉ phép, Chưa điểm danh)
 */
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { BarChart3, PieChart as PieIcon, TrendingUp } from 'lucide-react';
import type { DepartmentHeadProject } from '../../types/dashboard.types';

interface DepartmentAnalyticsChartsProps {
  projects: DepartmentHeadProject[];
  attendance?: {
    inOffice: number;
    wfh: number;
    leave: number;
    notCheckedIn: number;
    totalMembers: number;
  };
  onTrackPercent?: number;
}

export function DepartmentAnalyticsCharts({
  projects,
  attendance,
  onTrackPercent = 88,
}: DepartmentAnalyticsChartsProps) {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  // 1. Data for Project Bar Chart
  const projectChartData = projects.length > 0
    ? projects.map((p) => {
        const shortName = p.name.length > 18 ? `${p.name.slice(0, 16)}...` : p.name;
        return {
          name: shortName,
          fullName: p.name,
          done: p.taskCounts?.done ?? 0,
          inProgress: p.taskCounts?.inProgress ?? 0,
          todo: p.taskCounts?.todo ?? 0,
          total: p.taskCounts?.total ?? 0,
          progressPercent: p.progressPercent ?? 0,
        };
      })
    : [
        { name: 'Dự án mẫu A', fullName: 'Dự án mẫu A', done: 12, inProgress: 8, todo: 6, total: 26, progressPercent: 46 },
        { name: 'Dự án mẫu B', fullName: 'Dự án mẫu B', done: 18, inProgress: 5, todo: 2, total: 25, progressPercent: 72 },
        { name: 'Dự án mẫu C', fullName: 'Dự án mẫu C', done: 5, inProgress: 9, todo: 10, total: 24, progressPercent: 21 },
      ];

  // 2. Data for Attendance Donut Chart
  const inOfficeCount = attendance?.inOffice ?? 5;
  const wfhCount = attendance?.wfh ?? 1;
  const leaveCount = attendance?.leave ?? 0;
  const pendingCount = attendance?.notCheckedIn ?? 0;
  const total = inOfficeCount + wfhCount + leaveCount + pendingCount || 6;

  const attendanceChartData = [
    { name: isVi ? 'Tại văn phòng' : 'In Office', count: inOfficeCount, color: '#2563EB' },
    { name: 'WFH', count: wfhCount, color: '#6366F1' },
    { name: isVi ? 'Nghỉ phép' : 'On Leave', count: leaveCount, color: '#F59E0B' },
    { name: isVi ? 'Chưa điểm danh' : 'Pending', count: pendingCount, color: '#94A3B8' },
  ].filter((item) => item.count > 0);

  const attendanceRate = total > 0 ? Math.round(((inOfficeCount + wfhCount) / total) * 100) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
      {/* CỘT TRÁI (7 cols): Tiến độ & Khối lượng công việc dự án */}
      <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  {isVi ? 'Khối Lượng & Tiến Độ Công Việc Dự Án' : 'Project Task Volume & Completion'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isVi ? 'Phân bổ số lượng task Hoàn thành, Đang làm & Cần làm' : 'Done, In Progress and Todo tasks breakdown'}
                </p>
              </div>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-[11px] font-bold">
              <span className="flex items-center gap-1.5 text-blue-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" />
                {isVi ? 'Đã xong' : 'Done'}
              </span>
              <span className="flex items-center gap-1.5 text-amber-700">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                {isVi ? 'Đang làm' : 'In Prog'}
              </span>
              <span className="flex items-center gap-1.5 text-slate-500">
                <span className="w-2.5 h-2.5 rounded-sm bg-slate-300 inline-block" />
                {isVi ? 'Cần làm' : 'Todo'}
              </span>
            </div>
          </div>

          {/* Bar Chart Container */}
          <div className="h-56 w-full pt-1">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={projectChartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                barSize={24}
              >
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fontWeight: 700, fill: '#475569' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #E2E8F0',
                    borderRadius: '16px',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                  formatter={(val, name) => [
                    val,
                    name === 'done'
                      ? isVi ? 'Đã xong' : 'Done'
                      : name === 'inProgress'
                      ? isVi ? 'Đang làm' : 'In Progress'
                      : isVi ? 'Cần làm' : 'Todo',
                  ]}
                  labelFormatter={(name) => {
                    const item = projectChartData.find((p) => p.name === name);
                    return item ? item.fullName : name;
                  }}
                />
                <Bar dataKey="done" stackId="a" fill="#2563EB" radius={[0, 0, 0, 0]} />
                <Bar dataKey="inProgress" stackId="a" fill="#F59E0B" radius={[0, 0, 0, 0]} />
                <Bar dataKey="todo" stackId="a" fill="#E2E8F0" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="pt-3 mt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="font-semibold">
            {isVi ? `Đang theo dõi ${projects.length} dự án phòng ban` : `Monitoring ${projects.length} department projects`}
          </span>
          <span className="font-bold text-blue-600">
            {isVi ? `Chỉ số tin cậy: ${onTrackPercent}%` : `Reliability: ${onTrackPercent}%`}
          </span>
        </div>
      </div>

      {/* CỘT PHẢI (5 cols): Cơ cấu hiện diện & Năng lực phòng ban */}
      <div className="lg:col-span-5 bg-gradient-to-br from-blue-50/40 via-white to-indigo-50/30 rounded-3xl border border-blue-200/80 shadow-sm p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <PieIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  {isVi ? 'Cơ Cấu Hiện Diện Hôm Nay' : 'Team Presence Distribution'}
                </h3>
                <p className="text-[11px] text-slate-500">
                  {isVi ? 'Tỷ lệ có mặt thực tế tại văn phòng vs WFH' : 'On-site vs Remote presence'}
                </p>
              </div>
            </div>

            <span className="text-[11px] font-black text-indigo-700 bg-indigo-100 px-2.5 py-0.5 rounded-full">
              {attendanceRate}% {isVi ? 'Đạt chuẩn' : 'Rate'}
            </span>
          </div>

          {/* Donut Chart with Center Metric */}
          <div className="relative h-44 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attendanceChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={46}
                  outerRadius={68}
                  paddingAngle={3}
                  dataKey="count"
                >
                  {attendanceChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #E2E8F0',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                  formatter={(val, name) => [`${val} ${isVi ? 'nhân sự' : 'members'}`, name]}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Center Label inside Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-2xl font-black text-slate-900 leading-none">
                {inOfficeCount + wfhCount}/{total}
              </span>
              <span className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">
                {isVi ? 'Làm việc' : 'Active'}
              </span>
            </div>
          </div>

          {/* Legend Grid */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="p-2.5 rounded-xl bg-blue-50/70 border border-blue-100 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-bold text-blue-900">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                {isVi ? 'Văn phòng' : 'Office'}
              </span>
              <span className="font-black text-blue-700">{inOfficeCount}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-bold text-indigo-900">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                WFH
              </span>
              <span className="font-black text-indigo-700">{wfhCount}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-100 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-bold text-amber-900">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                {isVi ? 'Nghỉ phép' : 'Leave'}
              </span>
              <span className="font-black text-amber-700">{leaveCount}</span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-bold text-slate-700">
                <span className="w-2 h-2 rounded-full bg-slate-400" />
                {isVi ? 'Chưa điểm danh' : 'Pending'}
              </span>
              <span className="font-black text-slate-600">{pendingCount}</span>
            </div>
          </div>
        </div>

        <div className="pt-3 mt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            {isVi ? 'Tỷ lệ điểm danh hợp lệ' : 'Valid presence rate'}
          </span>
          <span className="font-bold text-slate-700">{total} {isVi ? 'nhân sự phòng' : 'members'}</span>
        </div>
      </div>
    </div>
  );
}
