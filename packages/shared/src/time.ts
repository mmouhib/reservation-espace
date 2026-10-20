import type { MinuteOfDay, Weekday } from "./models";

/**
 * Dates are plain "YYYY-MM-DD" strings in the time zone of a site, and times are
 * minutes since midnight. This avoids time zone bugs: a booking is "2026-05-12, 09:00 to 11:00"
 * wherever the user looks at it from.
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const WEEKDAYS_FROM_SUNDAY: Weekday[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function isDateString(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  return new Date(`${value}T00:00:00Z`).toISOString().startsWith(value);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

export function weekdayOf(date: string): Weekday {
  return WEEKDAYS_FROM_SUNDAY[new Date(`${date}T00:00:00Z`).getUTCDay()]!;
}

/** "08:30" for 510. */
export function formatMinutes(minutes: MinuteOfDay): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

/** 510 for "08:30". */
export function parseTime(time: string): MinuteOfDay {
  const [h, m] = time.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function zonedParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute"), second: get("second") };
}

/** The wall clock of a time zone as a date string and a minute of the day. */
export function nowIn(timeZone: string, now: Date = new Date()): { date: string; minute: MinuteOfDay } {
  const p = zonedParts(now, timeZone);
  const date = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  return { date, minute: p.hour * 60 + p.minute };
}

function offsetMs(instant: Date, timeZone: string): number {
  const p = zonedParts(instant, timeZone);
  const wallAsUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return wallAsUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** The UTC instant of a wall clock time in a time zone (e.g. 09:00 in Paris). */
export function zonedTimeToUtc(date: string, minute: MinuteOfDay, timeZone: string): Date {
  const [year, month, day] = date.split("-").map(Number) as [number, number, number];
  const wall = Date.UTC(year, month - 1, day, 0, minute);
  // Two passes handle days where the offset changes (daylight saving time).
  const first = wall - offsetMs(new Date(wall), timeZone);
  return new Date(wall - offsetMs(new Date(first), timeZone));
}
