import React from 'react';
import {
  Pin,
  Bell,
  BellOff,
  Users,
  Video,
  FolderGit2,
  Building2,
} from 'lucide-react';
import { useChatStore } from '../stores/chat.store';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export const ConversationView: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const {
    activeConversation,
    togglePin,
    toggleMute,
    typingMap,
  } = useChatStore();

  if (!activeConversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
        <div className="w-16 h-16 rounded-3xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4 text-blue-600 shadow-xs">
          <Users className="w-8 h-8" />
        </div>
        <h3 className="text-base font-bold text-slate-800 mb-1">
          {t('chat.select_conversation', 'Chọn cuộc trò chuyện')}
        </h3>
        <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
          {t(
            'chat.select_conversation_desc',
            'Chọn một phòng trò chuyện từ danh sách bên trái hoặc nhấp chuột phải vào avatar của đồng nghiệp bất kỳ để bắt đầu chat.',
          )}
        </p>
      </div>
    );
  }

  const typingUser = typingMap[activeConversation.id];
  const isDirect = activeConversation.type === 'DIRECT';
  const isProject = activeConversation.type === 'PROJECT';

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Conversation Top Header Ribbon */}
      <div className="px-5 py-3.5 bg-white border-b border-slate-200/90 flex items-center justify-between shrink-0 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          {isDirect && activeConversation.otherUser ? (
            <UserAvatar
              user={{
                id: activeConversation.otherUser.id,
                name: activeConversation.otherUser.name,
                avatar: activeConversation.otherUser.avatar,
                role: activeConversation.otherUser.role,
              }}
              size="md"
              showOnlineDot
              isOnline={activeConversation.isOnline}
            />
          ) : (
            <div
              className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-xs ${
                isProject
                  ? 'bg-gradient-to-br from-indigo-500 to-blue-600'
                  : 'bg-gradient-to-br from-teal-500 to-emerald-600'
              }`}
            >
              {isProject ? <FolderGit2 className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
            </div>
          )}

          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 truncate">
              {activeConversation.name}
            </h2>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              {isDirect ? (
                <span className="flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      activeConversation.isOnline ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  />
                  <span>
                    {activeConversation.isOnline
                      ? t('chat.online', 'Đang hoạt động')
                      : t('chat.offline', 'Ngoại tuyến')}
                  </span>
                </span>
              ) : (
                <span>
                  {activeConversation.participantCount}{' '}
                  {t('chat.members', 'thành viên')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1">
          {/* Quick Meeting button */}
          <button
            type="button"
            onClick={() => navigate('/meetings')}
            title={t('chat.start_meeting', 'Tạo cuộc họp')}
            className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
          >
            <Video className="w-4 h-4" />
          </button>

          {/* Pin Button */}
          <button
            type="button"
            onClick={() => togglePin(activeConversation.id)}
            title={activeConversation.isPinned ? t('chat.unpin', 'Bỏ ghim') : t('chat.pin', 'Ghim')}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              activeConversation.isPinned
                ? 'text-amber-600 bg-amber-50 hover:bg-amber-100'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Pin className="w-4 h-4" />
          </button>

          {/* Mute Button */}
          <button
            type="button"
            onClick={() => toggleMute(activeConversation.id)}
            title={activeConversation.isMuted ? t('chat.unmute', 'Bật thông báo') : t('chat.mute', 'Tắt thông báo')}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              activeConversation.isMuted
                ? 'text-rose-600 bg-rose-50 hover:bg-rose-100'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            {activeConversation.isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Message Stream */}
      <MessageList />

      {/* Typing indicator bar */}
      <TypingIndicator userName={typingUser?.userName} />

      {/* Message Input Footer */}
      <MessageInput />
    </div>
  );
};
