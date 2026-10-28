import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { addDays, formatMinutes, nowIn } from "@reservation/shared";
import { REGION } from "../lib/config";
import { notifyUser } from "../lib/notify";
import { bookings, users } from "./common";

const HOUR_MS = 60 * 60 * 1000;

/** Every hour: reminds users of the bookings that start within the next 24 hours. */
export const sendBookingReminders = onSchedule({ schedule: "every 1 hours", region: REGION }, async () => {
  const now = new Date();
  const in24Hours = new Date(now.getTime() + 24 * HOUR_MS);
  const col = await bookings();
  const due = await col
    .find({ status: "confirmed", reminderSent: false, startsAt: { $gt: now, $lte: in24Hours } })
    .toArray();

  for (const booking of due) {
    await col.updateOne({ _id: booking._id }, { $set: { reminderSent: true } });
    await notifyUser(booking.userId, {
      type: "bookingReminder",
      values: { space: booking.spaceName, date: booking.date, from: formatMinutes(booking.from), to: formatMinutes(booking.to) },
      link: "/mes-reservations",
    });
  }
  logger.info("Booking reminders sent", { count: due.length });
});

/** Every Monday morning: sums up the week for the users who asked for it. */
export const sendWeeklyDigests = onSchedule({ schedule: "every monday 07:00", timeZone: "Europe/Paris", region: REGION }, async () => {
  const from = nowIn("Europe/Paris").date;
  const to = addDays(from, 6);
  const subscribers = await (await users()).find({ "notificationPrefs.weeklyDigest": true }).toArray();

  for (const user of subscribers) {
    if (user.status !== "active") continue;
    const week = await (await bookings())
      .find({ userId: user._id, status: "confirmed", date: { $gte: from, $lte: to } })
      .toArray();
    if (week.length === 0) continue;
    await notifyUser(user._id, { type: "weeklyDigest", values: { count: week.length }, link: "/mes-reservations" });
  }
});
