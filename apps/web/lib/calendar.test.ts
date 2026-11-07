import { describe, expect, it } from "vitest";
import type { BookingSummary, EventSummary } from "@reservation/shared";
import { addMonths, googleCalendarUrl, groupByDay, move, placeItems, startOfWeek, visibleDays, weekdayNames, type CalendarItem } from "./calendar";

const item = (key: string, from: number, to: number, allDay = false): CalendarItem => ({ key, kind: "event", title: key, date: "2026-05-12", from, to, allDay });

describe("weeks and months", () => {
  it("starts weeks on Monday", () => {
    expect(startOfWeek("2026-05-12")).toBe("2026-05-11"); // Tuesday
    expect(startOfWeek("2026-05-11")).toBe("2026-05-11"); // Monday
    expect(startOfWeek("2026-05-17")).toBe("2026-05-11"); // Sunday
  });

  it("moves by months without overflowing short months", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2024-01-31", 1)).toBe("2024-02-29");
    expect(addMonths("2026-03-15", -3)).toBe("2025-12-15");
    expect(addMonths("2026-12-10", 1)).toBe("2027-01-10");
  });

  it("shows one day, seven days, or six whole weeks around the month", () => {
    expect(visibleDays("day", "2026-05-12")).toEqual(["2026-05-12"]);
    expect(visibleDays("week", "2026-05-12")).toEqual(["2026-05-11", "2026-05-12", "2026-05-13", "2026-05-14", "2026-05-15", "2026-05-16", "2026-05-17"]);
    const month = visibleDays("month", "2026-05-20");
    expect(month).toHaveLength(42);
    expect(month[0]).toBe("2026-04-27"); // the Monday of the week of 1 May (a Friday)
    expect(month.includes("2026-05-31")).toBe(true);
    expect(visibleDays("month", "2026-06-10")[0]).toBe("2026-06-01"); // 1 June is a Monday
  });

  it("goes to the previous and next page of each view", () => {
    expect(move("day", "2026-05-12", 1)).toBe("2026-05-13");
    expect(move("week", "2026-05-12", -1)).toBe("2026-05-05");
    expect(move("month", "2026-05-31", 1)).toBe("2026-06-30");
  });

  it("names the weekdays Monday first", () => {
    expect(weekdayNames("en")[0]).toBe("Mon");
    expect(weekdayNames("fr")[6]).toBe("dim.");
  });
});

describe("grouping and placing", () => {
  it("groups bookings and events by day, all-day first, then by time", () => {
    const booking = { id: "b1", spaceName: "Desk", date: "2026-05-12", from: 540, to: 600 } as BookingSummary;
    const events: EventSummary[] = [
      { id: "e1", title: "Dentist", note: "", date: "2026-05-12", allDay: false, from: 480, to: 540 },
      { id: "e2", title: "Holiday", note: "", date: "2026-05-12", allDay: true, from: 0, to: 1440 },
      { id: "e3", title: "Other day", note: "", date: "2026-05-13", allDay: true, from: 0, to: 1440 },
    ];
    const byDay = groupByDay([booking], events);
    expect(byDay.get("2026-05-12")!.map((i) => i.key)).toEqual(["event:e2", "event:e1", "booking:b1"]);
    expect(byDay.get("2026-05-13")!.map((i) => i.key)).toEqual(["event:e3"]);
  });

  it("keeps items that do not overlap at full width", () => {
    const placed = placeItems([item("a", 540, 600), item("b", 600, 660)]);
    expect(placed.map((p) => [p.item.key, p.lane, p.lanes])).toEqual([
      ["a", 0, 1],
      ["b", 0, 1],
    ]);
  });

  it("puts items that overlap side by side, and frees the width after them", () => {
    const placed = placeItems([item("a", 540, 660), item("b", 600, 720), item("c", 630, 650), item("d", 780, 840)]);
    const byKey = Object.fromEntries(placed.map((p) => [p.item.key, p]));
    expect(byKey.a).toMatchObject({ lane: 0, lanes: 3 });
    expect(byKey.b).toMatchObject({ lane: 1, lanes: 3 });
    expect(byKey.c).toMatchObject({ lane: 2, lanes: 3 });
    expect(byKey.d).toMatchObject({ lane: 0, lanes: 1 });
  });
});

describe("Add to Google Calendar", () => {
  it("fills in the booking, in UTC", () => {
    const booking = { spaceName: "Desk 1A-04", startsAt: "2026-11-05T08:00:00.000Z", from: 540, to: 1020 } as BookingSummary;
    const url = new URL(googleCalendarUrl(booking, "Paris, La Défense"));
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Desk 1A-04");
    expect(url.searchParams.get("dates")).toBe("20261105T080000Z/20261105T160000Z");
    expect(url.searchParams.get("location")).toBe("Paris, La Défense");
  });
});
