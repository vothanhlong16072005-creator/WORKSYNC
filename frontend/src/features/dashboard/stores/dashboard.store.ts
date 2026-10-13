import { create } from 'zustand';
import type { DashboardState, DashboardRole, Role } from '../types/dashboard.types';
import { fetchDashboardData } from '../api/dashboard.api';
import { useAuthStore } from '@/stores/auth.store';

interface DashboardStore {
  state: DashboardState;
  fetchDashboard: (roleEndpoint?: DashboardRole) => Promise<void>;
  reset: () => void;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  state: { status: 'idle' },

  fetchDashboard: async (roleEndpoint = 'me') => {
    set({ state: { status: 'loading' } });
    try {
      const authUser = useAuthStore.getState().user;
      const data = await fetchDashboardData(roleEndpoint);
      const role = (authUser?.role ?? 'EMPLOYEE') as Role;
      set({ state: { status: 'success', data, role } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Không thể tải dữ liệu bảng điều khiển';
      set({ state: { status: 'error', error: message } });
    }
  },

  reset: () => set({ state: { status: 'idle' } }),
}));
