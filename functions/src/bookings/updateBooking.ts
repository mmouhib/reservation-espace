import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  bookingCost,
  findBookingProblem,
  formatMinutes,
  isWithinRanges,
  nowIn,
  overlaps,
  updateBookingInput,
  zonedTimeToUtc,
  type Booking,
} from "@reservation/shared";
import { db } from "../lib/admin";
import { writeAudit } from "../lib/audit";
import { secureCall } from "../lib/callable";
import { readBalance, writeCredits } from "../lib/credits";
import { appError } from "../lib/errors";
import { notifyUser } from "../lib/notify";
import { absencesOf, bookings, loadSpace, spaceDayQuery, startsInThePast, toBookedSlot, userAbsencesQuery, userDayQuery } from "./common";

/**
 * Changes the date, time or number of people of a booking. Administrators can also
 * move it to another space. The credits are adjusted to the new price.
 */
export const updateBooking = secureCall(
  { name: "updateBooking", schema: updateBookingInput, rateLimit: { limit: 20, windowSec: 60 } },
  async ({ uid, role, data }) => {
    const isAdmin = role === "admin";
    const ref = bookings().doc(data.bookingId);
    const slot = { from: data.from, to: data.to };

    const { before, spaceName } = await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists) throw appError("not-found", "bookingNotFound", "Booking not found.");
      const before = snap.data() as Booking<Timestamp>;
      if (before.userId !== uid && !isAdmin) throw appError("permission-denied", "forbidden", "Not your booking.");
      if (before.status !== "confirmed" || startsInThePast(before)) {
        throw appError("failed-precondition", "bookingNotCancellable", "Booking can no longer be changed.");
      }

      const spaceId = isAdmin && data.spaceId ? data.spaceId : before.spaceId;
      const attendees = data.attendees ?? before.attendees;
      const { space, site } = await loadSpace(tx, spaceId);
      const sameSpace = await tx.get(spaceDayQuery(spaceId, data.date));
      const owners = await tx.get(userDayQuery(before.userId, data.date));
      const absences = await tx.get(userAbsencesQuery(before.userId));
      const balance = await readBalance(tx, before.userId);

      const others = sameSpace.docs.filter((d) => d.id !== data.bookingId);
      const problem = findBookingProblem({ space, date: data.date, slot, attendees, existing: others.map(toBookedSlot), now: nowIn(site.timeZone) });
      if (problem) throw appError("failed-precondition", problem, `Change refused: ${problem}`);
      if (isWithinRanges(data.date, absencesOf(absences.docs))) throw appError("failed-precondition", "absent", "User is absent.");
      if (owners.docs.some((d) => d.id !== data.bookingId && overlaps(d.data() as Booking, slot))) {
        throw appError("failed-precondition", "alreadyBooked", "User already has a booking at that time.");
      }

      // Charge the difference, or refund it when the new booking is cheaper.
      const cost = bookingCost(space.creditsPerHour ?? 0, slot);
      const difference = cost - before.credits;
      if (difference !== 0) {
        writeCredits(tx, before.userId, balance, {
          amount: -difference,
          type: difference > 0 ? "booking" : "refund",
          label: space.name,
          bookingId: data.bookingId,
        });
      }

      tx.update(ref, {
        spaceId,
        spaceName: space.name,
        siteId: space.siteId,
        date: data.date,
        from: data.from,
        to: data.to,
        attendees,
        credits: cost,
        startsAt: Timestamp.fromDate(zonedTimeToUtc(data.date, data.from, site.timeZone)),
        reminderSent: false,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { before, spaceName: space.name };
    });

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
