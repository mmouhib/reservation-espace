import type { ErrorReason } from "./errors";
import type { Closure, MinuteOfDay, OpeningHours, Space, SpaceCategory } from "./models";
import { addDays, daysBetween, weekdayOf } from "./time";

/** Booking rules, shared by the Cloud Functions (which enforce them) and the web app. */

export const SLOT_MINUTES = 30;
export const MIN_DURATION = 30;
export const MAX_DURATION = 8 * 60;
export const MAX_DAYS_AHEAD = 60;

/** Open spaces and coworking areas are booked seat by seat; everything else is booked whole. */
const SHARED_CATEGORIES: SpaceCategory[] = ["open_space", "coworking"];

export function isSharedCategory(category: SpaceCategory): boolean {
  return SHARED_CATEGORIES.includes(category);
}

export interface Slot {
  from: MinuteOfDay;
  to: MinuteOfDay;
}

export interface BookedSlot extends Slot {
  attendees: number;
}

export function overlaps(a: Slot, b: Slot): boolean {
  return a.from < b.to && b.from < a.to;
}

/** Credits for a booking: the hourly price prorated, rounded up. */
export function bookingCost(creditsPerHour: number, slot: Slot): number {
  return Math.ceil((creditsPerHour * (slot.to - slot.from)) / 60);
}

export function fitsOpeningHours(hours: OpeningHours, date: string, slot: Slot): boolean {
  return hours[weekdayOf(date)].some((range) => range.from <= slot.from && slot.to <= range.to);
}

export function isClosedOn(closures: Closure[], date: string): boolean {
  return closures.some((c) => c.from <= date && date <= c.to);
}

/** Whether the request fits next to the existing bookings of the space. */
export function hasCapacity(existing: BookedSlot[], request: BookedSlot, space: Pick<Space, "category" | "capacity">): boolean {
  if (request.attendees > space.capacity) return false;
  const clashing = existing.filter((b) => overlaps(b, request));
  if (!isSharedCategory(space.category)) return clashing.length === 0;

  // Seats in use only change when a booking starts, so checking those moments is enough.
  const moments = [request.from, ...clashing.map((b) => b.from).filter((t) => t > request.from)];
  return moments.every((t) => {
    const inUse = clashing.filter((b) => b.from <= t && t < b.to).reduce((sum, b) => sum + b.attendees, 0);
    return inUse + request.attendees <= space.capacity;
  });
}

export type BookingProblem = Extract<
  ErrorReason,
  "invalidSlot" | "spaceClosed" | "outsideHours" | "pastSlot" | "tooFarAhead" | "slotTaken" | "tooManyAttendees"
>;

export interface BookingCheck {
  space: Pick<Space, "category" | "capacity" | "status" | "openingHours" | "closures">;
  date: string;
  slot: Slot;
  attendees: number;
  /** Other confirmed bookings of the same space on that date. */
  existing: BookedSlot[];
  /** The current date and minute in the site's time zone. */
  now: { date: string; minute: MinuteOfDay };
}

/** The first rule the booking breaks, or null when it can be made. */
export function findBookingProblem({ space, date, slot, attendees, existing, now }: BookingCheck): BookingProblem | null {
  const duration = slot.to - slot.from;
  const alignedToSlots = slot.from % SLOT_MINUTES === 0 && slot.to % SLOT_MINUTES === 0;
  if (!alignedToSlots || duration < MIN_DURATION || duration > MAX_DURATION || slot.from < 0 || slot.to > 24 * 60) {
    return "invalidSlot";
  }
  if (date < now.date || (date === now.date && slot.to <= now.minute)) return "pastSlot";
  if (daysBetween(now.date, date) > MAX_DAYS_AHEAD) return "tooFarAhead";
  if (space.status !== "active" || isClosedOn(space.closures, date)) return "spaceClosed";
  if (!fitsOpeningHours(space.openingHours, date, slot)) return "outsideHours";
  if (attendees > space.capacity) return "tooManyAttendees";
  if (!hasCapacity(existing, { ...slot, attendees }, space)) return "slotTaken";
  return null;
}

/** Whether a date falls inside any of the given inclusive date ranges. */
export function isWithinRanges(date: string, ranges: { from: string; to: string }[]): boolean {
  return ranges.some((r) => r.from <= date && date <= r.to);
}

/** Every date from `from` to `to`, inclusive. */
export function eachDate(from: string, to: string): string[] {
  const dates: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) dates.push(d);
  return dates;
}
