import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Clock,
  Sparkles,
  RefreshCw,
  Send,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import { dailyReportsApi } from '../api/daily-reports.api';
import type { DraftPayload } from '../types/daily-report.types';

interface DailyReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  targetDate?: string;
  targetUserId?: string;
}

export const DailyReportModal: React.FC<DailyReportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetDate,
  targetUserId,
}) => {
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [draft, setDraft] = useState<DraftPayload | null>(null);
  const [content, setContent] = useState('');
  const [blockers, setBlockers] = useState('');
  const [plannedTomorrow, setPlannedTomorrow] = useState('');
  const [tasksDone, setTasksDone] = useState<string[]>([]);
  const [showAutoData, setShowAutoData] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadDraft();
    } else {
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen, targetDate]);

  const loadDraft = async () => {
    setIsLoadingDraft(true);
    setErrorMsg(null);
    try {
      const data = await dailyReportsApi.getTodayDraft(targetDate);
      setDraft(data);
      setContent(data.suggestedContent);
      setBlockers(data.suggestedBlockers);
      setPlannedTomorrow(data.suggestedPlannedTomorrow);
      const allTaskTitles = [
        ...data.completedTasks.map((t) => t.title),
        ...data.completedQuickTasks.map((q) => q.title),
      ];
      setTasksDone(allTaskTitles);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Không thể tải dữ liệu tự động cho báo cáo');
    } finally {
      setIsLoadingDraft(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) {
      setErrorMsg('Vui lòng nhập nội dung báo cáo ngày');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const dateStr = draft?.date || targetDate || new Date().toISOString().split('T')[0];
      await dailyReportsApi.submitReport({
        date: dateStr,
        content: content.trim(),
        tasksDone,
        blockers: blockers.trim() || null,
        plannedTomorrow: plannedTomorrow.trim() || null,
        aiDrafted: true,
        targetUserId,
      });

      setSuccessMsg('Báo cáo ngày đã được nộp thành công!');
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1200);
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Có lỗi xảy ra khi nộp báo cáo');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header Ribbon */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-white border border-white/20 shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold">Báo Cáo Cuối Ngày (Daily Report)</h2>
                <span className="px-2 py-0.5 rounded-full bg-white/20 text-[11px] font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" /> Tự động tổng hợp
                </span>
              </div>
              <p className="text-xs text-blue-100 mt-0.5">
                Ngày {draft?.date || targetDate || 'hôm nay'} — Ghi nhận kết quả lao động & chia sẻ tiến độ
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Attendance Summary Strip */}
        {draft?.attendance && (
          <div className="px-6 py-2.5 bg-blue-50/70 border-b border-blue-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-700">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-medium text-slate-800">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Vào: {draft.attendance.checkInTime ? new Date(draft.attendance.checkInTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </span>
              <span className="flex items-center gap-1.5 font-medium text-slate-800">
                Ra: {draft.attendance.checkOutTime ? new Date(draft.attendance.checkOutTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
              </span>
              {draft.attendance.workHours !== null && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                  Tổng {draft.attendance.workHours}h làm việc
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={loadDraft}
              disabled={isLoadingDraft}
              className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 transition-colors cursor-pointer text-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDraft ? 'animate-spin' : ''}`} />
              Nạp lại dữ liệu
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="font-semibold">{successMsg}</span>
            </div>
          )}

          {/* Collapsible 4-Source Badge Row */}
          {draft && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-600" /> Nguồn dữ liệu đã tích hợp ({draft.completedTasks.length + draft.completedQuickTasks.length} task, {draft.attendedMeetings.length} họp)
                </span>
                <button
                  type="button"
                  onClick={() => setShowAutoData(!showAutoData)}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  {showAutoData ? 'Thu gọn chi tiết' : 'Xem chi tiết'}
                </button>
              </div>

              {showAutoData && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
                  <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-semibold block">TASK HOÀN THÀNH</span>
                    <span className="font-bold text-slate-800 text-sm">{draft.completedTasks.length + draft.completedQuickTasks.length} việc</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-semibold block">WORK LOGS</span>
                    <span className="font-bold text-slate-800 text-sm">{(draft.totalWorkMinutes / 60).toFixed(1)} giờ</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-semibold block">CUỘC HỌP</span>
                    <span className="font-bold text-slate-800 text-sm">{draft.attendedMeetings.length} buổi</span>
                  </div>
                  <div className="p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                    <span className="text-[10px] text-slate-400 font-semibold block">TASK TỒN ĐỌNG</span>
                    <span className={`font-bold text-sm ${draft.overdueTasks.length > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
                      {draft.overdueTasks.length} task
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          <form id="daily-report-form" onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Content */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center justify-between">
                <span>1. Nội dung công việc hoàn thành trong ngày *</span>
                <span className="text-[11px] font-normal text-slate-400">Hỗ trợ định dạng văn bản / Markdown</span>
              </label>
              <textarea
                rows={7}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Nhập chi tiết các đầu việc đã thực hiện..."
                required
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs font-sans text-slate-800 outline-none leading-relaxed resize-y"
              />
            </div>

            {/* 2. Blockers */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                <span>2. Khó khăn / Vướng mắc cần hỗ trợ (Blockers)</span>
              </label>
              <textarea
                rows={3}
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                placeholder="Nêu vướng mắc với dự án, thiết bị, quy trình hoặc ghi 'Không có'..."
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs font-sans text-slate-800 outline-none leading-relaxed resize-y"
              />
            </div>

            {/* 3. Planned Tomorrow */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>3. Kế hoạch công việc ngày mai</span>
              </label>
              <textarea
                rows={3}
                value={plannedTomorrow}
                onChange={(e) => setPlannedTomorrow(e.target.value)}
                placeholder="Các đầu việc dự kiến sẽ tiếp tục triển khai trong ngày làm việc tiếp theo..."
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-xs font-sans text-slate-800 outline-none leading-relaxed resize-y"
              />
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-slate-400 italic">
            * Báo cáo sẽ tự động khoá sau 00:00 đêm nay để đối soát công việc.
          </p>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              form="daily-report-form"
              disabled={isSubmitting || isLoadingDraft}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Đang nộp...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Nộp Báo Cáo
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
