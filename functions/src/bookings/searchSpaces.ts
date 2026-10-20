import {
  COL,
  isWithinRanges,
  bookingCost,
  findBookingProblem,
  nowIn,
  overlaps,
  searchSpacesInput,
  type Absence,
  type Booking,
  type Site,
  type Space,
  type SpaceSlotStatus,
} from "@reservation/shared";
import { db } from "../lib/admin";
import { appError } from "../lib/errors";
import { secureCall } from "../lib/callable";
import { userAbsencesQuery, userDayQuery } from "./common";

/**
 * Tells, for every space of a site, whether it can be booked on a given slot.
 * It answers on behalf of the user so that nobody can read other people's bookings.
 */
export const searchSpaces = secureCall(
  { name: "searchSpaces", schema: searchSpacesInput, rateLimit: { limit: 40, windowSec: 60 } },
  async ({ uid, data }): Promise<SpaceSlotStatus[]> => {
    const siteSnap = await db.collection(COL.sites).doc(data.siteId).get();
    if (!siteSnap.exists) throw appError("not-found", "spaceNotFound", "Site not found.");
    const site = siteSnap.data() as Site;

    const [spaces, dayBookings, myBookings, myAbsences] = await Promise.all([
      db.collection(COL.spaces).where("siteId", "==", data.siteId).get(),
      db.collection(COL.bookings).where("siteId", "==", data.siteId).where("date", "==", data.date).where("status", "==", "confirmed").get(),
      userDayQuery(uid, data.date).get(),
      userAbsencesQuery(uid).get(),
    ]);

    const slot = { from: data.from, to: data.to };
    const now = nowIn(site.timeZone);
    const absent = isWithinRanges(data.date, myAbsences.docs.map((d) => d.data() as Absence));
    const alreadyBooked = myBookings.docs.some((d) => overlaps(d.data() as Booking, slot));

    return spaces.docs.map((doc) => {
      const space = doc.data() as Space;
      const existing = dayBookings.docs.map((b) => ({ id: b.id, ...(b.data() as Booking) })).filter((b) => b.spaceId === doc.id);
      const problem =
        findBookingProblem({ space, date: data.date, slot, attendees: data.attendees ?? 1, existing, now }) ??
        (absent ? "absent" : alreadyBooked ? "alreadyBooked" : null);

      return {
        spaceId: doc.id,
        available: problem === null,
        reason: problem,
        cost: bookingCost(space.creditsPerHour ?? 0, slot),
        busy: existing.map(({ from, to, attendees }) => ({ from, to, attendees })),
      };
    });
  },
);
