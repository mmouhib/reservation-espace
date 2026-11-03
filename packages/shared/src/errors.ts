/**
 * Stable reasons attached to API errors (`error.reason` in the response).
 * The server never sends user-facing text: the client translates
 * `errors.<reason>` in the user's language.
 */
export const ERROR_REASONS = [
  // Access
  "authRequired",
  "forbidden",
  "invalidInput",
  "rateLimited",
  "noEmail",
  "notInCompany",
  "emailNotVerified",
  "cannotDemoteSelf",
  "userNotFound",
  // Bookings
  "invalidSlot",
  "spaceClosed",
  "outsideHours",
  "pastSlot",
  "tooFarAhead",
  "slotTaken",
  "tooManyAttendees",
  "alreadyBooked",
  "absent",
  "spaceNotFound",
  "bookingNotFound",
  "bookingNotCancellable",
  "invalidDates",
  // Credits
  "notEnoughCredits",
  "planNotFound",
  "alreadySubscribed",
  "subscriptionNotFound",
  "paymentFailed",
  "paymentUnavailable",
  // AI assistant
  "assistantUnavailable",
  // Visitors
  "visitNotFound",
  "eventNotFound",
  "invalidVisitStatus",
] as const;
export type ErrorReason = (typeof ERROR_REASONS)[number];

export function isErrorReason(value: unknown): value is ErrorReason {
  return typeof value === "string" && (ERROR_REASONS as readonly string[]).includes(value);
}
