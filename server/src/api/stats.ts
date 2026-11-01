import { dateRangeInput, SPACE_CATEGORIES, type BookingTotals, type BookingsPerDay, type HoursPerCategory, type SpaceCategory, type TopSpace } from "@reservation/shared";
import { bookings, spaces } from "../bookings/common";
import { secureCall } from "../lib/callable";

/** Confirmed bookings whose day is in the range. */
const confirmedInRange = (from: string, to: string) => ({ status: "confirmed" as const, date: { $gte: from, $lte: to } });
const STATS_POLICY = { rateLimit: { limit: 30, windowSec: 60 } };

/** Totals of a date range: confirmed and cancelled bookings, hours, credits and distinct users. Administrators only. */
export const getBookingTotals = secureCall({ name: "getBookingTotals", schema: dateRangeInput, role: "admin", ...STATS_POLICY }, async ({ data }): Promise<BookingTotals> => {
  const rows = await (await bookings())
    .aggregate<{ _id: string; count: number; minutes: number; credits: number; users: string[] }>([
      { $match: { date: { $gte: data.from, $lte: data.to } } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          minutes: { $sum: { $subtract: ["$to", "$from"] } },
          credits: { $sum: "$credits" },
          users: { $addToSet: "$userId" },
        },
      },
    ])
    .toArray();

  const confirmed = rows.find((r) => r._id === "confirmed");
  const cancelled = rows.find((r) => r._id === "cancelled");
  return {
    confirmed: confirmed?.count ?? 0,
    cancelled: cancelled?.count ?? 0,
    hours: (confirmed?.minutes ?? 0) / 60,
    credits: confirmed?.credits ?? 0,
    users: confirmed?.users.length ?? 0,
  };
});

/** Confirmed bookings per day, earliest day first. Administrators only. */
export const getBookingsPerDay = secureCall({ name: "getBookingsPerDay", schema: dateRangeInput, role: "admin", ...STATS_POLICY }, async ({ data }): Promise<BookingsPerDay[]> => {
  const rows = await (await bookings())
    .aggregate<{ _id: string; count: number }>([
      { $match: confirmedInRange(data.from, data.to) },
      { $group: { _id: "$date", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ])
    .toArray();
  return rows.map((r) => ({ date: r._id, count: r.count }));
});

/** Booked hours per space category, confirmed bookings only, in category order. Administrators only. */
export const getHoursPerCategory = secureCall({ name: "getHoursPerCategory", schema: dateRangeInput, role: "admin", ...STATS_POLICY }, async ({ data }): Promise<HoursPerCategory[]> => {
  const perSpace = await (await bookings())
    .aggregate<{ _id: string; minutes: number }>([
      { $match: confirmedInRange(data.from, data.to) },
      { $group: { _id: "$spaceId", minutes: { $sum: { $subtract: ["$to", "$from"] } } } },
    ])
    .toArray();

  const categoryOf = new Map<string, SpaceCategory>();
  const spaceDocs = await (await spaces()).find({ _id: { $in: perSpace.map((r) => r._id) } }, { projection: { category: 1 } }).toArray();
  for (const space of spaceDocs) categoryOf.set(space._id, space.category);

  const minutesByCategory = new Map<SpaceCategory, number>();
  for (const row of perSpace) {
    const category = categoryOf.get(row._id);
    if (category) minutesByCategory.set(category, (minutesByCategory.get(category) ?? 0) + row.minutes);
  }
  return SPACE_CATEGORIES.filter((c) => minutesByCategory.has(c)).map((c) => ({ category: c, hours: (minutesByCategory.get(c) ?? 0) / 60 }));
});

/** The five most booked spaces by name, confirmed bookings only. Administrators only. */
export const getTopSpaces = secureCall({ name: "getTopSpaces", schema: dateRangeInput, role: "admin", ...STATS_POLICY }, async ({ data }): Promise<TopSpace[]> => {
  const rows = await (await bookings())
    .aggregate<{ _id: string; count: number }>([
      { $match: confirmedInRange(data.from, data.to) },
      { $group: { _id: "$spaceName", count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: 5 },
    ])
    .toArray();
  return rows.map((r) => ({ name: r._id, count: r.count }));
});
