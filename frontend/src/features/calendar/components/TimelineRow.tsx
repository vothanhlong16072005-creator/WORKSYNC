import React, { useState } from 'react';
import type { CalendarView, Conflict, TimelineItem } from '../types/calendar.types';
import { TimelineItemBar } from './TimelineItemBar';
import { isSameDay } from '../utils/date-ranges';

interface TimelineRowProps {
  label: string;
  avatar?: string;
  subLabel?: string;
  items: TimelineItem[];
  days: Date[];
  view: CalendarView;
  conflicts: Conflict[];
  onSelectItem: (item: TimelineItem) => void;
  onDropOnDate: (itemData: { id: string; kind: string; title: string }, targetDate: Date) => void;
}

export const TimelineRow: React.FC<TimelineRowProps> = ({
  label,
  avatar,
  subLabel,
  items,
  days,
  view,
  conflicts,
  onSelectItem,
  onDropOnDate,
}) => {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const getItemsForDay = (date: Date) => {
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    return items.filter((item) => {
      const itemStart = new Date(item.startAt);
      const itemEnd = new Date(item.endAt);

      if (isSameDay(itemStart, date) || isSameDay(itemEnd, date)) {
        return true;
      }
      return itemStart <= dayEnd && itemEnd >= dayStart;
    });
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    setDragOverIndex(null);
    try {
      const dataStr = e.dataTransfer.getData('application/x-timeline-item');
      if (dataStr) {
        const parsed = JSON.parse(dataStr);
        onDropOnDate(parsed, targetDate);
      }
    } catch (err) {
      console.error('Failed to parse dropped timeline item:', err);
    }
  };

  return (
    <div className="flex border-b border-slate-200/80 hover:bg-slate-50/30 transition-colors group">
      {/* Left Column: User identity / Source */}
      <div className="w-48 sm:w-56 shrink-0 px-4 py-3 border-r border-slate-200 bg-white flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 text-slate-700 flex items-center justify-center font-bold text-xs uppercase shrink-0 overflow-hidden">
          {avatar ? (
            <img src={avatar} alt={label} className="w-full h-full object-cover" />
          ) : (
            label.charAt(0)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-900 truncate" title={label}>
            {label}
          </p>
          {subLabel && (
            <p className="text-[10px] text-slate-400 truncate mt-0.5">{subLabel}</p>
          )}
        </div>
      </div>

      {/* Grid of Day Cells */}
      <div
        className="flex-1 grid"
        style={{
          gridTemplateColumns: `repeat(${days.length}, minmax(${
            view === 'month' ? '36px' : '140px'
          }, 1fr))`,
        }}
      >
        {days.map((day, idx) => {
          const dayItems = getItemsForDay(day);
          const isDragTarget = dragOverIndex === idx;

          return (
            <div
              key={idx}
              onDragOver={(e) => {
                e.preventDefault();
                if (dragOverIndex !== idx) setDragOverIndex(idx);
              }}
              onDragLeave={() => {
                if (dragOverIndex === idx) setDragOverIndex(null);
              }}
              onDrop={(e) => handleDrop(e, day)}
              className={`p-1.5 border-r border-slate-200/60 min-h-[58px] flex flex-col gap-1 transition-colors relative ${
                isDragTarget
                  ? 'bg-blue-50/80 border-2 border-dashed border-blue-400'
                  : 'hover:bg-slate-50/50'
              }`}
            >
              {dayItems.map((item) => (
                <TimelineItemBar
                  key={`${item.kind}-${item.id}`}
                  item={item}
                  conflicts={conflicts}
                  onClick={onSelectItem}
                  compact={view === 'month'}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
