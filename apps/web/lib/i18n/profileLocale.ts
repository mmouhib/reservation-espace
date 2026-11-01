import type { Locale } from "@reservation/shared";
import { api } from "@/lib/api/functions";

/**
 * When signed in, the profile holds the language (it follows the user across
 * devices and drives server-sent messages). A language picked on the sign-in
 * page is remembered for this tab and written to the profile after sign-in,
 * instead of being overridden by it.
 */

const SIGNED_OUT_CHOICE_KEY = "localeChosenSignedOut";

export function rememberSignedOutChoice(): void {
  try {
    sessionStorage.setItem(SIGNED_OUT_CHOICE_KEY, "1");
  } catch {
    // Storage unavailable: the profile language will apply after sign-in.
  }
}

/** True once if the language was picked while signed out in this tab. */
export function takeSignedOutChoice(): boolean {
  try {
    const chosen = sessionStorage.getItem(SIGNED_OUT_CHOICE_KEY) === "1";
    sessionStorage.removeItem(SIGNED_OUT_CHOICE_KEY);
    return chosen;
  } catch {
    return false;
  }
}

/** Saves the language on the signed-in user's profile. The uid argument is kept for existing callers. */
export function saveProfileLocale(_uid: string, locale: Locale): void {
  api.updateMyProfile({ locale }).catch((err) => console.warn("Could not save the language preference", err));
}
