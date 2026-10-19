export function getDayRange(referenceDate: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(referenceDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(referenceDate);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function getWeekRange(referenceDate: Date = new Date()): { start: Date; end: Date } {
  const current = new Date(referenceDate);
  // In VN: Monday is day 1, Sunday is day 7 (getDay() returns 0 for Sunday)
  const day = current.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;

  const start = new Date(current);
  start.setDate(current.getDate() + diffToMonday);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function getMonthRange(referenceDate: Date = new Date()): { start: Date; end: Date } {
  const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

export function getDaysInInterval(start: Date, end: Date): Date[] {
  const days: Date[] = [];
  const current = new Date(start);
  current.setHours(0, 0, 0, 0);

  const targetEnd = new Date(end);
  targetEnd.setHours(23, 59, 59, 999);

  while (current <= targetEnd) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

export function formatTime(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function formatDateShort(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === 'string' ? new Date(isoOrDate) : isoOrDate;
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
}

export function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}
