import React, { useEffect, useRef, useState } from 'react';
import { Send, X, Paperclip, Download, FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { Socket } from 'socket.io-client';
import type { ChatMessage } from '../types/meeting.types';

interface InMeetingChatProps {
  meetingId: string;
  socket: Socket | null;
  currentUser: { id: string; name: string; avatar?: string };
  isOpen: boolean;
  onClose: () => void;
  initialMessages?: ChatMessage[];
  unreadCount?: number;
  onRead?: () => void;
}

export const InMeetingChat: React.FC<InMeetingChatProps> = ({
  meetingId,
  socket,
  currentUser,
  isOpen,
  onClose,
  initialMessages = [],
  unreadCount = 0,
  onRead,
}) => {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    url: string;
    size: number;
    type: string;
  } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages((prev) => {
        const knownIds = new Set(prev.map((m) => m.id));
        const merged = [...prev, ...initialMessages.filter((m) => !knownIds.has(m.id))];
        return merged.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      });
    }
  }, [initialMessages]);

  useEffect(() => {
    if (isOpen) {
      onRead?.();
    }
  }, [isOpen, onRead]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
      if (isOpen) {
        onRead?.();
      }
    };

    const handleChatHistory = ({ messages: history }: { messages: ChatMessage[] }) => {
      if (Array.isArray(history)) {
        setMessages(history);
      }
    };

    socket.on('chat-message', handleNewMessage);
    socket.on('chat-history', handleChatHistory);

    return () => {
      socket.off('chat-message', handleNewMessage);
      socket.off('chat-history', handleChatHistory);
    };
  }, [socket, isOpen, onRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      toast.error('Kích thước tệp tối đa là 15MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelectedFile({
          name: file.name,
          url: reader.result,
          size: file.size,
          type: file.type,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedFile) || !socket) return;

    socket.emit('chat-message', {
      meetingId,
      text: inputText.trim() || (selectedFile ? `Đã gửi tệp: ${selectedFile.name}` : ''),
      sender: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
      },
      attachment: selectedFile || undefined,
    });

    setInputText('');
    setSelectedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-80 sm:w-88 h-full bg-white border-l border-slate-200 flex flex-col shadow-xl z-20 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-200 bg-white/95 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm text-slate-800">
            {t('meeting_room.chat_title', 'Trò chuyện trong cuộc họp')}
          </h3>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500 text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Đóng"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs bg-slate-50/50">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-center px-4">
            <p className="text-xs">
              {t(
                'meeting_room.no_messages',
                'Chưa có tin nhắn nào. Bạn có thể gửi tin nhắn hoặc chia sẻ tài liệu!',
              )}
            </p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender.id === currentUser.id;
            return (
              <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1">
                  <span className="font-semibold text-slate-700">
                    {isMe ? `${m.sender.name} (${t('meeting_room.you', 'Bạn')})` : m.sender.name}
                  </span>
                  <span>•</span>
                  <span>
                    {new Date(m.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div
                  className={`px-3.5 py-2.5 rounded-2xl text-xs max-w-[85%] break-words leading-relaxed shadow-xs ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-tr-xs'
                      : 'bg-white text-slate-800 rounded-tl-xs border border-slate-200/90'
                  }`}
                >
                  <p>{m.text}</p>

                  {/* Attachment in message */}
                  {m.attachment && (
                    <div
                      className={`mt-2 p-2 rounded-xl flex items-center justify-between gap-2 border ${
                        isMe
                          ? 'bg-blue-700/60 border-blue-500/60 text-white'
                          : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate text-[11px] font-medium" title={m.attachment.name}>
                          {m.attachment.name}
                        </span>
                      </div>
                      <a
                        href={m.attachment.url}
                        download={m.attachment.name}
                        target="_blank"
                        rel="noreferrer"
                        className={`p-1 rounded hover:bg-black/10 transition-colors shrink-0 ${
                          isMe ? 'text-white' : 'text-blue-600'
                        }`}
                        title="Tải tệp"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Selected file preview */}
      {selectedFile && (
        <div className="px-3 py-2 bg-blue-50 border-t border-blue-200 flex items-center justify-between text-xs text-blue-900">
          <div className="flex items-center gap-2 truncate">
            <Paperclip className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="truncate font-semibold">{selectedFile.name}</span>
            <span className="text-[10px] text-blue-500">
              ({(selectedFile.size / 1024).toFixed(0)} KB)
            </span>
          </div>
          <button
            onClick={() => {
              setSelectedFile(null);
              if (fileInputRef.current) fileInputRef.current.value = '';
            }}
            className="p-1 hover:bg-blue-100 rounded text-blue-700"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Input bar */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors shrink-0"
          title="Đính kèm tệp / tài liệu"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t('meeting_room.type_message', 'Nhập tin nhắn...')}
          className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-hidden transition-all"
        />

        <button
          type="submit"
          disabled={!inputText.trim() && !selectedFile}
          className="p-2 text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all disabled:opacity-40 disabled:hover:bg-blue-600 shrink-0 shadow-xs"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
