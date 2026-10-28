import {
  isWithinRanges,
  bookingCost,
  findBookingProblem,
  nowIn,
  overlaps,
  searchSpacesInput,
  type SpaceSlotStatus,
} from "@reservation/shared";
import { appError } from "../lib/errors";
import { secureCall } from "../lib/callable";
import { absences, bookings, sites, spaces, userAbsencesFilter, userDayFilter } from "./common";

/**
 * Tells, for every space of a site, whether it can be booked on a given slot.
 * It answers on behalf of the user so that nobody can read other people's bookings.
 */
export const searchSpaces = secureCall(
  { name: "searchSpaces", schema: searchSpacesInput, rateLimit: { limit: 40, windowSec: 60 } },
  async ({ uid, data }): Promise<SpaceSlotStatus[]> => {
    const site = await (await sites()).findOne({ _id: data.siteId });
    if (!site) throw appError("not-found", "spaceNotFound", "Site not found.");

    const [siteSpaces, dayBookings, myBookings, myAbsences] = await Promise.all([
      (await spaces()).find({ siteId: data.siteId }).toArray(),
      (await bookings()).find({ siteId: data.siteId, date: data.date, status: "confirmed" }).toArray(),
      (await bookings()).find(userDayFilter(uid, data.date)).toArray(),
      (await absences()).find(userAbsencesFilter(uid)).toArray(),
    ]);

    const slot = { from: data.from, to: data.to };
    const now = nowIn(site.timeZone);
    const absent = isWithinRanges(data.date, myAbsences);
    const alreadyBooked = myBookings.some((b) => overlaps(b, slot));

    return siteSpaces.map((space) => {
      const existing = dayBookings.filter((b) => b.spaceId === space._id);
      const problem =
        findBookingProblem({ space, date: data.date, slot, attendees: data.attendees ?? 1, existing, now }) ??
        (absent ? "absent" : alreadyBooked ? "alreadyBooked" : null);

      return {
        spaceId: space._id,
        available: problem === null,
        reason: problem,
        cost: bookingCost(space.creditsPerHour ?? 0, slot),
        busy: existing.map(({ from, to, attendees }) => ({ from, to, attendees })),
      };
    });
  },
);
