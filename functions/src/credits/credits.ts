import { onSchedule } from "firebase-functions/v2/scheduler";
import { adjustCreditsInput, cancelSubscriptionInput, purchasePlanInput } from "@reservation/shared";
import { writeAudit } from "../lib/audit";
import { secureCall } from "../lib/callable";
import { REGION } from "../lib/config";
import {
  applyCredit,
  cancelSubscriptionById,
  createSubscription,
  getActiveSubscription,
  getPlan,
  listDueSubscriptions,
  setNextRenewal,
} from "../lib/credits";
import { appError } from "../lib/errors";
import { notifyUser } from "../lib/notify";
import { withTransaction } from "../lib/transaction";

function inOneMonth(from = new Date()): Date {
  const next = new Date(from);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

/**
 * Buys a credit pack or starts a subscription for the signed-in user.
 * The payment is simulated: plug a payment provider in here before charging real money.
 */
export const purchasePlan = secureCall(
  { name: "purchasePlan", schema: purchasePlanInput, rateLimit: { limit: 10, windowSec: 60 } },
  async ({ uid, role, data }) => {
    const plan = await getPlan(data.planId);
    if (!plan || !plan.active) throw appError("not-found", "planNotFound", "Plan not found.");

    const isSubscription = plan.kind === "subscription";
    if (isSubscription && (await getActiveSubscription(uid))) {
      throw appError("failed-precondition", "alreadySubscribed", "User already has a subscription.");
    }

    await withTransaction(async (session) => {
      await applyCredit(uid, { amount: plan.credits, type: isSubscription ? "subscription" : "purchase", label: plan.name }, session);
      if (isSubscription) {
        await createSubscription(
          {
            userId: uid,
            planId: data.planId,
            planName: plan.name,
            credits: plan.credits,
            status: "active",
            nextRenewalAt: inOneMonth(),
            createdAt: new Date(),
            cancelledAt: null,
          },
          session,
        );
      }
    });

    await writeAudit({ actorId: uid, actorRole: role ?? "user", action: "credits.purchased", targetType: "plan", targetId: data.planId });
    await notifyUser(uid, { type: "creditsAdded", values: { count: plan.credits, label: plan.name }, link: "/credits" });
    return { credits: plan.credits };
  },
);

/** Stops a subscription. The credits already received are kept. */
export const cancelSubscription = secureCall(
  { name: "cancelSubscription", schema: cancelSubscriptionInput, rateLimit: { limit: 10, windowSec: 60 } },
  async ({ uid, role, data }) => {
    await cancelSubscriptionById(data.subscriptionId, uid, role === "admin");
    await writeAudit({ actorId: uid, actorRole: role ?? "user", action: "subscription.cancelled", targetType: "subscription", targetId: data.subscriptionId });
    return { cancelled: true };
  },
);

/** Admin-only: adds or removes credits on a user's balance, with a note. */
export const adjustCredits = secureCall(
  { name: "adjustCredits", schema: adjustCreditsInput, role: "admin", rateLimit: { limit: 20, windowSec: 60 } },
  async ({ uid: actorId, data }) => {
    await applyCredit(data.uid, { amount: data.amount, type: "adjustment", label: data.label });
    await writeAudit({
      actorId,
      actorRole: "admin",
      action: "credits.adjusted",
      targetType: "user",
      targetId: data.uid,
      details: { amount: data.amount, label: data.label },
    });
    if (data.amount > 0) {
      await notifyUser(data.uid, { type: "creditsAdded", values: { count: data.amount, label: data.label || "-" }, link: "/credits" });
    }
    return { adjusted: true };
  },
);

/** Every night: gives the monthly credits of the subscriptions that are due. */
export const renewSubscriptions = onSchedule({ schedule: "every day 03:00", timeZone: "Europe/Paris", region: REGION }, async () => {
  const due = await listDueSubscriptions(new Date());

  for (const subscription of due) {
    await withTransaction(async (session) => {
      await applyCredit(subscription.userId, { amount: subscription.credits, type: "subscription", label: subscription.planName }, session);
      await setNextRenewal(subscription._id, inOneMonth(subscription.nextRenewalAt), session);
    });
    await notifyUser(subscription.userId, {
      type: "subscriptionRenewed",
      values: { count: subscription.credits, label: subscription.planName },
      link: "/credits",
    });
  }
});
