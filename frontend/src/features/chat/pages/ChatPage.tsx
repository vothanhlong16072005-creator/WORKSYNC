import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useChatStore } from '../stores/chat.store';
import { useAuthStore } from '@/stores/auth.store';
import { ChatSidebar } from '../components/ChatSidebar';
import { ConversationView } from '../components/ConversationView';
import { useTranslation } from 'react-i18next';

export const ChatPage: React.FC = () => {
  const { t } = useTranslation();
  const { conversationId } = useParams();
  const navigate = useNavigate();

  const token = useAuthStore((s) => s.accessToken);
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    fetchConversations,
    initSocket,
    disconnectSocket,
  } = useChatStore();

  // Khởi tạo socket và fetch conversations khi mount
  useEffect(() => {
    if (token) {
      initSocket(token);
    }
    fetchConversations();

    return () => {
      disconnectSocket();
    };
  }, [token]);

  // Đồng bộ URL params với active conversation
  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const found = conversations.find((c) => c.id === conversationId);
      if (found && activeConversation?.id !== found.id) {
        setActiveConversation(found);
      }
    }
  }, [conversationId, conversations]);

  // Khi activeConversation đổi, cập nhật URL nếu cần
  const handleBackToSidebar = () => {
    setActiveConversation(null);
    navigate('/chat');
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-white overflow-hidden">
      {/* Sidebar: Ẩn trên mobile khi đang xem cuộc trò chuyện */}
      <div
        className={`h-full ${
          activeConversation ? 'hidden md:flex' : 'flex w-full md:w-auto'
        }`}
      >
        <ChatSidebar />
      </div>

      {/* Main Conversation Stream */}
      <div
        className={`flex-1 flex flex-col h-full overflow-hidden ${
          !activeConversation ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Nút quay lại trên mobile */}
        {activeConversation && (
          <div className="md:hidden flex items-center gap-2 p-2.5 bg-white border-b border-slate-200">
            <button
              onClick={handleBackToSidebar}
              className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-600 flex items-center gap-1 text-xs font-semibold cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t('chat.back_to_list', 'Danh sách')}</span>
            </button>
            <span className="text-xs font-bold text-slate-800 truncate ml-2">
              {activeConversation.name}
            </span>
          </div>
        )}

        <ConversationView />
      </div>
    </div>
  );
};
