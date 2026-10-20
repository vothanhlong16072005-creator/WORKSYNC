import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChatStore } from '../stores/chat.store';
import { chatApi } from '../api/chat.api';
import type { ChatConversation } from '../types/chat.types';

vi.mock('../api/chat.api', () => ({
  chatApi: {
    getConversations: vi.fn(),
    getOrCreateDirect: vi.fn(),
    getMessages: vi.fn(),
    sendMessage: vi.fn(),
    uploadFile: vi.fn(),
    markAsRead: vi.fn(),
    togglePin: vi.fn(),
    toggleMute: vi.fn(),
    toggleReaction: vi.fn(),
    deleteMessage: vi.fn(),
  },
}));

vi.mock('socket.io-client', () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  })),
}));

describe('useChatStore', () => {
  const mockConv: ChatConversation = {
    id: 'conv-1',
    type: 'DIRECT',
    name: 'Nguyễn Văn A',
    createdById: 'u-1',
    unreadCount: 2,
    isPinned: false,
    isMuted: false,
    participantCount: 2,
    participantIds: ['u-1', 'u-2'],
    createdAt: '2026-10-20T00:00:00.000Z',
    updatedAt: '2026-10-20T00:00:00.000Z',
    otherUser: {
      id: 'u-2',
      name: 'Nguyễn Văn A',
      avatar: null,
      role: 'EMPLOYEE',
      isOnline: true,
    },
    isOnline: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    useChatStore.setState({
      conversations: [],
      activeConversation: null,
      messages: [],
      activeFilter: 'ALL',
      searchQuery: '',
      isLoadingConversations: false,
      isLoadingMessages: false,
      isSending: false,
      replyingTo: null,
      typingMap: {},
      socket: null,
    });
  });

  it('1. fetchConversations loads and updates state', async () => {
    vi.mocked(chatApi.getConversations).mockResolvedValueOnce([mockConv]);

    await useChatStore.getState().fetchConversations();

    expect(chatApi.getConversations).toHaveBeenCalledWith({
      type: 'ALL',
      search: undefined,
    });
    expect(useChatStore.getState().conversations).toHaveLength(1);
    expect(useChatStore.getState().conversations[0].name).toBe('Nguyễn Văn A');
  });

  it('2. setActiveConversation loads messages and marks as read', async () => {
    vi.mocked(chatApi.getMessages).mockResolvedValueOnce({
      messages: [
        {
          id: 'm-1',
          conversationId: 'conv-1',
          senderId: 'u-2',
          type: 'TEXT',
          content: 'Xin chào',
          isEdited: false,
          createdAt: '2026-10-20T01:00:00.000Z',
          updatedAt: '2026-10-20T01:00:00.000Z',
        },
      ],
      nextCursor: null,
      hasMore: false,
    });
    vi.mocked(chatApi.markAsRead).mockResolvedValueOnce({ success: true });

    await useChatStore.getState().setActiveConversation(mockConv);

    expect(useChatStore.getState().activeConversation?.id).toBe('conv-1');
    expect(useChatStore.getState().messages).toHaveLength(1);
    expect(chatApi.markAsRead).toHaveBeenCalledWith('conv-1');
  });

  it('3. togglePin updates store conversation isPinned status', async () => {
    useChatStore.setState({ conversations: [mockConv] });
    vi.mocked(chatApi.togglePin).mockResolvedValueOnce({ isPinned: true });

    await useChatStore.getState().togglePin('conv-1');

    expect(useChatStore.getState().conversations[0].isPinned).toBe(true);
  });

  it('4. toggleMute updates store conversation isMuted status', async () => {
    useChatStore.setState({ conversations: [mockConv] });
    vi.mocked(chatApi.toggleMute).mockResolvedValueOnce({ isMuted: true });

    await useChatStore.getState().toggleMute('conv-1');

    expect(useChatStore.getState().conversations[0].isMuted).toBe(true);
  });

  it('5. setFilter updates filter and triggers fetchConversations', async () => {
    vi.mocked(chatApi.getConversations).mockResolvedValueOnce([]);

    useChatStore.getState().setFilter('DIRECT');

    expect(useChatStore.getState().activeFilter).toBe('DIRECT');
    expect(chatApi.getConversations).toHaveBeenCalledWith({
      type: 'DIRECT',
      search: undefined,
    });
  });
});
