import { create } from 'zustand';
import { toast } from 'sonner';
import { calendarApi } from '../api/calendar.api';
import type {
  CalendarScope,
  CalendarView,
  Conflict,
  ItemKind,
  TimelineItem,
} from '../types/calendar.types';
import { getDayRange, getMonthRange, getWeekRange } from '../utils/date-ranges';
import { downloadBlob } from '../utils/ics-export';

export interface CalendarFilters {
  projectId: string | null;
  assigneeId: string | null;
  types: ItemKind[];
  status: string[];
  priority: string[];
  query: string;
}

const DEFAULT_FILTERS: CalendarFilters = {
  projectId: null,
  assigneeId: null,
  types: ['task', 'sprint', 'meeting', 'leave', 'wfh', 'overtime'],
  status: [],
  priority: [],
  query: '',
};

interface CalendarStoreState {
  view: CalendarView;
  scope: CalendarScope;
  currentDate: Date;
  rangeStart: Date;
  rangeEnd: Date;

  filters: CalendarFilters;

  items: TimelineItem[];
  conflicts: Conflict[];
  selectedItem: TimelineItem | null;

  pendingReschedule: {
    item: TimelineItem;
    newStart: Date;
    newEnd?: Date;
  } | null;

  isLoading: boolean;
  error: string | null;

  // Actions
  setView: (view: CalendarView) => void;
  setScope: (scope: CalendarScope) => void;
  setCurrentDate: (date: Date) => void;
  navigatePrev: () => void;
  navigateNext: () => void;
  navigateToday: () => void;

  setFilter: <K extends keyof CalendarFilters>(key: K, value: CalendarFilters[K]) => void;
  resetFilters: () => void;

  setSelectedItem: (item: TimelineItem | null) => void;
  setPendingReschedule: (pending: { item: TimelineItem; newStart: Date; newEnd?: Date } | null) => void;

  fetchItems: () => Promise<void>;
  confirmReschedule: (reason?: string) => Promise<boolean>;
  exportIcs: () => Promise<void>;
}

function computeRange(view: CalendarView, referenceDate: Date) {
  if (view === 'day') return getDayRange(referenceDate);
  if (view === 'month') return getMonthRange(referenceDate);
  return getWeekRange(referenceDate);
}

export const useCalendarStore = create<CalendarStoreState>((set, get) => {
  const initialDate = new Date();
  const initialRange = getWeekRange(initialDate);

  return {
    view: 'week',
    scope: 'mine',
    currentDate: initialDate,
    rangeStart: initialRange.start,
    rangeEnd: initialRange.end,

    filters: { ...DEFAULT_FILTERS },

    items: [],
    conflicts: [],
    selectedItem: null,
    pendingReschedule: null,

    isLoading: false,
    error: null,

    setView: (view) => {
      const { currentDate } = get();
      const range = computeRange(view, currentDate);
      set({ view, rangeStart: range.start, rangeEnd: range.end });
      get().fetchItems();
    },

    setScope: (scope) => {
      set({ scope });
      get().fetchItems();
    },

    setCurrentDate: (date) => {
      const { view } = get();
      const range = computeRange(view, date);
      set({ currentDate: date, rangeStart: range.start, rangeEnd: range.end });
      get().fetchItems();
    },

    navigatePrev: () => {
      const { view, currentDate } = get();
      const nextDate = new Date(currentDate);
      if (view === 'day') nextDate.setDate(nextDate.getDate() - 1);
      else if (view === 'month') nextDate.setMonth(nextDate.getMonth() - 1);
      else nextDate.setDate(nextDate.getDate() - 7);

      const range = computeRange(view, nextDate);
      set({ currentDate: nextDate, rangeStart: range.start, rangeEnd: range.end });
      get().fetchItems();
    },

    navigateNext: () => {
      const { view, currentDate } = get();
      const nextDate = new Date(currentDate);
      if (view === 'day') nextDate.setDate(nextDate.getDate() + 1);
      else if (view === 'month') nextDate.setMonth(nextDate.getMonth() + 1);
      else nextDate.setDate(nextDate.getDate() + 7);

      const range = computeRange(view, nextDate);
      set({ currentDate: nextDate, rangeStart: range.start, rangeEnd: range.end });
      get().fetchItems();
    },

    navigateToday: () => {
      const today = new Date();
      const { view } = get();
      const range = computeRange(view, today);
      set({ currentDate: today, rangeStart: range.start, rangeEnd: range.end });
      get().fetchItems();
    },

    setFilter: (key, value) => {
      set((state) => ({
        filters: { ...state.filters, [key]: value },
      }));
      get().fetchItems();
    },

    resetFilters: () => {
      set({ filters: { ...DEFAULT_FILTERS } });
      get().fetchItems();
    },

    setSelectedItem: (item) => set({ selectedItem: item }),
    setPendingReschedule: (pending) => set({ pendingReschedule: pending }),

    fetchItems: async () => {
      const { rangeStart, rangeEnd, scope, filters } = get();
      set({ isLoading: true, error: null });

      try {
        const data = await calendarApi.getTimeline({
          from: rangeStart.toISOString(),
          to: rangeEnd.toISOString(),
          scope,
          projectId: filters.projectId,
          assigneeId: filters.assigneeId,
          types: filters.types,
          status: filters.status,
          priority: filters.priority,
          query: filters.query,
        });

        set({
          items: data.items,
          conflicts: data.conflicts,
          isLoading: false,
        });
      } catch (err: any) {
        const errorMsg =
          err?.response?.data?.message || err?.message || 'Không thể tải dữ liệu lịch';
        set({ error: errorMsg, isLoading: false });
        toast.error(errorMsg);
      }
    },

    confirmReschedule: async (reason?: string): Promise<boolean> => {
      const { pendingReschedule, items } = get();
      if (!pendingReschedule) return false;

      const { item, newStart, newEnd } = pendingReschedule;
      const previousItems = [...items];

      // Optimistic update
      const updatedItems = items.map((it) => {
        if (it.id === item.id && it.kind === item.kind) {
          return {
            ...it,
            startAt: newStart.toISOString(),
            endAt: (newEnd || newStart).toISOString(),
          };
        }
        return it;
      });
      set({ items: updatedItems, pendingReschedule: null });

      try {
        await calendarApi.rescheduleItem(item.kind, item.id, {
          newStart: newStart.toISOString(),
          newEnd: newEnd?.toISOString(),
          reason,
        });
        toast.success(`Đã đổi lịch cho ${item.title}`);
        // Refresh to recompute conflicts
        get().fetchItems();
        return true;
      } catch (err: any) {
        // Rollback on error
        set({ items: previousItems });
        const errorMsg =
          err?.response?.data?.message || err?.message || 'Không thể đổi lịch sự kiện';
        toast.error(errorMsg);
        return false;
      }
    },

    exportIcs: async () => {
      const { rangeStart, rangeEnd, scope, filters } = get();
      try {
        toast.info('Đang tạo file lịch .ics...');
        const blob = await calendarApi.exportIcs({
          from: rangeStart.toISOString(),
          to: rangeEnd.toISOString(),
          scope,
          projectId: filters.projectId,
          assigneeId: filters.assigneeId,
          types: filters.types,
          status: filters.status,
          priority: filters.priority,
          query: filters.query,
        });
        downloadBlob(blob, `worksync-calendar-${scope}.ics`);
        toast.success('Đã tải xuống file lịch .ics thành công!');
      } catch (err: any) {
        const errorMsg =
          err?.response?.data?.message || err?.message || 'Không thể xuất file .ics';
        toast.error(errorMsg);
      }
    },
  };
});
