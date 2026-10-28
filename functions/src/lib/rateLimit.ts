import { COL, evaluateRateLimit, type RateLimitPolicy, type RateLimitState } from "@reservation/shared";
import { getDb } from "./mongo";
import { appError } from "./errors";

interface RateLimitDoc extends RateLimitState {
  _id: string;
}

/** Enforces a per-user, per-function fixed-window limit. Throws `resource-exhausted` when exceeded. */
export async function enforceRateLimit(uid: string, fnName: string, policy: RateLimitPolicy): Promise<void> {
  const db = await getDb();
  const col = db.collection<RateLimitDoc>(COL.rateLimits);
  const _id = `${uid}_${fnName}`;

  const current = await col.findOne({ _id });
  const decision = evaluateRateLimit(current ?? null, policy, Date.now());
  if (decision.allowed) await col.replaceOne({ _id }, decision.next, { upsert: true });
  if (!decision.allowed) {
    throw appError("resource-exhausted", "rateLimited", "Rate limit exceeded.", {
      retryAfterSec: decision.retryAfterSec,
    });
  }
}
