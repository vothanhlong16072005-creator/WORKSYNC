import type { TimelineItem } from '../types/calendar.types';

export function downloadBlob(blob: Blob, filename = 'worksync-calendar.ics') {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }, 100);
}

export function buildClientIcs(items: TimelineItem[]): string {
  const formatIcsDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const escapeIcs = (str: string): string => {
    return (str || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  };

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//WorkSync//Client Work Calendar//VI',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:WorkSync Calendar',
  ];

  for (const item of items) {
    const startIcs = formatIcsDate(item.startAt);
    const endIcs = formatIcsDate(item.endAt);
    const summary = escapeIcs(`[${item.kind.toUpperCase()}] ${item.title}`);
    const desc = escapeIcs(item.description || item.title);

    lines.push(
      'BEGIN:VEVENT',
      `UID:${item.kind}-${item.id}@worksync.vn`,
      `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
      `DTSTART:${startIcs}`,
      `DTEND:${endIcs}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${desc}`,
      `STATUS:CONFIRMED`,
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
