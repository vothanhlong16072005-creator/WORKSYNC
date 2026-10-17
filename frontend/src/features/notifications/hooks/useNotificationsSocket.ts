import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationsStore } from '../stores/notifications.store';
import type { NotificationItem } from '../types/notification.types';

export function useNotificationsSocket() {
  const { accessToken, user } = useAuthStore();
  const { addRealtimeNotification, setUnreadCount, syncNotificationRead, fetchUnreadCount } =
    useNotificationsStore();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!accessToken || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    // Determine backend socket url
    const backendUrl =
      import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:4000';

    const socket = io(`${backendUrl}/notifications`, {
      auth: { token: accessToken },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      fetchUnreadCount();
    });

    socket.on('notification:new', (notification: NotificationItem) => {
      addRealtimeNotification(notification);

      // Trigger pop-up toast
      toast(notification.title, {
        description: notification.body || undefined,
        action: notification.data?.url
          ? {
              label: 'Xem',
              onClick: () => {
                window.location.href = notification.data!.url as string;
              },
            }
          : undefined,
      });
    });

    socket.on('notification:unread-count', (data: { unreadCount: number }) => {
      setUnreadCount(data.unreadCount);
    });

    socket.on('notification:read-sync', (data: { id: string }) => {
      syncNotificationRead(data.id);
      fetchUnreadCount();
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [accessToken, user?.id]);

  return {
    socket: socketRef.current,
  };
}
