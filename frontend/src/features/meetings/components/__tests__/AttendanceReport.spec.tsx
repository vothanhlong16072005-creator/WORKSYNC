import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AttendanceReport } from '../AttendanceReport';
import type { AttendanceReportData } from '../../types/meeting.types';

describe('AttendanceReport', () => {
  const mockData: AttendanceReportData = {
    meeting: {
      id: 'meet-1',
      title: 'Sprint 1 Review',
      scopeType: 'PROJECT',
      status: 'COMPLETED',
      startTime: '2026-10-18T10:00:00Z',
      endTime: '2026-10-18T11:30:00Z',
      roomCode: 'room-123',
      createdBy: { id: 'u-1', name: 'Nguyễn Văn PM' },
    },
    metrics: {
      totalInvited: 8,
      presentCount: 6,
      absentCount: 1,
      declinedCount: 1,
      pendingCount: 0,
      totalDurationSeconds: 28800,
      avgDurationMinutes: 80,
    },
    details: [
      {
        userId: 'u-1',
        name: 'Nguyễn Văn PM',
        email: 'pm@worksync.com',
        role: 'PM',
        rsvp: 'ACCEPTED',
        durationMinutes: 90,
        durationSeconds: 5400,
        isPresent: true,
        statusLabel: 'Có mặt',
      },
      {
        userId: 'u-2',
        name: 'Lê Văn Vắng',
        email: 'vang@worksync.com',
        role: 'EMPLOYEE',
        rsvp: 'ACCEPTED',
        durationMinutes: 0,
        durationSeconds: 0,
        isPresent: false,
        statusLabel: 'Vắng mặt',
      },
    ],
  };

  it('renders all 6 metrics accurately', () => {
    render(<AttendanceReport data={mockData} />);

    // Total Invited
    expect(screen.getByText('8')).toBeInTheDocument();
    expect(screen.getByText('Tổng mời')).toBeInTheDocument();

    // Present
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getAllByText('Có mặt').length).toBeGreaterThanOrEqual(1);

    // Absent & Declined
    expect(screen.getAllByText('1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Vắng mặt').length).toBeGreaterThanOrEqual(1);

    // Duration
    expect(screen.getByText('80p')).toBeInTheDocument();
    expect(screen.getByText('Thời lượng TB')).toBeInTheDocument();

    // Details table check
    expect(screen.getByText('Nguyễn Văn PM')).toBeInTheDocument();
    expect(screen.getByText('Lê Văn Vắng')).toBeInTheDocument();
  });
});
