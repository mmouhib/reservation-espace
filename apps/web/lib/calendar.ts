import { addDays, INTL_LOCALE, weekdayOf, type BookingSummary, type EventSummary, type Locale } from "@reservation/shared";

export type CalendarView = "day" | "week" | "month";

/** What the calendar shows: a booking, or an event of the person. */
export interface CalendarItem {
  key: string;
  kind: "booking" | "event";
  title: string;
  date: string;
  from: number;
  to: number;
  allDay: boolean;
  booking?: BookingSummary;
  event?: EventSummary;
}

const WEEK_FROM_MONDAY = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/** The Monday of the week of a day. Weeks start on Monday. */
export function startOfWeek(date: string): string {
  return addDays(date, -WEEK_FROM_MONDAY.indexOf(weekdayOf(date)));
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** The same day of another month, or the last day of that month when it is shorter (31 January + 1 month = 28 February). */
export function addMonths(date: string, months: number): string {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7)) - 1 + months;
  const first = new Date(Date.UTC(year, month, 1));
  const day = Math.min(Number(date.slice(8, 10)), daysInMonth(first.getUTCFullYear(), first.getUTCMonth() + 1));
  return `${first.getUTCFullYear()}-${String(first.getUTCMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** The days a view displays: one, seven, or six full weeks that contain the month. */
export function visibleDays(view: CalendarView, anchor: string): string[] {
  if (view === "day") return [anchor];
  const first = view === "week" ? startOfWeek(anchor) : startOfWeek(`${anchor.slice(0, 7)}-01`);
  const count = view === "week" ? 7 : 42;
  return Array.from({ length: count }, (_, i) => addDays(first, i));
}

/** The anchor of the previous (-1) or next (1) page of a view. */
export function move(view: CalendarView, anchor: string, direction: -1 | 1): string {
  if (view === "day") return addDays(anchor, direction);
  if (view === "week") return addDays(anchor, 7 * direction);
  return addMonths(anchor, direction);
}

const utc = (date: string) => new Date(`${date}T00:00:00Z`);

/** "May 2026", "11 – 17 May 2026" or "Tuesday 12 May 2026". */
export function viewTitle(view: CalendarView, anchor: string, locale: Locale): string {
  const format = (options: Intl.DateTimeFormatOptions, date = anchor) => new Intl.DateTimeFormat(INTL_LOCALE[locale], { ...options, timeZone: "UTC" }).format(utc(date));
  if (view === "month") return format({ month: "long", year: "numeric" });
  if (view === "day") return format({ weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const days = visibleDays("week", anchor);
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).formatRange(utc(days[0]!), utc(days[6]!));
}

/** "Mon", "Tue"... in the language of the user, Monday first. */
export function weekdayNames(locale: Locale, style: "short" | "long" = "short"): string[] {
  // 2024-01-01 is a Monday.
  return Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(INTL_LOCALE[locale], { weekday: style, timeZone: "UTC" }).format(utc(addDays("2024-01-01", i))));
}

/** The items of the bookings and the events, grouped by day, all-day events first and then by start time. */
export function groupByDay(bookings: BookingSummary[], events: EventSummary[]): Map<string, CalendarItem[]> {
  const items: CalendarItem[] = [
    ...bookings.map((booking) => ({
      key: `booking:${booking.id}`,
      kind: "booking" as const,
      title: booking.spaceName,
      date: booking.date,
      from: booking.from,
      to: booking.to,
      allDay: false,
      booking,
    })),
    ...events.map((event) => ({
      key: `event:${event.id}`,
      kind: "event" as const,
      title: event.title,
      date: event.date,
      from: event.from,
      to: event.to,
      allDay: event.allDay,
      event,
    })),
  ];
  const byDay = new Map<string, CalendarItem[]>();
  for (const item of items) byDay.set(item.date, [...(byDay.get(item.date) ?? []), item]);
  for (const day of byDay.values()) day.sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.from - b.from || a.to - b.to);
  return byDay;
}

export interface PlacedItem {
  item: CalendarItem;
  /** Which of the side-by-side columns the item takes, and how many columns its group has. */
  lane: number;
  lanes: number;
}

/**
 * Places the timed items of a day so that items which overlap in time sit side by side instead of on top of
 * each other. Items that do not touch each other keep the full width.
 */
export function placeItems(items: CalendarItem[]): PlacedItem[] {
  const sorted = [...items].sort((a, b) => a.from - b.from || a.to - b.to);
  const placed: PlacedItem[] = [];
  let group: PlacedItem[] = [];
  let groupEnd = -1;
  const laneEnds: number[] = [];

  const closeGroup = () => {
    for (const p of group) p.lanes = laneEnds.length;
    placed.push(...group);
    group = [];
    laneEnds.length = 0;
  };

  for (const item of sorted) {
    if (item.from >= groupEnd && group.length > 0) closeGroup();
    let lane = laneEnds.findIndex((end) => end <= item.from);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = item.to;
    group.push({ item, lane, lanes: 1 });
    groupEnd = Math.max(groupEnd, item.to);
    if (group.length === 1) groupEnd = item.to;
  }
  if (group.length > 0) closeGroup();
  return placed;
}

const googleDate = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");

/** A link that opens Google Calendar with this booking filled in, ready to save. */
export function googleCalendarUrl(booking: BookingSummary, location = ""): string {
  const start = new Date(booking.startsAt);
  const end = new Date(start.getTime() + (booking.to - booking.from) * 60_000);
  const params = new URLSearchParams({ action: "TEMPLATE", text: booking.spaceName, dates: `${googleDate(start)}/${googleDate(end)}` });
  if (location) params.set("location", location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
