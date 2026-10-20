import type { QueryDocumentSnapshot, Timestamp, Transaction } from "firebase-admin/firestore";
import { COL, type Absence, type BookedSlot, type Booking, type Site, type Space } from "@reservation/shared";
import { db } from "../lib/admin";
import { appError } from "../lib/errors";

export const bookings = () => db.collection(COL.bookings);

/** Confirmed bookings of one space on one day. */
export const spaceDayQuery = (spaceId: string, date: string) =>
  bookings().where("spaceId", "==", spaceId).where("date", "==", date).where("status", "==", "confirmed");

/** Confirmed bookings of one user on one day. */
export const userDayQuery = (userId: string, date: string) =>
  bookings().where("userId", "==", userId).where("date", "==", date).where("status", "==", "confirmed");

export const userAbsencesQuery = (userId: string) => db.collection(COL.absences).where("userId", "==", userId);

export function toBookedSlot(doc: QueryDocumentSnapshot): BookedSlot {
  const { from, to, attendees } = doc.data() as Booking;
  return { from, to, attendees };
}

export function absencesOf(docs: QueryDocumentSnapshot[]): Absence[] {
  return docs.map((d) => d.data() as Absence);
}

/** Reads a space and its site in a transaction. */
export async function loadSpace(tx: Transaction, spaceId: string): Promise<{ space: Space; site: Site }> {
  const spaceSnap = await tx.get(db.collection(COL.spaces).doc(spaceId));
  if (!spaceSnap.exists) throw appError("not-found", "spaceNotFound", "Space not found.");
  const space = spaceSnap.data() as Space;
  const siteSnap = await tx.get(db.collection(COL.sites).doc(space.siteId));
  if (!siteSnap.exists) throw appError("not-found", "spaceNotFound", "Site not found.");
  return { space, site: siteSnap.data() as Site };
}

export function startsInThePast(booking: Booking<Timestamp>): boolean {
  return booking.startsAt.toMillis() <= Date.now();
}
