import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore, type User } from '@/stores/auth.store';

const buildUser = (role: User['role']): User => ({
  id: `u-${role}`,
  email: `${role.toLowerCase()}@worksync.com`,
  name: `Test ${role}`,
  role,
});

describe('useAuthStore role helpers (M12 — Issue 5)', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null });
  });

  describe('hasRole', () => {
    it('returns true when role matches', () => {
      useAuthStore.setState({ user: buildUser('ADMIN') });
      expect(useAuthStore.getState().hasRole('ADMIN')).toBe(true);
    });

    it('returns false when role does not match', () => {
      useAuthStore.setState({ user: buildUser('PM') });
      expect(useAuthStore.getState().hasRole('ADMIN')).toBe(false);
    });

    it('returns false when no user is logged in', () => {
      expect(useAuthStore.getState().hasRole('ADMIN')).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('returns true when user has one of the allowed roles', () => {
      useAuthStore.setState({ user: buildUser('PM') });
      expect(useAuthStore.getState().hasAnyRole(['PM', 'HR', 'ADMIN'])).toBe(true);
    });

    it('returns false when user has none of the allowed roles', () => {
      useAuthStore.setState({ user: buildUser('EMPLOYEE') });
      expect(useAuthStore.getState().hasAnyRole(['PM', 'HR', 'ADMIN'])).toBe(false);
    });

    it('returns false for empty allowed list when user is null', () => {
      expect(useAuthStore.getState().hasAnyRole(['ADMIN'])).toBe(false);
    });
  });
});
