import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Video,
  CheckCircle2,
  Zap,
  AtSign,
  ClipboardList,
  Bell,
  Trash2,
} from 'lucide-react';
import type { NotificationItem as NotificationItemType, NotificationType } from '../types/notification.types';
import { useNotificationsStore } from '../stores/notifications.store';

interface NotificationItemProps {
  notification: NotificationItemType;
  onItemClick?: () => void;
  compact?: boolean;
}

function getCategoryConfig(type: NotificationType) {
  switch (type) {
    case 'MEETING':
      return {
        icon: Video,
        bg: 'bg-blue-100 text-blue-700 border-blue-300',
        borderColor: 'border-l-blue-600',
        badge: 'Họp trực tuyến',
      };
    case 'ATTENDANCE_APPROVAL':
      return {
        icon: CheckCircle2,
        bg: 'bg-emerald-100 text-emerald-700 border-emerald-300',
        borderColor: 'border-l-emerald-600',
        badge: 'Chấm công & Đơn',
      };
    case 'QUICK_TASK':
      return {
        icon: Zap,
        bg: 'bg-amber-100 text-amber-700 border-amber-300',
        borderColor: 'border-l-amber-600',
        badge: 'Việc nhanh',
      };
    case 'MENTION':
      return {
        icon: AtSign,
        bg: 'bg-purple-100 text-purple-700 border-purple-300',
        borderColor: 'border-l-purple-600',
        badge: 'Nhắc tên',
      };
    case 'TASK':
      return {
        icon: ClipboardList,
        bg: 'bg-indigo-100 text-indigo-700 border-indigo-300',
        borderColor: 'border-l-indigo-600',
        badge: 'Công việc',
      };
    default:
      return {
        icon: Bell,
        bg: 'bg-slate-100 text-slate-700 border-slate-300',
        borderColor: 'border-l-slate-600',
        badge: 'Hệ thống',
      };
  }
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 60) return 'Vừa xong';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;
  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;
  return date.toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' });
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onItemClick,
  compact = false,
}) => {
  const navigate = useNavigate();
  const { markAsRead, deleteNotification } = useNotificationsStore();
  const config = getCategoryConfig(notification.type);
  const Icon = config.icon;

  const handleClick = () => {
    if (onItemClick) {
      onItemClick();
    }
    if (!notification.isRead) {
      markAsRead(notification.id).catch(() => {});
    }

    const targetUrl = notification.data?.url;
    const taskId = notification.data?.taskId;
    const projectId = notification.data?.projectId;

    // Handle TASK notifications
    if (notification.type === 'TASK' || taskId) {
      if (projectId && taskId) {
        navigate(`/projects/${projectId}/tasks?taskId=${taskId}`);
        return;
      }
      if (taskId) {
        navigate(`/tasks?taskId=${taskId}`);
        return;
      }
      navigate('/tasks');
      return;
    }

    // Handle MEETING notifications
    if (notification.type === 'MEETING') {
      if (targetUrl && (targetUrl.startsWith('/meetings') || targetUrl.startsWith('/meeting'))) {
        navigate(targetUrl);
      } else {
        navigate('/meetings');
      }
      return;
    }

    // Handle QUICK_TASK notifications
    if (notification.type === 'QUICK_TASK') {
      navigate('/quick-tasks');
      return;
    }

    // Handle ATTENDANCE_APPROVAL notifications
    if (notification.type === 'ATTENDANCE_APPROVAL') {
      navigate(targetUrl || '/attendance');
      return;
    }

    // Handle MENTION notifications
    if (notification.type === 'MENTION') {
      if (targetUrl) {
        navigate(targetUrl);
      } else if (taskId) {
        navigate(`/tasks?taskId=${taskId}`);
      } else {
        navigate('/tasks');
      }
      return;
    }

    if (targetUrl) {
      navigate(targetUrl);
      return;
    }

    navigate('/dashboard');
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification(notification.id);
  };

  return (
    <div
      onClick={handleClick}
      className={`group relative flex items-start gap-3.5 p-3.5 mx-2 my-1.5 rounded-xl border cursor-pointer transition-all duration-150 ${
        notification.isRead
          ? 'bg-white hover:bg-slate-50 border-slate-200/80 shadow-2xs'
          : 'bg-blue-50/40 hover:bg-blue-50/70 border-blue-200/80 shadow-xs'
      }`}
    >
      {/* Category Icon */}
      <div
        className={`shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center ${config.bg} shadow-2xs`}
      >
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-7">
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
              notification.isRead ? 'bg-slate-100 text-slate-600' : 'bg-white text-slate-800 shadow-2xs border border-slate-200'
            }`}
          >
            {config.badge}
          </span>
          <span className="text-[11px] font-medium text-slate-400">
            {formatRelativeTime(notification.createdAt)}
          </span>
        </div>

        <h4
          className={`text-xs md:text-sm leading-snug line-clamp-1 transition-colors ${
            notification.isRead ? 'font-semibold text-slate-700 group-hover:text-blue-600' : 'font-bold text-slate-900 group-hover:text-blue-600'
          }`}
        >
          {notification.title}
        </h4>

        {notification.body && (
          <p
            className={`text-xs mt-1 text-slate-600 ${
              compact ? 'line-clamp-1' : 'line-clamp-2'
            }`}
          >
            {notification.body}
          </p>
        )}
      </div>

      {/* Unread indicator or delete button */}
      <div className="absolute right-3.5 top-3.5 flex items-center gap-2">
        {!notification.isRead && (
          <span
            className="w-2.5 h-2.5 rounded-full bg-blue-600 ring-4 ring-blue-100"
            title="Chưa đọc"
          />
        )}
        <button
          onClick={handleDelete}
          className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-all"
          title="Xóa thông báo"
          type="button"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
