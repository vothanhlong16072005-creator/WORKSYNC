import { differenceInMinutes, set, startOfDay, max, min } from 'date-fns';

export interface LunchConfig {
  /** Hour of lunch start in 24h format (default 12) */
  lunchStartHour: number;
  /** Hour of lunch end in 24h format (default 13) */
  lunchEndHour: number;
  /** Total lunch duration in minutes (default 60) */
  lunchDurationMinutes: number;
}

export const DEFAULT_LUNCH_CONFIG: LunchConfig = {
  lunchStartHour: 12,
  lunchEndHour: 13,
  lunchDurationMinutes: 60,
};

/**
 * Get lunch overlap in minutes between a work interval and the lunch window.
 * Returns 0 if the work interval does not overlap with the lunch window.
 */
export function getLunchOverlapMinutes(
  checkIn: Date,
  checkOut: Date,
  config: LunchConfig = DEFAULT_LUNCH_CONFIG,
): number {
  if (checkOut <= checkIn) return 0;

  const dayStart = startOfDay(checkIn);
  const lunchStart = set(dayStart, { hours: config.lunchStartHour, minutes: 0 });
  const lunchEnd = set(dayStart, { hours: config.lunchEndHour, minutes: 0 });

  const overlapStart = max([checkIn, lunchStart]);
  const overlapEnd = min([checkOut, lunchEnd]);

  if (overlapStart >= overlapEnd) return 0;
  return differenceInMinutes(overlapEnd, overlapStart);
}

/**
 * Calculate work hours between checkIn and checkOut, automatically subtracting lunch overlap.
 *
 * @example
 * calculateWorkHours(08:30, 17:30) = 8.0 (540 min - 60 min lunch)
 * calculateWorkHours(08:30, 12:00) = 3.5 (no lunch overlap)
 * calculateWorkHours(13:00, 18:00) = 5.0 (no lunch overlap)
 */
export function calculateWorkHours(
  checkIn: Date | string,
  checkOut: Date | string,
  config: LunchConfig = DEFAULT_LUNCH_CONFIG,
): number {
  const inDate = typeof checkIn === 'string' ? new Date(checkIn) : checkIn;
  const outDate = typeof checkOut === 'string' ? new Date(checkOut) : checkOut;

  if (!inDate || !outDate || isNaN(inDate.getTime()) || isNaN(outDate.getTime())) {
    return 0;
  }
  if (outDate <= inDate) return 0;

  const totalMinutes = differenceInMinutes(outDate, inDate);
  const lunchOverlap = getLunchOverlapMinutes(inDate, outDate, config);
  const workMinutes = Math.max(0, totalMinutes - lunchOverlap);
  return Math.round((workMinutes / 60) * 100) / 100;
}

/**
 * Calculate minutes early from workEndTime (e.g., 17:30).
 * Positive = user is early, Negative = user is late.
 */
export function calculateEarlyMinutes(
  checkOut: Date,
  workEndHour: number = 17,
  workEndMinute: number = 30,
  timezone: string = 'Asia/Ho_Chi_Minh',
): number {
  const dayStart = startOfDay(checkOut);
  const workEnd = set(dayStart, { hours: workEndHour, minutes: workEndMinute });
  return differenceInMinutes(workEnd, checkOut);
}

/**
 * Calculate actual overtime hours when checking out.
 * HRM standard: actualOT = min(registeredHours, checkOutTime - workEndTime)
 *
 * @returns actualHours rounded to 1 decimal, or 0 if no OT request or check-out is before work end
 */
export function calculateActualOTHours(
  checkOut: Date,
  registeredHours: number,
  workEndHour: number = 17,
  workEndMinute: number = 30,
): number {
  if (registeredHours <= 0) return 0;
  const dayStart = startOfDay(checkOut);
  const workEnd = set(dayStart, { hours: workEndHour, minutes: workEndMinute });
  if (checkOut <= workEnd) return 0;
  const actualMinutes = differenceInMinutes(checkOut, workEnd);
  const actualHours = Math.min(registeredHours, actualMinutes / 60);
  return Math.round(actualHours * 10) / 10;
}
