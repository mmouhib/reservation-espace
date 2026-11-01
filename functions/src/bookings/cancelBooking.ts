import type { Filter } from "mongodb";
import { cancelBookingInput, formatMinutes, type Booking, type Role } from "@reservation/shared";
import { writeAudit } from "../lib/audit";
import { secureCall } from "../lib/callable";
import { applyCredit } from "../lib/credits";
import { appError } from "../lib/errors";
import { notifyUser } from "../lib/notify";
import { withTransaction } from "../lib/transaction";
import { bookings, startsInThePast, type BookingDoc } from "./common";

export interface Actor {
  uid: string;
  /** "system" is used by automatic cancellations (absences, departed employees). */
  role: Role | "system";
}

/**
 * Cancels a booking and refunds its credits. Owners can cancel bookings that have
 * not started; administrators and the system can cancel any confirmed booking.
 */
export async function cancelBookingById(bookingId: string, actor: Actor, reason?: string): Promise<Booking<Date>> {
  const booking = await withTransaction(async (session) => {
    const col = await bookings();
    const booking = await col.findOne({ _id: bookingId }, { session });
    if (!booking) throw appError("not-found", "bookingNotFound", "Booking not found.");

    const privileged = actor.role === "admin" || actor.role === "system";
    if (booking.userId !== actor.uid && !privileged) throw appError("permission-denied", "forbidden", "Not your booking.");
    if (booking.status !== "confirmed" || (!privileged && startsInThePast(booking))) {
      throw appError("failed-precondition", "bookingNotCancellable", "Booking can no longer be cancelled.");
    }

    await col.updateOne(
      { _id: bookingId },
      { $set: { status: "cancelled", cancelledBy: actor.uid, cancelReason: reason ?? null, updatedAt: new Date() } },
      { session },
    );
    return booking;
  });

  // A refund can never fail the "not enough credits" check (it only adds), so this
  // can safely run after the cancellation commits, same trade-off as the charge.
  if (booking.credits > 0) {
    await applyCredit(booking.userId, { amount: booking.credits, type: "refund", label: booking.spaceName, bookingId });
  }

  await writeAudit({
    actorId: actor.uid,
    actorRole: actor.role,
    action: "booking.cancelled",
    targetType: "booking",
    targetId: bookingId,
    details: { reason: reason ?? null },
  });
  const byAdmin = actor.role === "admin" && actor.uid !== booking.userId;
  await notifyUser(booking.userId, {
    type: byAdmin ? "bookingCancelledByAdmin" : "bookingCancelled",
    values: {
      space: booking.spaceName,
      date: booking.date,
      from: formatMinutes(booking.from),
      to: formatMinutes(booking.to),
      reason: reason || "-",
    },
    link: "/mes-reservations",
  });
  return booking;
}

/** Cancels the upcoming bookings of a user, optionally only within a date range. Returns how many were cancelled. */
export async function cancelUpcomingBookings(
  userId: string,
  actor: Actor,
  reason: string,
  range?: { from: string; to: string },
): Promise<number> {
  const filter: Filter<BookingDoc> = { userId, status: "confirmed" };
  if (range) filter.date = { $gte: range.from, $lte: range.to };
  const docs = await (await bookings()).find(filter).toArray();

  let cancelled = 0;
  for (const doc of docs) {
    if (startsInThePast(doc)) continue;
    await cancelBookingById(doc._id, actor, reason);
    cancelled += 1;
  }
  return cancelled;
}

export const cancelBooking = secureCall(
  { name: "cancelBooking", schema: cancelBookingInput, rateLimit: { limit: 20, windowSec: 60 } },
  async ({ uid, role, data }) => {
    await cancelBookingById(data.bookingId, { uid, role: role ?? "user" }, data.reason);
    return { cancelled: true };
  },
);
