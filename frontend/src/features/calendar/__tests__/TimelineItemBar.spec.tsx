import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TimelineItemBar } from '../components/TimelineItemBar';
import type { TaskTimelineItem } from '../types/calendar.types';

describe('TimelineItemBar', () => {
  const mockTask: TaskTimelineItem = {
    kind: 'task',
    id: 't-123',
    title: 'Deploy Production V2',
    description: null,
    startAt: '2026-10-22T09:00:00.000Z',
    endAt: '2026-10-22T09:00:00.000Z',
    projectId: 'p-1',
    projectName: 'WorkSync V2',
    status: 'IN_PROGRESS',
    priority: 'HIGH',
    assigneeId: 'u-1',
    assigneeName: 'Dev Long',
    creatorId: 'u-pm',
    creatorName: 'PM Tuan',
    canReschedule: true,
  };

  it('1. Renders item title and type icon accurately', () => {
    const handleClick = vi.fn();
    render(<TimelineItemBar item={mockTask} onClick={handleClick} />);

    expect(screen.getByText('Deploy Production V2')).toBeInTheDocument();
  });

  it('2. Triggers onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<TimelineItemBar item={mockTask} onClick={handleClick} />);

    fireEvent.click(screen.getByText('Deploy Production V2'));
    expect(handleClick).toHaveBeenCalledWith(mockTask);
  });

  it('3. Renders conflict badge if conflict exists for item', () => {
    const handleClick = vi.fn();
    const mockConflict = {
      userId: 'u-1',
      userName: 'Dev Long',
      type: 'overdue_overload' as const,
      message: 'Dev Long có 3 task quá hạn',
      involvedItemIds: ['t-123'],
    };

    render(
      <TimelineItemBar
        item={mockTask}
        conflicts={[mockConflict]}
        onClick={handleClick}
      />,
    );

    expect(screen.getByTitle(/Dev Long có 3 task quá hạn/)).toBeInTheDocument();
  });
});
