import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ExternalLink, Loader2 } from 'lucide-react';
import { useNotificationsStore } from '../stores/notifications.store';
import { useNotificationsSocket } from '../hooks/useNotificationsSocket';
import { NotificationItem } from './NotificationItem';

export const NotificationBell: React.FC = () => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Hook handles socket listener
  useNotificationsSocket();

  const {
    unreadCount,
    dropdownItems,
    dropdownLoading,
    fetchDropdownItems,
    fetchUnreadCount,
    markAllAsRead,
  } = useNotificationsStore();

  useEffect(() => {
    fetchUnreadCount();
  }, []);

  const toggleDropdown = () => {
    if (!isOpen) {
      fetchDropdownItems();
    }
    setIsOpen(!isOpen);
  };

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const formatBadgeCount = (count: number) => {
    if (count <= 9) return `${count}`;
    if (count <= 99) return '9+';
    return '99+';
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={toggleDropdown}
        className="relative flex items-center justify-center w-10 h-10 border-2 border-slate-900 bg-white hover:bg-slate-100 transition-colors shadow-[2px_2px_0px_0px_rgba(15,23,42,1)] focus:outline-none"
        title="Thông báo"
        aria-label="Thông báo"
      >
        <Bell className="h-5 w-5 text-slate-900" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1 flex items-center justify-center text-[10px] font-black text-white bg-rose-600 rounded-full border-2 border-white shadow-sm animate-pulse">
            {formatBadgeCount(unreadCount)}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white border-2 border-slate-900 shadow-[4px_4px_0px_0px_rgba(15,23,42,1)] rounded-none z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Dropdown Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b-2 border-slate-200 bg-slate-50">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                Thông báo
              </span>
              {unreadCount > 0 && (
                <span className="text-[10px] font-black bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full border border-rose-300">
                  {unreadCount} chưa đọc
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllAsRead()}
                className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
                title="Đánh dấu tất cả đã đọc"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Đã đọc tất cả</span>
              </button>
            )}
          </div>

          {/* Items List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-slate-100">
            {dropdownLoading ? (
              <div className="p-8 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
                <span className="text-xs font-medium">Đang tải thông báo...</span>
              </div>
            ) : dropdownItems.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <div className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Bell className="w-5 h-5" />
                </div>
                <p className="text-xs font-bold text-slate-700">Không có thông báo nào</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Bạn đã cập nhật mọi việc mới nhất!</p>
              </div>
            ) : (
              dropdownItems.map((item) => (
                <NotificationItem
                  key={item.id}
                  notification={item}
                  compact
                  onItemClick={() => setIsOpen(false)}
                />
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t-2 border-slate-200 bg-slate-50 text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications');
              }}
              className="w-full flex items-center justify-center gap-2 py-2 text-xs font-black uppercase tracking-wider text-slate-900 hover:bg-slate-200 transition-colors"
            >
              <span>Xem tất cả thông báo</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
