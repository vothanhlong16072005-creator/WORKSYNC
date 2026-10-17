/**
 * QuickTask Store — M3.5
 * Zustand store quản lý danh sách QuickTask + CRUD + stats.
 *
 * State machine: idle → loading → ready | error
 */
import { create } from 'zustand';
import { quickTaskApi } from '../api/quick-task.api';
import type {
  QuickTask,
  QuickTaskStats,
  CreateQuickTaskPayload,
  UpdateQuickTaskPayload,
  TaskStatus,
} from '../types/quick-task.types';

type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

interface QuickTaskState {
  state: AsyncState<QuickTask[]>;
  statsState: AsyncState<QuickTaskStats>;
  filterStatus: TaskStatus | 'ALL';

  setFilter: (status: TaskStatus | 'ALL') => void;
  loadAll: (params?: { status?: TaskStatus }) => Promise<void>;
  loadStats: () => Promise<void>;
  create: (payload: CreateQuickTaskPayload) => Promise<QuickTask>;
  update: (id: string, payload: UpdateQuickTaskPayload) => Promise<QuickTask>;
  remove: (id: string) => Promise<void>;
  reset: () => void;
}

export const useQuickTaskStore = create<QuickTaskState>((set, get) => ({
  state: { status: 'idle' },
  statsState: { status: 'idle' },
  filterStatus: 'ALL',

  setFilter: (status) => {
    set({ filterStatus: status });
    void get().loadAll(status === 'ALL' ? undefined : { status });
  },

  loadAll: async (params) => {
    set({ state: { status: 'loading' } });
    try {
      const data = await quickTaskApi.getAll(params);
      set({ state: { status: 'success', data } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi tải Quick Tasks';
      set({ state: { status: 'error', error: message } });
    }
  },

  loadStats: async () => {
    set({ statsState: { status: 'loading' } });
    try {
      const data = await quickTaskApi.getStats();
      set({ statsState: { status: 'success', data } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi tải thống kê';
      set({ statsState: { status: 'error', error: message } });
    }
  },

  create: async (payload) => {
    const created = await quickTaskApi.create(payload);
    // Refresh list
    const current = get().state;
    if (current.status === 'success') {
      set({ state: { status: 'success', data: [created, ...current.data] } });
    } else {
      void get().loadAll();
    }
    void get().loadStats();
    return created;
  },

  update: async (id, payload) => {
    const updated = await quickTaskApi.update(id, payload);
    const current = get().state;
    if (current.status === 'success') {
      set({
        state: {
          status: 'success',
          data: current.data.map((t) => (t.id === id ? updated : t)),
        },
      });
    }
    void get().loadStats();
    return updated;
  },

  remove: async (id) => {
    await quickTaskApi.remove(id);
    const current = get().state;
    if (current.status === 'success') {
      set({
        state: {
          status: 'success',
          data: current.data.filter((t) => t.id !== id),
        },
      });
    }
    void get().loadStats();
  },

  reset: () => set({ state: { status: 'idle' }, statsState: { status: 'idle' } }),
}));
