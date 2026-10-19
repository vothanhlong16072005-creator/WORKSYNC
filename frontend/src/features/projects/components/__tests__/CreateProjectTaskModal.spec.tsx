import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreateProjectTaskModal } from '../CreateProjectTaskModal';
import { apiClient } from '@/lib/api-client';

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('CreateProjectTaskModal', () => {
  const mockMembers = [
    {
      userId: 'user-1',
      projectRole: 'PM',
      user: { id: 'user-1', name: 'Nguyễn Minh Tuấn', email: 'pm@worksync.com', avatar: null },
    },
    {
      userId: 'user-2',
      projectRole: 'MEMBER',
      user: { id: 'user-2', name: 'Hoàng Văn Nam', email: 'nam.hoang@worksync.com', avatar: null },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(
      <CreateProjectTaskModal
        isOpen={false}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        projectId="proj-1"
        members={mockMembers}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders modal with project members in assignee dropdown when isOpen is true', () => {
    render(
      <CreateProjectTaskModal
        isOpen={true}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        projectId="proj-ai-meeting"
        projectName="AI Meeting & Speech Intelligence"
        members={mockMembers}
      />,
    );

    expect(screen.getByText(/AI Meeting & Speech Intelligence/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ví dụ: Thiết kế giao diện báo cáo tổng hợp|e\.g\. Implement authentication/i)).toBeInTheDocument();
    expect(screen.getByText(/Nguyễn Minh Tuấn \(PM\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Hoàng Văn Nam \(MEMBER\)/i)).toBeInTheDocument();
  });

  it('submits task successfully with assignee and calls onSuccess and onClose', async () => {
    const mockOnClose = vi.fn();
    const mockOnSuccess = vi.fn();
    (apiClient.post as any).mockResolvedValue({ data: { id: 'task-100', title: 'Task Test' } });

    render(
      <CreateProjectTaskModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
        projectId="proj-ai-meeting"
        members={mockMembers}
      />,
    );

    const titleInput = screen.getByPlaceholderText(/Ví dụ: Thiết kế giao diện báo cáo tổng hợp|e\.g\. Implement authentication/i);
    fireEvent.change(titleInput, { target: { value: 'Xây dựng pipeline WebRTC Gemini Audio' } });

    const selectAssignee = screen.getByRole('combobox', { name: /Giao Cho Thành Viên|Assign To/i });
    fireEvent.change(selectAssignee, { target: { value: 'user-2' } });

    const submitBtn = screen.getByRole('button', { name: /Tạo Công Việc|Create Task/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/tasks',
        expect.objectContaining({
          projectId: 'proj-ai-meeting',
          title: 'Xây dựng pipeline WebRTC Gemini Audio',
          assigneeId: 'user-2',
          status: 'TODO',
          priority: 'MEDIUM',
        }),
      );
      expect(mockOnSuccess).toHaveBeenCalled();
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});
