import type { DecodedIdToken } from "firebase-admin/auth";
import type { z } from "zod";
import { hasRole, isRole, type RateLimitPolicy, type Role } from "@reservation/shared";
import { appError } from "./errors";
import { logger } from "./logger";
import { enforceRateLimit } from "./rateLimit";

/** The person making a request: the verified Firebase ID token. */
export interface Caller {
  uid: string;
  token: DecodedIdToken;
}

export interface CallContext<I> {
  uid: string;
  /** Role from the custom claim, or null when the user has not been bootstrapped yet. */
  role: Role | null;
  email: string | null;
  data: I;
}

export interface AuthorizeOptions<S extends z.ZodType> {
  name: string;
  schema: S;
  /**
   * Minimum role required. Defaults to "user", which any bootstrapped company account has:
   * a signed-in account without a role claim (for example a Google account outside the
   * allowed email domains) is refused. Pass `null` to allow it, only for bootstrapProfile.
   */
  role?: Role | null;
  rateLimit?: RateLimitPolicy;
}

/** Sends one piece of a streamed answer to the client. */
export type SendChunk = (chunk: string) => void;

/** An API endpoint: `POST /api/<name>` with the input as JSON, answering `{ data }`. */
export interface Endpoint {
  kind: "endpoint";
  name: string;
  /** Streams text chunks (NDJSON) before the final `{ data }`. */
  streaming: boolean;
  invoke(caller: Caller | null, input: unknown, send: SendChunk): Promise<unknown>;
}

/** A job that runs on a schedule (cron syntax) inside the server. */
export interface Job {
  kind: "job";
  name: string;
  schedule: string;
  timeZone?: string;
  run(): Promise<void>;
}

const DEFAULT_RATE_LIMIT: RateLimitPolicy = { limit: 30, windowSec: 60 };

/**
 * Authentication, role check (at least "user" unless said otherwise), per-user rate
 * limiting and zod input validation shared by every endpoint, streaming or not.
 */
export async function authorize<S extends z.ZodType>(
  caller: Caller | null,
  input: unknown,
  opts: AuthorizeOptions<S>,
): Promise<{ uid: string; role: Role | null; email: string | null; data: z.infer<S> }> {
  if (!caller) throw appError("unauthenticated", "authRequired", "Authentication required.");

  const { uid, token } = caller;
  const role = isRole(token.role) ? token.role : null;

  const required = opts.role === undefined ? "user" : opts.role;
  if (required && (!role || !hasRole(role, required))) {
    logger.warn("Permission denied", { fn: opts.name, uid, role, required });
    throw appError("permission-denied", "forbidden", "Missing required role.");
  }

  await enforceRateLimit(uid, opts.name, opts.rateLimit ?? DEFAULT_RATE_LIMIT);

  const parsed = opts.schema.safeParse(input ?? {});
  if (!parsed.success) {
    throw appError("invalid-argument", "invalidInput", "Invalid input.", { issues: parsed.error.issues });
  }

  return { uid, role, email: token.email ?? null, data: parsed.data };
}

/** An endpoint with authentication, role check, per-user rate limiting and zod input validation. */
export function secureCall<S extends z.ZodType, R>(
  opts: AuthorizeOptions<S>,
  handler: (ctx: CallContext<z.infer<S>>) => Promise<R>,
): Endpoint {
  return {
    kind: "endpoint",
    name: opts.name,
    streaming: false,
    invoke: async (caller, input) => handler(await authorize(caller, input, opts)),
  };
}

/** Like secureCall, for an answer that is sent piece by piece (the handler calls `send`). */
export function secureStream<S extends z.ZodType, R>(
  opts: AuthorizeOptions<S>,
  handler: (ctx: CallContext<z.infer<S>> & { send: SendChunk }) => Promise<R>,
): Endpoint {
  return {
    kind: "endpoint",
    name: opts.name,
    streaming: true,
    invoke: async (caller, input, send) => handler({ ...(await authorize(caller, input, opts)), send }),
  };
}

/** A scheduled job. `schedule` is cron syntax, e.g. "0 7 * * 1" (Mondays at 07:00). */
export function scheduledJob(opts: { name: string; schedule: string; timeZone?: string }, run: () => Promise<void>): Job {
  return { kind: "job", ...opts, run };
}
