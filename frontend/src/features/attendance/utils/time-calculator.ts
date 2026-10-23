/**
 * Mirror of backend time-calculator utility for use in frontend.
 * Auto-subtracts lunch break overlap.
 */

export interface LunchConfig {
  lunchStartHour: number;
  lunchEndHour: number;
  lunchDurationMinutes: number;
}

export const DEFAULT_LUNCH_CONFIG: LunchConfig = {
  lunchStartHour: 12,
  lunchEndHour: 13,
  lunchDurationMinutes: 60,
};

function toDate(input: Date | string | null | undefined): Date | null {
  if (!input) return null;
  if (input instanceof Date) return input;
  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

function setTime(d: Date, hour: number, minute: number = 0): Date {
  const out = new Date(d);
  out.setHours(hour, minute, 0, 0);
  return out;
}

function getLunchOverlapMinutes(
  checkIn: Date,
  checkOut: Date,
  config: LunchConfig,
): number {
  if (checkOut <= checkIn) return 0;
  const lunchStart = setTime(checkIn, config.lunchStartHour, 0);
  const lunchEnd = setTime(checkIn, config.lunchEndHour, 0);
  const overlapStart = checkIn > lunchStart ? checkIn : lunchStart;
  const overlapEnd = checkOut < lunchEnd ? checkOut : lunchEnd;
  if (overlapStart >= overlapEnd) return 0;
  return Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / 60000);
}

export function calculateWorkHours(
  checkIn: Date | string | null | undefined,
  checkOut: Date | string | null | undefined,
  config: LunchConfig = DEFAULT_LUNCH_CONFIG,
): number {
  const inDate = toDate(checkIn);
  const outDate = toDate(checkOut);
  if (!inDate || !outDate) return 0;

  // ⚠️ Dữ liệu có thể bị sai thứ tự khi check-out bị ghi nhầm sang ngày hôm
  // trước (ví dụ check-in 24/10 08:18 nhưng check-out lại là 23/10 04:39).
  // Khi đó `outDate <= inDate` → trả 0 → UI hiện "0.0h" dù đã làm cả ngày.
  // → Tự động hoán đổi để luôn tính đúng khoảng thời gian làm việc.
  const [start, end] = outDate < inDate ? [outDate, inDate] : [inDate, outDate];

  const totalMinutes = Math.floor((end.getTime() - start.getTime()) / 60000);
  const lunchOverlap = getLunchOverlapMinutes(start, end, config);
  const workMinutes = Math.max(0, totalMinutes - lunchOverlap);
  return Math.round((workMinutes / 60) * 100) / 100;
}

export function calculateEarlyMinutes(
  checkOut: Date | string,
  workEndHour: number = 17,
  workEndMinute: number = 30,
): number {
  const out = toDate(checkOut);
  if (!out) return 0;
  const workEnd = setTime(out, workEndHour, workEndMinute);
  return Math.floor((workEnd.getTime() - out.getTime()) / 60000);
}

/**
 * Tính giờ làm việc thực tế khi CHƯA có check-out (đang trong ca).
 * Dùng `now` làm mốc → luôn >= checkIn nên không bị lỗi thứ tự thời gian.
 */
export function calculateWorkHoursToNow(
  checkIn: Date | string | null | undefined,
  now: Date | string | null | undefined = new Date(),
  config: LunchConfig = DEFAULT_LUNCH_CONFIG,
): number {
  const inDate = toDate(checkIn);
  const nowDate = toDate(now);
  if (!inDate || !nowDate) return 0;
  if (nowDate <= inDate) return 0;
  const totalMinutes = Math.floor((nowDate.getTime() - inDate.getTime()) / 60000);
  const lunchOverlap = getLunchOverlapMinutes(inDate, nowDate, config);
  const workMinutes = Math.max(0, totalMinutes - lunchOverlap);
  return Math.round((workMinutes / 60) * 100) / 100;
}

export function calculateActualOTHours(
  checkOut: Date | string,
  registeredHours: number,
  workEndHour: number = 17,
  workEndMinute: number = 30,
): number {
  if (registeredHours <= 0) return 0;
  const out = toDate(checkOut);
  if (!out) return 0;
  const workEnd = setTime(out, workEndHour, workEndMinute);
  if (out <= workEnd) return 0;
  const actualMinutes = (out.getTime() - workEnd.getTime()) / 60000;
  return Math.round(Math.min(registeredHours, actualMinutes / 60) * 10) / 10;
}
