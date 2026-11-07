import { randomBytes } from "node:crypto";
import { COL, addDays, emptyInput, formatMinutes, type CalendarFeedResult, type CalendarEvent } from "@reservation/shared";
import { bookings, sites, users } from "../bookings/common";
import { secureCall } from "../lib/callable";
import { appError } from "../lib/errors";
import { getDb } from "../lib/mongo";
import { buildCalendar, type IcsEvent } from "./ics";

/** 32 random bytes, written as 43 URL-safe characters: nobody can guess it. */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const newToken = () => randomBytes(32).toString("base64url");

/** How far back and ahead the calendar reaches: enough for a calendar app, small enough to stay light. */
const DAYS_BACK = 60;
const DAYS_AHEAD = 365;

/**
 * The private link of the signed-in person's calendar. Calendar apps (Google, Apple, Outlook) cannot sign in, so the
 * link itself is the secret: it is made on first use and only the owner can read it or replace it.
 */
export const getMyCalendarFeed = secureCall({ name: "getMyCalendarFeed", schema: emptyInput }, async ({ uid }): Promise<CalendarFeedResult> => {
  const col = await users();
  // Only set it when there is none yet, so two calls at once end with the same token.
  await col.updateOne({ _id: uid, $or: [{ calendarToken: { $exists: false } }, { calendarToken: null }] }, { $set: { calendarToken: newToken() } });
  const user = await col.findOne({ _id: uid });
  if (!user?.calendarToken) throw appError("not-found", "userNotFound", "User not found.");
  return { token: user.calendarToken };
});

/** Replaces the link: the old one stops working at once (for example after it was shared by mistake). */
export const resetMyCalendarFeed = secureCall(
  { name: "resetMyCalendarFeed", schema: emptyInput, rateLimit: { limit: 5, windowSec: 60 } },
  async ({ uid }): Promise<CalendarFeedResult> => {
    const token = newToken();
    const result = await (await users()).updateOne({ _id: uid }, { $set: { calendarToken: token } });
    if (result.matchedCount === 0) throw appError("not-found", "userNotFound", "User not found.");
    return { token };
  },
);

/** The calendar file behind a link, or null when the link is not one (or its owner is gone). */
export async function buildFeed(token: string, now = new Date()): Promise<string | null> {
  if (!TOKEN_PATTERN.test(token)) return null;
  const user = await (await users()).findOne({ calendarToken: token, status: "active" });
  if (!user) return null;

  const today = now.toISOString().slice(0, 10);
  const range = { $gte: addDays(today, -DAYS_BACK), $lte: addDays(today, DAYS_AHEAD) };
  const [myBookings, myEvents, allSites] = await Promise.all([
    (await bookings()).find({ userId: user._id, status: "confirmed", date: range }).toArray(),
    (await getDb()).collection<CalendarEvent<Date> & { _id: string }>(COL.events).find({ userId: user._id, date: range }).toArray(),
    (await sites()).find({}).toArray(),
  ]);
  const siteLabel = new Map(allSites.map((site) => [site._id, [site.name, site.address].filter(Boolean).join(", ")]));

  const events: IcsEvent[] = [
    ...myBookings.map((booking) => ({
      uid: `booking-${booking._id}@reservation-espace`,
      summary: booking.spaceName,
      time: { kind: "utc" as const, start: booking.startsAt, end: new Date(booking.startsAt.getTime() + (booking.to - booking.from) * 60_000) },
      location: siteLabel.get(booking.siteId) ?? "",
      description: `${formatMinutes(booking.from)} – ${formatMinutes(booking.to)} · ${booking.credits} credits`,
    })),
    ...myEvents.map((event) => ({
      uid: `event-${event._id}@reservation-espace`,
      summary: event.title,
      time: event.allDay ? { kind: "allDay" as const, date: event.date } : { kind: "floating" as const, date: event.date, from: event.from, to: event.to },
      description: event.note,
    })),
  ];
  return buildCalendar("Réservation d'Espace", events, now);
}
