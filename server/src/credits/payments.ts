import type Stripe from "stripe";
import { COL, confirmPaymentInput, createPaymentInput, type ConfirmPaymentResult, type CreatePaymentResult } from "@reservation/shared";
import { writeAudit } from "../lib/audit";
import { secureCall } from "../lib/callable";
import { STRIPE_WEBHOOK_SECRET } from "../lib/config";
import { applyCredit, createSubscription, getActiveSubscription, getPlan } from "../lib/credits";
import { appError } from "../lib/errors";
import { logger } from "../lib/logger";
import { getDb } from "../lib/mongo";
import { notifyUser } from "../lib/notify";
import { getStripe } from "../lib/stripe";
import { withTransaction } from "../lib/transaction";

/** Stripe refuses amounts under 0.50 EUR. */
const MIN_AMOUNT_CENTS = 50;

function inOneMonth(from = new Date()): Date {
  const next = new Date(from);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

interface PaymentDoc {
  _id: string; // the Stripe PaymentIntent id: a payment can be turned into credits only once
  userId: string;
  planId: string;
  planName: string;
  credits: number;
  amountCents: number;
  createdAt: Date;
}

async function retrieveIntent(id: string): Promise<Stripe.PaymentIntent> {
  try {
    return await getStripe().paymentIntents.retrieve(id);
  } catch (err) {
    if (err instanceof Error && "code" in err && err.code === "resource_missing") {
      throw appError("not-found", "paymentFailed", "Payment not found.");
    }
    logger.error("Stripe could not be reached", { err });
    throw appError("unavailable", "paymentUnavailable", "Payment service unavailable.");
  }
}

/**
 * Turns a paid PaymentIntent into credits, once. Called by the buyer's browser right after paying and by
 * Stripe's webhook, in any order and as often as needed: the first call gives the credits and the others
 * only report them. The plan is read from the intent (what the buyer saw and paid), not from the current
 * plan, which an administrator may have changed since.
 */
export async function fulfillPayment(intent: Stripe.PaymentIntent, actor: { uid: string; role: "user" | "admin" | "system" }): Promise<ConfirmPaymentResult> {
  const { userId, planId, planName, kind } = intent.metadata;
  const credits = Number(intent.metadata.credits);
  if (intent.status !== "succeeded") throw appError("failed-precondition", "paymentFailed", "The payment is not complete.");
  if (!userId || !planId || !planName || !Number.isInteger(credits) || credits <= 0) {
    throw appError("failed-precondition", "paymentFailed", "The payment does not belong to a plan.");
  }

  const payments = (await getDb()).collection<PaymentDoc>(COL.payments);
  const first = await withTransaction(async (session) => {
    if (await payments.findOne({ _id: intent.id }, { session })) return false;
    await payments.insertOne(
      { _id: intent.id, userId, planId, planName, credits, amountCents: intent.amount_received, createdAt: new Date() },
      { session },
    );
    const isSubscription = kind === "subscription";
    await applyCredit(userId, { amount: credits, type: isSubscription ? "subscription" : "purchase", label: planName }, session);
    if (isSubscription && !(await getActiveSubscription(userId))) {
      await createSubscription(
        { userId, planId, planName, credits, status: "active", nextRenewalAt: inOneMonth(), createdAt: new Date(), cancelledAt: null },
        session,
      );
    }
    return true;
  });

  if (first) {
    await writeAudit({
      actorId: actor.uid,
      actorRole: actor.role,
      action: "credits.purchased",
      targetType: "plan",
      targetId: planId,
      details: { paymentIntentId: intent.id, amountCents: intent.amount_received },
    });
    await notifyUser(userId, { type: "creditsAdded", values: { count: credits, label: planName }, link: "/credits" });
  }
  return { credits };
}

/**
 * Starts the payment of a credit pack or a subscription: creates a Stripe PaymentIntent for the plan's
 * price, which the browser then confirms with the card form. The price comes from the plan, never from the client.
 */
export const createPayment = secureCall(
  { name: "createPayment", schema: createPaymentInput, rateLimit: { limit: 10, windowSec: 60 } },
  async ({ uid, data }): Promise<CreatePaymentResult> => {
    const plan = await getPlan(data.planId);
    if (!plan || !plan.active) throw appError("not-found", "planNotFound", "Plan not found.");
    if (plan.kind === "subscription" && (await getActiveSubscription(uid))) {
      throw appError("failed-precondition", "alreadySubscribed", "User already has a subscription.");
    }
    if (plan.priceCents < MIN_AMOUNT_CENTS) throw appError("failed-precondition", "paymentUnavailable", "The plan costs less than Stripe's minimum.");

    try {
      const intent = await getStripe().paymentIntents.create({
        amount: plan.priceCents,
        currency: "eur",
        allowed_payment_method_types: ["card"],
        description: `${plan.name} (${plan.credits} credits)`,
        metadata: { userId: uid, planId: data.planId, planName: plan.name, kind: plan.kind, credits: String(plan.credits) },
      });
      if (!intent.client_secret) throw new Error("Stripe sent no client secret");
      return { paymentIntentId: intent.id, clientSecret: intent.client_secret };
    } catch (err) {
      logger.error("Could not create the payment", { err });
      throw appError("unavailable", "paymentUnavailable", "Payment service unavailable.");
    }
  },
);

/**
 * The browser calls this once Stripe says the card was charged. The server checks with Stripe itself
 * (it never trusts the browser) that the payment succeeded and is the caller's own, then gives the credits.
 */
export const confirmPayment = secureCall(
  { name: "confirmPayment", schema: confirmPaymentInput, rateLimit: { limit: 20, windowSec: 60 } },
  async ({ uid, role, data }): Promise<ConfirmPaymentResult> => {
    const intent = await retrieveIntent(data.paymentIntentId);
    if (intent.metadata.userId !== uid) throw appError("permission-denied", "forbidden", "This payment belongs to someone else.");
    return fulfillPayment(intent, { uid, role: role === "admin" ? "admin" : "user" });
  },
);

/** The webhook is only available when its signing secret is set (see STRIPE_WEBHOOK_SECRET). */
export function stripeWebhookEnabled(): boolean {
  return STRIPE_WEBHOOK_SECRET() !== "";
}

/**
 * Handles a webhook call from Stripe: checks its signature, and gives the credits of a succeeded payment
 * even when the buyer closed the page before the browser could confirm it. Returns the HTTP status to answer.
 */
export async function handleStripeWebhook(rawBody: Buffer, signature: string | undefined): Promise<number> {
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature ?? "", STRIPE_WEBHOOK_SECRET());
  } catch {
    return 400;
  }
  if (event.type !== "payment_intent.succeeded") return 200;
  try {
    await fulfillPayment(event.data.object, { uid: "stripe", role: "system" });
    return 200;
  } catch (err) {
    logger.error("Could not fulfil a payment from the webhook", { err });
    // Stripe tries again later.
    return 500;
  }
}
