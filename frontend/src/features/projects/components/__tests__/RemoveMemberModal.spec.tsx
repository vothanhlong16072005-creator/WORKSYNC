import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RemoveMemberModal } from '../RemoveMemberModal';
import type { ProjectMemberItem } from '../../types/project.types';
import type { TaskDetailModalTask } from '@/features/tasks/components/TaskDetailModal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue || key,
    i18n: { language: 'vi' },
  }),
}));

describe('RemoveMemberModal', () => {
  const mockMember: ProjectMemberItem = {
    id: 'pm-1',
    userId: 'user-123',
    projectId: 'proj-1',
    projectRole: 'DEV',
    joinedAt: '2026-01-01',
    user: {
      id: 'user-123',
      name: 'Trần Văn Nam',
      email: 'nam.tran@worksync.com',
      avatar: null,
      role: 'EMPLOYEE',
    },
  };

  const mockAvailableMembers: ProjectMemberItem[] = [
    {
      id: 'pm-2',
      userId: 'user-456',
      projectId: 'proj-1',
      projectRole: 'DEV',
      joinedAt: '2026-01-01',
      user: {
        id: 'user-456',
        name: 'Lê Hoàng Long',
        email: 'long.le@worksync.com',
        avatar: null,
        role: 'EMPLOYEE',
      },
    },
  ];

  const mockPendingTasks: TaskDetailModalTask[] = [
    {
      id: 'task-1',
      title: 'Thiết kế Database Schema',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders standard removal modal when member has no pending tasks', () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <RemoveMemberModal
        isOpen={true}
        onClose={vi.fn()}
        member={mockMember}
        pendingTasks={[]}
        availableMembers={mockAvailableMembers}
        onConfirm={onConfirm}
      />,
    );

    expect(screen.getByText('Trần Văn Nam')).toBeInTheDocument();
    expect(screen.getByText('Xác Nhận Xóa')).toBeInTheDocument();
    expect(screen.getByText(/hiện không có nhiệm vụ chưa hoàn thành nào/i)).toBeInTheDocument();
    expect(screen.queryByText(/chuyển giao toàn bộ/i)).not.toBeInTheDocument();
  });

  it('renders warning alert and requires reassignment when member has pending tasks', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <RemoveMemberModal
        isOpen={true}
        onClose={vi.fn()}
        member={mockMember}
        pendingTasks={mockPendingTasks}
        availableMembers={mockAvailableMembers}
        onConfirm={onConfirm}
      />,
    );

    // Shows pending task warning
    expect(screen.getByText(/1 nhiệm vụ chưa hoàn thành/i)).toBeInTheDocument();
    expect(screen.getByText('Thiết kế Database Schema')).toBeInTheDocument();

    // Reassign submit button
    const submitBtn = screen.getByRole('button', { name: /Bàn Giao Nhiệm Vụ & Xóa/i });
    expect(submitBtn).toBeDisabled();

    // Select replacement member
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'user-456' } });

    expect(submitBtn).not.toBeDisabled();
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('user-456');
    });
  });
});
