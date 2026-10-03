import { HttpsError } from "firebase-functions/https";
import { COL, evaluateRateLimit, type RateLimitPolicy, type RateLimitState } from "@reservation/shared";
import { db } from "./admin";

/** Enforces a per-user, per-function fixed-window limit. Throws `resource-exhausted` when exceeded. */
export async function enforceRateLimit(uid: string, fnName: string, policy: RateLimitPolicy): Promise<void> {
  const ref = db.collection(COL.rateLimits).doc(`${uid}_${fnName}`);
  const decision = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = evaluateRateLimit((snap.data() as RateLimitState | undefined) ?? null, policy, Date.now());
    if (d.allowed) tx.set(ref, d.next);
    return d;
  });
  if (!decision.allowed) {
    throw new HttpsError("resource-exhausted", "Trop de requêtes, réessayez dans quelques instants.", {
      retryAfterSec: decision.retryAfterSec,
    });
  }
}
