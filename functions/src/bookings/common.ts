import type { ClientSession, Filter } from "mongodb";
import { COL, type Absence, type BookedSlot, type Booking, type Site, type Space, type UserProfile } from "@reservation/shared";
import { appError } from "../lib/errors";
import { getDb } from "../lib/mongo";

export type BookingDoc = Booking<Date> & { _id: string };
export type SpaceDoc = Space<Date> & { _id: string };
export type SiteDoc = Site & { _id: string };
export type AbsenceDoc = Absence<Date> & { _id: string };
export type UserDoc = UserProfile<Date> & { _id: string };

export async function bookings() {
  return (await getDb()).collection<BookingDoc>(COL.bookings);
}

export async function absences() {
  return (await getDb()).collection<AbsenceDoc>(COL.absences);
}

export async function spaces() {
  return (await getDb()).collection<SpaceDoc>(COL.spaces);
}

export async function sites() {
  return (await getDb()).collection<SiteDoc>(COL.sites);
}

export async function users() {
  return (await getDb()).collection<UserDoc>(COL.users);
}

/** Confirmed bookings of one space on one day. */
export const spaceDayFilter = (spaceId: string, date: string): Filter<BookingDoc> => ({ spaceId, date, status: "confirmed" });

/** Confirmed bookings of one user on one day. */
export const userDayFilter = (userId: string, date: string): Filter<BookingDoc> => ({ userId, date, status: "confirmed" });

export const userAbsencesFilter = (userId: string): Filter<AbsenceDoc> => ({ userId });

export function toBookedSlot(booking: BookingDoc): BookedSlot {
  const { from, to, attendees } = booking;
  return { from, to, attendees };
}

/** Reads a space and its site, inside the caller's transaction session. */
export async function loadSpace(session: ClientSession, spaceId: string): Promise<{ space: SpaceDoc; site: SiteDoc }> {
  const space = await (await spaces()).findOne({ _id: spaceId }, { session });
  if (!space) throw appError("not-found", "spaceNotFound", "Space not found.");
  const site = await (await sites()).findOne({ _id: space.siteId }, { session });
  if (!site) throw appError("not-found", "spaceNotFound", "Site not found.");
  return { space, site };
}

export function startsInThePast(booking: Booking<Date>): boolean {
  return booking.startsAt.getTime() <= Date.now();
}
