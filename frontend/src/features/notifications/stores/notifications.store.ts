import { create } from 'zustand';
import type { NotificationItem, NotificationType } from '../types/notification.types';
import { notificationsApi } from '../api/notifications.api';

export type FilterTab = 'ALL' | 'UNREAD' | 'READ';

interface NotificationsState {
  unreadCount: number;
  notifications: NotificationItem[];
  dropdownItems: NotificationItem[];
  loading: boolean;
  dropdownLoading: boolean;
  page: number;
  hasMore: boolean;
  filterTab: FilterTab;
  filterType: NotificationType | 'ALL';

  setUnreadCount: (count: number) => void;
  fetchUnreadCount: () => Promise<void>;
  fetchDropdownItems: () => Promise<void>;
  fetchNotifications: (reset?: boolean) => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteAllRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  addRealtimeNotification: (item: NotificationItem) => void;
  syncNotificationRead: (id: string) => void;
  setFilterTab: (tab: FilterTab) => void;
  setFilterType: (type: NotificationType | 'ALL') => void;
}

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  unreadCount: 0,
  notifications: [],
  dropdownItems: [],
  loading: false,
  dropdownLoading: false,
  page: 1,
  hasMore: true,
  filterTab: 'ALL',
  filterType: 'ALL',

  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),

  fetchUnreadCount: async () => {
    try {
      const res = await notificationsApi.getUnreadCount();
      set({ unreadCount: res.unreadCount });
    } catch {
      // Silent fail
    }
  },

  fetchDropdownItems: async () => {
    set({ dropdownLoading: true });
    try {
      const res = await notificationsApi.getNotifications({ page: 1, limit: 5 });
      set({ dropdownItems: res.items, dropdownLoading: false });
    } catch {
      set({ dropdownLoading: false });
    }
  },

  fetchNotifications: async (reset = false) => {
    const { page, notifications, filterTab, filterType, loading } = get();
    if (loading && !reset) return;

    const targetPage = reset ? 1 : page;
    set({ loading: true });

    try {
      const isRead =
        filterTab === 'UNREAD' ? false : filterTab === 'READ' ? true : undefined;
      const type = filterType !== 'ALL' ? filterType : undefined;

      const res = await notificationsApi.getNotifications({
        page: targetPage,
        limit: 20,
        isRead,
        type,
      });

      set({
        notifications: reset ? res.items : [...notifications, ...res.items],
        page: targetPage + 1,
        hasMore: res.page < res.totalPages,
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  markAsRead: async (id: string) => {
    // Optimistic update
    set((state) => ({
      unreadCount: Math.max(0, state.unreadCount - 1),
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
      ),
      dropdownItems: state.dropdownItems.map((n) =>
        n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n,
      ),
    }));

    try {
      await notificationsApi.markAsRead(id);
    } catch {
      // Revert if needed
      get().fetchUnreadCount();
    }
  },

  markAllAsRead: async () => {
    set((state) => ({
      unreadCount: 0,
      notifications: state.notifications.map((n) => ({
        ...n,
        isRead: true,
        readAt: new Date().toISOString(),
      })),
      dropdownItems: state.dropdownItems.map((n) => ({
        ...n,
        isRead: true,
        readAt: new Date().toISOString(),
      })),
    }));

    try {
      await notificationsApi.markAllAsRead();
    } catch {
      get().fetchUnreadCount();
    }
  },

  deleteAllRead: async () => {
    set((state) => ({
      notifications: state.notifications.filter((n) => !n.isRead),
      dropdownItems: state.dropdownItems.filter((n) => !n.isRead),
    }));

    try {
      await notificationsApi.deleteAllRead();
    } catch {
      get().fetchNotifications(true);
    }
  },

  deleteNotification: async (id: string) => {
    const target = get().notifications.find((n) => n.id === id);
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
      dropdownItems: state.dropdownItems.filter((n) => n.id !== id),
      unreadCount: target && !target.isRead ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
    }));

    try {
      await notificationsApi.deleteNotification(id);
    } catch {
      get().fetchNotifications(true);
    }
  },

  addRealtimeNotification: (item: NotificationItem) => {
    set((state) => ({
      unreadCount: state.unreadCount + 1,
      notifications: [item, ...state.notifications],
      dropdownItems: [item, ...state.dropdownItems.slice(0, 4)],
    }));
  },

  syncNotificationRead: (id: string) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, isRead: true } : n,
      ),
      dropdownItems: state.dropdownItems.map((n) =>
        n.id === id ? { ...n, isRead: true } : n,
      ),
    }));
  },

  setFilterTab: (tab: FilterTab) => {
    set({ filterTab: tab, page: 1 });
    get().fetchNotifications(true);
  },

  setFilterType: (type: NotificationType | 'ALL') => {
    set({ filterType: type, page: 1 });
    get().fetchNotifications(true);
  },
}));
