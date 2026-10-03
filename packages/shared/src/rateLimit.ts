export interface RateLimitPolicy {
  /** Maximum calls allowed per window. */
  limit: number;
  /** Window length in seconds. */
  windowSec: number;
}

export interface RateLimitState {
  windowStart: number; // epoch ms
  count: number;
}

export interface RateLimitDecision {
  allowed: boolean;
  next: RateLimitState;
  /** Seconds until the current window resets (only meaningful when denied). */
  retryAfterSec: number;
}

/**
 * Fixed-window rate limiter. Pure so it can be unit-tested; persisted by the
 * Functions wrapper inside a Firestore transaction.
 */
export function evaluateRateLimit(
  state: RateLimitState | null,
  policy: RateLimitPolicy,
  nowMs: number,
): RateLimitDecision {
  const windowMs = policy.windowSec * 1000;
  const expired = !state || nowMs - state.windowStart >= windowMs;
  const current: RateLimitState = expired ? { windowStart: nowMs, count: 0 } : state;

  if (current.count >= policy.limit) {
    const retryAfterSec = Math.ceil((current.windowStart + windowMs - nowMs) / 1000);
    return { allowed: false, next: current, retryAfterSec };
  }
  return { allowed: true, next: { windowStart: current.windowStart, count: current.count + 1 }, retryAfterSec: 0 };
}
