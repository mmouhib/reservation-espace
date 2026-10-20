import { FieldValue, Timestamp } from "firebase-admin/firestore";
import {
  COL,
  bookingCost,
  createBookingInput,
  findBookingProblem,
  formatMinutes,
  isWithinRanges,
  nowIn,
  overlaps,
  zonedTimeToUtc,
  type Booking,
  type UserProfile,
} from "@reservation/shared";
import { db } from "../lib/admin";
import { writeAudit } from "../lib/audit";
import { secureCall } from "../lib/callable";
import { readBalance, writeCredits } from "../lib/credits";
import { appError } from "../lib/errors";
import { notifyUser } from "../lib/notify";
import { absencesOf, bookings, loadSpace, spaceDayQuery, toBookedSlot, userAbsencesQuery, userDayQuery } from "./common";

/** Books a space for the signed-in user, charging credits. Every rule is checked in one transaction. */
export const createBooking = secureCall(
  { name: "createBooking", schema: createBookingInput, rateLimit: { limit: 20, windowSec: 60 } },
  async ({ uid, role, data }) => {
    const slot = { from: data.from, to: data.to };
    const ref = bookings().doc();

    const space = await db.runTransaction(async (tx) => {
      const { space, site } = await loadSpace(tx, data.spaceId);
      const userSnap = await tx.get(db.collection(COL.users).doc(uid));
      const sameSpace = await tx.get(spaceDayQuery(data.spaceId, data.date));
      const mine = await tx.get(userDayQuery(uid, data.date));
      const absences = await tx.get(userAbsencesQuery(uid));
      const balance = await readBalance(tx, uid);

      const user = userSnap.data() as UserProfile | undefined;
      if (!user || user.status !== "active") throw appError("permission-denied", "forbidden", "Account is not active.");

      const problem = findBookingProblem({
        space,
        date: data.date,
        slot,
        attendees: data.attendees,
        existing: sameSpace.docs.map(toBookedSlot),
        now: nowIn(site.timeZone),
      });
      if (problem) throw appError("failed-precondition", problem, `Booking refused: ${problem}`);
      if (isWithinRanges(data.date, absencesOf(absences.docs))) throw appError("failed-precondition", "absent", "User is absent.");
      if (mine.docs.some((d) => overlaps(d.data() as Booking, slot))) {
        throw appError("failed-precondition", "alreadyBooked", "User already has a booking at that time.");
      }

      const cost = bookingCost(space.creditsPerHour ?? 0, slot);
      const booking: Booking<FieldValue | Timestamp> = {
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
        startsAt: Timestamp.fromDate(zonedTimeToUtc(data.date, data.from, site.timeZone)),
        status: "confirmed",
        credits: cost,
        cancelledBy: null,
        cancelReason: null,
        reminderSent: false,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };
      tx.create(ref, booking);
      if (cost > 0) writeCredits(tx, uid, balance, { amount: -cost, type: "booking", label: space.name, bookingId: ref.id });
      return space;
    });

    await writeAudit({
      actorId: uid,
      actorRole: role ?? "user",
      action: "booking.created",
      targetType: "booking",
      targetId: ref.id,
      details: { spaceId: data.spaceId, date: data.date },
    });
    await notifyUser(uid, {
      type: "bookingConfirmed",
      values: { space: space.name, date: data.date, from: formatMinutes(data.from), to: formatMinutes(data.to) },
      link: "/mes-reservations",
    });
    return { bookingId: ref.id };
  },
);
