import { defineBoolean, defineInt, defineSecret, defineString } from "firebase-functions/params";

export const REGION = "europe-west1";

// MongoDB connection string (Atlas in production). It contains the database password, so it lives in
// Secret Manager: `firebase functions:secrets:set MONGODB_URI`. Every function reads Mongo (the rate
// limiter alone does), so every function must bind it: see lib/globalOptions.ts. For the emulators,
// MONGODB_URI in functions/.env.local is used instead (see lib/mongo.ts).
export const MONGODB_URI = defineSecret("MONGODB_URI");

export const BOOTSTRAP_ADMIN_EMAILS = defineString("BOOTSTRAP_ADMIN_EMAILS", { default: "" });
export const ALLOWED_EMAIL_DOMAINS = defineString("ALLOWED_EMAIL_DOMAINS", { default: "" });
// Credits given to every new account (0 to give none).
export const WELCOME_CREDITS = defineInt("WELCOME_CREDITS", { default: 0 });
export const ENFORCE_APP_CHECK = defineBoolean("ENFORCE_APP_CHECK", { default: false });

// Google AI Studio key for Gemini (ai.google.dev). Stored in Secret Manager, not .env:
// `firebase functions:secrets:set GOOGLE_GENERATIVE_AI_API_KEY`, and for the emulator,
// a `functions/.secret.local` file (never committed).
export const GOOGLE_GENERATIVE_AI_API_KEY = defineSecret("GOOGLE_GENERATIVE_AI_API_KEY");

// Resend key (resend.com) for notification emails. Same handling as the Gemini key:
// `firebase functions:secrets:set RESEND_API_KEY`, or RESEND_API_KEY in functions/.secret.local.
// Empty = emails are skipped (logged as a warning).
export const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
// Sender of the notification emails, e.g. "Réservation <no-reply@yourdomain.com>" (must be verified in Resend).
export const RESEND_FROM = defineString("RESEND_FROM", { default: "Réservation <no-reply@example.com>" });

export function csv(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
