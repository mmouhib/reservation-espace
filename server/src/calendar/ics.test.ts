import { describe, expect, it } from "vitest";
import { buildCalendar, escapeText, foldLine, formatUtc } from "./ics";

describe("iCalendar text", () => {
  it("escapes the characters that have a meaning", () => {
    expect(escapeText("Room A, floor 2; bring \\ notes\nsecond line")).toBe("Room A\\, floor 2\\; bring \\\\ notes\\nsecond line");
  });

  it("folds long lines at 75 bytes, never inside a character", () => {
    const long = `SUMMARY:${"é".repeat(60)}`;
    const folded = foldLine(long);
    const lines = folded.split("\r\n");
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.every((line, i) => Buffer.byteLength(line) <= 75 && (i === 0 || line.startsWith(" ")))).toBe(true);
    expect(lines.map((line, i) => (i === 0 ? line : line.slice(1))).join("")).toBe(long);
    expect(foldLine("SUMMARY:short")).toBe("SUMMARY:short");
  });

  it("writes instants in UTC", () => {
    expect(formatUtc(new Date("2026-11-05T08:00:00.000Z"))).toBe("20261105T080000Z");
  });
});

describe("buildCalendar", () => {
  const now = new Date("2026-11-01T10:00:00Z");
  const calendar = buildCalendar(
    "Bookings",
    [
      { uid: "booking-1@x", summary: "Desk 1A-04", time: { kind: "utc", start: new Date("2026-11-05T08:00:00Z"), end: new Date("2026-11-05T16:00:00Z") }, location: "Paris, La Défense", description: "8 credits" },
      { uid: "event-1@x", summary: "Dentist", time: { kind: "floating", date: "2026-11-06", from: 840, to: 900 } },
      { uid: "event-2@x", summary: "Holiday", time: { kind: "allDay", date: "2026-12-31" } },
      { uid: "event-3@x", summary: "Late", time: { kind: "floating", date: "2026-11-07", from: 1320, to: 1440 } },
    ],
    now,
  );

  it("is a calendar made of events, with CRLF line ends", () => {
    expect(calendar.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n")).toBe(true);
    expect(calendar.endsWith("END:VCALENDAR\r\n")).toBe(true);
    expect(calendar.match(/BEGIN:VEVENT/g)).toHaveLength(4);
    expect(calendar.replaceAll("\r\n", "").includes("\n")).toBe(false);
  });

  it("writes bookings in UTC, personal events as floating times and all-day events as dates", () => {
    expect(calendar).toContain("DTSTART:20261105T080000Z\r\nDTEND:20261105T160000Z");
    expect(calendar).toContain("DTSTART:20261106T140000\r\nDTEND:20261106T150000");
    expect(calendar).toContain("DTSTART;VALUE=DATE:20261231\r\nDTEND;VALUE=DATE:20270101");
    expect(calendar).toContain("DTSTART:20261107T220000\r\nDTEND:20261108T000000");
    expect(calendar).toContain("LOCATION:Paris\\, La Défense");
    expect(calendar).toContain("DTSTAMP:20261101T100000Z");
  });
});
