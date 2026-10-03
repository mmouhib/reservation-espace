import { HttpsError, type FunctionsErrorCode } from "firebase-functions/v2/https";
import type { ErrorReason } from "@reservation/shared";

/**
 * An HttpsError carrying a stable `reason` that the client translates
 * (`errors.<reason>`). The message is English and meant for logs only.
 */
export function appError(
  code: FunctionsErrorCode,
  reason: ErrorReason,
  message: string,
  extra?: Record<string, unknown>,
): HttpsError {
  return new HttpsError(code, message, { reason, ...extra });
}
