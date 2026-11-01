import type { ErrorReason } from "@reservation/shared";

export type ErrorCode =
  | "invalid-argument"
  | "unauthenticated"
  | "permission-denied"
  | "not-found"
  | "failed-precondition"
  | "resource-exhausted"
  | "unavailable"
  | "internal";

const HTTP_STATUS: Record<ErrorCode, number> = {
  "invalid-argument": 400,
  unauthenticated: 401,
  "permission-denied": 403,
  "not-found": 404,
  "failed-precondition": 412,
  "resource-exhausted": 429,
  unavailable: 503,
  internal: 500,
};

/**
 * An error carrying a stable `reason` that the client translates (`errors.<reason>`).
 * The message is English and meant for logs only.
 */
export class AppError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly reason: ErrorReason,
    message: string,
    readonly extra: Record<string, unknown> = {},
  ) {
    super(message);
  }

  get status(): number {
    return HTTP_STATUS[this.code];
  }
}

export function appError(code: ErrorCode, reason: ErrorReason, message: string, extra?: Record<string, unknown>): AppError {
  return new AppError(code, reason, message, extra);
}
