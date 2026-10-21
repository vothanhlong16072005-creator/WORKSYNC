import React, { useEffect, useRef, useState } from 'react';
import {
  FileText,
  Download,
  CornerDownRight,
  Trash2,
  ArrowDown,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { useChatStore } from '../stores/chat.store';
import { useAuthStore } from '@/stores/auth.store';
import { UserAvatar } from '@/components/ui/UserAvatar';
import type { ChatMessage } from '../types/chat.types';
import { useTranslation } from 'react-i18next';
import {
  formatDateHeader,
  getDateKey,
  formatTime,
  formatFileSize,
} from '../utils/chat-date';

const QUICK_REACTION_EMOJIS = ['👍', '❤️', '😂', '🎉', '🚀'];

export const MessageList: React.FC = () => {
  const { t } = useTranslation();
  const currentUser = useAuthStore((s) => s.user);
  const {
    messages,
    isLoadingMessages,
    hasMoreMessages,
    loadMoreMessages,
    toggleReaction,
    deleteMessage,
    setReplyingTo,
  } = useChatStore();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Auto scroll down on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Group messages by date
  const groupedMessages: { date: string; items: ChatMessage[] }[] = [];
  let currentDate = '';
  let currentGroup: ChatMessage[] = [];

  messages.forEach((msg) => {
    const d = getDateKey(msg.createdAt);
    if (d !== currentDate) {
      if (currentGroup.length > 0) {
        groupedMessages.push({ date: currentDate, items: currentGroup });
      }
      currentDate = d;
      currentGroup = [msg];
    } else {
      currentGroup.push(msg);
    }
  });
  if (currentGroup.length > 0) {
    groupedMessages.push({ date: currentDate, items: currentGroup });
  }

const getFullFileUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  const backendBase =
    import.meta.env.VITE_API_URL?.replace(/\/api$/, '') ||
    import.meta.env.VITE_API_BASE_URL?.replace(/\/api$/, '') ||
    'http://localhost:4000';
  return `${backendBase}${url.startsWith('/') ? '' : '/'}${url}`;
};

  const renderMessageContent = (msg: ChatMessage, isOwn: boolean) => {
    if (msg.type === 'FILE' && msg.fileUrl) {
      const isImg = msg.fileMime?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/i.test(msg.fileName || '');
      const fullUrl = getFullFileUrl(msg.fileUrl);

      if (isImg) {
        return (
          <div className="space-y-1.5">
            <div
              onClick={() => setPreviewImage(fullUrl)}
              className="relative max-w-xs rounded-xl overflow-hidden border border-black/10 cursor-pointer group"
            >
              <img
                src={fullUrl}
                alt={msg.fileName || 'Ảnh'}
                className="w-full max-h-60 object-cover transition-transform group-hover:scale-105"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                <ExternalLink className="w-5 h-5 drop-shadow" />
              </div>
            </div>
            {msg.fileName && (
              <p className={`text-[11px] truncate ${isOwn ? 'text-blue-100' : 'text-slate-500'}`}>
                {msg.fileName} ({formatFileSize(msg.fileSize)})
              </p>
            )}
          </div>
        );
      }

      // Other documents / zip / pdf
      return (
        <a
          href={fullUrl}
          target="_blank"
          rel="noopener noreferrer"
          download={msg.fileName || true}
          className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
            isOwn
              ? 'bg-blue-700/60 hover:bg-blue-700 text-white'
              : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200/80'
          }`}
        >
          <div className={`p-2 rounded-lg ${isOwn ? 'bg-white/20' : 'bg-blue-50 text-blue-600'}`}>
            <FileText className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <p className="text-xs font-semibold truncate">{msg.fileName || 'Tệp đính kèm'}</p>
            <p className={`text-[10px] ${isOwn ? 'text-blue-200' : 'text-slate-400'}`}>
              {formatFileSize(msg.fileSize)}
            </p>
          </div>
          <Download className="w-4 h-4 opacity-70 shrink-0" />
        </a>
      );
    }

    return <p className="text-sm whitespace-pre-wrap leading-relaxed break-words">{msg.content}</p>;
  };

  return (
    <div
      ref={listContainerRef}
      className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-slate-50/60 scroll-smooth"
    >
      {/* Load More Button */}
      {hasMoreMessages && (
        <div className="flex justify-center pb-2">
          <button
            onClick={loadMoreMessages}
            disabled={isLoadingMessages}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
          >
            {isLoadingMessages ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ArrowDown className="w-3.5 h-3.5 rotate-180" />
            )}
            <span>{t('chat.load_older', 'Tải tin nhắn cũ hơn')}</span>
          </button>
        </div>
      )}

      {/* Grouped Messages by Date */}
      {groupedMessages.map((group) => (
        <div key={group.date} className="space-y-3">
          {/* Date Header Ribbon */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="px-3 py-0.5 rounded-full bg-slate-200/70 text-[11px] font-semibold text-slate-600 tracking-wide">
              {formatDateHeader(group.date)}
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Messages */}
          {group.items.map((msg) => {
            const isOwn = msg.senderId === currentUser?.id;
            const isSystem = msg.type === 'SYSTEM';

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center my-2">
                  <span className="px-3.5 py-1 rounded-full bg-slate-200/60 text-slate-600 text-xs font-medium">
                    {msg.content}
                  </span>
                </div>
              );
            }

            const isHovered = hoveredMessageId === msg.id;

            return (
              <div
                key={msg.id}
                onMouseEnter={() => setHoveredMessageId(msg.id)}
                onMouseLeave={() => setHoveredMessageId(null)}
                className={`group relative flex gap-2.5 items-end ${
                  isOwn ? 'flex-row-reverse justify-start' : 'flex-row justify-start'
                }`}
              >
                {/* Sender Avatar */}
                {!isOwn && (
                  <UserAvatar
                    user={{
                      id: msg.sender?.id || msg.senderId,
                      name: msg.sender?.name || 'Người dùng',
                      avatar: msg.sender?.avatar,
                      role: msg.sender?.role,
                    }}
                    size="sm"
                    className="shrink-0 mb-1"
                  />
                )}

                {/* Message Bubble + Meta */}
                <div className={`max-w-[80%] sm:max-w-[70%] flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                  {/* Sender Name for group chat */}
                  {!isOwn && (
                    <span className="text-[11px] font-medium text-slate-500 mb-1 ml-1">
                      {msg.sender?.name}
                    </span>
                  )}

                  {/* Quoted Message (if replied) */}
                  {msg.replyTo && (
                    <div
                      className={`mb-1 px-3 py-1.5 rounded-xl text-xs max-w-full border-l-3 ${
                        isOwn
                          ? 'bg-blue-700/30 text-slate-700 border-blue-400'
                          : 'bg-slate-100 text-slate-600 border-slate-300'
                      }`}
                    >
                      <span className="font-semibold text-slate-800 mr-1.5">
                        {msg.replyTo.sender?.name || 'Tin nhắn'}:
                      </span>
                      <span className="truncate">
                        {msg.replyTo.type === 'FILE' ? `[Tệp] ${msg.replyTo.fileName}` : msg.replyTo.content}
                      </span>
                    </div>
                  )}

                  {/* Bubble Container */}
                  <div
                    className={`relative px-4 py-2.5 shadow-2xs ${
                      isOwn
                        ? 'bg-blue-600 text-white rounded-2xl rounded-tr-xs'
                        : 'bg-white border border-slate-200/90 text-slate-900 rounded-2xl rounded-tl-xs'
                    }`}
                  >
                    {renderMessageContent(msg, isOwn)}

                    {/* Timestamp & Edited note */}
                    <div
                      className={`flex items-center gap-1 mt-1 text-[10px] select-none ${
                        isOwn ? 'text-blue-100 justify-end' : 'text-slate-400 justify-end'
                      }`}
                    >
                      <span>{formatTime(msg.createdAt)}</span>
                      {msg.isEdited && <span>(đã sửa)</span>}
                    </div>
                  </div>

                  {/* Reactions Pills */}
                  {msg.reactionsGrouped && Object.keys(msg.reactionsGrouped).length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {Object.entries(msg.reactionsGrouped).map(([emoji, userIds]) => {
                        const hasReacted = currentUser?.id ? userIds.includes(currentUser.id) : false;
                        return (
                          <button
                            key={emoji}
                            onClick={() => toggleReaction(msg.id, emoji)}
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors cursor-pointer border ${
                              hasReacted
                                ? 'bg-blue-50 border-blue-200 text-blue-700 font-bold'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <span>{emoji}</span>
                            <span className="text-[10px]">{userIds.length}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Floating Action Strip on Hover */}
                {isHovered && (
                  <div
                    className={`absolute z-20 -top-4 flex items-center gap-0.5 bg-white rounded-xl shadow-md border border-slate-200 px-1 py-0.5 animate-in fade-in zoom-in-95 ${
                      isOwn ? 'right-12' : 'left-12'
                    }`}
                  >
                    {/* Quick Reactions */}
                    {QUICK_REACTION_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => toggleReaction(msg.id, emoji)}
                        className="w-6 h-6 rounded-lg hover:bg-slate-100 flex items-center justify-center text-xs transition-transform hover:scale-125 cursor-pointer"
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    ))}

                    <div className="w-px h-3.5 bg-slate-200 mx-0.5" />

                    {/* Reply button */}
                    <button
                      type="button"
                      onClick={() => setReplyingTo(msg)}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 cursor-pointer"
                      title={t('chat.reply', 'Trả lời')}
                    >
                      <CornerDownRight className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete button (only sender or admin) */}
                    {(isOwn || currentUser?.role === 'ADMIN') && (
                      <button
                        type="button"
                        onClick={() => deleteMessage(msg.id)}
                        className="p-1 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 cursor-pointer"
                        title={t('chat.delete', 'Xóa')}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}

      <div ref={messagesEndRef} />

      {/* Lightbox Modal for Image Preview */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-in fade-in"
        >
          <img
            src={previewImage}
            alt="Preview"
            className="max-w-full max-h-[90vh] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
