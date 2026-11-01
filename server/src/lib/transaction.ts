import type { ClientSession } from "mongodb";
import { COL } from "@reservation/shared";
import { getMongoClient } from "./mongo";

/** Tries again when two transactions race to create the same lock document for the first time. */
const MAX_LOCK_RACE_RETRIES = 5;

function isLockCreationRace(err: unknown): boolean {
  const e = err as { code?: number; message?: string };
  // The driver retries write conflicts itself. A duplicate key on the locks collection is the one
  // case it does not: the other transaction committed the lock between our check and our insert.
  return e?.code === 11000 && typeof e.message === "string" && e.message.includes(`.${COL.locks} `);
}

/**
 * Runs `fn` inside a MongoDB multi-document transaction (requires the server to
 * run as a replica set). Every read/write `fn` performs must pass `{ session }`
 * explicitly: Mongo sessions don't implicitly scope reads.
 * The driver retries transient transaction errors internally, so `fn` may run more
 * than once: keep side effects (emails, notifications) outside of it.
 */
export async function withTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  const client = await getMongoClient();
  for (let attempt = 1; ; attempt += 1) {
    const session = client.startSession();
    try {
      let result: T | undefined;
      await session.withTransaction(async () => {
        result = await fn(session);
      });
      return result as T;
    } catch (err) {
      if (attempt < MAX_LOCK_RACE_RETRIES && isLockCreationRace(err)) continue;
      throw err;
    } finally {
      await session.endSession();
    }
  }
}
