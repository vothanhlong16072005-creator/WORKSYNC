import { describe, expect, it } from 'vitest';
import { set } from 'date-fns';
import {
  calculateWorkHours,
  getLunchOverlapMinutes,
  calculateEarlyMinutes,
  calculateActualOTHours,
  DEFAULT_LUNCH_CONFIG,
} from './time-calculator.js';

const today = set(new Date(), { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });

function at(hour: number, minute: number = 0): Date {
  return set(today, { hours: hour, minutes: minute });
}

describe('time-calculator', () => {
  describe('getLunchOverlapMinutes', () => {
    it('returns 60 when work spans full lunch (08:30 → 17:30)', () => {
      const overlap = getLunchOverlapMinutes(at(8, 30), at(17, 30));
      expect(overlap).toBe(60);
    });

    it('returns 0 when work is in the morning (08:30 → 12:00)', () => {
      const overlap = getLunchOverlapMinutes(at(8, 30), at(12, 0));
      expect(overlap).toBe(0);
    });

    it('returns 0 when work is in the afternoon (13:00 → 18:00)', () => {
      const overlap = getLunchOverlapMinutes(at(13, 0), at(18, 0));
      expect(overlap).toBe(0);
    });

    it('returns 30 when work partially overlaps lunch (11:30 → 12:30)', () => {
      const overlap = getLunchOverlapMinutes(at(11, 30), at(12, 30));
      expect(overlap).toBe(30);
    });

    it('returns 0 when checkOut <= checkIn', () => {
      const overlap = getLunchOverlapMinutes(at(12, 0), at(8, 0));
      expect(overlap).toBe(0);
    });

    it('respects custom lunch config (e.g., 11:30-12:30)', () => {
      const customConfig = { lunchStartHour: 11, lunchEndHour: 12, lunchDurationMinutes: 60 };
      const overlap = getLunchOverlapMinutes(at(11, 0), at(13, 0), customConfig);
      expect(overlap).toBe(60);
    });
  });

  describe('calculateWorkHours', () => {
    it('returns 8.0 for full day 08:30 → 17:30 (subtracts 1h lunch)', () => {
      const hours = calculateWorkHours(at(8, 30), at(17, 30));
      expect(hours).toBe(8.0);
    });

    it('returns 3.5 for half morning 08:30 → 12:00 (no lunch overlap)', () => {
      const hours = calculateWorkHours(at(8, 30), at(12, 0));
      expect(hours).toBe(3.5);
    });

    it('returns 5.0 for half afternoon 13:00 → 18:00 (no lunch overlap)', () => {
      const hours = calculateWorkHours(at(13, 0), at(18, 0));
      expect(hours).toBe(5.0);
    });

    it('returns 0 for invalid dates', () => {
      expect(calculateWorkHours('invalid', at(17, 30))).toBe(0);
      expect(calculateWorkHours(at(8, 30), 'invalid')).toBe(0);
    });

    it('returns 0 when checkOut <= checkIn', () => {
      expect(calculateWorkHours(at(17, 30), at(8, 30))).toBe(0);
    });

    it('accepts string ISO dates', () => {
      const inIso = at(8, 30).toISOString();
      const outIso = at(17, 30).toISOString();
      const hours = calculateWorkHours(inIso, outIso);
      expect(hours).toBe(8.0);
    });

    it('uses DEFAULT_LUNCH_CONFIG by default', () => {
      expect(DEFAULT_LUNCH_CONFIG).toEqual({
        lunchStartHour: 12,
        lunchEndHour: 13,
        lunchDurationMinutes: 60,
      });
    });
  });

  describe('calculateEarlyMinutes', () => {
    it('returns positive 90 when checking out at 16:00 (work ends 17:30)', () => {
      const early = calculateEarlyMinutes(at(16, 0));
      expect(early).toBe(90);
    });

    it('returns 0 when checking out exactly at 17:30', () => {
      const early = calculateEarlyMinutes(at(17, 30));
      expect(early).toBe(0);
    });

    it('returns negative -30 when checking out at 18:00 (late / overtime)', () => {
      const early = calculateEarlyMinutes(at(18, 0));
      expect(early).toBe(-30);
    });
  });

  describe('calculateActualOTHours (HRM standard: min(registered, actual))', () => {
    it('returns 1.5 when registered 3h but check-out at 19:00 (1.5h OT)', () => {
      const actual = calculateActualOTHours(at(19, 0), 3);
      expect(actual).toBe(1.5);
    });

    it('returns registeredHours when actual exceeds registered (3h registered, 4h actual)', () => {
      const actual = calculateActualOTHours(at(21, 0), 3);
      expect(actual).toBe(3);
    });

    it('returns 0 when check-out is at or before 17:30', () => {
      expect(calculateActualOTHours(at(17, 30), 3)).toBe(0);
      expect(calculateActualOTHours(at(17, 0), 3)).toBe(0);
    });

    it('returns 0 when registeredHours <= 0', () => {
      expect(calculateActualOTHours(at(20, 0), 0)).toBe(0);
      expect(calculateActualOTHours(at(20, 0), -1)).toBe(0);
    });

    it('rounds to 1 decimal (19:45 → 2.25h → 2.3h)', () => {
      const actual = calculateActualOTHours(at(19, 45), 3);
      expect(actual).toBe(2.3);
    });
  });
});
