import { BrowserRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationItem } from '../NotificationItem';
import type { NotificationItem as NotificationItemType } from '../../types/notification.types';

describe('NotificationItem', () => {
  const mockNotification: NotificationItemType = {
    id: 'n-1',
    userId: 'u-1',
    type: 'MEETING',
    category: 'meeting.created',
    title: 'Sprint 1 Planning Meeting',
    body: 'Bạn được mời tham gia cuộc họp dự án',
    data: { url: '/meetings/m-1' },
    isRead: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  it('renders category badge, title, and body', () => {
    render(
      <BrowserRouter>
        <NotificationItem notification={mockNotification} />
      </BrowserRouter>,
    );

    expect(screen.getByText('Họp trực tuyến')).toBeInTheDocument();
    expect(screen.getByText('Sprint 1 Planning Meeting')).toBeInTheDocument();
    expect(screen.getByText('Bạn được mời tham gia cuộc họp dự án')).toBeInTheDocument();
  });

  it('shows unread indicator when isRead is false', () => {
    render(
      <BrowserRouter>
        <NotificationItem notification={mockNotification} />
      </BrowserRouter>,
    );

    expect(screen.getByTitle('Chưa đọc')).toBeInTheDocument();
  });

  it('calls onItemClick when clicked', () => {
    const onItemClick = vi.fn();
    render(
      <BrowserRouter>
        <NotificationItem notification={mockNotification} onItemClick={onItemClick} />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByText('Sprint 1 Planning Meeting'));
    expect(onItemClick).toHaveBeenCalled();
  });
});
