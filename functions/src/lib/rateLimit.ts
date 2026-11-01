import { COL, type RateLimitPolicy, type RateLimitState } from "@reservation/shared";
import { getDb } from "./mongo";
import { appError } from "./errors";

interface RateLimitDoc extends RateLimitState {
  _id: string;
}

/**
 * Enforces a per-user, per-function fixed-window limit. Throws `resource-exhausted` when exceeded.
 *
 * The count is raised by one single update that also starts a new window when the old one is over.
 * A read followed by a write would let concurrent requests all read the same count and all be
 * allowed. Refused calls are counted too, which only matters inside the window that is already running.
 */
export async function enforceRateLimit(uid: string, fnName: string, policy: RateLimitPolicy): Promise<void> {
  const col = (await getDb()).collection<RateLimitDoc>(COL.rateLimits);
  const _id = `${uid}_${fnName}`;
  const now = Date.now();
  const windowMs = policy.windowSec * 1000;

  // True when there is no window yet, or the current one has ended.
  const windowOver = { $or: [{ $not: [{ $isNumber: "$windowStart" }] }, { $lte: [{ $add: ["$windowStart", windowMs] }, now] }] };
  const raise = () =>
    col.findOneAndUpdate(
      { _id },
      [
        // Both stages decide from the same old windowStart: only the second one changes it.
        { $set: { count: { $cond: [windowOver, 1, { $add: [{ $ifNull: ["$count", 0] }, 1] }] } } },
        { $set: { windowStart: { $cond: [windowOver, now, "$windowStart"] } } },
      ],
      { upsert: true, returnDocument: "after" },
    );

  let doc: RateLimitDoc | null;
  try {
    doc = await raise();
  } catch (err) {
    // Two first calls created the document at the same time: the other one won, so count on top of it.
    if ((err as { code?: number }).code !== 11000) throw err;
    doc = await raise();
  }

  if (doc && doc.count > policy.limit) {
    const retryAfterSec = Math.max(1, Math.ceil((doc.windowStart + windowMs - now) / 1000));
    throw appError("resource-exhausted", "rateLimited", "Rate limit exceeded.", { retryAfterSec });
  }
}
