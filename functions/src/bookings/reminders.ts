import { Timestamp } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { logger } from "firebase-functions/v2";
import { COL, addDays, formatMinutes, nowIn, type Booking, type UserProfile } from "@reservation/shared";
import { db } from "../lib/admin";
import { REGION } from "../lib/config";
import { notifyUser } from "../lib/notify";
import { bookings } from "./common";

const HOUR_MS = 60 * 60 * 1000;

/** Every hour: reminds users of the bookings that start within the next 24 hours. */
export const sendBookingReminders = onSchedule({ schedule: "every 1 hours", region: REGION }, async () => {
  const now = Timestamp.now();
  const in24Hours = Timestamp.fromMillis(now.toMillis() + 24 * HOUR_MS);
  const due = await bookings()
    .where("status", "==", "confirmed")
    .where("reminderSent", "==", false)
    .where("startsAt", ">", now)
    .where("startsAt", "<=", in24Hours)
    .get();

  for (const doc of due.docs) {
    const booking = doc.data() as Booking;
    await doc.ref.update({ reminderSent: true });
    await notifyUser(booking.userId, {
      type: "bookingReminder",
      values: { space: booking.spaceName, date: booking.date, from: formatMinutes(booking.from), to: formatMinutes(booking.to) },
      link: "/mes-reservations",
    });
  }
  logger.info("Booking reminders sent", { count: due.size });
});

/** Every Monday morning: sums up the week for the users who asked for it. */
export const sendWeeklyDigests = onSchedule({ schedule: "every monday 07:00", timeZone: "Europe/Paris", region: REGION }, async () => {
  const from = nowIn("Europe/Paris").date;
  const to = addDays(from, 6);
  const subscribers = await db.collection(COL.users).where("notificationPrefs.weeklyDigest", "==", true).get();

  for (const doc of subscribers.docs) {
    if ((doc.data() as UserProfile).status !== "active") continue;
    const week = await bookings()
      .where("userId", "==", doc.id)
      .where("status", "==", "confirmed")
      .where("date", ">=", from)
      .where("date", "<=", to)
      .get();
    if (week.empty) continue;
    await notifyUser(doc.id, { type: "weeklyDigest", values: { count: week.size }, link: "/mes-reservations" });
  }
});
