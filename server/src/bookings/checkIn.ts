import { checkInInput, type CheckInResult } from "@reservation/shared";
import { toBookingSummary } from "../api/common";
import { secureCall } from "../lib/callable";
import { appError } from "../lib/errors";
import { bookings, spaces } from "./common";

/** Check-in opens this long before a booking starts, and stays open until it ends. */
const OPEN_BEFORE_START_MINUTES = 30;
const MAX_BOOKING_HOURS = 24;

/**
 * Scanning the QR code of a space checks the person in to their own booking of that space, if one is running
 * (or starts within half an hour). Checking in twice does nothing more.
 */
export const checkInToSpace = secureCall(
  { name: "checkInToSpace", schema: checkInInput, rateLimit: { limit: 20, windowSec: 60 } },
  async ({ uid, data }): Promise<CheckInResult> => {
    if (!(await (await spaces()).findOne({ _id: data.spaceId }, { projection: { _id: 1 } }))) {
      throw appError("not-found", "spaceNotFound", "Space not found.");
    }

    const now = Date.now();
    const col = await bookings();
    const candidates = await col
      .find({
        userId: uid,
        spaceId: data.spaceId,
        status: "confirmed",
        startsAt: { $gte: new Date(now - MAX_BOOKING_HOURS * 3_600_000), $lte: new Date(now + OPEN_BEFORE_START_MINUTES * 60_000) },
      })
      .sort({ startsAt: 1 })
      .toArray();
    // The one that has not ended yet (a booking that just started comes before the next one).
    const booking = candidates.find((candidate) => candidate.startsAt.getTime() + (candidate.to - candidate.from) * 60_000 > now);
    if (!booking) throw appError("not-found", "noBookingNow", "No booking for this space right now.");

    if (booking.checkedInAt) return { booking: toBookingSummary(booking), alreadyCheckedIn: true };
    const checkedInAt = new Date(now);
    await col.updateOne({ _id: booking._id, checkedInAt: { $in: [null, undefined] } }, { $set: { checkedInAt } });
    return { booking: toBookingSummary({ ...booking, checkedInAt }), alreadyCheckedIn: false };
  },
);
