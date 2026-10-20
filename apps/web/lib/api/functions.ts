import { FirebaseError } from "firebase/app";
import { FunctionsError, httpsCallable } from "firebase/functions";
import {
  isErrorReason,
  type AdjustCreditsInput,
  type AnonymizeUserInput,
  type BootstrapProfileInput,
  type BootstrapProfileResult,
  type CancelBookingInput,
  type CancelSubscriptionInput,
  type CreateBookingInput,
  type DeclareAbsenceInput,
  type MessageKey,
  type PurchasePlanInput,
  type RemoveAbsenceInput,
  type SearchSpacesInput,
  type SetUserRoleInput,
  type SpaceSlotStatus,
  type TeamBookingsInput,
  type TeamBookingsResult,
  type UpdateBookingInput,
  type UpdateUserOrgInput,
} from "@reservation/shared";
import { getFirebase } from "@/lib/firebase/client";

/** Typed wrappers over callable Cloud Functions. */

function callable<I, O>(name: string) {
  return async (input: I): Promise<O> => {
    const fn = httpsCallable<I, O>(getFirebase().functions, name);
    const res = await fn(input);
    return res.data;
  };
}

type Empty = Record<string, never>;

export const api = {
  // Users
  bootstrapProfile: callable<BootstrapProfileInput, BootstrapProfileResult>("bootstrapProfile"),
  setUserRole: callable<SetUserRoleInput, { changed: boolean }>("setUserRole"),
  runDirectorySyncNow: callable<Empty, { checked: number; disabled: string[] }>("runDirectorySyncNow"),
  updateUserOrg: callable<UpdateUserOrgInput, { updated: boolean }>("updateUserOrg"),
  exportMyData: callable<Empty, Record<string, unknown>>("exportMyData"),
  deleteMyAccount: callable<Empty, { deleted: boolean }>("deleteMyAccount"),
  anonymizeUser: callable<AnonymizeUserInput, { deleted: boolean }>("anonymizeUser"),
  // Bookings
  searchSpaces: callable<SearchSpacesInput, SpaceSlotStatus[]>("searchSpaces"),
  createBooking: callable<CreateBookingInput, { bookingId: string }>("createBooking"),
  updateBooking: callable<UpdateBookingInput, { updated: boolean }>("updateBooking"),
  cancelBooking: callable<CancelBookingInput, { cancelled: boolean }>("cancelBooking"),
  declareAbsence: callable<DeclareAbsenceInput, { absenceId: string; cancelled: number }>("declareAbsence"),
  removeAbsence: callable<RemoveAbsenceInput, { removed: boolean }>("removeAbsence"),
  teamBookings: callable<TeamBookingsInput, TeamBookingsResult>("teamBookings"),
  // Credits
  purchasePlan: callable<PurchasePlanInput, { credits: number }>("purchasePlan"),
  cancelSubscription: callable<CancelSubscriptionInput, { cancelled: boolean }>("cancelSubscription"),
  adjustCredits: callable<AdjustCreditsInput, { adjusted: boolean }>("adjustCredits"),
};

const CODE_KEYS: Record<string, MessageKey> = {
  "functions/unauthenticated": "errors.authRequired",
  "functions/permission-denied": "errors.forbidden",
  "functions/resource-exhausted": "errors.rateLimited",
  "functions/unavailable": "errors.unavailable",
  "functions/internal": "errors.internal",
  "auth/popup-closed-by-user": "errors.popupClosed",
  "auth/network-request-failed": "errors.network",
  "auth/invalid-credential": "errors.invalidCredential",
  "auth/user-disabled": "errors.accountDisabled",
};

/**
 * Translation key for any error. Callable errors carry a `reason` set by the
 * server (see functions/src/lib/errors.ts); other Firebase errors map by code.
 */
export function errorKey(err: unknown): MessageKey {
  if (err instanceof FunctionsError) {
    const reason = (err.details as { reason?: unknown } | undefined)?.reason;
    if (isErrorReason(reason)) return `errors.${reason}`;
  }
  if (err instanceof FirebaseError) {
    return CODE_KEYS[err.code] ?? "errors.generic";
  }
  return "errors.generic";
}
