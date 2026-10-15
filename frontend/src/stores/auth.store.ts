import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'EMPLOYEE' | 'PM' | 'HR' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole | string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, accessToken: string) => void;
  logout: () => void;
  /**
   * Check whether current user has the exact required role.
   * @example hasRole('ADMIN')
   */
  hasRole: (role: UserRole) => boolean;
  /**
   * Check whether current user has at least one of the supplied roles.
   * @example hasAnyRole(['PM', 'HR', 'ADMIN'])
   */
  hasAnyRole: (roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      setAuth: (user, accessToken) => set({ user, accessToken }),
      logout: () => {
        set({ user: null, accessToken: null });
        localStorage.removeItem('worksync-auth');
      },
      hasRole: (role) => get().user?.role === role,
      hasAnyRole: (roles) => {
        const current = get().user?.role;
        return current ? roles.includes(current as UserRole) : false;
      },
    }),
    {
      name: 'worksync-auth',
    }
  )
);
