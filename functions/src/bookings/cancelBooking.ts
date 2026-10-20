import { FieldValue, type Timestamp } from "firebase-admin/firestore";
import { cancelBookingInput, formatMinutes, type Booking, type Role } from "@reservation/shared";
import { db } from "../lib/admin";
import { writeAudit } from "../lib/audit";
import { secureCall } from "../lib/callable";
import { readBalance, writeCredits } from "../lib/credits";
import { appError } from "../lib/errors";
import { notifyUser } from "../lib/notify";
import { bookings, startsInThePast } from "./common";

export interface Actor {
  uid: string;
  /** "system" is used by automatic cancellations (absences, departed employees). */
  role: Role | "system";
}

/**
 * Cancels a booking and refunds its credits. Owners can cancel bookings that have
 * not started; administrators and the system can cancel any confirmed booking.
 */
export async function cancelBookingById(bookingId: string, actor: Actor, reason?: string): Promise<Booking<Timestamp>> {
  const ref = bookings().doc(bookingId);

  const booking = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) throw appError("not-found", "bookingNotFound", "Booking not found.");
    const booking = snap.data() as Booking<Timestamp>;

    const privileged = actor.role === "admin" || actor.role === "system";
    if (booking.userId !== actor.uid && !privileged) throw appError("permission-denied", "forbidden", "Not your booking.");
    if (booking.status !== "confirmed" || (!privileged && startsInThePast(booking))) {
      throw appError("failed-precondition", "bookingNotCancellable", "Booking can no longer be cancelled.");
    }

    const balance = await readBalance(tx, booking.userId);
    tx.update(ref, { status: "cancelled", cancelledBy: actor.uid, cancelReason: reason ?? null, updatedAt: FieldValue.serverTimestamp() });
    if (booking.credits > 0) {
      writeCredits(tx, booking.userId, balance, { amount: booking.credits, type: "refund", label: booking.spaceName, bookingId });
    }
    return booking;
  });

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
  let query = bookings().where("userId", "==", userId).where("status", "==", "confirmed");
  if (range) query = query.where("date", ">=", range.from).where("date", "<=", range.to);
  const snap = await query.get();

  let cancelled = 0;
  for (const doc of snap.docs) {
    if (startsInThePast(doc.data() as Booking<Timestamp>)) continue;
    await cancelBookingById(doc.id, actor, reason);
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

