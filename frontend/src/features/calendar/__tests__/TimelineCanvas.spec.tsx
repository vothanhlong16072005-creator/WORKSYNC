import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TimelineCanvas } from '../components/TimelineCanvas';
import { useCalendarStore } from '../stores/calendar.store';

describe('TimelineCanvas', () => {
  it('1. Renders empty state message when items list is empty', () => {
    useCalendarStore.setState({ items: [], isLoading: false });
    render(<TimelineCanvas />);

    expect(
      screen.getByText(/Không có sự kiện hoặc công việc nào trong khoảng thời gian này/),
    ).toBeInTheDocument();
  });

  it('2. Renders user rows when items are present', () => {
    useCalendarStore.setState({
      items: [
        {
          kind: 'task',
          id: 'task-1',
          title: 'Design Wireframes',
          startAt: new Date().toISOString(),
          endAt: new Date().toISOString(),
          projectId: 'p-1',
          projectName: 'WorkSync V2',
          status: 'TODO',
          priority: 'MEDIUM',
          assigneeId: 'u-1',
          assigneeName: 'Dev Long',
          creatorId: 'u-pm',
          creatorName: 'PM Tuan',
          canReschedule: true,
        },
      ],
      isLoading: false,
    });

    render(<TimelineCanvas />);
    expect(screen.getByText('Dev Long')).toBeInTheDocument();
    expect(screen.getByText('Design Wireframes')).toBeInTheDocument();
  });
});
