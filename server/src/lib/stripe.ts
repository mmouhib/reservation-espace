import Stripe from "stripe";
import { STRIPE_API_HOST, STRIPE_API_PORT, STRIPE_API_PROTOCOL, STRIPE_SECRET_KEY } from "./config";
import { appError } from "./errors";

let client: Stripe | null = null;

/**
 * The Stripe client, created on first use. Without STRIPE_SECRET_KEY credits cannot be bought:
 * there is no free fallback, so a missing key can never hand out credits.
 * STRIPE_API_HOST (and PORT, PROTOCOL) point it at a stand-in for Stripe, which the tests use.
 */
export function getStripe(): Stripe {
  const key = STRIPE_SECRET_KEY();
  if (!key) throw appError("unavailable", "paymentUnavailable", "Stripe is not configured.");
  const host = STRIPE_API_HOST();
  client ??= new Stripe(
    key,
    host ? { host, port: STRIPE_API_PORT(), protocol: STRIPE_API_PROTOCOL() === "https" ? "https" : "http" } : {},
  );
  return client;
}
