/**
 * Stable reasons attached to callable errors (`HttpsError.details.reason`).
 * The server never sends user-facing text: the client translates
 * `errors.<reason>` in the user's language.
 */
export const ERROR_REASONS = [
  "authRequired",
  "forbidden",
  "invalidInput",
  "rateLimited",
  "noEmail",
  "notInCompany",
  "cannotDemoteSelf",
  "userNotFound",
] as const;
export type ErrorReason = (typeof ERROR_REASONS)[number];

export function isErrorReason(value: unknown): value is ErrorReason {
  return typeof value === "string" && (ERROR_REASONS as readonly string[]).includes(value);
}
