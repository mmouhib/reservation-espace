import { onCall, type CallableOptions, type CallableRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import type { SecretParam } from "firebase-functions/params";
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

export interface AuthorizeOptions<S extends z.ZodType> {
  name: string;
  schema: S;
  /** Minimum role required. Omit to allow any signed-in user, including one without a role claim yet. */
  role?: Role;
  rateLimit?: RateLimitPolicy;
}

export interface SecureCallOptions<S extends z.ZodType> extends AuthorizeOptions<S> {
  /** Secret Manager params to bind to the function (e.g. a third-party API key). */
  secrets?: SecretParam[];
}

const DEFAULT_RATE_LIMIT: RateLimitPolicy = { limit: 30, windowSec: 60 };

/**
 * Authentication, optional role check, per-user rate limiting and zod input
 * validation shared by every callable, streaming or not.
 */
export async function authorize<S extends z.ZodType>(
  request: CallableRequest<unknown>,
  opts: AuthorizeOptions<S>,
): Promise<{ uid: string; role: Role | null; email: string | null; data: z.infer<S> }> {
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

  return { uid, role, email: token.email ?? null, data: parsed.data };
}

/**
 * Wraps a callable with authentication, optional App Check, role check,
 * per-user rate limiting and zod input validation.
 */
export function secureCall<S extends z.ZodType, R>(
  opts: SecureCallOptions<S>,
  handler: (ctx: CallContext<z.infer<S>>) => Promise<R>,
) {
  const callableOptions: CallableOptions = { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK };
  if (opts.secrets) callableOptions.secrets = opts.secrets;
  return onCall(callableOptions, async (request): Promise<R> => {
    const ctx = await authorize(request, opts);
    return handler({ ...ctx, request });
  });
}
