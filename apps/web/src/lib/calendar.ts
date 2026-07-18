// Builds a standards-compliant .ics file from the patient's daily schedule so
// one tap drops the whole plan into Apple/Google/Outlook calendars.
// "Auto-add" from a browser means download + open — no calendar write API exists.

type ScheduleItem = {
  title: string;
  detail: string;
  hour: number; // 24h local
  minute: number;
  weekly?: boolean; // weekly (injection) vs daily
};

const SCHEDULE: ScheduleItem[] = [
  { title: 'Metformin 1000mg', detail: 'With breakfast', hour: 8, minute: 0 },
  { title: 'Blood-pressure check', detail: 'Mornings are best', hour: 9, minute: 0 },
  { title: 'Evening walk', detail: '20 min after your meal', hour: 19, minute: 30 },
  { title: 'Metformin 1000mg', detail: 'With your evening meal', hour: 18, minute: 0 },
  { title: 'Semaglutide injection', detail: 'Weekly — same day each week', hour: 9, minute: 30, weekly: true },
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function icsDate(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}T${pad(d.getHours())}${pad(d.getMinutes())}00`;
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

export function buildScheduleIcs(patientName: string): string {
  const now = new Date();
  const stamp = icsDate(now);
  const events = SCHEDULE.map((item, i) => {
    const start = new Date(now);
    start.setHours(item.hour, item.minute, 0, 0);
    if (start < now) start.setDate(start.getDate() + 1); // first occurrence is upcoming
    const end = new Date(start.getTime() + 15 * 60 * 1000);
    return [
      'BEGIN:VEVENT',
      `UID:cadence-${i}-${stamp}@cadence.app`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsDate(start)}`,
      `DTEND:${icsDate(end)}`,
      `RRULE:FREQ=${item.weekly ? 'WEEKLY' : 'DAILY'}`,
      `SUMMARY:${escapeText(item.title)}`,
      `DESCRIPTION:${escapeText(`${item.detail} — from ${patientName}'s Cadence care plan`)}`,
      'BEGIN:VALARM',
      'TRIGGER:-PT5M',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(item.title)}`,
      'END:VALARM',
      'END:VEVENT',
    ].join('\r\n');
  });

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cadence//Care Plan//EN',
    'CALSCALE:GREGORIAN',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

export function downloadScheduleIcs(patientName: string): void {
  const blob = new Blob([buildScheduleIcs(patientName)], {
    type: 'text/calendar;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'cadence-daily-plan.ics';
  a.click();
  URL.revokeObjectURL(url);
}
