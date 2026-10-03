import { FirebaseError } from "firebase/app";
import { FunctionsError, httpsCallable } from "firebase/functions";
import {
  isErrorReason,
  type BootstrapProfileInput,
  type BootstrapProfileResult,
  type MessageKey,
  type SetUserRoleInput,
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

export const api = {
  bootstrapProfile: callable<BootstrapProfileInput, BootstrapProfileResult>("bootstrapProfile"),
  setUserRole: callable<SetUserRoleInput, { changed: boolean }>("setUserRole"),
  runDirectorySyncNow: callable<Record<string, never>, { checked: number; disabled: string[] }>("runDirectorySyncNow"),
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
