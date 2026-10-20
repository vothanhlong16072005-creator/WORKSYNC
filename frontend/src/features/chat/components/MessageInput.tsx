import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Smile, X, CornerDownRight } from 'lucide-react';
import { useChatStore } from '../stores/chat.store';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const POPULAR_EMOJIS = ['👍', '❤️', '😂', '🎉', '🚀', '👀', '🔥', '👏', '🙏', '✨'];

export const MessageInput: React.FC = () => {
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const {
    activeConversation,
    sendMessage,
    sendFileMessage,
    isSending,
    replyingTo,
    setReplyingTo,
    startTyping,
    stopTyping,
  } = useChatStore();

  useEffect(() => {
    // Focus textarea khi đổi cuộc trò chuyện
    textareaRef.current?.focus();
  }, [activeConversation?.id]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);

    if (activeConversation) {
      startTyping(activeConversation.id);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(activeConversation.id);
      }, 2500);
    }
  };

  const handleSend = async () => {
    if (!content.trim() || isSending || !activeConversation) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    stopTyping(activeConversation.id);

    const textToSend = content;
    setContent('');
    await sendMessage(textToSend);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error('Kích thước tệp không được vượt quá 25MB');
      return;
    }

    await sendFileMessage(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleInsertEmoji = (emoji: string) => {
    setContent((prev) => prev + emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  return (
    <div className="relative border-t border-slate-200/90 bg-white p-3 sm:p-4">
      {/* Reply-to Banner */}
      {replyingTo && (
        <div className="mb-2 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 border border-slate-200/80 text-xs text-slate-600 animate-in fade-in slide-in-from-bottom-1">
          <div className="flex items-center gap-2 min-w-0">
            <CornerDownRight className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span className="font-semibold text-slate-800 shrink-0">
              {replyingTo.sender?.name || 'Tin nhắn'}:
            </span>
            <span className="truncate text-slate-500">
              {replyingTo.type === 'FILE' ? `[Tệp] ${replyingTo.fileName}` : replyingTo.content}
            </span>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Emoji Picker Popover */}
      {showEmojiPicker && (
        <div className="absolute bottom-16 left-4 z-40 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-100">
          {POPULAR_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleInsertEmoji(emoji)}
              className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center text-lg transition-transform hover:scale-125 cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
      />

      <div className="flex items-end gap-2">
        {/* Attachment & Emoji Action buttons */}
        <div className="flex items-center gap-0.5 pb-1">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending}
            title={t('chat.attach_file', 'Đính kèm tệp tin (Tối đa 25MB)')}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            <Paperclip className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            title={t('chat.insert_emoji', 'Chèn biểu tượng cảm xúc')}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              showEmojiPicker ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Smile className="w-4 h-4" />
          </button>
        </div>

        {/* Text Input area */}
        <div className="flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder={t('chat.type_message', 'Nhập tin nhắn... (Nhấn Enter để gửi, Shift+Enter xuống dòng)')}
            rows={1}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200/90 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white resize-none transition-all max-h-32 leading-relaxed"
            style={{ minHeight: '44px' }}
          />
        </div>

        {/* Send Button */}
        <div className="pb-1">
          <button
            type="button"
            onClick={handleSend}
            disabled={!content.trim() || isSending}
            title={t('chat.send', 'Gửi tin nhắn')}
            className="p-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 active:scale-95 transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-blue-600 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
