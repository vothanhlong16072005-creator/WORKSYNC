import React, { useState } from 'react';
import {
  Search,
  Plus,
  Users,
  MessageSquare,
  Pin,
  BellOff,
  FolderGit2,
  Building2,
  X,
} from 'lucide-react';
import { useChatStore } from '../stores/chat.store';
import { UserAvatar } from '@/components/ui/UserAvatar';
import { CreateGroupChatModal } from './CreateGroupChatModal';
import { formatLastActivity } from '../utils/chat-date';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

export const ChatSidebar: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);

  const {
    conversations,
    activeConversation,
    setActiveConversation,
    activeFilter,
    setFilter,
    searchQuery,
    setSearchQuery,
    isLoadingConversations,
  } = useChatStore();

  const getGroupIcon = (type: string) => {
    switch (type) {
      case 'PROJECT':
        return <FolderGit2 className="w-4 h-4 text-indigo-600" />;
      case 'DEPARTMENT':
        return <Building2 className="w-4 h-4 text-teal-600" />;
      default:
        return <Users className="w-4 h-4 text-blue-600" />;
    }
  };

  return (
    <aside className="w-80 sm:w-88 flex flex-col h-full bg-white border-r border-slate-200/90 shrink-0">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-200/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-base font-bold text-slate-900 tracking-tight">
              {t('chat.title', 'Trò chuyện')}
            </h1>
            <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold text-xs">
              {conversations.length}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsGroupModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-semibold transition-colors cursor-pointer"
            title={t('chat.create_group', 'Tạo nhóm mới')}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t('chat.new_group_btn', 'Tạo nhóm')}</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('chat.search_placeholder', 'Tìm cuộc trò chuyện, người dùng...')}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-50 border border-slate-200/90 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-100/80 rounded-xl">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeFilter === 'ALL'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('chat.filter_all', 'Tất cả')}
          </button>
          <button
            type="button"
            onClick={() => setFilter('DIRECT')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeFilter === 'DIRECT'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('chat.filter_direct', 'Cá nhân')}
          </button>
          <button
            type="button"
            onClick={() => setFilter('GROUP')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeFilter === 'GROUP'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('chat.filter_group', 'Nhóm')}
          </button>
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
        {isLoadingConversations ? (
          <div className="p-4 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-200 rounded-md w-3/4" />
                  <div className="h-3 bg-slate-100 rounded-md w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-xs font-medium">
              {searchQuery
                ? t('chat.no_search_results', 'Không tìm thấy cuộc trò chuyện')
                : t('chat.no_conversations', 'Chưa có cuộc trò chuyện nào')}
            </p>
          </div>
        ) : (
          conversations.map((conv) => {
            const isActive = activeConversation?.id === conv.id;
            const isDirect = conv.type === 'DIRECT';

            return (
              <div
                key={conv.id}
                onClick={() => {
                  setActiveConversation(conv);
                  navigate(`/chat/${conv.id}`);
                }}
                className={`flex items-start gap-3 p-3.5 transition-all cursor-pointer select-none ${
                  isActive
                    ? 'bg-blue-50/80 border-l-4 border-blue-600'
                    : 'hover:bg-slate-50/90 border-l-4 border-transparent'
                }`}
              >
                {/* Avatar with Online indicator */}
                <div className="relative shrink-0 pt-0.5">
                  {isDirect && conv.otherUser ? (
                    <UserAvatar
                      user={{
                        id: conv.otherUser.id,
                        name: conv.otherUser.name,
                        avatar: conv.otherUser.avatar,
                        role: conv.otherUser.role,
                      }}
                      size="md"
                      showOnlineDot
                      isOnline={conv.isOnline}
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center shadow-2xs">
                      {getGroupIcon(conv.type)}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span
                      className={`text-xs truncate ${
                        conv.unreadCount > 0 ? 'font-bold text-slate-900' : 'font-semibold text-slate-800'
                      }`}
                    >
                      {conv.name}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0 font-medium">
                      {formatLastActivity(conv.lastMessageAt || conv.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <p
                      className={`text-xs truncate leading-normal ${
                        conv.unreadCount > 0 ? 'font-semibold text-slate-800' : 'text-slate-500'
                      }`}
                    >
                      {conv.lastSenderName && conv.type !== 'DIRECT' ? (
                        <span className="text-slate-400 mr-1">{conv.lastSenderName}:</span>
                      ) : null}
                      {conv.lastMessageText || t('chat.no_messages', 'Chưa có tin nhắn')}
                    </p>

                    {/* Indicators (Pin, Mute, Unread Pill) */}
                    <div className="flex items-center gap-1 shrink-0">
                      {conv.isPinned && <Pin className="w-3 h-3 text-amber-500 fill-amber-500" />}
                      {conv.isMuted && <BellOff className="w-3 h-3 text-slate-400" />}
                      {conv.unreadCount > 0 && (
                        <span className="min-w-4.5 h-4.5 px-1.5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                          {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal create group */}
      <CreateGroupChatModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
      />
    </aside>
  );
};
