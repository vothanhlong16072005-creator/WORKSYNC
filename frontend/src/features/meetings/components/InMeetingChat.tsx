import React, { useEffect, useRef, useState } from 'react';
import { Send, X } from 'lucide-react';
import type { Socket } from 'socket.io-client';
import type { ChatMessage } from '../types/meeting.types';

interface InMeetingChatProps {
  meetingId: string;
  socket: Socket | null;
  currentUser: { id: string; name: string; avatar?: string };
  isOpen: boolean;
  onClose: () => void;
}

export const InMeetingChat: React.FC<InMeetingChatProps> = ({
  meetingId,
  socket,
  currentUser,
  isOpen,
  onClose,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg]);
    };

    socket.on('chat-message', handleNewMessage);

    return () => {
      socket.off('chat-message', handleNewMessage);
    };
  }, [socket]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !socket) return;

    socket.emit('chat-message', {
      meetingId,
      text: inputText.trim(),
      sender: {
        id: currentUser.id,
        name: currentUser.name,
        avatar: currentUser.avatar,
      },
    });

    setInputText('');
  };

  return (
    <div className="w-80 h-full bg-card border-l border-border flex flex-col shadow-xl z-20">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-border bg-card">
        <h3 className="font-semibold text-sm text-foreground">Trò chuyện trong cuộc họp</h3>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-muted-foreground text-center px-4">
            Chưa có tin nhắn nào. Hãy gửi lời chào đầu tiên!
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.sender.id === currentUser.id;
            return (
              <div
                key={m.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
                  <span className="font-medium text-foreground">{m.sender.name}</span>
                  <span>•</span>
                  <span>
                    {new Date(m.createdAt).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div
                  className={`px-3 py-2 rounded-2xl text-xs max-w-[85%] break-words ${
                    isMe
                      ? 'bg-primary text-primary-foreground rounded-tr-xs'
                      : 'bg-muted text-foreground rounded-tl-xs'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input bar */}
      <form onSubmit={handleSend} className="p-3 border-t border-border bg-card flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Nhập tin nhắn..."
          className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-input bg-background text-foreground focus:ring-2 focus:ring-primary focus:outline-hidden"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 text-primary-foreground bg-primary hover:bg-primary/90 rounded-xl transition-colors disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
