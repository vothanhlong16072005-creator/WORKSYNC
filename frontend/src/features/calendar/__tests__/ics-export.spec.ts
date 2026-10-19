import { describe, expect, it } from 'vitest';
import { buildClientIcs } from '../utils/ics-export';
import type { TimelineItem } from '../types/calendar.types';

describe('ics-export utility', () => {
  it('1. Generates valid RFC 5545 empty VCALENDAR when no items', () => {
    const ics = buildClientIcs([]);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).not.toContain('BEGIN:VEVENT');
  });

  it('2. Generates VEVENT with correct fields for populated items', () => {
    const mockItems: TimelineItem[] = [
      {
        kind: 'meeting',
        id: 'meet-101',
        title: 'Daily Standup',
        description: 'Sync team blockers',
        startAt: '2026-10-21T09:00:00.000Z',
        endAt: '2026-10-21T09:30:00.000Z',
        scope: 'PROJECT',
        projectId: 'p-1',
        departmentId: null,
        attendeeCount: 5,
        status: 'SCHEDULED',
        creatorId: 'u-1',
        creatorName: 'PM',
        canReschedule: true,
      },
    ];

    const ics = buildClientIcs(mockItems);
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('UID:meeting-meet-101@worksync.vn');
    expect(ics).toContain('SUMMARY:[MEETING] Daily Standup');
    expect(ics).toContain('DESCRIPTION:Sync team blockers');
    expect(ics).toContain('STATUS:CONFIRMED');
    expect(ics).toContain('END:VEVENT');
  });
});
