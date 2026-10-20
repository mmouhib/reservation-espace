import { defineBoolean, defineInt, defineString } from "firebase-functions/params";

export const REGION = "europe-west1";

export const BOOTSTRAP_ADMIN_EMAILS = defineString("BOOTSTRAP_ADMIN_EMAILS", { default: "" });
export const ALLOWED_EMAIL_DOMAINS = defineString("ALLOWED_EMAIL_DOMAINS", { default: "" });
// Credits given to every new account (0 to give none).
export const WELCOME_CREDITS = defineInt("WELCOME_CREDITS", { default: 0 });
export const ENFORCE_APP_CHECK = defineBoolean("ENFORCE_APP_CHECK", { default: false });

export function csv(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
