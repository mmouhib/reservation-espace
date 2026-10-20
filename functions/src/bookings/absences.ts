import { FieldValue } from "firebase-admin/firestore";
import { COL, declareAbsenceInput, removeAbsenceInput, type Absence, type UserProfile } from "@reservation/shared";
import { db } from "../lib/admin";
import { writeAudit } from "../lib/audit";
import { secureCall } from "../lib/callable";
import { appError } from "../lib/errors";
import { cancelUpcomingBookings } from "./cancelBooking";

/** Declares that the user is away: their bookings in that period are cancelled and refunded. */
export const declareAbsence = secureCall(
  { name: "declareAbsence", schema: declareAbsenceInput, rateLimit: { limit: 10, windowSec: 60 } },
  async ({ uid, role, data }) => {
    if (data.from > data.to) throw appError("invalid-argument", "invalidDates", "The start date is after the end date.");

    const user = (await db.collection(COL.users).doc(uid).get()).data() as UserProfile | undefined;
    const absence: Absence<FieldValue> = {
      userId: uid,
      userName: user?.displayName ?? "",
      from: data.from,
      to: data.to,
      note: data.note,
      createdAt: FieldValue.serverTimestamp(),
    };
    const ref = await db.collection(COL.absences).add(absence);

    const cancelled = await cancelUpcomingBookings(uid, { uid, role: "system" }, "absence", { from: data.from, to: data.to });
    await writeAudit({
      actorId: uid,
      actorRole: role ?? "user",
      action: "absence.declared",
      targetType: "absence",
      targetId: ref.id,
      details: { from: data.from, to: data.to, cancelledBookings: cancelled },
    });
    return { absenceId: ref.id, cancelled };
  },
);

/** Removes an absence. Owners can remove their own; administrators can remove any. */
export const removeAbsence = secureCall(
  { name: "removeAbsence", schema: removeAbsenceInput, rateLimit: { limit: 20, windowSec: 60 } },
  async ({ uid, role, data }) => {
    const ref = db.collection(COL.absences).doc(data.absenceId);
    const snap = await ref.get();
    if (!snap.exists) throw appError("not-found", "bookingNotFound", "Absence not found.");
    if ((snap.data() as Absence).userId !== uid && role !== "admin") {
      throw appError("permission-denied", "forbidden", "Not your absence.");
    }
    await ref.delete();
    return { removed: true };
  },
);
