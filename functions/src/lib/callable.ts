import { onCall, type CallableRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import type { z } from "zod";
import { hasRole, isRole, type RateLimitPolicy, type Role } from "@reservation/shared";
import { ENFORCE_APP_CHECK, REGION } from "./config";
import { appError } from "./errors";
import { enforceRateLimit } from "./rateLimit";

export interface CallContext<I> {
  uid: string;
  /** Role from the custom claim, or null when the user has not been bootstrapped yet. */
  role: Role | null;
  email: string | null;
  data: I;
  request: CallableRequest<unknown>;
}

export interface SecureCallOptions<S extends z.ZodType> {
  name: string;
  schema: S;
  /** Minimum role required. Omit to allow any signed-in user, including one without a role claim yet. */
  role?: Role;
  rateLimit?: RateLimitPolicy;
}

const DEFAULT_RATE_LIMIT: RateLimitPolicy = { limit: 30, windowSec: 60 };

/**
 * Wraps a callable with authentication, optional App Check, role check,
 * per-user rate limiting and zod input validation.
 */
export function secureCall<S extends z.ZodType, R>(
  opts: SecureCallOptions<S>,
  handler: (ctx: CallContext<z.infer<S>>) => Promise<R>,
) {
  return onCall({ region: REGION, enforceAppCheck: ENFORCE_APP_CHECK }, async (request): Promise<R> => {
    const token = request.auth?.token;
    if (!request.auth || !token) throw appError("unauthenticated", "authRequired", "Authentication required.");

    const uid = request.auth.uid;
    const role = isRole(token.role) ? token.role : null;

    if (opts.role && (!role || !hasRole(role, opts.role))) {
      logger.warn("Permission denied", { fn: opts.name, uid, role, required: opts.role });
      throw appError("permission-denied", "forbidden", "Missing required role.");
    }

    await enforceRateLimit(uid, opts.name, opts.rateLimit ?? DEFAULT_RATE_LIMIT);

    const parsed = opts.schema.safeParse(request.data ?? {});
    if (!parsed.success) {
      throw appError("invalid-argument", "invalidInput", "Invalid input.", { issues: parsed.error.issues });
    }

    return handler({ uid, role, email: token.email ?? null, data: parsed.data, request });
  });
}
