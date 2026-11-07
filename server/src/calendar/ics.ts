/**
 * Builds an iCalendar file (RFC 5545), the format Google Calendar, Apple Calendar and Outlook read.
 * Bookings have an exact instant (UTC). A personal event has no time zone, so it is written as a
 * "floating" time: it shows at the same clock time wherever the calendar is read.
 */

const CRLF = "\r\n";

export type IcsTime =
  | { kind: "utc"; start: Date; end: Date }
  | { kind: "floating"; date: string; from: number; to: number }
  | { kind: "allDay"; date: string };

export interface IcsEvent {
  uid: string;
  summary: string;
  time: IcsTime;
  location?: string;
  description?: string;
}

/** Commas, semicolons, backslashes and line breaks have a meaning in a text value. */
export function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** A line is at most 75 bytes: longer ones continue on the next line, which starts with a space. */
export function foldLine(line: string): string {
  if (Buffer.byteLength(line) <= 75) return line;
  const parts: string[] = [];
  let current = "";
  let size = 0;
  let limit = 75;
  for (const char of line) {
    const bytes = Buffer.byteLength(char);
    if (size + bytes > limit) {
      parts.push(current);
      current = char;
      size = bytes;
      limit = 74; // the leading space of a continuation line counts too
    } else {
      current += char;
      size += bytes;
    }
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}

export function formatUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

const compactDate = (date: string) => date.replaceAll("-", "");

function floating(date: string, minute: number): string {
  const clamped = Math.min(minute, 24 * 60 - 1);
  const hh = String(Math.floor(clamped / 60)).padStart(2, "0");
  const mm = String(clamped % 60).padStart(2, "0");
  return `${compactDate(date)}T${hh}${mm}00`;
}

function nextDay(date: string): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

function timeLines(time: IcsTime): string[] {
  if (time.kind === "utc") return [`DTSTART:${formatUtc(time.start)}`, `DTEND:${formatUtc(time.end)}`];
  if (time.kind === "allDay") return [`DTSTART;VALUE=DATE:${compactDate(time.date)}`, `DTEND;VALUE=DATE:${compactDate(nextDay(time.date))}`];
  // An event that ends at midnight ends on the next day.
  const end = time.to >= 24 * 60 ? `${compactDate(nextDay(time.date))}T000000` : floating(time.date, time.to);
  return [`DTSTART:${floating(time.date, time.from)}`, `DTEND:${end}`];
}

export function buildCalendar(name: string, events: IcsEvent[], now = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Reservation d'Espace//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(name)}`,
    // Hints for calendar apps on how often to ask again (Google decides for itself, every few hours).
    "REFRESH-INTERVAL;VALUE=DURATION:PT1H",
    "X-PUBLISHED-TTL:PT1H",
  ];
  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.uid}`,
      `DTSTAMP:${formatUtc(now)}`,
      ...timeLines(event.time),
      `SUMMARY:${escapeText(event.summary)}`,
      ...(event.location ? [`LOCATION:${escapeText(event.location)}`] : []),
      ...(event.description ? [`DESCRIPTION:${escapeText(event.description)}`] : []),
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");
  return lines.map(foldLine).join(CRLF) + CRLF;
}
