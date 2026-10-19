import React from 'react';
import { createPortal } from 'react-dom';
import { Trash2, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ConfirmCancelMeetingModalProps {
  isOpen: boolean;
  meetingTitle: string;
  onClose: () => void;
  onConfirm: () => void;
  isDeleting?: boolean;
}

export const ConfirmCancelMeetingModal: React.FC<ConfirmCancelMeetingModalProps> = ({
  isOpen,
  meetingTitle,
  onClose,
  onConfirm,
  isDeleting = false,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 text-foreground animate-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          title="Đóng"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 dark:bg-rose-950/60 dark:border-rose-800 dark:text-rose-400 flex items-center justify-center shrink-0">
            <Trash2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              {t('meetings.cancel_modal_title', 'Hủy / Xóa cuộc họp?')}
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Hành động này sẽ hủy lịch họp đã tạo
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground leading-relaxed mb-6">
          {t('meetings.cancel_modal_desc', 'Bạn có chắc chắn muốn hủy / xóa cuộc họp')} <strong className="text-foreground">"{meetingTitle}"</strong>? {t('meetings.cancel_modal_note', 'Các thành viên trong danh sách mời sẽ được cập nhật.')}
        </p>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-colors"
          >
            {t('common.cancel', 'Hủy')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors shadow-xs flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{isDeleting ? t('common.deleting', 'Đang xóa...') : t('meetings.confirm_delete', 'Xác nhận xóa')}</span>
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
