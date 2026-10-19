import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectSprintsView } from '../ProjectSprintsView';
import type { Sprint } from '@/features/sprints/types/sprint.types';
import type { TaskDetailModalTask } from '@/features/tasks/components/TaskDetailModal';

describe('ProjectSprintsView', () => {
  const mockSprint: Sprint = {
    id: 'sprint-1',
    projectId: 'proj-1',
    name: 'Sprint 14: Mobile App',
    goal: 'Ship authentication and push notifications',
    status: 'ACTIVE',
    startDate: '2026-10-01T00:00:00.000Z',
    endDate: '2026-10-15T00:00:00.000Z',
    durationDays: 14,
    completedAt: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    updatedAt: '2026-10-01T00:00:00.000Z',
  };

  const mockTasks: TaskDetailModalTask[] = [
    {
      id: 'task-1',
      title: 'Tích hợp FaceID biometric',
      status: 'DONE',
      priority: 'HIGH',
      sprintId: 'sprint-1',
      storyPoints: 5,
      dueDate: '2026-10-14T00:00:00.000Z',
      assignee: {
        id: 'user-1',
        name: 'Hoàng Nam',
        avatar: null,
      },
    },
    {
      id: 'task-2',
      title: 'Tối ưu hiệu năng push socket',
      status: 'IN_PROGRESS',
      priority: 'URGENT',
      sprintId: 'sprint-1',
      storyPoints: 8,
      dueDate: '2026-10-15T00:00:00.000Z',
      assignee: {
        id: 'user-2',
        name: 'Tuấn Nguyễn',
        avatar: null,
      },
    },
    {
      id: 'task-3',
      title: 'Thiết kế icon bộ nhận diện',
      status: 'TODO',
      priority: 'LOW',
      sprintId: null, // in Backlog
      storyPoints: 3,
      assignee: null,
    },
  ];

  const defaultProps = {
    projectId: 'proj-1',
    projectName: 'WorkSync Mobile',
    sprints: [mockSprint],
    tasks: mockTasks,
    canManageSprint: true,
    canManageProject: true,
    onCreateSprint: vi.fn(),
    onStartSprint: vi.fn(),
    onCompleteSprint: vi.fn(),
    onDeleteSprint: vi.fn(),
    onCreateTaskInSprint: vi.fn(),
    onTaskClick: vi.fn(),
    onTaskStatusChange: vi.fn(),
    onAssignTaskToSprint: vi.fn(),
  };

  it('renders sprint header, active badge, and progress bar', () => {
    render(<ProjectSprintsView {...defaultProps} />);

    expect(
      screen.getByRole('heading', { level: 3, name: /Sprint 14: Mobile App/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(/ĐANG CHẠY|ACTIVE SPRINT/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Ship authentication/i)).toBeInTheDocument();
    // 1 of 2 sprint tasks is done => 50%
    expect(screen.getByText(/50%/i)).toBeInTheDocument();
  });

  it('renders sprint tasks with assignee, priority and SP', () => {
    render(<ProjectSprintsView {...defaultProps} />);

    expect(screen.getByText('Tích hợp FaceID biometric')).toBeInTheDocument();
    expect(screen.getByText('Tối ưu hiệu năng push socket')).toBeInTheDocument();
    expect(screen.getByText('Hoàng Nam')).toBeInTheDocument();
    expect(screen.getByText('Tuấn Nguyễn')).toBeInTheDocument();
    expect(screen.getByText('5 SP')).toBeInTheDocument();
    expect(screen.getByText('8 SP')).toBeInTheDocument();
  });

  it('renders backlog tasks section with unassigned tasks', () => {
    render(<ProjectSprintsView {...defaultProps} />);

    expect(screen.getByText(/Product Backlog/i)).toBeInTheDocument();
    expect(screen.getByText('Thiết kế icon bộ nhận diện')).toBeInTheDocument();
  });

  it('triggers onCreateTaskInSprint when clicking "+ Thêm Công Việc"', () => {
    const handleCreateTask = vi.fn();
    render(<ProjectSprintsView {...defaultProps} onCreateTaskInSprint={handleCreateTask} />);

    const addTaskBtn = screen.getByText(/Thêm Công Việc|Add Task/i);
    fireEvent.click(addTaskBtn);

    expect(handleCreateTask).toHaveBeenCalledWith('sprint-1');
  });

  it('triggers onTaskStatusChange when toggling completion checkbox', () => {
    const handleStatusChange = vi.fn();
    render(<ProjectSprintsView {...defaultProps} onTaskStatusChange={handleStatusChange} />);

    // Click checkbox of task-2 (IN_PROGRESS) to complete
    const checkboxes = screen.getAllByRole('button', { name: /Đánh dấu/i });
    expect(checkboxes.length).toBeGreaterThan(0);
    fireEvent.click(checkboxes[1]);

    expect(handleStatusChange).toHaveBeenCalledWith('task-2', 'DONE');
  });
});
