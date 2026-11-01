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
