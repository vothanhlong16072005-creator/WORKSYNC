import { apiClient } from '@/lib/api-client';
import type {
  NotificationItem,
  NotificationsListResponse,
  ListNotificationsParams,
  UnreadCountResponse,
  PushSubscriptionDto,
} from '../types/notification.types';

export const notificationsApi = {
  async getNotifications(params?: ListNotificationsParams): Promise<NotificationsListResponse> {
    const res = await apiClient.get<NotificationsListResponse>('/notifications', { params });
    return res.data;
  },

  async getUnreadCount(): Promise<UnreadCountResponse> {
    const res = await apiClient.get<UnreadCountResponse>('/notifications/unread-count');
    return res.data;
  },

  async markAsRead(id: string): Promise<NotificationItem> {
    const res = await apiClient.patch<NotificationItem>(`/notifications/${id}/read`);
    return res.data;
  },

  async markAllAsRead(): Promise<{ success: boolean }> {
    const res = await apiClient.patch<{ success: boolean }>('/notifications/read-all');
    return res.data;
  },

  async deleteAllRead(): Promise<{ success: boolean }> {
    const res = await apiClient.delete<{ success: boolean }>('/notifications');
    return res.data;
  },

  async deleteNotification(id: string): Promise<{ success: boolean }> {
    const res = await apiClient.delete<{ success: boolean }>(`/notifications/${id}`);
    return res.data;
  },

  async subscribePush(dto: PushSubscriptionDto): Promise<unknown> {
    const res = await apiClient.post('/notifications/push-subscribe', dto);
    return res.data;
  },

  async unsubscribePush(endpoint: string): Promise<unknown> {
    const res = await apiClient.post('/notifications/push-unsubscribe', { endpoint });
    return res.data;
  },
};
