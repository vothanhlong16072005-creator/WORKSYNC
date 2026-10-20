import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ChatPage } from '../pages/ChatPage';
import { useChatStore } from '../stores/chat.store';

vi.mock('../api/chat.api', () => ({
  chatApi: {
    getConversations: vi.fn().mockResolvedValue([]),
    getMessages: vi.fn().mockResolvedValue({ messages: [], nextCursor: null, hasMore: false }),
  },
}));

describe('ChatPage', () => {
  it('1. Renders ChatPage with sidebar and empty prompt', () => {
    useChatStore.setState({
      conversations: [],
      activeConversation: null,
      messages: [],
      isLoadingConversations: false,
    });

    render(
      <BrowserRouter>
        <ChatPage />
      </BrowserRouter>,
    );

    expect(screen.getByRole('heading', { level: 1, name: /Trò chuyện/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: /Chọn cuộc trò chuyện/i })).toBeInTheDocument();
  });
});
