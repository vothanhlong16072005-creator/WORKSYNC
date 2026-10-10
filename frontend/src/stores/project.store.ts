import { create } from 'zustand';
import { api } from '@/lib/api-client';
import type { ProjectSummary } from '@/lib/api-schemas';

interface ProjectState {
  projects: ProjectSummary[];
  status: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
  loadMine: () => Promise<void>;
  refreshTaskCounts: () => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  status: 'idle',
  error: null,

  loadMine: async () => {
    set({ status: 'loading', error: null });
    try {
      const projects = await api.fetchMyProjects();
      set({ projects, status: 'ready', error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load projects';
      set({ status: 'error', error: message });
    }
  },

  refreshTaskCounts: async () => {
    try {
      const projects = await api.fetchMyProjects();
      set({ projects });
    } catch (err) {
      console.error('Failed to refresh project task counts:', err);
    }
  },
}));
