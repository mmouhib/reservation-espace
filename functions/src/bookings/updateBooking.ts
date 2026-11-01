import {
  bookingCost,
  findBookingProblem,
  formatMinutes,
  isWithinRanges,
  nowIn,
  overlaps,
  updateBookingInput,
  zonedTimeToUtc,
} from "@reservation/shared";
import { writeAudit } from "../lib/audit";
import { secureCall } from "../lib/callable";
import { applyCredit } from "../lib/credits";
import { appError } from "../lib/errors";
import { notifyUser } from "../lib/notify";
import { withTransaction } from "../lib/transaction";
import {
  absences,
  bookings,
  loadSpace,
  spaceDayFilter,
  startsInThePast,
  toBookedSlot,
  userAbsencesFilter,
  userDayFilter,
  type BookingDoc,
} from "./common";

/**
 * Changes the date, time or number of people of a booking. Administrators can also
 * move it to another space. The credits are adjusted to the new price: the booking
 * update is one Mongo transaction, and the credit difference is a separate operation
 * applied right after it commits (see functions/src/lib/credits.ts). If that charge
 * fails (not enough credits for a more expensive slot), the booking is reverted to its
 * previous fields rather than left changed-but-unpaid.
 */
export const updateBooking = secureCall(
  { name: "updateBooking", schema: updateBookingInput, rateLimit: { limit: 20, windowSec: 60 } },
  async ({ uid, role, data }) => {
    const isAdmin = role === "admin";
    const slot = { from: data.from, to: data.to };

    const { before, spaceName, difference } = await withTransaction(async (session) => {
      const col = await bookings();
      const before = await col.findOne({ _id: data.bookingId }, { session });
      if (!before) throw appError("not-found", "bookingNotFound", "Booking not found.");
      if (before.userId !== uid && !isAdmin) throw appError("permission-denied", "forbidden", "Not your booking.");
      if (before.status !== "confirmed" || startsInThePast(before)) {
        throw appError("failed-precondition", "bookingNotCancellable", "Booking can no longer be changed.");
      }

      const spaceId = isAdmin && data.spaceId ? data.spaceId : before.spaceId;
      const attendees = data.attendees ?? before.attendees;
      const { space, site } = await loadSpace(session, spaceId);
      const sameSpace = await col.find(spaceDayFilter(spaceId, data.date), { session }).toArray();
      const owners = await col.find(userDayFilter(before.userId, data.date), { session }).toArray();
      const myAbsences = await (await absences()).find(userAbsencesFilter(before.userId), { session }).toArray();

      const others = sameSpace.filter((b) => b._id !== data.bookingId);
      const problem = findBookingProblem({ space, date: data.date, slot, attendees, existing: others.map(toBookedSlot), now: nowIn(site.timeZone) });
      if (problem) throw appError("failed-precondition", problem, `Change refused: ${problem}`);
      if (isWithinRanges(data.date, myAbsences)) throw appError("failed-precondition", "absent", "User is absent.");
      if (owners.some((b) => b._id !== data.bookingId && overlaps(b, slot))) {
        throw appError("failed-precondition", "alreadyBooked", "User already has a booking at that time.");
      }

      const cost = bookingCost(space.creditsPerHour ?? 0, slot);
      await col.updateOne(
        { _id: data.bookingId },
        {
          $set: {
            spaceId,
            spaceName: space.name,
            siteId: space.siteId,
            date: data.date,
            from: data.from,
            to: data.to,
            attendees,
            credits: cost,
            startsAt: zonedTimeToUtc(data.date, data.from, site.timeZone),
            reminderSent: false,
            updatedAt: new Date(),
          },
        },
        { session },
      );
      return { before, spaceName: space.name, difference: cost - before.credits };
    });

    if (difference !== 0) {
      try {
        await applyCredit(before.userId, { amount: -difference, type: difference > 0 ? "booking" : "refund", label: spaceName, bookingId: data.bookingId });
      } catch (err) {
        await revertBooking(data.bookingId, before);
        throw err;
      }
    }

    await writeAudit({
      actorId: uid,
      actorRole: role ?? "user",
      action: "booking.updated",
      targetType: "booking",
      targetId: data.bookingId,
      details: { from: { date: before.date, from: before.from, to: before.to }, to: { date: data.date, from: data.from, to: data.to } },
    });
    // Only tell the owner when someone else changed their booking.
    if (before.userId !== uid) {
      await notifyUser(before.userId, {
        type: "bookingMoved",
        values: { space: spaceName, date: data.date, from: formatMinutes(data.from), to: formatMinutes(data.to) },
        link: "/mes-reservations",
      });
    }
    return { updated: true };
  },
);

/** Restores the fields a failed credit charge would otherwise leave changed. */
async function revertBooking(bookingId: string, before: BookingDoc): Promise<void> {
  await (await bookings()).updateOne(
    { _id: bookingId },
    {
      $set: {
        spaceId: before.spaceId,
        spaceName: before.spaceName,
        siteId: before.siteId,
        date: before.date,
        from: before.from,
        to: before.to,
        attendees: before.attendees,
        credits: before.credits,
        startsAt: before.startsAt,
        reminderSent: before.reminderSent,
        updatedAt: new Date(),
      },
    },
  );
}
