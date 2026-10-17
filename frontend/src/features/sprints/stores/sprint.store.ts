/**
 * Sprint Store — M3.5
 */
import { create } from 'zustand';
import { sprintApi } from '../api/sprint.api';
import type { CreateSprintInput, Sprint, SprintBurndown, UpdateSprintInput } from '../types/sprint.types';

interface SprintState {
  sprints: Sprint[];
  currentSprint: Sprint | null;
  burndown: SprintBurndown | null;
  isLoading: boolean;
  error: string | null;

  fetchSprintsByProject: (projectId: string) => Promise<void>;
  fetchSprintDetail: (id: string) => Promise<void>;
  fetchBurndown: (id: string) => Promise<void>;
  createSprint: (input: CreateSprintInput) => Promise<Sprint>;
  updateSprint: (id: string, input: UpdateSprintInput) => Promise<Sprint>;
  startSprint: (id: string) => Promise<Sprint>;
  completeSprint: (id: string) => Promise<Sprint>;
  removeSprint: (id: string) => Promise<void>;
  clearCurrentSprint: () => void;
}

export const useSprintStore = create<SprintState>((set, get) => ({
  sprints: [],
  currentSprint: null,
  burndown: null,
  isLoading: false,
  error: null,

  fetchSprintsByProject: async (projectId: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await sprintApi.getByProject(projectId);
      set({ sprints: data, isLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi khi tải danh sách sprint';
      set({ error: message, isLoading: false });
    }
  },

  fetchSprintDetail: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const data = await sprintApi.getById(id);
      set({ currentSprint: data, isLoading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi khi tải chi tiết sprint';
      set({ error: message, isLoading: false });
    }
  },

  fetchBurndown: async (id: string) => {
    try {
      const data = await sprintApi.getBurndown(id);
      set({ burndown: data });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Lỗi khi tải burndown chart';
      set({ error: message });
    }
  },

  createSprint: async (input: CreateSprintInput) => {
    set({ isLoading: true, error: null });
    try {
      const newSprint = await sprintApi.create(input);
      set((state) => ({
        sprints: [newSprint, ...state.sprints],
        isLoading: false,
      }));
      return newSprint;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể tạo sprint';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  updateSprint: async (id: string, input: UpdateSprintInput) => {
    set({ isLoading: true, error: null });
    try {
      const updated = await sprintApi.update(id, input);
      set((state) => ({
        sprints: state.sprints.map((s) => (s.id === id ? { ...s, ...updated } : s)),
        currentSprint: state.currentSprint?.id === id ? { ...state.currentSprint, ...updated } : state.currentSprint,
        isLoading: false,
      }));
      return updated;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể cập nhật sprint';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  startSprint: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const started = await sprintApi.start(id);
      set((state) => ({
        sprints: state.sprints.map((s) => (s.id === id ? { ...s, ...started } : s)),
        currentSprint: state.currentSprint?.id === id ? { ...state.currentSprint, ...started } : state.currentSprint,
        isLoading: false,
      }));
      // Refresh burndown
      await get().fetchBurndown(id);
      return started;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể bắt đầu sprint';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  completeSprint: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const completed = await sprintApi.complete(id);
      set((state) => ({
        sprints: state.sprints.map((s) => (s.id === id ? { ...s, ...completed } : s)),
        currentSprint: state.currentSprint?.id === id ? { ...state.currentSprint, ...completed } : state.currentSprint,
        isLoading: false,
      }));
      await get().fetchBurndown(id);
      return completed;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể hoàn thành sprint';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  removeSprint: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      await sprintApi.remove(id);
      set((state) => ({
        sprints: state.sprints.filter((s) => s.id !== id),
        currentSprint: state.currentSprint?.id === id ? null : state.currentSprint,
        isLoading: false,
      }));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể xóa sprint';
      set({ error: message, isLoading: false });
      throw err;
    }
  },

  clearCurrentSprint: () => set({ currentSprint: null, burndown: null }),
}));
