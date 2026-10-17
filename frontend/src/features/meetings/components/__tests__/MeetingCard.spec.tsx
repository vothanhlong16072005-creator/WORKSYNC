import { BrowserRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useAuthStore } from '@/stores/auth.store';
import { MeetingCard } from '../MeetingCard';
import type { Meeting } from '../../types/meeting.types';

describe('MeetingCard', () => {
  const mockMeeting: Meeting = {
    id: 'meet-1',
    title: 'Daily Standup',
    description: 'Họp nhanh đầu ngày',
    scopeType: 'PROJECT',
    status: 'SCHEDULED',
    startTime: '2026-10-18T09:00:00Z',
    endTime: '2026-10-18T09:30:00Z',
    roomCode: 'room-1',
    createdById: 'pm-1',
    createdBy: { id: 'pm-1', name: 'Nguyễn PM', email: 'pm@worksync.com', role: 'PM' },
    project: { id: 'p-1', name: 'Worksync Platform', code: 'WSP' },
    attendees: [
      {
        id: 'att-1',
        meetingId: 'meet-1',
        userId: 'u-1',
        user: { id: 'u-1', name: 'Long Võ', email: 'long@worksync.com', role: 'EMPLOYEE' },
        rsvp: 'PENDING',
        totalDurationSeconds: 0,
      },
    ],
    createdAt: '2026-10-17T00:00:00Z',
    updatedAt: '2026-10-17T00:00:00Z',
  };

  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 'u-1', name: 'Long Võ', email: 'long@worksync.com', role: 'EMPLOYEE' },
      accessToken: 'token',
    });
  });

  it('renders title, project name, scope badge and RSVP buttons', () => {
    render(
      <BrowserRouter>
        <MeetingCard meeting={mockMeeting} />
      </BrowserRouter>,
    );

    expect(screen.getByText('Daily Standup')).toBeInTheDocument();
    expect(screen.getByText('Dự án: Worksync Platform')).toBeInTheDocument();
    expect(screen.getByText('Dự án')).toBeInTheDocument();
    expect(screen.getByText('Tham gia')).toBeInTheDocument();
    expect(screen.getByText('Từ chối')).toBeInTheDocument();
    expect(screen.getByText('Vào phòng')).toBeInTheDocument();
  });
});
