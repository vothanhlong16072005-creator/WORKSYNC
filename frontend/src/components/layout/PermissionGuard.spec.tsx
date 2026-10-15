import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore, type User } from '@/stores/auth.store';
import { PermissionGuard } from '@/components/layout/PermissionGuard';

const buildUser = (role: User['role']): User => ({
  id: `u-${role}`,
  email: `${role.toLowerCase()}@worksync.com`,
  name: `Test ${role}`,
  role,
});

const setUser = (user: User | null) => {
  useAuthStore.setState({ user, accessToken: user ? 'mock-token' : null });
};

const renderGuard = (
  allowed: Array<'EMPLOYEE' | 'PM' | 'HR' | 'ADMIN'>,
  options?: { redirectOnDeny?: boolean; redirectTo?: string; fallback?: React.ReactNode },
  initialPath = '/protected',
) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route
          path="/protected"
          element={
            <PermissionGuard allowedRoles={allowed} {...options}>
              <div data-testid="protected-content">SECRET</div>
            </PermissionGuard>
          }
        />
        <Route path="/dashboard" element={<div data-testid="dashboard">DASHBOARD</div>} />
        <Route path="/login" element={<div data-testid="login">LOGIN</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('PermissionGuard', () => {
  beforeEach(() => {
    setUser(null);
  });

  it('renders children when user has allowed role', () => {
    setUser(buildUser('ADMIN'));
    renderGuard(['ADMIN', 'HR']);
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('redirects to /dashboard when user lacks role (default behavior)', () => {
    setUser(buildUser('EMPLOYEE'));
    renderGuard(['ADMIN']);
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('redirects to custom route when specified', () => {
    setUser(buildUser('PM'));
    renderGuard(['HR', 'ADMIN'], { redirectTo: '/login' });
    expect(screen.getByTestId('login')).toBeInTheDocument();
  });

  it('renders fallback when redirectOnDeny is false and no fallback provided', () => {
    setUser(buildUser('EMPLOYEE'));
    renderGuard(['ADMIN'], { redirectOnDeny: false });
    // Default fallback shows "Access Restricted" (in current i18n language)
    expect(screen.getByText(/truy cập|Restricted/i)).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    setUser(buildUser('EMPLOYEE'));
    renderGuard(['ADMIN'], {
      redirectOnDeny: false,
      fallback: <div data-testid="custom-fallback">DENIED</div>,
    });
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
  });

  it('redirects unauthenticated user to /login', () => {
    setUser(null);
    renderGuard(['EMPLOYEE']);
    expect(screen.getByTestId('login')).toBeInTheDocument();
  });
});
