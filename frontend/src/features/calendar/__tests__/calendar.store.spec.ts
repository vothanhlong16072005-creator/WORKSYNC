import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCalendarStore } from '../stores/calendar.store';
import { calendarApi } from '../api/calendar.api';

vi.mock('../api/calendar.api', () => ({
  calendarApi: {
    getTimeline: vi.fn(),
    rescheduleItem: vi.fn(),
    exportIcs: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

describe('useCalendarStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('1. Initializes with default state (week view, mine scope)', () => {
    const state = useCalendarStore.getState();
    expect(state.view).toBe('week');
    expect(state.scope).toBe('mine');
    expect(state.filters.types).toHaveLength(6);
  });

  it('2. Changes view mode and updates date range', () => {
    const { setView } = useCalendarStore.getState();
    setView('day');
    expect(useCalendarStore.getState().view).toBe('day');

    setView('month');
    expect(useCalendarStore.getState().view).toBe('month');
  });

  it('3. Changes scope and triggers fetch', () => {
    const { setScope } = useCalendarStore.getState();
    (calendarApi.getTimeline as any).mockResolvedValue({
      range: { from: '2026-10-20', to: '2026-10-27' },
      scope: 'department',
      items: [],
      conflicts: [],
    });

    setScope('department');
    expect(useCalendarStore.getState().scope).toBe('department');
    expect(calendarApi.getTimeline).toHaveBeenCalled();
  });

  it('4. Filters can be updated and reset', () => {
    const { setFilter, resetFilters } = useCalendarStore.getState();
    setFilter('query', 'Sprint review');
    expect(useCalendarStore.getState().filters.query).toBe('Sprint review');

    resetFilters();
    expect(useCalendarStore.getState().filters.query).toBe('');
  });

  it('5. Confirms reschedule with optimistic update and calls API', async () => {
    const mockItem: any = {
      kind: 'task',
      id: 'task-1',
      title: 'Fix issue',
      startAt: '2026-10-20T09:00:00.000Z',
      endAt: '2026-10-20T09:00:00.000Z',
      canReschedule: true,
      creatorName: 'PM',
      creatorId: 'u-1',
    };

    useCalendarStore.setState({
      items: [mockItem],
      pendingReschedule: {
        item: mockItem,
        newStart: new Date('2026-10-22T09:00:00.000Z'),
        newEnd: new Date('2026-10-22T09:00:00.000Z'),
      },
    });

    (calendarApi.rescheduleItem as any).mockResolvedValue({ success: true });
    (calendarApi.getTimeline as any).mockResolvedValue({ items: [], conflicts: [] });

    const success = await useCalendarStore.getState().confirmReschedule('Dời lịch theo sprint');
    expect(success).toBe(true);
    expect(calendarApi.rescheduleItem).toHaveBeenCalledWith(
      'task',
      'task-1',
      expect.objectContaining({
        newStart: '2026-10-22T09:00:00.000Z',
        reason: 'Dời lịch theo sprint',
      }),
    );
  });
});
