import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useAuthStore, type User } from '@/stores/auth.store';
import { CreateMeetingModal } from '../CreateMeetingModal';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    get: vi.fn().mockResolvedValue({ data: [] }),
    post: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

const buildUser = (role: User['role'], departmentId?: string): User => ({
  id: `u-${role}`,
  email: `${role.toLowerCase()}@worksync.com`,
  name: `Test ${role}`,
  role,
  departmentId,
});

describe('CreateMeetingModal', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, accessToken: null });
  });

  it('1. PM sees Dự án and 1-on-1 scopes, but NOT Phòng ban', () => {
    useAuthStore.setState({ user: buildUser('PM', 'dept-1') });
    render(<CreateMeetingModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByText('Dự án')).toBeInTheDocument();
    expect(screen.getByText(/Cuộc họp tự do|1-on-1/)).toBeInTheDocument();
    expect(screen.queryByText('Phòng ban')).not.toBeInTheDocument();
  });

  it('2. DEPARTMENT_HEAD sees Phòng ban, Dự án and 1-on-1 scopes', () => {
    useAuthStore.setState({ user: buildUser('DEPARTMENT_HEAD', 'dept-1') });
    render(<CreateMeetingModal isOpen={true} onClose={() => {}} />);

    expect(screen.getByText('Phòng ban')).toBeInTheDocument();
    expect(screen.getByText('Dự án')).toBeInTheDocument();
    expect(screen.getByText(/Cuộc họp tự do|1-on-1/)).toBeInTheDocument();
  });

  it('3. EMPLOYEE only sees 1-on-1 scope', () => {
    useAuthStore.setState({ user: buildUser('EMPLOYEE', 'dept-1') });
    render(<CreateMeetingModal isOpen={true} onClose={() => {}} />);

    expect(screen.queryByText('Dự án')).not.toBeInTheDocument();
    expect(screen.queryByText('Phòng ban')).not.toBeInTheDocument();
    expect(screen.getByText(/Cuộc họp tự do|1-on-1/)).toBeInTheDocument();
  });
});
