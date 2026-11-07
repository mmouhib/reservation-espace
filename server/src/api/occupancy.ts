import { occupancyInput, weekdayOf, type OccupancyHeatmap } from "@reservation/shared";
import { bookings, spaces } from "../bookings/common";
import { secureCall } from "../lib/callable";

const WEEK_FROM_MONDAY = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export interface BookedHours {
  date: string;
  from: number;
  to: number;
  spaceId: string;
}

/** The days of a range, with how many there are of each weekday (a range of 10 days has 2 of some weekdays and 1 of others). */
function weekdayCounts(from: string, to: string): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (let day = new Date(`${from}T00:00:00Z`); day <= new Date(`${to}T00:00:00Z`); day.setUTCDate(day.getUTCDate() + 1)) {
    counts[WEEK_FROM_MONDAY.indexOf(weekdayOf(day.toISOString().slice(0, 10)))]! += 1;
  }
  return counts;
}

/**
 * How full the spaces are, by weekday and hour: for each weekday and hour, the average number of spaces booked at
 * that time, over the days of the range. A space booked twice at the same time counts once.
 */
export function computeHeatmap(booked: BookedHours[], from: string, to: string, totalSpaces: number): OccupancyHeatmap {
  // The spaces in use at each hour of each day.
  const inUse = new Map<string, Set<string>>();
  for (const { date, from: start, to: end, spaceId } of booked) {
    for (let hour = Math.floor(start / 60); hour * 60 < end; hour += 1) {
      const key = `${date}|${hour}`;
      const spacesAtThatTime = inUse.get(key) ?? new Set<string>();
      spacesAtThatTime.add(spaceId);
      inUse.set(key, spacesAtThatTime);
    }
  }

  const totals = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  for (const [key, set] of inUse) {
    const [date, hour] = key.split("|") as [string, string];
    totals[WEEK_FROM_MONDAY.indexOf(weekdayOf(date))]![Number(hour)]! += set.size;
  }

  const days = weekdayCounts(from, to);
  const cells = totals.map((row, weekday) => row.map((sum) => (days[weekday] ? Math.round((sum / days[weekday]!) * 10) / 10 : 0)));

  let peak: OccupancyHeatmap["peak"] = null;
  cells.forEach((row, weekday) =>
    row.forEach((value, hour) => {
      if (value > 0 && (!peak || value > peak.value)) peak = { weekday, hour, value };
    }),
  );
  return { cells, spaces: totalSpaces, peak };
}

/** Occupancy of the spaces by weekday and hour over a period, for one site or all. Administrators only. */
export const getOccupancyHeatmap = secureCall(
  { name: "getOccupancyHeatmap", schema: occupancyInput, role: "admin", rateLimit: { limit: 20, windowSec: 60 } },
  async ({ data }): Promise<OccupancyHeatmap> => {
    const site = data.siteId ? { siteId: data.siteId } : {};
    const [rows, totalSpaces] = await Promise.all([
      (await bookings())
        .find({ ...site, status: "confirmed", date: { $gte: data.from, $lte: data.to } }, { projection: { date: 1, from: 1, to: 1, spaceId: 1 } })
        .toArray(),
      (await spaces()).countDocuments({ ...site, status: "active" }),
    ]);
    return computeHeatmap(rows, data.from, data.to, totalSpaces);
  },
);
