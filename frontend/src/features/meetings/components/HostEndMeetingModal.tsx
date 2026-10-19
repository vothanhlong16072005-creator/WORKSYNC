import React from 'react';
import { createPortal } from 'react-dom';
import { PhoneOff, StopCircle, LogOut, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface HostEndMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeaveOnly: () => void;
  onEndForAll: () => void;
}

export const HostEndMeetingModal: React.FC<HostEndMeetingModalProps> = ({
  isOpen,
  onClose,
  onLeaveOnly,
  onEndForAll,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl p-6 text-slate-800 relative animate-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shadow-2xs">
            <PhoneOff className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {t('meeting_room.end_modal_title', 'Kết thúc cuộc họp?')}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Bạn là người chủ trì cuộc họp này
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed mb-6">
          {t(
            'meeting_room.end_modal_desc',
            'Bạn muốn chỉ rời khỏi phòng họp hay kết thúc cuộc họp ngay lập tức cho toàn bộ người tham gia?',
          )}
        </p>

        <div className="space-y-3">
          {/* End for all */}
          <button
            onClick={onEndForAll}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-all shadow-sm group"
          >
            <div className="flex items-center gap-2.5">
              <StopCircle className="w-4 h-4 text-white" />
              <div className="text-left">
                <p className="font-bold">{t('meeting_room.end_call_for_all', 'Kết thúc cuộc họp cho tất cả')}</p>
                <p className="text-[10px] text-rose-100 font-normal">Chuyển trạng thái hoàn thành & xuất biên bản báo cáo</p>
              </div>
            </div>
            <span className="text-xs font-bold">→</span>
          </button>

          {/* Leave only */}
          <button
            onClick={onLeaveOnly}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-all border border-slate-200"
          >
            <div className="flex items-center gap-2.5">
              <LogOut className="w-4 h-4 text-slate-500" />
              <div className="text-left">
                <p className="font-bold">{t('meeting_room.leave_only', 'Chỉ rời cuộc họp')}</p>
                <p className="text-[10px] text-slate-500 font-normal">Cuộc họp vẫn tiếp tục với những người khác</p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
