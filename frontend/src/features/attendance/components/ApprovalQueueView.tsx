import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  XCircle,
  Home,
  Calendar,
  Sparkles,
  RotateCw,
  RotateCcw,
  Clock,
  Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAttendanceStore } from '../stores/attendance.store';
import { attendanceApi } from '../api/attendance.api';
import { getErrorMessage } from '../utils/error-handler';
import type { WfhRequest, LeaveRequest } from '../types/attendance.types';
import type { EarlyLeaveRequest, OvertimeRequest } from '../types/attendance-gd2.types';

interface ExtendedEarlyLeave extends EarlyLeaveRequest {
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  };
}

interface ExtendedOvertime extends OvertimeRequest {
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  };
}

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

  const [activeTab, setActiveTab] = useState<'wfh' | 'leave' | 'early' | 'ot'>('wfh');
  const [statusFilter, setStatusFilter] = useState<'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'>('PENDING');
  
  const [historyWfh, setHistoryWfh] = useState<WfhRequest[]>([]);
  const [historyLeaves, setHistoryLeaves] = useState<LeaveRequest[]>([]);
  const [pendingEarly, setPendingEarly] = useState<ExtendedEarlyLeave[]>([]);
  const [pendingOT, setPendingOT] = useState<ExtendedOvertime[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  const [rejectModalItem, setRejectModalItem] = useState<{
    id: string;
    type: 'wfh' | 'leave' | 'early' | 'ot';
    name: string;
  } | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAutoApproving, setIsAutoApproving] = useState(false);

  const fetchEarlyAndOT = useCallback(async () => {
    try {
      const [earlyRes, otRes] = await Promise.all([
        attendanceApi.getPendingEarlyLeave(),
        attendanceApi.getPendingOvertime(),
      ]);
      setPendingEarly((earlyRes as unknown as ExtendedEarlyLeave[]) || []);
      setPendingOT((otRes as unknown as ExtendedOvertime[]) || []);
    } catch {
      // ignore
    }
  }, []);

  const fetchStatusHistory = useCallback(async () => {
    setIsHistoryLoading(true);
    try {
      if (statusFilter !== 'PENDING') {
        const [wfhRes, leaveRes] = await Promise.all([
          attendanceApi.getPendingWfhRequests(statusFilter),
          attendanceApi.getPendingLeaveRequests(statusFilter),
        ]);
        setHistoryWfh(wfhRes || []);
        setHistoryLeaves(leaveRes || []);
      }
      await fetchEarlyAndOT();
    } catch {
      toast.error(isVi ? 'Không thể tải danh sách đơn theo trạng thái' : 'Failed to load requests by status');
    } finally {
      setIsHistoryLoading(false);
    }
  }, [statusFilter, isVi, fetchEarlyAndOT]);

  useEffect(() => {
    fetchStatusHistory();
  }, [fetchStatusHistory]);

  const handleApproveWfh = async (id: string, name: string) => {
    try {
      await approveWfh(id);
      toast.success(isVi ? `Đã phê duyệt đơn WFH của ${name}` : `Approved WFH for ${name}`);
      if (statusFilter !== 'PENDING') fetchStatusHistory();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Lỗi duyệt đơn WFH'));
    }
  };

  const handleApproveLeave = async (id: string, name: string) => {
    try {
      await approveLeave(id);
      toast.success(isVi ? `Đã phê duyệt đơn nghỉ phép của ${name}` : `Approved leave for ${name}`);
      if (statusFilter !== 'PENDING') fetchStatusHistory();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Lỗi duyệt đơn nghỉ phép'));
    }
  };

  const handleApproveEarly = async (id: string, name: string) => {
    try {
      await attendanceApi.approveEarlyLeave(id);
      toast.success(isVi ? `Đã duyệt đơn về sớm của ${name}` : `Approved early leave for ${name}`);
      fetchEarlyAndOT();
      onRefresh();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Lỗi duyệt đơn về sớm'));
    }
  };

  const handleApproveOT = async (id: string, name: string) => {
    try {
      await attendanceApi.approveOvertime(id);
      toast.success(isVi ? `Đã duyệt đơn làm thêm giờ (OT) của ${name}` : `Approved overtime for ${name}`);
      fetchEarlyAndOT();
      onRefresh();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Lỗi duyệt đơn OT'));
    }
  };

  const handleRevert = async (id: string, type: 'wfh' | 'leave', name: string) => {
    try {
      if (type === 'wfh') {
        await attendanceApi.revertWfh(id);
      } else {
        await attendanceApi.revertLeave(id);
      }
      toast.success(
        isVi
          ? `Đã hoàn tác đơn của ${name} về trạng thái Chờ duyệt!`
          : `Reverted ${name}'s request back to Pending!`,
      );
      onRefresh();
      fetchStatusHistory();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Lỗi hoàn tác đơn'));
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectModalItem) return;
    setIsProcessing(true);
    try {
      if (rejectModalItem.type === 'wfh') {
        await rejectWfh(rejectModalItem.id, { rejectionNote });
        toast.info(isVi ? `Đã từ chối đơn WFH của ${rejectModalItem.name}` : `Rejected WFH for ${rejectModalItem.name}`);
      } else if (rejectModalItem.type === 'leave') {
        await rejectLeave(rejectModalItem.id);
        toast.info(isVi ? `Đã từ chối đơn nghỉ của ${rejectModalItem.name}` : `Rejected leave for ${rejectModalItem.name}`);
      } else if (rejectModalItem.type === 'early') {
        await attendanceApi.rejectEarlyLeave(rejectModalItem.id, rejectionNote);
        toast.info(isVi ? `Đã từ chối đơn về sớm của ${rejectModalItem.name}` : `Rejected early leave for ${rejectModalItem.name}`);
        fetchEarlyAndOT();
      } else if (rejectModalItem.type === 'ot') {
        await attendanceApi.rejectOvertime(rejectModalItem.id, rejectionNote);
        toast.info(isVi ? `Đã từ chối đơn làm thêm giờ của ${rejectModalItem.name}` : `Rejected overtime for ${rejectModalItem.name}`);
        fetchEarlyAndOT();
      }
      setRejectModalItem(null);
      setRejectionNote('');
      if (statusFilter !== 'PENDING') fetchStatusHistory();
      onRefresh();
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
        if (statusFilter !== 'PENDING') fetchStatusHistory();
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

  const currentWfhList = statusFilter === 'PENDING' ? pendingWfh : historyWfh;
  const currentLeaveList = statusFilter === 'PENDING' ? pendingLeaves : historyLeaves;
  const isCurrentLoading = statusFilter === 'PENDING' ? isLoading : isHistoryLoading;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
      {/* Top Header & Trigger Auto-approve */}
      <div className="p-5 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Category Switcher with 4 Tabs */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab('wfh')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'wfh'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Home className="w-4 h-4" />
              <span>{isVi ? 'Duyệt WFH' : 'WFH Queue'}</span>
              <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black">
                {currentWfhList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('leave')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'leave'
                  ? 'bg-white text-amber-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>{isVi ? 'Nghỉ phép' : 'Leave Queue'}</span>
              <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-black">
                {currentLeaveList.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('early')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'early'
                  ? 'bg-white text-cyan-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{isVi ? 'Về sớm' : 'Early Leave'}</span>
              <span className="px-1.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-[10px] font-black">
                {pendingEarly.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ot')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'ot'
                  ? 'bg-white text-purple-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Briefcase className="w-4 h-4" />
              <span>{isVi ? 'Làm thêm giờ (OT)' : 'Overtime (OT)'}</span>
              <span className="px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-800 text-[10px] font-black">
                {pendingOT.length}
              </span>
            </button>
          </div>

          {/* Status Filter Pills for WFH & Leave */}
          {(activeTab === 'wfh' || activeTab === 'leave') && (
            <div className="inline-flex items-center p-1 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold">
              <button
                onClick={() => setStatusFilter('PENDING')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'PENDING'
                    ? 'bg-amber-500 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isVi ? 'Chờ duyệt' : 'Pending'}
              </button>
              <button
                onClick={() => setStatusFilter('APPROVED')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'APPROVED'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isVi ? 'Đã phê duyệt' : 'Approved'}
              </button>
              <button
                onClick={() => setStatusFilter('REJECTED')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'REJECTED'
                    ? 'bg-rose-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isVi ? 'Đã từ chối' : 'Rejected'}
              </button>
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-800 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isVi ? 'Tất cả' : 'All'}
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5">
          {activeTab === 'wfh' && statusFilter === 'PENDING' && (
            <button
              onClick={handleTriggerAutoApprove}
              disabled={isAutoApproving}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs transition-colors"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>{isAutoApproving ? (isVi ? 'Đang duyệt...' : 'Processing...') : (isVi ? 'Auto-approve WFH' : 'Auto-approve WFH')}</span>
            </button>
          )}

          <button
            onClick={() => {
              onRefresh();
              fetchStatusHistory();
            }}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            title={isVi ? 'Làm mới' : 'Refresh'}
          >
            <RotateCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content List */}
      <div className="p-5">
        {isCurrentLoading ? (
          <div className="py-12 text-center text-slate-400">
            <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin inline-block mr-2" />
            <span className="text-xs font-semibold">{isVi ? 'Đang tải danh sách đơn...' : 'Loading requests...'}</span>
          </div>
        ) : activeTab === 'wfh' ? (
          currentWfhList.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-semibold text-slate-700">{isVi ? 'Không có đơn WFH nào!' : 'No WFH requests found!'}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {isVi ? `Trạng thái: [${statusFilter}] sạch sẽ` : `Status: [${statusFilter}] all clear`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentWfhList.map((item) => (
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
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            item.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : item.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {item.status === 'APPROVED'
                            ? isVi ? 'Đã duyệt' : 'Approved'
                            : item.status === 'REJECTED'
                            ? isVi ? 'Đã từ chối' : 'Rejected'
                            : isVi ? 'Chờ duyệt' : 'Pending'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-700 font-semibold">
                        <span className="text-blue-600">{formatDate(item.date)}</span>
                        <span className="text-slate-400">•</span>
                        <span>{item.expectedStart} - {item.expectedEnd}</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 font-medium">
                        <strong className="text-slate-700">{isVi ? 'Lý do' : 'Reason'}:</strong> {item.reason}
                      </p>
                      {item.rejectionNote && (
                        <p className="text-xs text-rose-600 mt-0.5 font-medium">
                          <strong>{isVi ? 'Phản hồi từ chối' : 'Rejection Note'}:</strong> {item.rejectionNote}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    {item.status === 'PENDING' ? (
                      <>
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
                      </>
                    ) : (
                      <button
                        onClick={() => handleRevert(item.id, 'wfh', item.user?.name || '')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all border border-slate-300"
                        title={isVi ? 'Đưa đơn về lại trạng thái Chờ duyệt để chỉnh sửa' : 'Revert back to Pending'}
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                        <span>{isVi ? 'Hoàn tác / Sửa lại' : 'Revert to Pending'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'leave' ? (
          currentLeaveList.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-semibold text-slate-700">{isVi ? 'Không có đơn nghỉ phép nào!' : 'No leave requests found!'}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {isVi ? `Trạng thái: [${statusFilter}] sạch sẽ` : `Status: [${statusFilter}] all clear`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {currentLeaveList.map((item) => (
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
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                            item.status === 'APPROVED'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : item.status === 'REJECTED'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {item.status === 'APPROVED'
                            ? isVi ? 'Đã duyệt' : 'Approved'
                            : item.status === 'REJECTED'
                            ? isVi ? 'Đã từ chối' : 'Rejected'
                            : isVi ? 'Chờ duyệt' : 'Pending'}
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
                    {item.status === 'PENDING' ? (
                      <>
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
                      </>
                    ) : (
                      <button
                        onClick={() => handleRevert(item.id, 'leave', item.user?.name || '')}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all border border-slate-300"
                        title={isVi ? 'Đưa đơn về lại trạng thái Chờ duyệt để chỉnh sửa' : 'Revert back to Pending'}
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-blue-600" />
                        <span>{isVi ? 'Hoàn tác / Sửa lại' : 'Revert to Pending'}</span>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : activeTab === 'early' ? (
          pendingEarly.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-semibold text-slate-700">{isVi ? 'Không có đơn xin về sớm nào đang chờ duyệt!' : 'No pending early leave requests!'}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {isVi ? 'Tất cả nhân sự tuân thủ giờ tan ca 17:30' : 'All staff complying with shift schedule'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingEarly.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-cyan-100 text-cyan-800 font-bold flex items-center justify-center text-sm flex-shrink-0">
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
                        <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 font-bold text-[10px] border border-cyan-200">
                          {isVi ? 'Xin về sớm' : 'Early Leave'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border bg-amber-50 text-amber-700 border-amber-200">
                          {isVi ? 'Chờ duyệt' : 'Pending'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-700 font-semibold">
                        <span className="text-cyan-700">{formatDate(item.date)}</span>
                        <span className="text-slate-400">•</span>
                        <span>{isVi ? 'Giờ xin về:' : 'Expected time:'} <strong className="text-cyan-900">{new Date(item.expectedLeaveTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</strong></span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 font-medium">
                        <strong className="text-slate-700">{isVi ? 'Lý do' : 'Reason'}:</strong> {item.reason}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => handleApproveEarly(item.id, item.user?.name || '')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isVi ? 'Duyệt về sớm' : 'Approve'}</span>
                    </button>
                    <button
                      onClick={() => setRejectModalItem({ id: item.id, type: 'early', name: item.user?.name || '' })}
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
        ) : (
          pendingOT.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-80" />
              <p className="font-semibold text-slate-700">{isVi ? 'Không có đơn làm thêm giờ (OT) nào đang chờ duyệt!' : 'No pending overtime requests!'}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {isVi ? 'Quỹ giờ làm thêm giờ hôm nay ở mức ổn định' : 'Overtime budget stable today'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingOT.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-800 font-bold flex items-center justify-center text-sm flex-shrink-0">
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
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 font-bold text-[10px] border border-purple-200">
                          {isVi ? 'Làm thêm giờ OT' : 'Overtime'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border bg-amber-50 text-amber-700 border-amber-200">
                          {isVi ? 'Chờ duyệt' : 'Pending'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-700 font-semibold">
                        <span className="text-purple-700">{formatDate(item.date)}</span>
                        <span className="text-slate-400">•</span>
                        <span>
                          {isVi ? 'Khung giờ OT:' : 'OT Window:'} <strong className="text-purple-900">{new Date(item.registeredStart).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} → {new Date(item.registeredEnd).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</strong>
                        </span>
                        <span className="text-slate-400">•</span>
                        <span className="text-emerald-700 font-bold">{item.registeredHours}h OT</span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 font-medium">
                        <strong className="text-slate-700">{isVi ? 'Kế hoạch công việc / Lý do' : 'Reason'}:</strong> {item.reason}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => handleApproveOT(item.id, item.user?.name || '')}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{isVi ? 'Duyệt OT' : 'Approve OT'}</span>
                    </button>
                    <button
                      onClick={() => setRejectModalItem({ id: item.id, type: 'ot', name: item.user?.name || '' })}
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
              placeholder={isVi ? 'Ví dụ: Lịch dự án chưa cần thiết hoặc ngoài kế hoạch sprint...' : 'Reason for rejection...'}
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
