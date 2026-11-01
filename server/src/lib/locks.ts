import type { ClientSession } from "mongodb";
import { COL } from "@reservation/shared";
import { getDb } from "./mongo";

/**
 * Makes concurrent transactions on the same resource take turns.
 *
 * MongoDB transactions use snapshot isolation: two transactions that each read "this desk is
 * free" and then insert two different booking documents do not conflict, so both would commit
 * (write skew). Writing the same lock document first turns that into a write conflict on one
 * document, which MongoDB detects: the second transaction is aborted and retried, and on the
 * retry it sees the first booking.
 *
 * Call it at the start of the transaction, before reading what the rules depend on.
 */
export async function lockForUpdate(session: ClientSession, ...keys: string[]): Promise<void> {
  const locks = (await getDb()).collection<{ _id: string; n: number }>(COL.locks);
  // A fixed order, so two transactions that need the same keys never wait on each other.
  for (const key of [...new Set(keys)].sort()) {
    await locks.updateOne({ _id: key }, { $inc: { n: 1 } }, { upsert: true, session });
  }
}

/** Lock key of a space on a day: protects its capacity. */
export const spaceDayLock = (spaceId: string, date: string) => `space:${spaceId}:${date}`;

/** Lock key of a user on a day: protects the "no overlapping bookings" rule. */
export const userDayLock = (userId: string, date: string) => `user:${userId}:${date}`;
