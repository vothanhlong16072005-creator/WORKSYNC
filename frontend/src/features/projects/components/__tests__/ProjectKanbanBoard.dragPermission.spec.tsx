import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { ProjectKanbanBoard } from '../ProjectKanbanBoard';
import type { TaskDetailModalTask } from '@/features/tasks/components/TaskDetailModal';

/**
 * Regression test cho phân quyền kéo thả trên Kanban dự án.
 *
 * Bug gốc: `isEmployeeOnly` chặn TOÀN BỘ drag (`isDragDisabled={isEmployeeOnly}`,
 * `isDropDisabled={isEmployeeOnly}`) → nhân viên không thể kéo thả task được giao
 * cho chính mình, dù backend `requireTaskMovePermission` cho phép.
 *
 * Yêu cầu nghiệp vụ: nhân viên được kéo thả task CỦA MÌNH; task của người
 * khác thì không được phép.
 */

vi.mock('sonner', () => ({
  toast: { warning: vi.fn(), error: vi.fn(), success: vi.fn(), info: vi.fn() },
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: 'vi' }, t: (k: string, d?: string) => d ?? k }),
}));

const makeTask = (id: string, assigneeId?: string): TaskDetailModalTask =>
  ({
    id,
    title: `Task ${id}`,
    status: 'TODO',
    priority: 'MEDIUM',
    labels: [],
    assignee: assigneeId ? { id: assigneeId, name: 'User' } : null,
  }) as TaskDetailModalTask;

const renderBoard = (props: React.ComponentProps<typeof ProjectKanbanBoard>) =>
  render(
    <MemoryRouter>
      <ProjectKanbanBoard {...props} />
    </MemoryRouter>,
  );

describe('ProjectKanbanBoard — quyền kéo thả', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('nhân viên ĐƯỢC kéo task được giao cho mình (isDragDisabled = false)', () => {
    const tasks = [makeTask('t1', 'me')];
    const { container } = renderBoard({
      projectId: 'p1',
      projectName: 'Project',
      tasks,
      isEmployeeOnly: true,
      currentUserId: 'me',
      onTaskClick: vi.fn(),
    });

    const card = container.querySelector('[data-rfd-draggable-id="t1"]');
    expect(card).toBeTruthy();
    // Card được phép kéo ⇒ có drag-handle attributes + role=button
    expect(card?.getAttribute('data-rfd-drag-handle-draggable-id')).toBe('t1');
    expect(card?.getAttribute('role')).toBe('button');
  });

  it('nhân viên KHÔNG được kéo task của người khác (isDragDisabled = true)', () => {
    const tasks = [makeTask('t2', 'someone-else')];
    const { container } = renderBoard({
      projectId: 'p1',
      projectName: 'Project',
      tasks,
      isEmployeeOnly: true,
      currentUserId: 'me',
      onTaskClick: vi.fn(),
    });

    const card = container.querySelector('[data-rfd-draggable-id="t2"]');
    // Không có drag-handle ⇒ không thể kéo
    expect(card?.getAttribute('data-rfd-drag-handle-draggable-id')).toBeNull();
    expect(card?.getAttribute('role')).toBeNull();
  });

  it('PM / Admin kéo được MỌI task (isEmployeeOnly = false)', () => {
    const tasks = [makeTask('t3', 'someone-else'), makeTask('t4', 'other')];
    const { container } = renderBoard({
      projectId: 'p1',
      projectName: 'Project',
      tasks,
      isEmployeeOnly: false,
      currentUserId: 'me',
      onTaskClick: vi.fn(),
    });

    for (const id of ['t3', 't4']) {
      const card = container.querySelector(`[data-rfd-draggable-id="${id}"]`);
      expect(card?.getAttribute('data-rfd-drag-handle-draggable-id')).toBe(id);
    }
  });

  it('hiển thị thông báo cho phép kéo task được giao cho mình', () => {
    const tasks = [makeTask('t5', 'me')];
    renderBoard({
      projectId: 'p1',
      projectName: 'Project',
      tasks,
      isEmployeeOnly: true,
      currentUserId: 'me',
      onTaskClick: vi.fn(),
    });

    expect(
      screen.getByText(/kéo thả các công việc được giao cho bạn/i),
    ).toBeTruthy();
  });

  it('hiển thị thông báo "chỉ xem" cho task của người khác', () => {
    const tasks = [makeTask('t6', 'someone-else')];
    renderBoard({
      projectId: 'p1',
      projectName: 'Project',
      tasks,
      isEmployeeOnly: true,
      currentUserId: 'me',
      onTaskClick: vi.fn(),
    });

    expect(screen.getByText(/được giao cho người khác chỉ để xem/i)).toBeTruthy();
  });

  it('vẫn gọi onTaskClick khi click vào card (không ảnh hưởng UI cũ)', () => {
    const onTaskClick = vi.fn();
    const tasks = [makeTask('t7', 'me')];
    const { container } = renderBoard({
      projectId: 'p1',
      projectName: 'Project',
      tasks,
      isEmployeeOnly: true,
      currentUserId: 'me',
      onTaskClick,
    });

    const card = container.querySelector('[data-rfd-draggable-id="t7"]');
    fireEvent.click(card as Element);
    expect(onTaskClick).toHaveBeenCalledWith(expect.objectContaining({ id: 't7' }));
  });
});
