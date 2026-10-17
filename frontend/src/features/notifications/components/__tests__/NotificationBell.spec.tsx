import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationBell } from '../NotificationBell';
import { useNotificationsStore } from '../../stores/notifications.store';
import { useAuthStore } from '@/stores/auth.store';

vi.mock('../../hooks/useNotificationsSocket', () => ({
  useNotificationsSocket: () => ({ socket: null }),
}));

describe('NotificationBell', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 'u-1', name: 'Tester', email: 'test@worksync.com', role: 'EMPLOYEE' },
      accessToken: 'token-123',
    });
    useNotificationsStore.setState({
      unreadCount: 3,
      dropdownItems: [],
      dropdownLoading: false,
    });
  });

  it('renders bell button with unread count badge', () => {
    render(
      <BrowserRouter>
        <NotificationBell />
      </BrowserRouter>,
    );

    expect(screen.getByRole('button', { name: /thông báo/i })).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('opens dropdown when bell icon is clicked', () => {
    render(
      <BrowserRouter>
        <NotificationBell />
      </BrowserRouter>,
    );

    const bellBtn = screen.getByRole('button', { name: /thông báo/i });
    fireEvent.click(bellBtn);

    expect(screen.getByText('Xem tất cả thông báo')).toBeInTheDocument();
  });

  it('hides badge when unreadCount is 0', () => {
    useNotificationsStore.setState({ unreadCount: 0 });

    render(
      <BrowserRouter>
        <NotificationBell />
      </BrowserRouter>,
    );

    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });
});
