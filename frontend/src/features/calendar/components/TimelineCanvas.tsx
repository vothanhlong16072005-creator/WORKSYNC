import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarRange, Loader2 } from 'lucide-react';
import { useCalendarStore } from '../stores/calendar.store';
import { TimelineHeaderRow } from './TimelineHeaderRow';
import { TimelineRow } from './TimelineRow';
import { getDaysInInterval } from '../utils/date-ranges';
import type { TimelineItem } from '../types/calendar.types';

export const TimelineCanvas: React.FC = () => {
  const { t } = useTranslation();
  const {
    items,
    conflicts,
    view,
    rangeStart,
    rangeEnd,
    isLoading,
    setSelectedItem,
    setPendingReschedule,
  } = useCalendarStore();

  const days = useMemo(() => {
    return getDaysInInterval(rangeStart, rangeEnd);
  }, [rangeStart, rangeEnd]);

  // Group items by User identity (or "Dự án & Sprints" row)
  const groupedRows = useMemo(() => {
    const groups = new Map<string, { label: string; subLabel?: string; items: TimelineItem[] }>();

    for (const item of items) {
      let key = 'general';
      let label = 'Dự án & Sprints';
      let subLabel = 'Toàn nhóm';

      if (item.kind === 'task') {
        key = item.assigneeId || item.creatorId || 'unassigned';
        label = item.assigneeName || item.creatorName || 'Chưa giao';
        subLabel = 'Công việc';
      } else if (item.kind === 'leave' || item.kind === 'wfh' || item.kind === 'overtime') {
        key = item.userId || item.creatorId;
        label = (item as any).userName || item.creatorName;
        subLabel = 'Nhân sự & Chấm công';
      } else if (item.kind === 'meeting') {
        key = item.creatorId || 'meeting-general';
        label = item.creatorName || 'Cuộc họp';
        subLabel = 'Chủ tọa';
      } else if (item.kind === 'sprint') {
        key = `project-${item.projectId}`;
        label = item.projectName;
        subLabel = 'Chu kỳ Sprint';
      }

      const existing = groups.get(key) || { label, subLabel, items: [] };
      existing.items.push(item);
      groups.set(key, existing);
    }

    return Array.from(groups.values());
  }, [items]);

  const handleDropOnDate = (
    itemData: { id: string; kind: string; title: string },
    targetDate: Date,
  ) => {
    const found = items.find((i) => i.id === itemData.id && i.kind === itemData.kind);
    if (!found) return;

    // Calculate duration to preserve it
    const origStart = new Date(found.startAt);
    const origEnd = new Date(found.endAt);
    const durationMs = origEnd.getTime() - origStart.getTime();

    const newStart = new Date(targetDate);
    // Preserve hour/minute of original start
    newStart.setHours(origStart.getHours(), origStart.getMinutes(), 0, 0);

    const newEnd = new Date(newStart.getTime() + durationMs);

    setPendingReschedule({
      item: found,
      newStart,
      newEnd,
    });
  };

  if (isLoading) {
    return (
      <div className="flex-1 min-h-[420px] flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-xs font-semibold text-slate-600">
          Đang đồng bộ dữ liệu lịch làm việc...
        </p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex-1 min-h-[420px] flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-xs text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mb-3 shadow-2xs">
          <CalendarRange className="w-7 h-7" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 mb-1">
          {t('calendar.empty', 'Không có sự kiện hoặc công việc nào trong khoảng thời gian này.')}
        </h3>
        <p className="text-xs text-slate-400 max-w-sm mb-4">
          Hãy thay đổi tuần/tháng đang chọn hoặc điều chỉnh bộ lọc để xem các sự kiện khác.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden flex flex-col">
      <div className="overflow-x-auto flex-1">
        <div className="min-w-fit">
          <TimelineHeaderRow view={view} days={days} />
          <div className="divide-y divide-slate-100">
            {groupedRows.map((row, idx) => (
              <TimelineRow
                key={idx}
                label={row.label}
                subLabel={row.subLabel}
                items={row.items}
                days={days}
                view={view}
                conflicts={conflicts}
                onSelectItem={setSelectedItem}
                onDropOnDate={handleDropOnDate}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
