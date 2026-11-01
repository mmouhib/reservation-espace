import {
  calendarRangeInput,
  listBookingsInRangeInput,
  listMyBookingsInput,
  listMyUpcomingBookingsInput,
  type BookingSummary,
} from "@reservation/shared";
import { bookings } from "../bookings/common";
import { secureCall } from "../lib/callable";
import { toBookingSummary } from "./common";

/** The signed-in user's bookings, latest date first. */
export const listMyBookings = secureCall(
  { name: "listMyBookings", schema: listMyBookingsInput },
  async ({ uid, data }): Promise<BookingSummary[]> => {
    const docs = await (await bookings()).find({ userId: uid }).sort({ date: -1, from: -1 }).limit(data.limit).toArray();
    return docs.map(toBookingSummary);
  },
);

/** The signed-in user's confirmed bookings from a day on, earliest first (at most 10). */
export const listMyUpcomingBookings = secureCall(
  { name: "listMyUpcomingBookings", schema: listMyUpcomingBookingsInput },
  async ({ uid, data }): Promise<BookingSummary[]> => {
    const docs = await (await bookings())
      .find({ userId: uid, status: "confirmed", date: { $gte: data.fromDate } })
      .sort({ date: 1, from: 1 })
      .limit(10)
      .toArray();
    return docs.map(toBookingSummary);
  },
);

/** The signed-in user's confirmed bookings whose day is in the range, past or future (the calendar). */
export const listMyBookingsInRange = secureCall(
  { name: "listMyBookingsInRange", schema: calendarRangeInput, rateLimit: { limit: 60, windowSec: 60 } },
  async ({ uid, data }): Promise<BookingSummary[]> => {
    const docs = await (await bookings())
      .find({ userId: uid, status: "confirmed", date: { $gte: data.from, $lte: data.to } })
      .sort({ date: 1, from: 1 })
      .limit(500)
      .toArray();
    return docs.map(toBookingSummary);
  },
);

/** Every booking, whatever its status, whose day is in the range. Administrators only. */
export const listBookingsInRange = secureCall(
  { name: "listBookingsInRange", schema: listBookingsInRangeInput, role: "admin", rateLimit: { limit: 30, windowSec: 60 } },
  async ({ data }): Promise<BookingSummary[]> => {
    const docs = await (await bookings())
      .find({ date: { $gte: data.from, $lte: data.to } })
      .sort({ date: 1, from: 1 })
      .limit(data.limit)
      .toArray();
    return docs.map(toBookingSummary);
  },
);
