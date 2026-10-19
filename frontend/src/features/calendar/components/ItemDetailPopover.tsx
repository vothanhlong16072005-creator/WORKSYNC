import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  X,
  Calendar,
  Clock,
  User,
  ExternalLink,
  Video,
  ListTodo,
  Flag,
  PlaneTakeoff,
  Home,
  Clock4,
  AlertTriangle,
  CalendarSync,
} from 'lucide-react';
import { useCalendarStore } from '../stores/calendar.store';
import { formatTime, formatDateShort } from '../utils/date-ranges';

export const ItemDetailPopover: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { selectedItem, setSelectedItem, setPendingReschedule, conflicts } = useCalendarStore();

  if (!selectedItem) return null;

  const itemConflicts = conflicts.filter((c) =>
    c.involvedItemIds.includes(selectedItem.id),
  );

  const handleOpenDetail = () => {
    if (selectedItem.kind === 'task') {
      navigate(`/tasks/${selectedItem.id}`);
      setSelectedItem(null);
    } else if (selectedItem.kind === 'meeting') {
      navigate(`/meetings/${selectedItem.id}/report`);
      setSelectedItem(null);
    } else if (selectedItem.kind === 'sprint') {
      navigate(`/projects/${(selectedItem as any).projectId}/sprints/${selectedItem.id}`);
      setSelectedItem(null);
    }
  };

  const handleJoinMeeting = () => {
    if (selectedItem.kind === 'meeting') {
      navigate(`/meetings/${selectedItem.id}/prepare`);
      setSelectedItem(null);
    }
  };

  const handleOpenReschedule = () => {
    setPendingReschedule({
      item: selectedItem,
      newStart: new Date(selectedItem.startAt),
      newEnd: new Date(selectedItem.endAt),
    });
    setSelectedItem(null);
  };

  const getKindBadge = () => {
    const badges: Record<string, { label: string; bg: string; icon: React.ElementType }> = {
      task: { label: 'Task', bg: 'bg-blue-50 text-blue-700 border-blue-200', icon: ListTodo },
      sprint: { label: 'Sprint', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', icon: Flag },
      meeting: { label: 'Cuộc họp', bg: 'bg-purple-50 text-purple-700 border-purple-200', icon: Video },
      leave: { label: 'Nghỉ phép', bg: 'bg-amber-50 text-amber-700 border-amber-200', icon: PlaneTakeoff },
      wfh: { label: 'WFH', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Home },
      overtime: { label: 'Tăng ca', bg: 'bg-rose-50 text-rose-700 border-rose-200', icon: Clock4 },
    };
    const b = badges[selectedItem.kind] || badges.task;
    const Icon = b.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border ${b.bg}`}>
        <Icon className="w-3.5 h-3.5" />
        <span>{b.label}</span>
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            {getKindBadge()}
          </div>
          <button
            type="button"
            onClick={() => setSelectedItem(null)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
              {selectedItem.title}
            </h3>
            {selectedItem.description && (
              <p className="text-xs text-slate-600 mt-1 leading-relaxed whitespace-pre-line">
                {selectedItem.description}
              </p>
            )}
          </div>

          {/* Conflict Alert if any */}
          {itemConflicts.length > 0 && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-rose-700">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>Cảnh báo xung đột lịch:</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-rose-700">
                {itemConflicts.map((c, i) => (
                  <li key={i}>{c.message}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Thời gian bắt đầu</span>
              </div>
              <p className="font-bold text-slate-800">
                {formatDateShort(selectedItem.startAt)} • {formatTime(selectedItem.startAt)}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Thời gian kết thúc</span>
              </div>
              <p className="font-bold text-slate-800">
                {formatDateShort(selectedItem.endAt)} • {formatTime(selectedItem.endAt)}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1">
                <User className="w-3.5 h-3.5" />
                <span>Người tạo</span>
              </div>
              <p className="font-bold text-slate-800 truncate">{selectedItem.creatorName}</p>
            </div>

            {selectedItem.kind === 'task' && (
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-semibold mb-1">
                  <User className="w-3.5 h-3.5" />
                  <span>Người thực hiện</span>
                </div>
                <p className="font-bold text-slate-800 truncate">
                  {(selectedItem as any).assigneeName || 'Chưa phân công'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-2.5">
          {selectedItem.canReschedule && (
            <button
              type="button"
              onClick={handleOpenReschedule}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-all shadow-2xs cursor-pointer active:scale-[0.98]"
            >
              <CalendarSync className="w-3.5 h-3.5 text-slate-600" />
              <span>{t('calendar.item.reschedule', 'Đổi lịch')}</span>
            </button>
          )}

          {selectedItem.kind === 'meeting' && (
            <button
              type="button"
              onClick={handleJoinMeeting}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-all shadow-xs cursor-pointer active:scale-[0.98]"
            >
              <Video className="w-3.5 h-3.5" />
              <span>{t('calendar.item.joinMeeting', 'Vào phòng họp')}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenDetail}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs cursor-pointer active:scale-[0.98]"
          >
            <span>{t('calendar.item.openDetail', 'Mở chi tiết')}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
