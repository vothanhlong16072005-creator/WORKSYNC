import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  XCircle,
  Home,
  Calendar,
  Sparkles,
  RotateCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAttendanceStore } from '../stores/attendance.store';
import { attendanceApi } from '../api/attendance.api';
import { getErrorMessage } from '../utils/error-handler';
import type { WfhRequest, LeaveRequest } from '../types/attendance.types';

interface ApprovalQueueViewProps {
  pendingWfh: WfhRequest[];
  pendingLeaves: LeaveRequest[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function ApprovalQueueView({
  pendingWfh,
  pendingLeaves,
  isLoading,
  onRefresh,
}: ApprovalQueueViewProps) {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  const { approveWfh, rejectWfh, approveLeave, rejectLeave } = useAttendanceStore();

  const [activeTab, setActiveTab] = useState<'wfh' | 'leave'>('wfh');
  const [rejectModalItem, setRejectModalItem] = useState<{ id: string; type: 'wfh' | 'leave'; name: string } | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAutoApproving, setIsAutoApproving] = useState(false);

  const handleApproveWfh = async (id: string, name: string) => {
    try {
      await approveWfh(id);
      toast.success(isVi ? `Đã phê duyệt đơn WFH của ${name}` : `Approved WFH for ${name}`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Lỗi duyệt đơn WFH'));
    }
  };

  const handleApproveLeave = async (id: string, name: string) => {
    try {
      await approveLeave(id);
      toast.success(isVi ? `Đã phê duyệt đơn nghỉ phép của ${name}` : `Approved leave for ${name}`);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Lỗi duyệt đơn nghỉ phép'));
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalItem) return;
    setIsProcessing(true);
    try {
      if (rejectModalItem.type === 'wfh') {
        await rejectWfh(rejectModalItem.id, { rejectionNote });
        toast.info(isVi ? `Đã từ chối đơn WFH của ${rejectModalItem.name}` : `Rejected WFH for ${rejectModalItem.name}`);
      } else {
        await rejectLeave(rejectModalItem.id);
        toast.info(isVi ? `Đã từ chối đơn nghỉ của ${rejectModalItem.name}` : `Rejected leave for ${rejectModalItem.name}`);
      }
      setRejectModalItem(null);
      setRejectionNote('');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Lỗi từ chối đơn'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTriggerAutoApprove = async () => {
    setIsAutoApproving(true);
    try {
      const res = await attendanceApi.triggerAutoApprove();
      if (res.approved > 0) {
        toast.success(isVi ? `Đã tự động duyệt ${res.approved} đơn WFH!` : `Auto-approved ${res.approved} WFH requests!`);
        onRefresh();
      } else {
        toast.info(isVi ? 'Không có đơn WFH nào đủ điều kiện tự động duyệt lúc này' : 'No eligible WFH requests to auto-approve');
      }
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Lỗi tự động duyệt đơn'));
    } finally {
      setIsAutoApproving(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(isVi ? 'vi-VN' : 'en-US', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Top Header & Trigger Auto-approve */}
      <div className="p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="inline-flex p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('wfh')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'wfh'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Home className="w-4 h-4" />
            <span>{isVi ? 'Duyệt WFH' : 'WFH Queue'}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black">
              {pendingWfh.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('leave')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === 'leave'
                ? 'bg-white text-amber-600 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>{isVi ? 'Duyệt Nghỉ Phép' : 'Leave Queue'}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black">
              {pendingLeaves.length}
            </span>
          </button>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleTriggerAutoApprove}
            disabled={isAutoApproving}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>{isAutoApproving ? (isVi ? 'Đang duyệt...' : 'Processing...') : (isVi ? 'Auto-approve WFH' : 'Auto-approve WFH')}</span>
          </button>

          <button
            onClick={onRefresh}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title={isVi ? 'Làm mới' : 'Refresh'}
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content List */}
      <div className="p-5">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400">
            <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin inline-block mr-2" />
            <span className="text-xs font-semibold">{isVi ? 'Đang tải hàng đợi phê duyệt...' : 'Loading queue...'}</span>
          </div>
        ) : activeTab === 'wfh' ? (
          pendingWfh.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-semibold text-slate-700">{isVi ? 'Hàng đợi sạch sẽ!' : 'All clear!'}</p>
              <p className="text-xs text-slate-400 mt-0.5">{isVi ? 'Không có đơn WFH nào đang chờ phê duyệt' : 'No pending WFH requests in queue'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingWfh.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm flex-shrink-0">
                      {item.user?.avatar ? (
                        <img src={item.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        item.user?.name?.charAt(0) || 'U'
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">{item.user?.name || 'Nhân viên'}</h4>
                        <span className="text-xs text-slate-400 font-medium">({item.user?.email})</span>
                        {item.user?.department?.name && (
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold text-[10px]">
                            {item.user.department.name}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-700 font-semibold">
                        <span className="text-blue-600">{formatDate(item.date)}</span>
                        <span className="text-slate-400">•</span>
                        <span>{item.expectedStart} - {item.expectedEnd}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 font-medium">
                        <strong className="text-slate-700">{isVi ? 'Lý do' : 'Reason'}:</strong> {item.reason}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => handleApproveWfh(item.id, item.user?.name || '')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isVi ? 'Duyệt' : 'Approve'}</span>
                    </button>
                    <button
                      onClick={() => setRejectModalItem({ id: item.id, type: 'wfh', name: item.user?.name || '' })}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-all"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>{isVi ? 'Từ chối' : 'Reject'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : pendingLeaves.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="font-semibold text-slate-700">{isVi ? 'Hàng đợi sạch sẽ!' : 'All clear!'}</p>
            <p className="text-xs text-slate-400 mt-0.5">{isVi ? 'Không có đơn xin nghỉ phép nào đang chờ duyệt' : 'No pending leave requests in queue'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendingLeaves.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-sm flex-shrink-0">
                    {item.user?.avatar ? (
                      <img src={item.user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      item.user?.name?.charAt(0) || 'U'
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{item.user?.name || 'Nhân viên'}</h4>
                      <span className="text-xs text-slate-400 font-medium">({item.user?.email})</span>
                      <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-bold text-[10px] border border-amber-200">
                        {item.leaveType}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-slate-700 font-semibold">
                      <span className="text-amber-600">{formatDate(item.startDate)} → {formatDate(item.endDate)}</span>
                      <span className="text-slate-400">•</span>
                      <span>{item.dayCount} {isVi ? 'ngày' : 'days'}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 font-medium">
                      <strong className="text-slate-700">{isVi ? 'Lý do' : 'Reason'}:</strong> {item.reason}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-center">
                  <button
                    onClick={() => handleApproveLeave(item.id, item.user?.name || '')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isVi ? 'Duyệt' : 'Approve'}</span>
                  </button>
                  <button
                    onClick={() => setRejectModalItem({ id: item.id, type: 'leave', name: item.user?.name || '' })}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs transition-all"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{isVi ? 'Từ chối' : 'Reject'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rejection Note Dialog */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xl max-w-sm w-full p-5">
            <h4 className="text-sm font-bold text-slate-900 mb-1">
              {isVi ? `Từ chối yêu cầu của ${rejectModalItem.name}` : `Reject request for ${rejectModalItem.name}`}
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              {isVi ? 'Nhập phản hồi hoặc lý do từ chối để nhân viên nắm thông tin' : 'Provide feedback or reasons for rejection'}
            </p>
            <textarea
              rows={3}
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              placeholder={isVi ? 'Ví dụ: Lịch dự án đang gấp, cần trực tiếp tại văn phòng...' : 'Reason for rejection...'}
              className="w-full p-2.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-500/20 resize-none font-medium text-slate-900 mb-4"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setRejectModalItem(null)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
              >
                {isVi ? 'Hủy' : 'Cancel'}
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={isProcessing}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-sm"
              >
                {isProcessing ? (isVi ? 'Đang xử lý...' : 'Processing...') : (isVi ? 'Xác nhận từ chối' : 'Confirm Rejection')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
