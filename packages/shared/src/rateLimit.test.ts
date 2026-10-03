import { describe, expect, it } from "vitest";
import { evaluateRateLimit, type RateLimitState } from "./rateLimit";

const policy = { limit: 3, windowSec: 60 };

describe("evaluateRateLimit", () => {
  it("opens a new window on first call", () => {
    const d = evaluateRateLimit(null, policy, 1_000);
    expect(d.allowed).toBe(true);
    expect(d.next).toEqual({ windowStart: 1_000, count: 1 });
  });

  it("denies once the limit is reached within the window", () => {
    let state: RateLimitState | null = null;
    for (let i = 0; i < 3; i++) {
      const d = evaluateRateLimit(state, policy, 1_000 + i);
      expect(d.allowed).toBe(true);
      state = d.next;
    }
    const denied = evaluateRateLimit(state, policy, 31_000);
    expect(denied.allowed).toBe(false);
    expect(denied.retryAfterSec).toBe(30);
  });

  it("resets after the window expires", () => {
    const d = evaluateRateLimit({ windowStart: 0, count: 3 }, policy, 60_000);
    expect(d.allowed).toBe(true);
    expect(d.next).toEqual({ windowStart: 60_000, count: 1 });
  });
});
