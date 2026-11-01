import { ObjectId } from "mongodb";
import {
  bookingCost,
  createBookingInput,
  findBookingProblem,
  formatMinutes,
  isWithinRanges,
  nowIn,
  overlaps,
  zonedTimeToUtc,
} from "@reservation/shared";
import { writeAudit } from "../lib/audit";
import { secureCall } from "../lib/callable";
import { applyCredit } from "../lib/credits";
import { appError } from "../lib/errors";
import { lockForUpdate, spaceDayLock, userDayLock } from "../lib/locks";
import { notifyUser } from "../lib/notify";
import { withTransaction } from "../lib/transaction";
import { absences, bookings, loadSpace, spaceDayFilter, toBookedSlot, userAbsencesFilter, userDayFilter, users, type BookingDoc } from "./common";

/**
 * Books a space for the signed-in user, charging credits. The checks, the booking and the
 * charge all happen in one Mongo transaction, so a booking is never left unpaid and a charge
 * is never left without its booking. The space and the user are locked for the day first
 * (see lib/locks.ts): without it, two people booking the same desk at the same moment would
 * both pass the checks and both be confirmed.
 */
export const createBooking = secureCall(
  { name: "createBooking", schema: createBookingInput, rateLimit: { limit: 20, windowSec: 60 } },
  async ({ uid, role, data }) => {
    const slot = { from: data.from, to: data.to };
    const bookingId = new ObjectId().toHexString();

    const space = await withTransaction(async (session) => {
      await lockForUpdate(session, spaceDayLock(data.spaceId, data.date), userDayLock(uid, data.date));
      const { space, site } = await loadSpace(session, data.spaceId);
      const user = await (await users()).findOne({ _id: uid }, { session });
      const sameSpace = await (await bookings()).find(spaceDayFilter(data.spaceId, data.date), { session }).toArray();
      const mine = await (await bookings()).find(userDayFilter(uid, data.date), { session }).toArray();
      const myAbsences = await (await absences()).find(userAbsencesFilter(uid), { session }).toArray();

      if (!user || user.status !== "active") throw appError("permission-denied", "forbidden", "Account is not active.");

      const problem = findBookingProblem({
        space,
        date: data.date,
        slot,
        attendees: data.attendees,
        existing: sameSpace.map(toBookedSlot),
        now: nowIn(site.timeZone),
      });
      if (problem) throw appError("failed-precondition", problem, `Booking refused: ${problem}`);
      if (isWithinRanges(data.date, myAbsences)) throw appError("failed-precondition", "absent", "User is absent.");
      if (mine.some((b) => overlaps(b, slot))) {
        throw appError("failed-precondition", "alreadyBooked", "User already has a booking at that time.");
      }

      const cost = bookingCost(space.creditsPerHour ?? 0, slot);
      const now = new Date();
      const booking: BookingDoc = {
        _id: bookingId,
        userId: uid,
        userName: user.displayName,
        teamIds: user.teamIds ?? [],
        spaceId: data.spaceId,
        spaceName: space.name,
        siteId: space.siteId,
        date: data.date,
        from: data.from,
        to: data.to,
        attendees: data.attendees,
        startsAt: zonedTimeToUtc(data.date, data.from, site.timeZone),
        status: "confirmed",
        credits: cost,
        cancelledBy: null,
        cancelReason: null,
        reminderSent: false,
        createdAt: now,
        updatedAt: now,
      };
      await (await bookings()).insertOne(booking, { session });
      // Throws notEnoughCredits, which cancels the whole transaction, booking included.
      if (cost > 0) await applyCredit(uid, { amount: -cost, type: "booking", label: space.name, bookingId }, session);
      return space;
    });

    await writeAudit({
      actorId: uid,
      actorRole: role ?? "user",
      action: "booking.created",
      targetType: "booking",
      targetId: bookingId,
      details: { spaceId: data.spaceId, date: data.date },
    });
    await notifyUser(uid, {
      type: "bookingConfirmed",
      values: { space: space.name, date: data.date, from: formatMinutes(data.from), to: formatMinutes(data.to) },
      link: "/mes-reservations",
    });
    return { bookingId };
  },
);
