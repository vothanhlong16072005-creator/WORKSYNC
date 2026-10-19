import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WorkCalendarPage } from '../pages/WorkCalendarPage';
import { useCalendarStore } from '../stores/calendar.store';
import { useAuthStore } from '@/stores/auth.store';

vi.mock('../api/calendar.api', () => ({
  calendarApi: {
    getTimeline: vi.fn().mockResolvedValue({
      range: { from: '2026-10-20T00:00:00.000Z', to: '2026-10-27T00:00:00.000Z' },
      scope: 'mine',
      items: [
        {
          kind: 'task',
          id: 'task-1',
          title: 'Unit Test Task',
          startAt: '2026-10-21T09:00:00.000Z',
          endAt: '2026-10-21T09:00:00.000Z',
          projectId: 'p-1',
          projectName: 'WorkSync V2',
          status: 'TODO',
          priority: 'HIGH',
          assigneeId: 'u-1',
          assigneeName: 'Dev Test',
          creatorId: 'u-pm',
          creatorName: 'PM Tuan',
          canReschedule: true,
        },
      ],
      conflicts: [],
    }),
    rescheduleItem: vi.fn(),
    exportIcs: vi.fn(),
  },
}));

vi.mock('@/stores/project.store', () => ({
  useProjectStore: () => ({
    projects: [{ id: 'p-1', name: 'WorkSync V2' }],
    loadMine: vi.fn(),
  }),
}));

describe('WorkCalendarPage', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: {
        id: 'u-1',
        email: 'test@worksync.com',
        name: 'Dev Test',
        role: 'EMPLOYEE',
      },
      accessToken: 'mock-token',
    });

    useCalendarStore.setState({
      items: [
        {
          kind: 'task',
          id: 'task-1',
          title: 'Unit Test Task',
          startAt: '2026-10-21T09:00:00.000Z',
          endAt: '2026-10-21T09:00:00.000Z',
          projectId: 'p-1',
          projectName: 'WorkSync V2',
          status: 'TODO',
          priority: 'HIGH',
          assigneeId: 'u-1',
          assigneeName: 'Dev Test',
          creatorId: 'u-pm',
          creatorName: 'PM Tuan',
          canReschedule: true,
        },
      ],
      conflicts: [],
      isLoading: false,
    });
  });

  it('1. Renders calendar page with header, KPIs, and items', async () => {
    render(
      <MemoryRouter>
        <WorkCalendarPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Lịch làm việc')).toBeInTheDocument();
    expect(await screen.findByText('Unit Test Task')).toBeInTheDocument();
    expect(screen.getByText('Của tôi')).toBeInTheDocument();
    expect(screen.getByText('Tuần')).toBeInTheDocument();
  });
});
