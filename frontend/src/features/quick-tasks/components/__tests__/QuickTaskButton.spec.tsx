/**
 * Tests for QuickTaskButton — RBAC visibility
 *  - PM, DEPARTMENT_HEAD, ADMIN: thấy nút
 *  - EMPLOYEE, HR: KHÔNG thấy nút
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useAuthStore, type User } from '@/stores/auth.store';
import { QuickTaskButton } from '../QuickTaskButton';

// Mock QuickTaskModal to avoid network/render complexity
vi.mock('../QuickTaskModal', () => ({
  QuickTaskModal: () => <div data-testid="quick-task-modal" />,
}));

const buildUser = (role: User['role']): User => ({
  id: `u-${role}`,
  email: `${role.toLowerCase()}@worksync.com`,
  name: `Test ${role}`,
  role,
});

describe('QuickTaskButton — RBAC visibility', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null });
  });

  it('renders for ADMIN', () => {
    useAuthStore.setState({ user: buildUser('ADMIN'), accessToken: 'mock' });
    render(<QuickTaskButton />);
    expect(screen.getByTestId('quick-task-button')).toBeInTheDocument();
  });

  it('renders for DEPARTMENT_HEAD', () => {
    useAuthStore.setState({ user: buildUser('DEPARTMENT_HEAD'), accessToken: 'mock' });
    render(<QuickTaskButton />);
    expect(screen.getByTestId('quick-task-button')).toBeInTheDocument();
  });

  it('renders for PM', () => {
    useAuthStore.setState({ user: buildUser('PM'), accessToken: 'mock' });
    render(<QuickTaskButton />);
    expect(screen.getByTestId('quick-task-button')).toBeInTheDocument();
  });

  it('does NOT render for EMPLOYEE', () => {
    useAuthStore.setState({ user: buildUser('EMPLOYEE'), accessToken: 'mock' });
    const { container } = render(<QuickTaskButton />);
    expect(container.querySelector('[data-testid="quick-task-button"]')).toBeNull();
  });

  it('does NOT render for HR', () => {
    useAuthStore.setState({ user: buildUser('HR'), accessToken: 'mock' });
    const { container } = render(<QuickTaskButton />);
    expect(container.querySelector('[data-testid="quick-task-button"]')).toBeNull();
  });
});
