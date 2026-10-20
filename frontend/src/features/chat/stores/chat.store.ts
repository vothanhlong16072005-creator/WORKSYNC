import { create } from 'zustand';
import { io, Socket } from 'socket.io-client';
import { chatApi } from '../api/chat.api';
import type {
  ChatConversation,
  ChatMessage,
  SendMessagePayload,
} from '../types/chat.types';
import { toast } from 'sonner';

interface ChatStoreState {
  conversations: ChatConversation[];
  activeConversation: ChatConversation | null;
  messages: ChatMessage[];
  hasMoreMessages: boolean;
  nextCursor: string | null;
  activeFilter: 'ALL' | 'DIRECT' | 'GROUP';
  searchQuery: string;
  isLoadingConversations: boolean;
  isLoadingMessages: boolean;
  isSending: boolean;
  typingMap: Record<string, { userId: string; userName: string }>;
  replyingTo: ChatMessage | null;
  socket: Socket | null;

  // Actions
  initSocket: (token: string) => void;
  disconnectSocket: () => void;
  fetchConversations: () => Promise<void>;
  setActiveConversation: (conversation: ChatConversation | null) => Promise<void>;
  loadMessages: (conversationId: string, reset?: boolean) => Promise<void>;
  loadMoreMessages: () => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  sendFileMessage: (file: File) => Promise<void>;
  setReplyingTo: (message: ChatMessage | null) => void;
  markAsRead: (conversationId: string) => Promise<void>;
  togglePin: (conversationId: string) => Promise<void>;
  toggleMute: (conversationId: string) => Promise<void>;
  toggleReaction: (messageId: string, emoji: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  setFilter: (filter: 'ALL' | 'DIRECT' | 'GROUP') => void;
  setSearchQuery: (query: string) => void;
  startTyping: (conversationId: string) => void;
  stopTyping: (conversationId: string) => void;
  startDirectChat: (targetUserId: string) => Promise<string>;
}

export const useChatStore = create<ChatStoreState>((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  hasMoreMessages: false,
  nextCursor: null,
  activeFilter: 'ALL',
  searchQuery: '',
  isLoadingConversations: false,
  isLoadingMessages: false,
  isSending: false,
  typingMap: {},
  replyingTo: null,
  socket: null,

  initSocket: (token: string) => {
    if (get().socket) return;

    const backendUrl =
      import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:4000';

    const socket = io(`${backendUrl}/chat`, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1500,
    });

    socket.on('connect', () => {
      const active = get().activeConversation;
      if (active) {
        socket.emit('join_conversation', { conversationId: active.id });
      }
    });

    socket.on('new_message', (data: { conversationId: string; message: ChatMessage }) => {
      const { activeConversation, messages, conversations } = get();

      // Nếu đang xem đúng conversation này -> thêm message vào danh sách
      if (activeConversation?.id === data.conversationId) {
        if (!messages.some((m) => m.id === data.message.id)) {
          set({ messages: [...messages, data.message] });
          // Tự động mark as read
          get().markAsRead(data.conversationId);
        }
      }

      // Cập nhật lastMessage & unreadCount trong conversation list
      set({
        conversations: conversations.map((conv) => {
          if (conv.id === data.conversationId) {
            const isCurrentActive = activeConversation?.id === data.conversationId;
            return {
              ...conv,
              lastMessageText:
                data.message.type === 'FILE'
                  ? `[Tệp] ${data.message.fileName || 'Tệp đính kèm'}`
                  : data.message.content,
              lastMessageAt: data.message.createdAt,
              lastSenderId: data.message.senderId,
              lastSenderName: data.message.sender?.name,
              unreadCount: isCurrentActive ? 0 : conv.unreadCount + 1,
            };
          }
          return conv;
        }),
      });
    });

    socket.on('user_typing', (data: { userId: string; userName: string; conversationId: string; isTyping: boolean }) => {
      const { typingMap } = get();
      if (data.isTyping) {
        set({
          typingMap: {
            ...typingMap,
            [data.conversationId]: { userId: data.userId, userName: data.userName },
          },
        });
      } else {
        const next = { ...typingMap };
        delete next[data.conversationId];
        set({ typingMap: next });
      }
    });

    socket.on('reaction_updated', (data: { conversationId: string; messageId: string; reactions: any[] }) => {
      const { messages } = get();
      const reactionsGrouped: Record<string, string[]> = {};
      for (const r of data.reactions) {
        if (!reactionsGrouped[r.emoji]) reactionsGrouped[r.emoji] = [];
        reactionsGrouped[r.emoji].push(r.userId);
      }

      set({
        messages: messages.map((m) =>
          m.id === data.messageId
            ? { ...m, reactions: data.reactions, reactionsGrouped }
            : m,
        ),
      });
    });

    socket.on('message_deleted', (data: { conversationId: string; messageId: string }) => {
      const { messages } = get();
      set({
        messages: messages.filter((m) => m.id !== data.messageId),
      });
    });

    socket.on('read_receipt', (data: { conversationId: string; userId: string; lastReadAt: string }) => {
      const { conversations } = get();
      set({
        conversations: conversations.map((c) =>
          c.id === data.conversationId
            ? { ...c, lastReadAt: data.lastReadAt }
            : c,
        ),
      });
    });

    socket.on('presence:update', (data: { userId: string; status: 'ONLINE' | 'OFFLINE' }) => {
      const { conversations } = get();
      const isOnline = data.status === 'ONLINE';
      set({
        conversations: conversations.map((c) => {
          if (c.type === 'DIRECT' && c.otherUser?.id === data.userId) {
            return {
              ...c,
              isOnline,
              otherUser: { ...c.otherUser, isOnline },
            };
          }
          return c;
        }),
      });
    });

    set({ socket });
  },

  disconnectSocket: () => {
    const { socket } = get();
    if (socket) {
      socket.disconnect();
      set({ socket: null });
    }
  },

  fetchConversations: async () => {
    set({ isLoadingConversations: true });
    try {
      const { activeFilter, searchQuery } = get();
      const data = await chatApi.getConversations({
        type: activeFilter,
        search: searchQuery || undefined,
      });
      set({ conversations: data, isLoadingConversations: false });
    } catch (err: unknown) {
      console.error('Failed to fetch conversations:', err);
      set({ isLoadingConversations: false });
    }
  },

  setActiveConversation: async (conv) => {
    const prevConv = get().activeConversation;
    const socket = get().socket;

    if (prevConv && socket) {
      socket.emit('leave_conversation', { conversationId: prevConv.id });
    }

    set({ activeConversation: conv, messages: [], replyingTo: null });

    if (conv) {
      if (socket) {
        socket.emit('join_conversation', { conversationId: conv.id });
      }
      await get().loadMessages(conv.id, true);
      get().markAsRead(conv.id);
    }
  },

  loadMessages: async (conversationId: string, reset = false) => {
    if (reset) {
      set({ messages: [], nextCursor: null, hasMoreMessages: false });
    }
    set({ isLoadingMessages: true });
    try {
      const res = await chatApi.getMessages(conversationId, undefined, 50);
      set({
        messages: res.messages,
        nextCursor: res.nextCursor,
        hasMoreMessages: res.hasMore,
        isLoadingMessages: false,
      });
    } catch (err: unknown) {
      console.error('Failed to load messages:', err);
      set({ isLoadingMessages: false });
    }
  },

  loadMoreMessages: async () => {
    const { activeConversation, nextCursor, messages, isLoadingMessages, hasMoreMessages } = get();
    if (!activeConversation || !nextCursor || isLoadingMessages || !hasMoreMessages) return;

    set({ isLoadingMessages: true });
    try {
      const res = await chatApi.getMessages(activeConversation.id, nextCursor, 50);
      set({
        messages: [...res.messages, ...messages],
        nextCursor: res.nextCursor,
        hasMoreMessages: res.hasMore,
        isLoadingMessages: false,
      });
    } catch (err: unknown) {
      console.error('Failed to load more messages:', err);
      set({ isLoadingMessages: false });
    }
  },

  sendMessage: async (content: string) => {
    const { activeConversation, replyingTo } = get();
    if (!activeConversation || !content.trim()) return;

    set({ isSending: true });
    try {
      const payload: SendMessagePayload = {
        content: content.trim(),
        replyToId: replyingTo?.id || null,
      };
      await chatApi.sendMessage(activeConversation.id, payload);
      set({ isSending: false, replyingTo: null });
    } catch (err: unknown) {
      toast.error('Gửi tin nhắn thất bại');
      set({ isSending: false });
    }
  },

  sendFileMessage: async (file: File) => {
    const { activeConversation, replyingTo } = get();
    if (!activeConversation) return;

    set({ isSending: true });
    try {
      await chatApi.uploadFile(activeConversation.id, file, replyingTo?.id || undefined);
      set({ isSending: false, replyingTo: null });
      toast.success('Đã gửi tệp thành công');
    } catch (err: unknown) {
      toast.error('Gửi tệp đính kèm thất bại');
      set({ isSending: false });
    }
  },

  setReplyingTo: (message) => {
    set({ replyingTo: message });
  },

  markAsRead: async (conversationId: string) => {
    try {
      await chatApi.markAsRead(conversationId);
      const { conversations } = get();
      set({
        conversations: conversations.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c,
        ),
      });
    } catch (err) {
      // Non-blocking
    }
  },

