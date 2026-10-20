import { describe, expect, it } from "vitest";
import { addDays, daysBetween, formatMinutes, isDateString, nowIn, parseTime, weekdayOf, zonedTimeToUtc } from "./time";

describe("dates", () => {
  it("validates calendar dates", () => {
    expect(isDateString("2026-02-28")).toBe(true);
    expect(isDateString("2026-02-30")).toBe(false);
    expect(isDateString("12/05/2026")).toBe(false);
  });

  it("adds days across months and counts days between dates", () => {
    expect(addDays("2026-01-31", 1)).toBe("2026-02-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetween("2026-01-01", "2026-03-01")).toBe(59);
  });

  it("finds the weekday", () => {
    expect(weekdayOf("2026-05-11")).toBe("mon");
    expect(weekdayOf("2026-05-17")).toBe("sun");
  });
});

describe("minutes", () => {
  it("formats and parses times", () => {
    expect(formatMinutes(510)).toBe("08:30");
    expect(parseTime("17:05")).toBe(17 * 60 + 5);
  });
});

describe("time zones", () => {
  it("converts a wall clock time to UTC with the summer and winter offsets", () => {
    expect(zonedTimeToUtc("2026-07-01", 9 * 60, "Europe/Paris").toISOString()).toBe("2026-07-01T07:00:00.000Z");
    expect(zonedTimeToUtc("2026-01-15", 9 * 60, "Europe/Paris").toISOString()).toBe("2026-01-15T08:00:00.000Z");
  });

  it("handles the day the clocks change", () => {
    // Paris switches to summer time on 2026-03-29 at 02:00.
    expect(zonedTimeToUtc("2026-03-29", 8 * 60, "Europe/Paris").toISOString()).toBe("2026-03-29T06:00:00.000Z");
  });

  it("reads the wall clock of a zone", () => {
    const instant = new Date("2026-07-01T22:30:00Z");
    expect(nowIn("Europe/Paris", instant)).toEqual({ date: "2026-07-02", minute: 30 });
    expect(nowIn("America/New_York", instant)).toEqual({ date: "2026-07-01", minute: 18 * 60 + 30 });
  });
});
