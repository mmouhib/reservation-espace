import type { ClientSession } from "mongodb";
import { getMongoClient } from "./mongo";

/**
 * Runs `fn` inside a MongoDB multi-document transaction (requires the server to
 * run as a replica set). Every read/write `fn` performs must pass `{ session }`
 * explicitly — unlike Firestore, Mongo sessions don't implicitly scope reads.
 * The driver retries transient transaction errors internally.
 */
export async function withTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  const client = await getMongoClient();
  const session = client.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await fn(session);
    });
    return result as T;
  } finally {
    await session.endSession();
  }
}
