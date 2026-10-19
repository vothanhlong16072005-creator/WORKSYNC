import React from 'react';
import { toast } from 'sonner';
import {
  ListTodo,
  Flag,
  Video,
  PlaneTakeoff,
  Home,
  Clock4,
  AlertCircle,
} from 'lucide-react';
import type { Conflict, ItemKind, TimelineItem } from '../types/calendar.types';
import { ConflictBadge } from './ConflictBadge';
import { formatTime } from '../utils/date-ranges';

interface TimelineItemBarProps {
  item: TimelineItem;
  conflicts?: Conflict[];
  onClick: (item: TimelineItem) => void;
  compact?: boolean;
}

const KIND_CONFIG: Record<
  ItemKind,
  { bg: string; border: string; icon: React.ElementType; label: string }
> = {
  task: {
    bg: 'bg-blue-500 hover:bg-blue-600 text-white',
    border: 'border-blue-600/80',
    icon: ListTodo,
    label: 'Task',
  },
  sprint: {
    bg: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    border: 'border-indigo-700/80',
    icon: Flag,
    label: 'Sprint',
  },
  meeting: {
    bg: 'bg-purple-600 hover:bg-purple-700 text-white',
    border: 'border-purple-700/80',
    icon: Video,
    label: 'Cuộc họp',
  },
  leave: {
    bg: 'bg-amber-500 hover:bg-amber-600 text-white',
    border: 'border-amber-600/80',
    icon: PlaneTakeoff,
    label: 'Nghỉ phép',
  },
  wfh: {
    bg: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    border: 'border-emerald-700/80',
    icon: Home,
    label: 'WFH',
  },
  overtime: {
    bg: 'bg-rose-500 hover:bg-rose-600 text-white',
    border: 'border-rose-600/80',
    icon: Clock4,
    label: 'Tăng ca',
  },
};

export const TimelineItemBar: React.FC<TimelineItemBarProps> = ({
  item,
  conflicts = [],
  onClick,
  compact = false,
}) => {
  const config = KIND_CONFIG[item.kind] || KIND_CONFIG.task;
  const Icon = config.icon;

  const itemConflicts = conflicts.filter((c) => c.involvedItemIds.includes(item.id));
  const hasConflict = itemConflicts.length > 0;

  const handleDragStart = (e: React.DragEvent) => {
    if (!item.canReschedule) {
      e.preventDefault();
      showBlockedToast();
      return;
    }

    e.dataTransfer.setData(
      'application/x-timeline-item',
      JSON.stringify({
        id: item.id,
        kind: item.kind,
        title: item.title,
      }),
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  const showBlockedToast = () => {
    if (item.kind === 'leave' || item.kind === 'wfh' || item.kind === 'overtime') {
      toast.warning('Không thể tự ý đổi lịch yêu cầu nhân sự. Vui lòng gửi yêu cầu mới tới HR.');
      return;
    }
    if (item.kind === 'task') {
      toast.warning(`Chỉ người tạo task hoặc người được giao mới đổi được lịch. Liên hệ ${item.creatorName}`);
      return;
    }
    if (item.kind === 'meeting') {
      toast.warning(`Chỉ người tạo cuộc họp mới đổi được lịch. Liên hệ ${item.creatorName}`);
      return;
    }
    if (item.kind === 'sprint') {
      toast.warning('Chỉ Quản trị viên hoặc PM dự án mới có thể đổi lịch Sprint.');
      return;
    }
    toast.warning('Bạn không có quyền đổi lịch sự kiện này.');
  };

  const handleMouseDown = () => {
    // If not draggable, user might be attempting to drag
    // We let normal clicks pass through to onClick
  };

  const timeLabel =
    item.kind === 'task' || item.kind === 'wfh'
      ? new Date(item.startAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
      : `${formatTime(item.startAt)} - ${formatTime(item.endAt)}`;

  if (compact) {
    // Month compact view: dot or thin strip
    return (
      <div
        draggable={item.canReschedule}
        onDragStart={handleDragStart}
        onClick={(e) => {
          e.stopPropagation();
          onClick(item);
        }}
        className={`group relative flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-medium transition-all shadow-2xs truncate ${
          config.bg
        } ${item.canReschedule ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
        title={`[${config.label}] ${item.title} (${timeLabel})`}
      >
        <Icon className="w-2.5 h-2.5 shrink-0" />
        <span className="truncate">{item.title}</span>
        {hasConflict && <ConflictBadge conflicts={itemConflicts} compact />}
      </div>
    );
  }

  return (
    <div
      draggable={item.canReschedule}
      onDragStart={handleDragStart}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        onClick(item);
      }}
      className={`group relative flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl border text-xs font-semibold shadow-xs transition-all duration-150 select-none ${
        config.bg
      } ${config.border} ${
        item.canReschedule
          ? 'cursor-grab active:cursor-grabbing hover:shadow-md hover:scale-[1.01]'
          : 'cursor-pointer hover:shadow-sm'
      }`}
      title={`[${config.label}] ${item.title} • ${timeLabel}`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <Icon className="w-3.5 h-3.5 shrink-0 text-white/90" />
        <span className="truncate tracking-tight">{item.title}</span>
      </div>

      <div className="flex items-center gap-1 shrink-0 text-[10px] text-white/80 font-normal">
        <span className="hidden sm:inline">{timeLabel}</span>
        {hasConflict && <ConflictBadge conflicts={itemConflicts} compact />}
        {item.kind === 'task' && (item as any).isOverdue && (
          <span title="Quá hạn">
            <AlertCircle className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
          </span>
        )}
      </div>
    </div>
  );
};
