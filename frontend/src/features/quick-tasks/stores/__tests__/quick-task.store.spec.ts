import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useQuickTaskStore } from '../quick-task.store';
import { quickTaskApi } from '../../api/quick-task.api';
import type { QuickTask, QuickTaskStats } from '../../types/quick-task.types';

vi.mock('../../api/quick-task.api', () => ({
  quickTaskApi: {
    create: vi.fn(),
    getAll: vi.fn(),
    getOne: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    getStats: vi.fn(),
  },
}));

const SAMPLE_TASK: QuickTask = {
  id: 'qt-1',
  title: 'Test task',
  description: null,
  projectId: null,
  project: null,
  assigneeId: 'user-2',
  assignee: {
    id: 'user-2',
    name: 'Test User',
    email: 'test@worksync.com',
    avatar: null,
    position: 'Engineer',
  },
  assignedById: 'user-1',
  assignedBy: {
    id: 'user-1',
    name: 'Admin',
    email: 'admin@worksync.com',
    avatar: null,
  },
  dueDate: new Date(Date.now() + 86_400_000).toISOString(),
  priority: 'MEDIUM',
  status: 'TODO',
  completedAt: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const SAMPLE_STATS: QuickTaskStats = {
  total: 10,
  today: 3,
  overdue: 1,
  byStatus: { TODO: 4, IN_PROGRESS: 2, DONE: 4 },
  byPriority: { LOW: 2, MEDIUM: 5, HIGH: 2, URGENT: 1 },
};

describe('useQuickTaskStore', () => {
  beforeEach(() => {
    useQuickTaskStore.setState({
      state: { status: 'idle' },
      statsState: { status: 'idle' },
      filterStatus: 'ALL',
    });
    vi.clearAllMocks();
  });

  it('starts in idle state', () => {
    const { state, statsState } = useQuickTaskStore.getState();
    expect(state.status).toBe('idle');
    expect(statsState.status).toBe('idle');
  });

  it('loadAll → success state with data', async () => {
    vi.mocked(quickTaskApi.getAll).mockResolvedValueOnce([SAMPLE_TASK]);

    await useQuickTaskStore.getState().loadAll();
    const { state } = useQuickTaskStore.getState();
    expect(state.status).toBe('success');
    if (state.status === 'success') {
      expect(state.data).toHaveLength(1);
      expect(state.data[0]?.id).toBe('qt-1');
    }
  });

  it('loadAll → error state on failure', async () => {
    vi.mocked(quickTaskApi.getAll).mockRejectedValueOnce(new Error('Network error'));

    await useQuickTaskStore.getState().loadAll();
    const { state } = useQuickTaskStore.getState();
    expect(state.status).toBe('error');
    if (state.status === 'error') {
      expect(state.error).toBe('Network error');
    }
  });

  it('loadStats → success state with stats', async () => {
    vi.mocked(quickTaskApi.getStats).mockResolvedValueOnce(SAMPLE_STATS);

    await useQuickTaskStore.getState().loadStats();
    const { statsState } = useQuickTaskStore.getState();
    expect(statsState.status).toBe('success');
    if (statsState.status === 'success') {
      expect(statsState.data.total).toBe(10);
    }
  });

  it('create prepends new task to list (when list already loaded)', async () => {
    // Seed list
    useQuickTaskStore.setState({
      state: { status: 'success', data: [SAMPLE_TASK] },
    });
    vi.mocked(quickTaskApi.create).mockResolvedValueOnce({ ...SAMPLE_TASK, id: 'qt-new', title: 'New' });
    vi.mocked(quickTaskApi.getStats).mockResolvedValueOnce(SAMPLE_STATS);

    await useQuickTaskStore.getState().create({
      title: 'New',
      assigneeId: 'user-2',
      dueDate: new Date().toISOString(),
    });
    const { state } = useQuickTaskStore.getState();
    expect(state.status).toBe('success');
    if (state.status === 'success') {
      expect(state.data[0]?.id).toBe('qt-new');
      expect(state.data).toHaveLength(2);
    }
  });

  it('update replaces matching task in list', async () => {
    useQuickTaskStore.setState({
      state: { status: 'success', data: [SAMPLE_TASK] },
    });
    vi.mocked(quickTaskApi.update).mockResolvedValueOnce({ ...SAMPLE_TASK, status: 'DONE' });
    vi.mocked(quickTaskApi.getStats).mockResolvedValueOnce(SAMPLE_STATS);

    await useQuickTaskStore.getState().update('qt-1', { status: 'DONE' });
    const { state } = useQuickTaskStore.getState();
    if (state.status === 'success') {
      expect(state.data[0]?.status).toBe('DONE');
    }
  });

  it('remove filters task from list', async () => {
    useQuickTaskStore.setState({
      state: { status: 'success', data: [SAMPLE_TASK] },
    });
    vi.mocked(quickTaskApi.remove).mockResolvedValueOnce({ id: 'qt-1', deleted: true });
    vi.mocked(quickTaskApi.getStats).mockResolvedValueOnce(SAMPLE_STATS);

    await useQuickTaskStore.getState().remove('qt-1');
    const { state } = useQuickTaskStore.getState();
    if (state.status === 'success') {
      expect(state.data).toHaveLength(0);
    }
  });

  it('setFilter triggers loadAll with status param', async () => {
    vi.mocked(quickTaskApi.getAll).mockResolvedValueOnce([]);
    useQuickTaskStore.getState().setFilter('TODO');
    // Wait a tick
    await new Promise((r) => setTimeout(r, 0));
    expect(quickTaskApi.getAll).toHaveBeenCalledWith({ status: 'TODO' });
    expect(useQuickTaskStore.getState().filterStatus).toBe('TODO');
  });

  it('setFilter ALL → no status param', async () => {
    useQuickTaskStore.setState({ filterStatus: 'TODO' });
    vi.mocked(quickTaskApi.getAll).mockResolvedValueOnce([]);
    useQuickTaskStore.getState().setFilter('ALL');
    await new Promise((r) => setTimeout(r, 0));
    expect(quickTaskApi.getAll).toHaveBeenCalledWith(undefined);
  });
});
