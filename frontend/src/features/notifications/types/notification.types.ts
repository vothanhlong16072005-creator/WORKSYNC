export type NotificationType =
  | 'MEETING'
  | 'ATTENDANCE_APPROVAL'
  | 'QUICK_TASK'
  | 'MENTION'
  | 'TASK'
  | 'SYSTEM';

export interface NotificationActor {
  id: string;
  name: string;
  avatar?: string | null;
  role?: string | null;
}

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  category: string;
  title: string;
  body?: string | null;
  data?: {
    url?: string;
    meetingId?: string;
    taskId?: string;
    requestId?: string;
    status?: string;
    contextType?: string;
    [key: string]: unknown;
  } | null;
  icon?: string | null;
  isRead: boolean;
  readAt?: string | null;
  actorId?: string | null;
  actor?: NotificationActor | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListNotificationsParams {
  page?: number;
  limit?: number;
  isRead?: boolean;
  type?: NotificationType;
  category?: string;
}

export interface NotificationsListResponse {
  items: NotificationItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface UnreadCountResponse {
  unreadCount: number;
}

export interface PushSubscriptionDto {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
}
