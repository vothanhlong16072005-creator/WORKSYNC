import React, { useEffect } from 'react';
import {
  Bell,
  CheckCheck,
  Trash2,
  Filter,
  Loader2,
  Sparkles,
  BellRing,
  Video,
  CalendarCheck,
  Zap,
  AtSign,
  CheckSquare,
} from 'lucide-react';
import { useNotificationsStore, type FilterTab } from '../stores/notifications.store';
import { usePushSubscription } from '../hooks/usePushSubscription';
import { NotificationItem } from '../components/NotificationItem';
import type { NotificationType } from '../types/notification.types';

export const NotificationsPage: React.FC = () => {
  const {
    notifications,
    unreadCount,
    loading,
    hasMore,
    filterTab,
    filterType,
    fetchNotifications,
    setFilterTab,
    setFilterType,
    markAllAsRead,
    deleteAllRead,
  } = useNotificationsStore();

  const { isSupported, isSubscribed, permission, subscribe } = usePushSubscription();

  useEffect(() => {
    fetchNotifications(true);
  }, []);

  const categoryChips: {
    label: string;
    type: NotificationType | 'ALL';
    icon: React.ComponentType<{ className?: string }>;
    color: string;
  }[] = [
    { label: 'Tất cả loại', type: 'ALL', icon: Sparkles, color: 'text-indigo-600' },
    { label: 'Cuộc họp', type: 'MEETING', icon: Video, color: 'text-blue-600' },
    { label: 'Chấm công & Đơn', type: 'ATTENDANCE_APPROVAL', icon: CalendarCheck, color: 'text-emerald-600' },
    { label: 'Việc nhanh', type: 'QUICK_TASK', icon: Zap, color: 'text-amber-500' },
    { label: 'Nhắc tên (@)', type: 'MENTION', icon: AtSign, color: 'text-purple-600' },
    { label: 'Công việc', type: 'TASK', icon: CheckSquare, color: 'text-indigo-600' },
  ];

  return (
    <div className="min-h-full pb-16 bg-slate-50/50">
      {/* Header Banner */}
      <div className="bg-white border-b border-slate-200/80 px-6 py-6 shadow-2xs">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-sm">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                  Trung tâm Thông báo
                </h1>
                <p className="text-xs font-medium text-slate-500 mt-0.5">
                  Cập nhật các hoạt động dự án, cuộc họp và xét duyệt công việc theo thời gian thực
                </p>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2.5">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsRead()}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200/80 hover:bg-blue-100 rounded-xl transition-all shadow-2xs"
              >
                <CheckCheck className="w-4 h-4 text-blue-600" />
                <span>Đã đọc tất cả</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => deleteAllRead()}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 rounded-xl transition-all shadow-2xs"
              title="Xóa toàn bộ thông báo đã đọc"
            >
              <Trash2 className="w-4 h-4" />
              <span>Xóa đã đọc</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 pt-6 space-y-5">
        {/* Web Push Prompt Banner (if not yet subscribed and supported) */}
        {isSupported && !isSubscribed && permission !== 'denied' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 text-white rounded-2xl shadow-sm border border-indigo-400/30">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shrink-0">
                <BellRing className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="text-sm font-bold tracking-wide">Bật thông báo đẩy Web Push</h4>
                <p className="text-xs text-indigo-100 mt-0.5">
                  Nhận thông báo cuộc họp bắt đầu và duyệt đơn ngay trên máy tính dù bạn không mở ứng dụng.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => subscribe()}
              className="px-4 py-2 text-xs font-black uppercase tracking-wider text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-xs shrink-0 transition-transform active:scale-95"
            >
              Bật ngay
            </button>
          </div>
        )}

        {/* Filters and Tabs */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs p-4 space-y-4">
          {/* Main Status Tabs */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200/60">
              {(['ALL', 'UNREAD', 'READ'] as FilterTab[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setFilterTab(tab)}
                  className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    filterTab === tab
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  {tab === 'ALL' && 'Tất cả'}
                  {tab === 'UNREAD' && (
                    <span className="flex items-center gap-1.5">
                      Chưa đọc
                      {unreadCount > 0 && (
                        <span className="px-1.5 py-0.2 text-[10px] bg-rose-600 text-white rounded-full font-bold">
                          {unreadCount}
                        </span>
                      )}
                    </span>
                  )}
                  {tab === 'READ' && 'Đã đọc'}
                </button>
              ))}
            </div>

            <div className="text-xs font-semibold text-slate-500">
              Tổng số: <span className="font-bold text-slate-900">{notifications.length}</span> thông báo
            </div>
          </div>

          {/* Category Chips with SVG Lucide Icons */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0 flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" /> Lọc:
            </span>
            {categoryChips.map((chip) => {
              const IconComp = chip.icon;
              const isActive = filterType === chip.type;
              return (
                <button
                  key={chip.type}
                  type="button"
                  onClick={() => setFilterType(chip.type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all shrink-0 ${
                    isActive
                      ? 'border-blue-600 bg-blue-600 text-white shadow-xs'
                      : 'border-slate-200/80 bg-slate-50/80 text-slate-700 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  <IconComp className={`w-3.5 h-3.5 ${isActive ? 'text-white' : chip.color}`} />
                  <span>{chip.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notifications List Container */}
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden p-2">
          {loading && notifications.length === 0 ? (
            <div className="p-16 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
              <p className="text-sm font-bold text-slate-700">Đang tải danh sách thông báo...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-16 text-center">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 flex items-center justify-center mx-auto mb-4 shadow-2xs">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Không tìm thấy thông báo
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {filterTab === 'UNREAD'
                  ? 'Tuyệt vời! Bạn không còn thông báo nào chưa đọc.'
                  : 'Hiện tại chưa có thông báo nào phù hợp với bộ lọc đã chọn.'}
              </p>
            </div>
          ) : (
            <div className="space-y-1">
              {notifications.map((item) => (
                <NotificationItem key={item.id} notification={item} />
              ))}
            </div>
          )}

          {/* Load More Button */}
          {hasMore && notifications.length > 0 && (
            <div className="p-4 bg-slate-50/70 border-t border-slate-100 text-center rounded-b-xl">
              <button
                type="button"
                onClick={() => fetchNotifications(false)}
                disabled={loading}
                className="px-6 py-2 text-xs font-bold text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl shadow-2xs active:scale-95 disabled:opacity-50 transition-all"
              >
                {loading ? 'Đang tải thêm...' : 'Tải thêm thông báo cũ hơn'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
