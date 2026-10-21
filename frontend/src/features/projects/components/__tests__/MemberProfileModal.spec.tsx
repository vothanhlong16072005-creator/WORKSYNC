import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MemberProfileModal } from '../MemberProfileModal';
import type { ProjectMemberItem } from '../../types/project.types';
import type { TaskDetailModalTask } from '@/features/tasks/components/TaskDetailModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
    i18n: { language: 'vi' },
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('MemberProfileModal', () => {
  const mockMember: ProjectMemberItem = {
    id: 'pm-1',
    userId: 'user-123',
    projectId: 'proj-1',
    projectRole: 'DEV_LEAD',
    joinedAt: '2026-01-01',
    user: {
      id: 'user-123',
      name: 'Nguyễn Văn Hùng',
      email: 'hung.nguyen@worksync.com',
      avatar: null,
      role: 'EMPLOYEE',
    },
  };

  const mockTasks: TaskDetailModalTask[] = [
    {
      id: 'task-1',
      title: 'Tối ưu API Endpoint',
      status: 'DONE',
      priority: 'HIGH',
      storyPoints: 5,
    },
    {
      id: 'task-2',
      title: 'Xây dựng UI Dashboard',
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      storyPoints: 3,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders member profile, metrics, and assigned tasks accurately', () => {
    const onSelectTask = vi.fn();
    render(
      <MemoryRouter>
        <MemberProfileModal
          isOpen={true}
          onClose={vi.fn()}
          member={mockMember}
          projectName="WorkSync Enterprise"
          memberTasks={mockTasks}
          onSelectTask={onSelectTask}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Nguyễn Văn Hùng')).toBeInTheDocument();
    expect(screen.getByText('hung.nguyen@worksync.com')).toBeInTheDocument();
    expect(screen.getByText('DEV_LEAD')).toBeInTheDocument();
    expect(screen.getByText('WorkSync Enterprise')).toBeInTheDocument();

    // Metrics check: Total tasks 2, Done 1, In Progress 1, Story Points 8
    expect(screen.getByText('2')).toBeInTheDocument(); // Total tasks
    expect(screen.getByText('(50%)')).toBeInTheDocument(); // 50% completion rate
    expect(screen.getByText('8')).toBeInTheDocument(); // 8 story points total

    // Tasks list
    expect(screen.getByText('Tối ưu API Endpoint')).toBeInTheDocument();
    expect(screen.getByText('Xây dựng UI Dashboard')).toBeInTheDocument();

    // Clicking a task
    fireEvent.click(screen.getByText('Tối ưu API Endpoint'));
    expect(onSelectTask).toHaveBeenCalledWith(mockTasks[0]);
  });
});
