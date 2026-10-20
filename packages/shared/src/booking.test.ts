import { describe, expect, it } from "vitest";
import { bookingCost, findBookingProblem, fitsOpeningHours, hasCapacity, isClosedOn, type BookingCheck } from "./booking";
import type { OpeningHours } from "./models";

const WORKDAY = [{ from: 8 * 60, to: 19 * 60 }];
const HOURS: OpeningHours = { mon: WORKDAY, tue: WORKDAY, wed: WORKDAY, thu: WORKDAY, fri: WORKDAY, sat: [], sun: [] };

// 2026-05-11 is a Monday.
const check = (overrides: Partial<BookingCheck> = {}): BookingCheck => ({
  space: { category: "desk", capacity: 1, status: "active", openingHours: HOURS, closures: [] },
  date: "2026-05-12",
  slot: { from: 9 * 60, to: 11 * 60 },
  attendees: 1,
  existing: [],
  now: { date: "2026-05-11", minute: 10 * 60 },
  ...overrides,
});

describe("opening hours and closures", () => {
  it("accepts slots inside the opening hours only", () => {
    expect(fitsOpeningHours(HOURS, "2026-05-12", { from: 480, to: 600 })).toBe(true);
    expect(fitsOpeningHours(HOURS, "2026-05-12", { from: 420, to: 600 })).toBe(false);
    expect(fitsOpeningHours(HOURS, "2026-05-16", { from: 600, to: 660 })).toBe(false); // Saturday
  });

  it("detects closures, end date included", () => {
    const closures = [{ from: "2026-05-10", to: "2026-05-12", reason: "works" }];
    expect(isClosedOn(closures, "2026-05-12")).toBe(true);
    expect(isClosedOn(closures, "2026-05-13")).toBe(false);
  });
});

describe("hasCapacity", () => {
  it("allows one booking at a time on a desk or a room", () => {
    const space = { category: "meeting_room" as const, capacity: 8 };
    const existing = [{ from: 600, to: 660, attendees: 3 }];
    expect(hasCapacity(existing, { from: 600, to: 630, attendees: 2 }, space)).toBe(false);
    expect(hasCapacity(existing, { from: 660, to: 720, attendees: 2 }, space)).toBe(true);
  });

  it("refuses more attendees than the capacity", () => {
    expect(hasCapacity([], { from: 600, to: 660, attendees: 9 }, { category: "meeting_room", capacity: 8 })).toBe(false);
  });

  it("counts seats in shared spaces", () => {
    const space = { category: "open_space" as const, capacity: 3 };
    const existing = [
      { from: 600, to: 720, attendees: 1 },
      { from: 660, to: 780, attendees: 1 },
    ];
    expect(hasCapacity(existing, { from: 600, to: 720, attendees: 1 }, space)).toBe(true); // 2 seats at most, +1 = 3
    expect(hasCapacity(existing, { from: 600, to: 720, attendees: 2 }, space)).toBe(false); // 3 seats at 11:00, +2 = 4
  });

  it("only counts seats still in use when the request starts later", () => {
    const space = { category: "coworking" as const, capacity: 2 };
    const existing = [{ from: 540, to: 600, attendees: 2 }];
    expect(hasCapacity(existing, { from: 600, to: 660, attendees: 2 }, space)).toBe(true);
  });
});

describe("findBookingProblem", () => {
  it("accepts a valid booking", () => {
    expect(findBookingProblem(check())).toBeNull();
  });

  it("rejects slots that are not on the 30 minute grid or too long", () => {
    expect(findBookingProblem(check({ slot: { from: 545, to: 600 } }))).toBe("invalidSlot");
    expect(findBookingProblem(check({ slot: { from: 600, to: 600 } }))).toBe("invalidSlot");
    expect(findBookingProblem(check({ slot: { from: 480, to: 1020 } }))).toBe("invalidSlot");
  });

  it("rejects past slots but allows the current one", () => {
    expect(findBookingProblem(check({ date: "2026-05-10" }))).toBe("pastSlot");
    const today = { date: "2026-05-11", slot: { from: 9 * 60, to: 12 * 60 } };
    expect(findBookingProblem(check({ ...today, now: { date: "2026-05-11", minute: 10 * 60 } }))).toBeNull();
    expect(findBookingProblem(check({ ...today, now: { date: "2026-05-11", minute: 12 * 60 } }))).toBe("pastSlot");
  });

  it("rejects bookings too far ahead", () => {
    expect(findBookingProblem(check({ date: "2026-08-03" }))).toBe("tooFarAhead");
  });

  it("rejects closed spaces, closures and hours outside opening times", () => {
    const space = check().space;
    expect(findBookingProblem(check({ space: { ...space, status: "closed" } }))).toBe("spaceClosed");
    expect(findBookingProblem(check({ space: { ...space, closures: [{ from: "2026-05-12", to: "2026-05-12", reason: "" }] } }))).toBe("spaceClosed");
    expect(findBookingProblem(check({ date: "2026-05-16" }))).toBe("outsideHours");
  });

  it("rejects taken slots and too many attendees", () => {
    expect(findBookingProblem(check({ existing: [{ from: 600, to: 660, attendees: 1 }] }))).toBe("slotTaken");
    const room = { ...check().space, category: "meeting_room" as const, capacity: 4 };
    expect(findBookingProblem(check({ space: room, attendees: 5 }))).toBe("tooManyAttendees");
  });
});

describe("bookingCost", () => {
  it("prorates the hourly price and rounds up", () => {
    expect(bookingCost(4, { from: 540, to: 660 })).toBe(8);
    expect(bookingCost(3, { from: 540, to: 570 })).toBe(2);
    expect(bookingCost(0, { from: 540, to: 660 })).toBe(0);
  });
});
