import React, { useEffect, useRef } from 'react';
import { MessageSquare, User as UserIcon, Copy, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

export interface ChatContextMenuUser {
  id: string;
  name: string;
  email?: string;
  avatar?: string | null;
  role?: string;
  position?: string | null;
}

interface ChatContextMenuProps {
  user: ChatContextMenuUser;
  position: { x: number; y: number };
  onClose: () => void;
  onStartChat: (userId: string) => void;
  onViewProfile?: (userId: string) => void;
}

export const ChatContextMenu: React.FC<ChatContextMenuProps> = ({
  user,
  position,
  onClose,
  onStartChat,
  onViewProfile,
}) => {
  const { t } = useTranslation();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Điều chỉnh vị trí đảm bảo không tràn màn hình
  const menuWidth = 230;
  const menuHeight = 180;
  const adjustedX = Math.min(position.x, window.innerWidth - menuWidth - 10);
  const adjustedY = Math.min(position.y, window.innerHeight - menuHeight - 10);

  const handleCopyEmail = () => {
    if (user.email) {
      navigator.clipboard.writeText(user.email);
      toast.success(t('chat.email_copied', 'Đã sao chép email'));
      onClose();
    }
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-56 bg-white rounded-2xl shadow-xl border border-slate-200/90 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      style={{ left: adjustedX, top: adjustedY }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header Profile preview */}
      <div className="p-3 bg-slate-50 border-b border-slate-200/80 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 overflow-hidden text-sm border border-blue-200">
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <span>{user.name.charAt(0).toUpperCase()}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-slate-900 truncate">{user.name}</p>
          <p className="text-[11px] text-slate-500 truncate">{user.position || user.role || 'Thành viên'}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Menu Options */}
      <div className="p-1.5 space-y-0.5">
        <button
          onClick={() => {
            onStartChat(user.id);
            onClose();
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
        >
          <MessageSquare className="w-4 h-4 text-blue-600" />
          <span>{t('chat.start_chat', 'Bắt đầu trò chuyện')}</span>
        </button>

        {user.email && (
          <button
            onClick={handleCopyEmail}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Copy className="w-4 h-4 text-slate-400" />
            <span>{t('chat.copy_email', 'Sao chép email')}</span>
          </button>
        )}

        {onViewProfile && (
          <button
            onClick={() => {
              onViewProfile(user.id);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <UserIcon className="w-4 h-4 text-slate-400" />
            <span>{t('chat.view_profile', 'Xem thông tin')}</span>
          </button>
        )}
      </div>
    </div>
  );
};
