import { useState } from 'react';
import { CheckCheck, XCircle, Check, X, FileText } from 'lucide-react';
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
    } catch (err: any) {
      toast.error('Không thể phê duyệt đơn', {
        description: err?.response?.data?.message || err?.message || 'Đã có lỗi xảy ra',
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
    } catch (err: any) {
      toast.error('Không thể từ chối đơn', {
        description: err?.response?.data?.message || err?.message || 'Đã có lỗi xảy ra',
      });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <>
      <div className="p-5 bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b-2 border-slate-900">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-600 text-white border border-slate-900 shadow-[2px_2px_0px_0px_rgba(15,23,42,1)]">
              <CheckCheck className="w-4 h-4 stroke-[2.5]" />
            </span>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">
                Phê duyệt tức thì
              </span>
              <h2 className="text-sm font-black uppercase tracking-tight text-slate-900">
                Quick Approval Widget (Duyệt nhanh 1-Click)
              </h2>
            </div>
          </div>

          <span className="px-2.5 py-1 bg-amber-100 text-amber-900 border border-slate-900 text-xs font-mono font-bold">
            {items.length} đơn khẩn cấp
          </span>
        </div>

        {/* Requests List */}
        {items.length === 0 ? (
          <div className="py-8 text-center bg-slate-50 border-2 border-dashed border-slate-300">
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
                className="p-3.5 bg-white border-2 border-slate-900 hover:shadow-[3px_3px_0px_0px_rgba(15,23,42,1)] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <img
                    src={
                      req.userAvatar ||
                      `https://ui-avatars.com/api/?name=${encodeURIComponent(req.userName)}&background=0F172A&color=fff`
                    }
                    alt={req.userName}
                    className="w-9 h-9 rounded-full object-cover border-2 border-slate-900 shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900 truncate">
                        {req.userName}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 text-[10px] font-black uppercase border border-slate-900 ${
                          req.type === 'WFH'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {req.type === 'WFH' ? 'WFH (Từ xa)' : 'Nghỉ phép'}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {req.dateOrRange}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      Phòng ban: <strong>{req.departmentName}</strong>
                    </div>

                    <p className="text-xs text-slate-700 font-medium line-clamp-1 mt-1 bg-slate-50 px-2 py-0.5 border border-slate-200">
                      &quot;{req.reason}&quot;
                    </p>
                  </div>
                </div>

                {/* Direct Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => setSelectedDetail(req)}
                    className="px-2.5 py-1.5 text-[11px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300"
                  >
                    Xem lý do
                  </button>

                  <button
                    type="button"
                    onClick={() => setRejectModalItem(req)}
                    disabled={processingId === req.id}
                    className="px-2.5 py-1.5 text-[11px] font-black uppercase text-rose-700 hover:bg-rose-50 border border-rose-300 hover:border-rose-600 transition-colors"
                  >
                    Từ chối
                  </button>

                  <button
                    type="button"
                    onClick={() => handleApprove(req)}
                    disabled={processingId === req.id}
                    className="flex items-center gap-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider border border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 transition-all disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] max-w-md w-full p-6 text-slate-900">
            <div className="flex items-start justify-between pb-3 mb-4 border-b-2 border-slate-900">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black uppercase text-slate-900">
                  Chi Tiết Lý Do Đơn {selectedDetail.type}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="p-1 hover:bg-slate-100"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="space-y-3 mb-6 text-sm">
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase">Nhân sự nộp đơn:</span>
                <div className="font-bold text-slate-900">{selectedDetail.userName} ({selectedDetail.departmentName})</div>
              </div>
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase">Thời gian đề xuất:</span>
                <div className="font-mono font-bold text-slate-800">{selectedDetail.dateOrRange}</div>
              </div>
              <div>
                <span className="text-xs text-slate-500 font-bold uppercase">Nội dung giải trình chi tiết:</span>
                <div className="p-3 bg-slate-50 border border-slate-300 text-slate-800 text-xs leading-relaxed mt-1">
                  {selectedDetail.reason}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-slate-900">
              <button
                type="button"
                onClick={() => setSelectedDetail(null)}
                className="px-4 py-2 text-xs font-bold uppercase text-slate-600 border border-slate-300"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  const item = selectedDetail;
                  setSelectedDetail(null);
                  handleApprove(item);
                }}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase border border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
              >
                Phê duyệt ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Từ chối kèm lý do */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border-4 border-slate-900 shadow-[8px_8px_0px_0px_rgba(15,23,42,1)] max-w-md w-full p-6 text-slate-900">
            <div className="flex items-start justify-between pb-3 mb-4 border-b-2 border-slate-900">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-rose-600" />
                <h3 className="text-base font-black uppercase text-slate-900">
                  Từ Chối Đơn {rejectModalItem.type}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                className="p-1 hover:bg-slate-100"
              >
                <X className="w-5 h-5 text-slate-600" />
              </button>
            </div>

            <div className="mb-4">
              <label htmlFor="rejectionNote" className="block text-xs font-black uppercase text-slate-700 mb-1.5">
                Lý do từ chối gửi nhân viên:
              </label>
              <textarea
                id="rejectionNote"
                rows={3}
                value={rejectionNote}
                onChange={(e) => setRejectionNote(e.target.value)}
                placeholder="Nhập lý do từ chối (vd: Cần tập trung on-site để deploy release)..."
                className="w-full p-2.5 text-xs border-2 border-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t-2 border-slate-900">
              <button
                type="button"
                onClick={() => setRejectModalItem(null)}
                className="px-4 py-2 text-xs font-bold uppercase text-slate-600 border border-slate-300"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleRejectConfirm}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black text-xs uppercase border border-slate-900 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]"
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
