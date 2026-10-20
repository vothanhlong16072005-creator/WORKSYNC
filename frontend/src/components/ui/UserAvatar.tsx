import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '@/features/chat/stores/chat.store';
import { ChatContextMenu, type ChatContextMenuUser } from '@/features/chat/components/ChatContextMenu';

interface UserAvatarProps {
  user: ChatContextMenuUser;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showOnlineDot?: boolean;
  isOnline?: boolean;
  enableContextMenu?: boolean;
  className?: string;
  onClick?: (e: React.MouseEvent) => void;
  onViewProfile?: (userId: string) => void;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  user,
  size = 'md',
  showOnlineDot = false,
  isOnline = false,
  enableContextMenu = true,
  className = '',
  onClick,
  onViewProfile,
}) => {
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const navigate = useNavigate();
  const startDirectChat = useChatStore((s) => s.startDirectChat);

  const sizeClasses = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-9 h-9 text-xs',
    lg: 'w-11 h-11 text-sm',
    xl: 'w-14 h-14 text-base font-bold',
  };

  const dotSizeClasses = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-3.5 h-3.5',
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!enableContextMenu) return;
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  const handleStartChat = async (userId: string) => {
    try {
      const convId = await startDirectChat(userId);
      navigate(`/chat/${convId}`);
    } catch (err) {
      console.error('Cannot open direct chat:', err);
    }
  };

  return (
    <>
      <div
        className={`relative inline-block select-none ${className}`}
        onContextMenu={handleContextMenu}
        onClick={onClick}
      >
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-semibold flex items-center justify-center overflow-hidden border border-white/80 shadow-xs transition-transform hover:scale-105 cursor-pointer`}
          title={user.name}
        >
          {user.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
          ) : (
            <span>{user.name ? user.name.charAt(0).toUpperCase() : '?'}</span>
          )}
        </div>

        {showOnlineDot && isOnline && (
          <span
            className={`absolute bottom-0 right-0 ${dotSizeClasses[size]} rounded-full bg-emerald-500 ring-2 ring-white`}
            title="Đang hoạt động"
          />
        )}
      </div>

      {contextMenuPos && (
        <ChatContextMenu
          user={user}
          position={contextMenuPos}
          onClose={() => setContextMenuPos(null)}
          onStartChat={handleStartChat}
          onViewProfile={onViewProfile}
        />
      )}
    </>
  );
};
