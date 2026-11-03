import "./env";

/** A setting read from the environment each time it is used (so tests and hosts can change it). */
const text = (name: string, fallback = "") => () => process.env[name]?.trim() || fallback;
const integer = (name: string, fallback: number) => () => {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && process.env[name]?.trim() ? value : fallback;
};

export const PORT = integer("PORT", 8080);

// Firebase project that issues the sign-in tokens (Firebase is used for Google sign-in only).
export const FIREBASE_PROJECT_ID = text("FIREBASE_PROJECT_ID");
// Service account JSON (one line) that lets the server set roles and disable accounts. Without it, Google's
// default credentials are used (GOOGLE_APPLICATION_CREDENTIALS, or a Google Cloud host).
export const FIREBASE_SERVICE_ACCOUNT = text("FIREBASE_SERVICE_ACCOUNT");

// MongoDB connection string (Atlas in production). It contains the database password.
export const MONGODB_URI = text("MONGODB_URI");
export const MONGODB_DB_NAME = text("MONGODB_DB_NAME");

// Email domains that may sign up (comma separated). Empty = any address.
export const ALLOWED_EMAIL_DOMAINS = text("ALLOWED_EMAIL_DOMAINS");
// Credits given to every new account (0 to give none).
export const WELCOME_CREDITS = integer("WELCOME_CREDITS", 0);

// Origins allowed to call the API from another address (comma separated). Empty when the web app is
// served by this server, which is the normal case; set it for `next dev` (http://localhost:3000).
export const CORS_ORIGINS = text("CORS_ORIGINS");

// Folder of the built web app (apps/web/out) that this server serves.
export const WEB_DIR = text("WEB_DIR");

// Google AI Studio key for Gemini (ai.google.dev).
export const GOOGLE_GENERATIVE_AI_API_KEY = text("GOOGLE_GENERATIVE_AI_API_KEY");

// Stripe (stripe.com) takes the card payments for credits. STRIPE_SECRET_KEY is sk_test_... in test mode.
// Without it credits cannot be bought. STRIPE_WEBHOOK_SECRET (whsec_...) turns on /api/stripe/webhook, which
// gives the credits even when the buyer closes the page right after paying.
export const STRIPE_SECRET_KEY = text("STRIPE_SECRET_KEY");
export const STRIPE_WEBHOOK_SECRET = text("STRIPE_WEBHOOK_SECRET");
// Only for the tests: talk to a stand-in for Stripe instead of api.stripe.com.
export const STRIPE_API_HOST = text("STRIPE_API_HOST");
export const STRIPE_API_PORT = integer("STRIPE_API_PORT", 443);
export const STRIPE_API_PROTOCOL = text("STRIPE_API_PROTOCOL", "https");

// Resend key (resend.com) for notification emails. Empty = emails are skipped (logged as a warning).
export const RESEND_API_KEY = text("RESEND_API_KEY");
// Sender of the notification emails, e.g. "Réservation <no-reply@yourdomain.com>" (must be verified in Resend).
export const RESEND_FROM = text("RESEND_FROM", "Réservation <no-reply@example.com>");

// Web Push (VAPID) keys: `npx web-push generate-vapid-keys`. Without them push notifications are skipped.
export const VAPID_PUBLIC_KEY = text("VAPID_PUBLIC_KEY");
export const VAPID_PRIVATE_KEY = text("VAPID_PRIVATE_KEY");
export const VAPID_SUBJECT = text("VAPID_SUBJECT", "mailto:admin@example.com");

export function csv(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
