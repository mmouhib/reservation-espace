import { ObjectId } from "mongodb";
import { declareAbsenceInput, removeAbsenceInput } from "@reservation/shared";
import { writeAudit } from "../lib/audit";
import { secureCall } from "../lib/callable";
import { appError } from "../lib/errors";
import { cancelUpcomingBookings } from "./cancelBooking";
import { absences, users, type AbsenceDoc } from "./common";

/** Declares that the user is away: their bookings in that period are cancelled and refunded. */
export const declareAbsence = secureCall(
  { name: "declareAbsence", schema: declareAbsenceInput, rateLimit: { limit: 10, windowSec: 60 } },
  async ({ uid, role, data }) => {
    if (data.from > data.to) throw appError("invalid-argument", "invalidDates", "The start date is after the end date.");

    const user = await (await users()).findOne({ _id: uid });
    const absenceId = new ObjectId().toHexString();
    const absence: AbsenceDoc = {
      _id: absenceId,
      userId: uid,
      userName: user?.displayName ?? "",
      from: data.from,
      to: data.to,
      note: data.note,
      createdAt: new Date(),
    };
    await (await absences()).insertOne(absence);

    const cancelled = await cancelUpcomingBookings(uid, { uid, role: "system" }, "absence", { from: data.from, to: data.to });
    await writeAudit({
      actorId: uid,
      actorRole: role ?? "user",
      action: "absence.declared",
      targetType: "absence",
      targetId: absenceId,
      details: { from: data.from, to: data.to, cancelledBookings: cancelled },
    });
    return { absenceId, cancelled };
  },
);

/** Removes an absence. Owners can remove their own; administrators can remove any. */
export const removeAbsence = secureCall(
  { name: "removeAbsence", schema: removeAbsenceInput, rateLimit: { limit: 20, windowSec: 60 } },
  async ({ uid, role, data }) => {
    const col = await absences();
    const absence = await col.findOne({ _id: data.absenceId });
    if (!absence) throw appError("not-found", "bookingNotFound", "Absence not found.");
    if (absence.userId !== uid && role !== "admin") {
      throw appError("permission-denied", "forbidden", "Not your absence.");
    }
    await col.deleteOne({ _id: data.absenceId });
    return { removed: true };
  },
);
