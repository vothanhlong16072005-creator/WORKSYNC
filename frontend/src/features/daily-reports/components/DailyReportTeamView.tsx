import React, { useState, useEffect } from 'react';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Users,
  Search,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { dailyReportsApi } from '../api/daily-reports.api';
import type { TeamWeeklyOverviewResponse, DailyReportItem } from '../types/daily-report.types';
import { UserAvatar } from '@/components/ui/UserAvatar';

export const DailyReportTeamView: React.FC = () => {
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    return monday.toISOString().split('T')[0];
  });

  const [data, setData] = useState<TeamWeeklyOverviewResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchMember, setSearchMember] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [viewReport, setViewReport] = useState<DailyReportItem | null>(null);

  useEffect(() => {
    loadWeeklyOverview();
  }, [currentWeekStart]);

  const loadWeeklyOverview = async () => {
    setIsLoading(true);
    try {
      const res = await dailyReportsApi.getTeamWeeklyOverview(currentWeekStart);
      setData(res);
    } catch (err) {
      console.error('Failed to load team weekly overview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const shiftWeek = (offsetDays: number) => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + offsetDays);
    setCurrentWeekStart(d.toISOString().split('T')[0]);
  };

  const handleCellClick = async (reportId?: string) => {
    if (!reportId) return;
    setSelectedReportId(reportId);
    try {
      const res = await dailyReportsApi.getReportById(reportId);
      setViewReport(res);
    } catch (err) {
      console.error('Cannot load report detail:', err);
    }
  };

  const dayLabels = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'CN'];

  // Lọc theo tìm kiếm tên thành viên
  const filteredSummaries = data?.summaries.filter(
    (m) =>
      m.userName.toLowerCase().includes(searchMember.toLowerCase()) ||
      m.userEmail.toLowerCase().includes(searchMember.toLowerCase()) ||
      (m.departmentName && m.departmentName.toLowerCase().includes(searchMember.toLowerCase())),
  );

  // Tính toán KPI tuần
  const totalSubmissions = data?.summaries.reduce((sum, m) => sum + m.submittedCount, 0) || 0;
  const maxPossible = (data?.totalMembers || 0) * 5; // 5 ngày làm việc tiêu chuẩn
  const completionRate = maxPossible > 0 ? Math.min(100, Math.round((totalSubmissions / maxPossible) * 100)) : 0;

  return (
    <div className="space-y-4">
      {/* KPI & Controls Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">TỔNG NHÂN SỰ</span>
            <span className="text-xl font-black text-slate-900">{data?.totalMembers || 0} người</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">BÁO CÁO ĐÃ NỘP TUẦN NÀY</span>
            <span className="text-xl font-black text-emerald-600">{totalSubmissions} lượt</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">TỶ LỆ CHUYÊN CẦN BÁO CÁO</span>
            <span className="text-xl font-black text-indigo-600">{completionRate}%</span>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <FileText className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Week Navigator and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftWeek(-7)}
            className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Tuần trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-800">
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>
              Tuần {data?.weekStart} → {data?.weekEnd}
            </span>
          </div>

          <button
            onClick={() => shiftWeek(7)}
            className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Tuần sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 flex-1 max-w-xs">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên thành viên..."
              value={searchMember}
              onChange={(e) => setSearchMember(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>
          <button
            onClick={loadWeeklyOverview}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Tải lại"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Interactive Weekly Matrix Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <th className="py-3 px-4 min-w-[200px]">Thành viên</th>
                {dayLabels.map((lbl, idx) => (
                  <th key={idx} className="py-3 px-2 text-center min-w-[70px]">
                    {lbl}
                  </th>
                ))}
                <th className="py-3 px-3 text-center min-w-[80px]">Đã nộp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-500" />
                    Đang tải dữ liệu tổng hợp tuần...
                  </td>
                </tr>
              ) : !filteredSummaries || filteredSummaries.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    Không tìm thấy thành viên nào
                  </td>
                </tr>
              ) : (
                filteredSummaries.map((m) => (
                  <tr key={m.userId} className="hover:bg-slate-50/60 transition-colors">
                    {/* Member Profile */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <UserAvatar
                          user={{
                            id: m.userId,
                            name: m.userName,
                            avatar: m.userAvatar,
                            role: 'EMPLOYEE',
                          }}
                          size="sm"
                        />
                        <div className="min-w-0">
                          <span className="font-bold text-slate-800 truncate block text-xs">
                            {m.userName}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate block">
                            {m.departmentName || m.userEmail}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* 7 Days Matrix Cells */}
                    {m.days.map((day, idx) => (
                      <td key={idx} className="py-2.5 px-2 text-center">
                        {day.isSubmitted ? (
                          <button
                            onClick={() => handleCellClick(day.reportId)}
                            className="w-8 h-8 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 inline-flex items-center justify-center transition-transform hover:scale-110 cursor-pointer shadow-2xs"
                            title={`Đã nộp ngày ${day.date}. Bấm để xem chi tiết`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        ) : day.isLocked ? (
                          <span
                            className="w-8 h-8 rounded-xl bg-rose-50 text-rose-500 border border-rose-100 inline-flex items-center justify-center"
                            title={`Chưa nộp ngày ${day.date} (Đã quá hạn khoá)`}
                          >
                            <XCircle className="w-4 h-4" />
                          </span>
                        ) : (
                          <span
                            className="w-8 h-8 rounded-xl bg-slate-50 text-slate-300 inline-flex items-center justify-center"
                            title={`Chưa có báo cáo ngày ${day.date}`}
                          >
                            —
                          </span>
                        )}
                      </td>
                    ))}

                    {/* Summary count */}
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                          m.submittedCount >= 5
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.submittedCount >= 3
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {m.submittedCount}/5 ngày
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Drawer xem chi tiết báo cáo khi bấm vào ô ngày */}
      {selectedReportId && viewReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in duration-150">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">
                  Báo cáo ngày {viewReport.date.split('T')[0]}
                </h3>
                <span className="text-[11px] text-blue-100">
                  Nhân sự: <strong>{viewReport.user.name}</strong> ({viewReport.user.role})
                </span>
              </div>
              <button
                onClick={() => {
                  setSelectedReportId(null);
                  setViewReport(null);
                }}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed flex-1 font-sans">
              <div>
                <h4 className="font-bold text-slate-800 mb-1.5 uppercase tracking-wider text-[11px]">
                  1. Công việc đã thực hiện
                </h4>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 whitespace-pre-wrap">
                  {viewReport.content}
                </div>
              </div>

              {viewReport.blockers && (
                <div>
                  <h4 className="font-bold text-amber-800 mb-1.5 uppercase tracking-wider text-[11px]">
                    2. Khó khăn / Vướng mắc (Blockers)
                  </h4>
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 whitespace-pre-wrap">
                    {viewReport.blockers}
                  </div>
                </div>
              )}

              {viewReport.plannedTomorrow && (
                <div>
                  <h4 className="font-bold text-indigo-800 mb-1.5 uppercase tracking-wider text-[11px]">
                    3. Kế hoạch ngày mai
                  </h4>
                  <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-indigo-900 whitespace-pre-wrap">
                    {viewReport.plannedTomorrow}
                  </div>
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                <span>Nộp lúc: {viewReport.submittedAt ? new Date(viewReport.submittedAt).toLocaleString('vi-VN') : '---'}</span>
                <span>{viewReport.isLocked ? '🔒 Đã khoá' : '🔓 Có thể sửa'}</span>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => {
                  setSelectedReportId(null);
                  setViewReport(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 font-semibold text-xs text-slate-700 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
