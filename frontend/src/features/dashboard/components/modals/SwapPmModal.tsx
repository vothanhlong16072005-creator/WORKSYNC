import { useState, useEffect } from 'react';
import { UserCheck, ShieldAlert, CheckCircle2, Search, Loader2 } from 'lucide-react';
import { ModalShell } from './ModalShell';
import { deptHeadApi } from '../../api/dept-head.api';
import { getErrorMessage } from '@/features/attendance/utils/error-handler';
import { apiClient } from '@/lib/api-client';

export interface SwapPmCandidate {
  id: string;
  name: string;
  email?: string;
  avatar: string | null;
  position?: string | null;
  role?: string;
  openTasks?: number;
}

interface SwapPmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projectId: string;
  projectName: string;
  currentPmName: string;
  currentPmId?: string;
  candidates?: SwapPmCandidate[];
}

export function SwapPmModal({
  isOpen,
  onClose,
  onSuccess,
  projectId,
  projectName,
  currentPmName,
  currentPmId,
  candidates,
}: SwapPmModalProps) {
  const [candidateList, setCandidateList] = useState<SwapPmCandidate[]>(candidates || []);
  const [selectedPmId, setSelectedPmId] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (candidates && candidates.length > 0) {
      setCandidateList(candidates);
    } else if (isOpen) {
      apiClient
        .get<SwapPmCandidate[]>('/users/assignable')
        .then((res) => {
          if (Array.isArray(res.data)) {
            setCandidateList(res.data);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, candidates]);

  const availableCandidates = candidateList.filter(
    (c) => c.id !== currentPmId && c.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleConfirm = async () => {
    if (!selectedPmId) {
      setError('Vui lòng chọn nhân sự đảm nhận vai trò PM mới');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await deptHeadApi.swapPm(projectId, {
        newPmId: selectedPmId,
        reason: reason.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Không thể đổi PM dự án'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Bàn Giao & Thay Đổi Project Manager"
      subtitle={`Dự án: ${projectName}`}
      size="md"
      headerGradient="amber"
      footer={
        <>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-colors"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            disabled={!selectedPmId || submitting}
            onClick={handleConfirm}
            className="inline-flex items-center gap-2 px-4.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-xs font-bold shadow-xs transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang xử lý...</span>
              </>
            ) : (
              <>
                <UserCheck className="w-3.5 h-3.5" />
                <span>Xác nhận đổi PM</span>
              </>
            )}
          </button>
        </>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Current PM card */}
        <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">
              PM Hiện Tại
            </span>
            <div className="text-sm font-black text-slate-900 mt-0.5">{currentPmName}</div>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-amber-200/80 text-amber-800 text-[10px] font-bold">
            Sẽ rời khỏi dự án & nhóm chat
          </span>
        </div>

        {/* Candidate Search */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1.5">
            Chọn PM Mới (Thành viên thuộc phòng ban):
          </label>
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo tên thành viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>

          <div className="max-h-52 overflow-y-auto space-y-1.5 pr-1">
            {availableCandidates.length === 0 ? (
              <div className="py-6 text-center text-slate-400 text-xs italic">
                Không tìm thấy nhân sự phù hợp
              </div>
            ) : (
              availableCandidates.map((c) => {
                const isSelected = selectedPmId === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedPmId(c.id)}
                    className={`p-2.5 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/60 shadow-xs ring-1 ring-amber-500'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {c.avatar ? (
                        <img
                          src={c.avatar}
                          alt={c.name}
                          className="w-7 h-7 rounded-full object-cover border border-slate-200 shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0">
                          {c.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 truncate">{c.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {c.position || c.role || 'Thành viên'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {typeof c.openTasks === 'number' && (
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                          {c.openTasks} task mở
                        </span>
                      )}
                      {isSelected ? (
                        <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300" />
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Reason */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Lý do bàn giao (Tùy chọn):
          </label>
          <textarea
            rows={2}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ví dụ: Bàn giao theo chu kỳ dự án, điều chuyển nhân sự..."
            className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        {/* Security Warning Notice */}
        <div className="p-3 rounded-2xl bg-amber-50/50 border border-amber-200 text-amber-900 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="text-[11px] leading-relaxed">
            <span className="font-bold">Lưu ý quản trị:</span> Sau khi xác nhận, PM mới sẽ sở hữu
            toàn bộ quyền điều hành dự án. PM cũ sẽ bị xóa khỏi danh sách thành viên dự án và kênh chat.
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}
      </div>
    </ModalShell>
  );
}
