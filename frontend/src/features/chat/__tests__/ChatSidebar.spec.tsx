import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ChatSidebar } from '../components/ChatSidebar';
import { useChatStore } from '../stores/chat.store';

vi.mock('../api/chat.api', () => ({
  chatApi: {
    getConversations: vi.fn().mockResolvedValue([]),
    createGroup: vi.fn(),
  },
}));

describe('ChatSidebar', () => {
  it('1. Renders title and empty state when no conversations exist', () => {
    useChatStore.setState({
      conversations: [],
      isLoadingConversations: false,
      searchQuery: '',
      activeFilter: 'ALL',
    });

    render(
      <BrowserRouter>
        <ChatSidebar />
      </BrowserRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /Trò chuyện/i })).toBeInTheDocument();
    expect(screen.getByText(/Chưa có cuộc trò chuyện nào/i)).toBeInTheDocument();
  });

  it('2. Renders conversation item with name, last message, and unread count', () => {
    useChatStore.setState({
      conversations: [
        {
          id: 'c-1',
          type: 'DIRECT',
          name: 'Lê Hoàng Nam',
          lastMessageText: 'Tiến độ sprint thế nào rồi anh?',
          lastMessageAt: '2026-10-20T02:00:00.000Z',
          unreadCount: 4,
          isPinned: true,
          isMuted: false,
          createdById: 'u-1',
          participantCount: 2,
          participantIds: ['u-1', 'u-2'],
          createdAt: '2026-10-20T00:00:00.000Z',
          updatedAt: '2026-10-20T00:00:00.000Z',
          otherUser: {
            id: 'u-2',
            name: 'Lê Hoàng Nam',
            avatar: null,
            role: 'EMPLOYEE',
          },
        },
      ],
      isLoadingConversations: false,
      searchQuery: '',
      activeFilter: 'ALL',
    });

    render(
      <BrowserRouter>
        <ChatSidebar />
      </BrowserRouter>,
    );

    expect(screen.getByText('Lê Hoàng Nam')).toBeInTheDocument();
    expect(screen.getByText('Tiến độ sprint thế nào rồi anh?')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });
});