  togglePin: async (conversationId: string) => {
    try {
      const res = await chatApi.togglePin(conversationId);
      const { conversations } = get();
      set({
        conversations: conversations.map((c) =>
          c.id === conversationId ? { ...c, isPinned: res.isPinned } : c,
        ),
      });
      toast.success(res.isPinned ? 'Đã ghim cuộc trò chuyện' : 'Đã bỏ ghim');
    } catch (err) {
      toast.error('Thao tác ghim thất bại');
    }
  },

  toggleMute: async (conversationId: string) => {
    try {
      const res = await chatApi.toggleMute(conversationId);
      const { conversations } = get();
      set({
        conversations: conversations.map((c) =>
          c.id === conversationId ? { ...c, isMuted: res.isMuted } : c,
        ),
      });
      toast.success(res.isMuted ? 'Đã tắt thông báo' : 'Đã bật thông báo');
    } catch (err) {
      toast.error('Thao tác thông báo thất bại');
    }
  },

  toggleReaction: async (messageId: string, emoji: string) => {
    try {
      const res = await chatApi.toggleReaction(messageId, emoji);
      const { messages } = get();
      set({
        messages: messages.map((m) =>
          m.id === messageId ? { ...m, reactionsGrouped: res.reactionsGrouped } : m,
        ),
      });
    } catch (err) {
      toast.error('Không thể thả cảm xúc');
    }
  },

  deleteMessage: async (messageId: string) => {
    try {
      await chatApi.deleteMessage(messageId);
      const { messages } = get();
      set({
        messages: messages.filter((m) => m.id !== messageId),
      });
      toast.success('Đã xóa tin nhắn');
    } catch (err) {
      toast.error('Không có quyền xóa tin nhắn này');
    }
  },

  setFilter: (filter) => {
    set({ activeFilter: filter });
    get().fetchConversations();
  },

  setSearchQuery: (search) => {
    set({ searchQuery: search });
    get().fetchConversations();
  },

  startTyping: (conversationId: string) => {
    const socket = get().socket;
    if (socket) {
      socket.emit('typing_start', { conversationId });
    }
  },

  stopTyping: (conversationId: string) => {
    const socket = get().socket;
    if (socket) {
      socket.emit('typing_stop', { conversationId });
    }
  },

  startDirectChat: async (targetUserId: string) => {
    const conv = await chatApi.getOrCreateDirect(targetUserId);
    await get().fetchConversations();
    get().setActiveConversation(conv);
    return conv.id;
  },
}));
