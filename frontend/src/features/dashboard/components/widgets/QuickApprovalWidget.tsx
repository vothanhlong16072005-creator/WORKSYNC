import { useState } from 'react';
import { CheckCheck, Check, X, FileText } from 'lucide-react';
import type { QuickApprovalItem } from '../../types/dashboard.types';
import { attendanceApi } from '@/features/attendance/api/attendance.api';
import { toast } from 'sonner';

interface Props {
  requests?: QuickApprovalItem[];
  onRefresh?: () => void;
}

export function QuickApprovalWidget({ requests = [], onRefresh }: Props) {
  const [items, setItems] = useState<QuickApprovalItem[]>(requests);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<QuickApprovalItem | null>(null);
  const [rejectModalItem, setRejectModalItem] = useState<QuickApprovalItem | null>(null);
  const [rejectionNote, setRejectionNote] = useState('');

  // Synchronize with prop changes
  if (requests.length !== items.length && items.length === 0) {
    setItems(requests);
  }

  const handleApprove = async (item: QuickApprovalItem) => {
    setProcessingId(item.id);
    try {
      if (item.type === 'WFH') {
        await attendanceApi.approveWfh(item.id);
      } else {
        await attendanceApi.approveLeave(item.id);
      }

      toast.success(`Đã duyệt đơn ${item.type} của ${item.userName} thành công!`, {
        description: `Thời gian: ${item.dateOrRange}. Trạng thái đã được cập nhật tự động.`,
      });

      // Remove approved item from list
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Đã có lỗi xảy ra';
      toast.error('Không thể phê duyệt đơn', {
        description: message,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectModalItem) return;
    setProcessingId(rejectModalItem.id);
    try {
      if (rejectModalItem.type === 'WFH') {
        await attendanceApi.rejectWfh(rejectModalItem.id, { rejectionNote: rejectionNote || 'Không phù hợp với kế hoạch sprint' });
      } else {
        await attendanceApi.rejectLeave(rejectModalItem.id);
      }

      toast.info(`Đã từ chối đơn của ${rejectModalItem.userName}`, {
        description: 'Đã gửi phản hồi đến nhân viên.',
      });

      setItems((prev) => prev.filter((i) => i.id !== rejectModalItem.id));
      setRejectModalItem(null);
      setRejectionNote('');
      if (onRefresh) onRefresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Đã có lỗi xảy ra';
      toast.error('Không thể từ chối đơn', {
        description: message,
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 sm:p-6 transition-all hover:border-slate-300">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/80 shadow-xs">
              <CheckCheck className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 block">
                Phê duyệt tức thì
              </span>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Quick Approval Widget (Duyệt nhanh 1-Click)
              </h2>
            </div>
          </div>

          <span className="inline-flex items-center px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/80 text-xs font-semibold">
            {items.length} đơn khẩn cấp
          </span>
        </div>

        {/* Requests List */}
        {items.length === 0 ? (
          <div className="py-8 text-center bg-slate-50/60 rounded-xl border border-dashed border-slate-200">
            <CheckCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2 opacity-80" />
            <p className="text-xs font-bold text-slate-700">
              Không có đơn WFH hoặc Nghỉ phép nào đang chờ duyệt.
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Tất cả yêu cầu phát sinh đã được xử lý xong!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((req) => (
              <div
                key={req.id}
                className="p-4 rounded-xl border border-slate-200/70 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-sm transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <img
                    src={
                      req.userAvatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(req.userName)}&background=0F172A&color=fff`
                    }
                    alt={req.userName}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-xs shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 truncate">
                        {req.userName}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${
                          req.type === 'WFH'
                            ? 'bg-sky-50 text-sky-800 border-sky-200/70'
                            : 'bg-amber-50 text-amber-800 border-amber-200/70'
                        }`}
                      >
                        {req.type === 'WFH' ? 'WFH (Từ xa)' : 'Nghỉ phép'}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {req.dateOrRange}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      Phòng ban: <strong className="text-slate-700">{req.departmentName}</strong>
                    </div>

                    <p className="text-xs text-slate-700 font-medium line-clamp-1 mt-1 bg-white/90 px-2.5 py-1 rounded-md border border-slate-200/60 shadow-2xs">
                      &quot;{req.reason}&quot;
                    </p>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => setSelectedDetail(req)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 shadow-2xs transition-colors"
                  >
                    Xem lý do
                  </button>

                  <button
                    type="button"
                    onClick={() => setRejectModalItem(req)}
                    disabled={processingId === req.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
                  >
                    Từ chối
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApprove(req)}
                    disabled={processingId === req.id}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Duyệt nhanh</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Xem chi tiết lý do */}
      {selectedDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 text-slate-900">
            <div className="flex items-start justify-between pb-3 mb-4 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <FileText className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-bold text-slate-900">
                  Chi Tiết Lý Do Đơn {selectedDetail.type}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 mb-6 text-xs">
              <div>
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Nhân sự nộp đơn:</span>
                <div className="font-bold text-slate-900 text-sm">{selectedDetail.userName} ({selectedDetail.departmentName})</div>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Thời gian đề xuất:</span>
                <div className="font-mono font-semibold text-slate-800">{selectedDetail.dateOrRange}</div>
              </div>
              <div>
                <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-0.5">Lý do cụ thể:</span>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 font-medium text-slate-800 leading-relaxed">
                  {selectedDetail.reason}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = selectedDetail;
                  setSelectedDetail(null);
                  handleApprove(target);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white shadow-xs transition-colors"
              >
                Duyệt đơn này
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Từ chối đơn */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-6 text-slate-900">
            <div className="flex items-start justify-between pb-3 mb-4 border-b border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Từ Chối Đơn của {rejectModalItem.userName}
              </h3>
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-3">
              Nhập lý do từ chối để gửi thông báo giải trình cho nhân viên:
            </p>

            <textarea
              rows={3}
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              placeholder="VD: Tuần này team cần tập trung onsite tại FPT Complex để kịp deadline Sprint..."
              className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 mb-4"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                disabled={processingId === rejectModalItem.id}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-xs transition-colors disabled:opacity-50"
              >
                Xác nhận từ chối
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
