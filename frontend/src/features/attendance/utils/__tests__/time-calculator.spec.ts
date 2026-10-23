import { describe, expect, it } from 'vitest';
import {
  calculateWorkHours,
  calculateWorkHoursToNow,
  calculateEarlyMinutes,
  DEFAULT_LUNCH_CONFIG,
} from '../time-calculator';

/**
 * Regression tests cho `time-calculator`.
 *
 * Bug gốc: bản ghi điểm danh có `checkOutTime` < `checkInTime` (check-out bị ghi
 * nhầm sang ngày hôm trước) → `calculateWorkHours` trả 0 → UI hiện
 * "Working 0.0h" dù nhân viên đã làm cả ngày.
 */

describe('time-calculator', () => {
  describe('calculateWorkHours', () => {
    it('tính đúng khi check-in và check-out theo đúng thứ tự', () => {
      // 08:00 → 17:30 = 9h30, trừ 1h nghỉ trưa = 8.5h
      const checkIn = new Date('2026-10-24T08:00:00');
      const checkOut = new Date('2026-10-24T17:30:00');
      expect(calculateWorkHours(checkIn, checkOut)).toBe(8.5);
    });

    it('tự hoán đổi khi check-out TRƯỚC check-in (dữ liệu sai thứ tự)', () => {
      // checkIn 24/10 08:18, checkOut 23/10 04:39 (bị ghi nhầm)
      const checkIn = new Date('2026-10-24T01:18:00.000Z');
      const checkOut = new Date('2026-10-23T21:39:09.235Z');
      const hours = calculateWorkHours(checkIn, checkOut);
      // Trước fix: 0. Sau fix: > 0
      expect(hours).toBeGreaterThan(0);
    });

    it('trả 0 khi thiếu check-in hoặc check-out', () => {
      expect(calculateWorkHours(null, new Date())).toBe(0);
      expect(calculateWorkHours(new Date(), null)).toBe(0);
      expect(calculateWorkHours(undefined, undefined)).toBe(0);
    });

    it('chấp nhận chuỗi ISO (kiểu dữ liệu API trả về)', () => {
      const checkIn = '2026-10-24T01:00:00.000Z';
      const checkOut = '2026-10-24T10:00:00.000Z';
      const hours = calculateWorkHours(checkIn, checkOut);
      expect(hours).toBe(8); // 9h - 1h nghỉ trưa
    });

    it('không trừ nghỉ trưa nếu ca làm việc không chạm giờ nghỉ', () => {
      const checkIn = new Date('2026-10-24T08:00:00');
      const checkOut = new Date('2026-10-24T11:00:00');
      expect(calculateWorkHours(checkIn, checkOut)).toBe(3);
    });

    it('chỉ trừ phần nghỉ trưa thực sự nằm trong ca (check-in sau 12:00)', () => {
      // 13:00 → 15:00, chỉ chạm 0 phút nghỉ trưa (12-13 đã qua)
      const checkIn = new Date('2026-10-24T13:00:00');
      const checkOut = new Date('2026-10-24T15:00:00');
      expect(calculateWorkHours(checkIn, checkOut)).toBe(2);
    });
  });

  describe('calculateWorkHoursToNow', () => {
    it('tính giờ làm đến thời điểm hiện tại khi chưa check-out', () => {
      const checkIn = new Date('2026-10-24T08:00:00');
      const now = new Date('2026-10-24T12:30:00');
      // 4h30 - 0.5h nghỉ trưa (12:00-12:30) = 4h
      expect(calculateWorkHoursToNow(checkIn, now)).toBe(4);
    });

    it('trả 0 khi now <= check-in', () => {
      const checkIn = new Date('2026-10-24T08:00:00');
      const now = new Date('2026-10-24T07:00:00');
      expect(calculateWorkHoursToNow(checkIn, now)).toBe(0);
    });
  });

  describe('calculateEarlyMinutes', () => {
    it('trả số phút về sớm', () => {
      const checkOut = new Date('2026-10-24T16:00:00');
      // 17:30 - 16:00 = 90 phút
      expect(calculateEarlyMinutes(checkOut, 17, 30)).toBe(90);
    });

    it('trả 0 khi check-out đúng giờ làm việc', () => {
      const checkOut = new Date('2026-10-24T17:30:00');
      expect(calculateEarlyMinutes(checkOut, 17, 30)).toBe(0);
    });
  });

  describe('DEFAULT_LUNCH_CONFIG', () => {
    it('nghỉ trưa 12:00-13:00', () => {
      expect(DEFAULT_LUNCH_CONFIG.lunchStartHour).toBe(12);
      expect(DEFAULT_LUNCH_CONFIG.lunchEndHour).toBe(13);
      expect(DEFAULT_LUNCH_CONFIG.lunchDurationMinutes).toBe(60);
    });
  });
});
