import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Lock,
  AlertCircle,
  FileText,
  Eye,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { dailyReportsApi } from '../api/daily-reports.api';
import type { DailyReportItem } from '../types/daily-report.types';
import { DailyReportModal } from './DailyReportModal';

export const MyDailyReportsList: React.FC = () => {
  const [reports, setReports] = useState<DailyReportItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [selectedReport, setSelectedReport] = useState<DailyReportItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchDate, setSearchDate] = useState('');

  useEffect(() => {
    loadReports();
  }, [searchDate]);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const res = await dailyReportsApi.getMyReports({
        date: searchDate || undefined,
        limit: 30,
      });
      setReports(res.items);
      setTotal(res.total);
    } catch (err) {
      console.error('Cannot load my daily reports:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* Top Filter and Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 font-medium focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>
          {searchDate && (
            <button
              onClick={() => setSearchDate('')}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium cursor-pointer"
            >
              Xóa lọc
            </button>
          )}
          <span className="text-xs text-slate-500 font-medium ml-2">
            Tổng cộng: <strong className="text-slate-800">{total}</strong> báo cáo
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadReports}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title="Tải lại danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Viết báo cáo hôm nay
          </button>
        </div>
      </div>

      {/* Reports List */}
      {isLoading ? (
        <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
          <span>Đang tải danh sách báo cáo...</span>
        </div>
      ) : reports.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200/80 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <FileText className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-700 mb-1">Chưa có báo cáo ngày nào</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
            Báo cáo ngày giúp bạn ghi nhận tiến độ công việc, chia sẻ kết quả với PM và tính chuyên cần.
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" /> Viết báo cáo ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {reports.map((r) => (
            <div
              key={r.id}
              className="bg-white p-4.5 rounded-2xl border border-slate-200/80 hover:border-blue-300 shadow-2xs hover:shadow-xs transition-all space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-slate-900 capitalize">
                      {formatDate(r.date)}
                    </span>
                    {r.isLocked ? (
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-[10px] font-semibold flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Đã khoá
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" /> Có thể sửa
                      </span>
                    )}
                    {r.lateSubmission && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-semibold flex items-center gap-1">
                        <AlertCircle className="w-2.5 h-2.5" /> Nộp trễ
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    Nộp lúc: {r.submittedAt ? new Date(r.submittedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : 'Chưa nộp'}
                  </span>
                </div>

                <button
                  onClick={() => setSelectedReport(r)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-blue-50 text-slate-600 hover:text-blue-600 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> Xem
                </button>
              </div>

              {/* Tasks pill row */}
              {r.tasksDone && r.tasksDone.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {r.tasksDone.slice(0, 3).map((task, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium truncate max-w-[200px]"
                    >
                      ✓ {task}
                    </span>
                  ))}
                  {r.tasksDone.length > 3 && (
                    <span className="px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-400 text-[11px]">
                      +{r.tasksDone.length - 3} khác
                    </span>
                  )}
                </div>
              )}

              {/* Content preview */}
              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed bg-slate-50/70 p-2.5 rounded-xl border border-slate-100 font-sans">
                {r.content}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Modal tạo báo cáo mới */}
      <DailyReportModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          loadReports();
        }}
      />

      {/* Drawer / Modal xem chi tiết */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold capitalize">
                  Báo cáo ngày {formatDate(selectedReport.date)}
                </h3>
                <span className="text-[11px] text-slate-400">
                  {selectedReport.user.name} ({selectedReport.user.role})
                </span>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
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
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 whitespace-pre-wrap">
                  {selectedReport.content}
                </div>
              </div>

              {selectedReport.blockers && (
                <div>
                  <h4 className="font-bold text-amber-800 mb-1.5 uppercase tracking-wider text-[11px]">
                    2. Khó khăn / Vướng mắc (Blockers)
                  </h4>
                  <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 whitespace-pre-wrap">
                    {selectedReport.blockers}
                  </div>
                </div>
              )}

              {selectedReport.plannedTomorrow && (
                <div>
                  <h4 className="font-bold text-indigo-800 mb-1.5 uppercase tracking-wider text-[11px]">
                    3. Kế hoạch ngày mai
                  </h4>
                  <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200 text-indigo-900 whitespace-pre-wrap">
                    {selectedReport.plannedTomorrow}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedReport(null)}
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
