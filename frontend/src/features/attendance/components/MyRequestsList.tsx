import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Home,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Plus,
  MessageSquare,
  type LucideIcon,
} from 'lucide-react';
import type { WfhRequest, LeaveRequest, RequestStatus } from '../types/attendance.types';

interface MyRequestsListProps {
  wfhRequests: WfhRequest[];
  leaveRequests: LeaveRequest[];
  isLoading: boolean;
  onOpenWfhModal: () => void;
  onOpenLeaveModal: () => void;
}

const STATUS_MAP: Record<
  RequestStatus,
  { labelVi: string; labelEn: string; bg: string; text: string; icon: LucideIcon }
> = {
  PENDING: {
    labelVi: 'Chờ duyệt',
    labelEn: 'Pending',
    bg: 'bg-amber-50 border-amber-200',
    text: 'text-amber-700',
    icon: Clock,
  },
  APPROVED: {
    labelVi: 'Đã duyệt',
    labelEn: 'Approved',
    bg: 'bg-emerald-50 border-emerald-200',
    text: 'text-emerald-700',
    icon: CheckCircle2,
  },
  AUTO_APPROVED: {
    labelVi: 'Tự động duyệt',
    labelEn: 'Auto Approved',
    bg: 'bg-blue-50 border-blue-200',
    text: 'text-blue-700',
    icon: CheckCircle2,
  },
  REJECTED: {
    labelVi: 'Từ chối',
    labelEn: 'Rejected',
    bg: 'bg-rose-50 border-rose-200',
    text: 'text-rose-700',
    icon: XCircle,
  },
};

export function MyRequestsList({
  wfhRequests,
  leaveRequests,
  isLoading,
  onOpenWfhModal,
  onOpenLeaveModal,
}: MyRequestsListProps) {
  const { i18n } = useTranslation();
  const isVi = i18n.language.startsWith('vi');

  const [activeTab, setActiveTab] = useState<'wfh' | 'leave'>('wfh');

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
      {/* Tab Switcher & Action Header */}
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
            <span>{isVi ? 'Đơn WFH' : 'WFH Requests'} ({wfhRequests.length})</span>
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
            <span>{isVi ? 'Đơn Nghỉ Phép' : 'Leave Requests'} ({leaveRequests.length})</span>
          </button>
        </div>

        <div>
          {activeTab === 'wfh' ? (
            <button
              onClick={onOpenWfhModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{isVi ? 'Tạo đơn WFH mới' : 'New WFH Request'}</span>
            </button>
          ) : (
            <button
              onClick={onOpenLeaveModal}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>{isVi ? 'Tạo đơn nghỉ phép' : 'New Leave Request'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Content List */}
      <div className="p-5">
        {isLoading ? (
          <div className="py-12 text-center text-slate-400">
            <span className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin inline-block mr-2" />
            <span className="text-xs font-semibold">{isVi ? 'Đang tải danh sách đơn...' : 'Loading requests...'}</span>
          </div>
        ) : activeTab === 'wfh' ? (
          wfhRequests.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-600">{isVi ? 'Bạn chưa có đơn WFH nào' : 'No WFH requests found'}</p>
              <button
                onClick={onOpenWfhModal}
                className="mt-3 text-xs font-bold text-blue-600 hover:underline"
              >
                {isVi ? '+ Gửi đơn WFH ngay' : '+ Request WFH Now'}
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {wfhRequests.map((req) => {
                const statusMeta = STATUS_MAP[req.status] || STATUS_MAP.PENDING;
                const StatusIcon = statusMeta.icon;
                return (
                  <div
                    key={req.id}
                    className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                        <Home className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">
                            {formatDate(req.date)}
                          </h4>
                          <span className="text-xs font-semibold text-slate-500">
                            ({req.expectedStart} - {req.expectedEnd})
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-1 font-medium">
                          <strong className="text-slate-700">{isVi ? 'Lý do' : 'Reason'}:</strong> {req.reason}
                        </p>
                        {req.rejectionNote && (
                          <div className="mt-2 p-2 rounded-lg bg-rose-50 border border-rose-100 flex items-start gap-1.5 text-xs text-rose-700">
                            <MessageSquare className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                            <span><strong>{isVi ? 'Phản hồi từ quản lý' : 'Manager Note'}:</strong> {req.rejectionNote}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusMeta.bg} ${statusMeta.text}`}
                      >
                        <StatusIcon className="w-3.5 h-3.5" />
                        {isVi ? statusMeta.labelVi : statusMeta.labelEn}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : leaveRequests.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-600">{isVi ? 'Bạn chưa có đơn nghỉ phép nào' : 'No leave requests found'}</p>
            <button
              onClick={onOpenLeaveModal}
              className="mt-3 text-xs font-bold text-amber-600 hover:underline"
            >
              {isVi ? '+ Gửi đơn xin nghỉ ngay' : '+ Request Leave Now'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {leaveRequests.map((req) => {
              const statusMeta = STATUS_MAP[req.status] || STATUS_MAP.PENDING;
              const StatusIcon = statusMeta.icon;
              return (
                <div
                  key={req.id}
                  className="p-4 rounded-xl border border-slate-200/80 bg-white hover:border-slate-300 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900">
                          {formatDate(req.startDate)} → {formatDate(req.endDate)}
                        </h4>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                          {req.leaveType} • {req.dayCount} {isVi ? 'ngày' : 'days'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1 font-medium">
                        <strong className="text-slate-700">{isVi ? 'Lý do' : 'Reason'}:</strong> {req.reason}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusMeta.bg} ${statusMeta.text}`}
                    >
                      <StatusIcon className="w-3.5 h-3.5" />
                      {isVi ? statusMeta.labelVi : statusMeta.labelEn}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
