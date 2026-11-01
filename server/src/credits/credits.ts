import { adjustCreditsInput, cancelSubscriptionInput } from "@reservation/shared";
import { writeAudit } from "../lib/audit";
import { scheduledJob, secureCall } from "../lib/callable";
import { applyCredit, cancelSubscriptionById, listDueSubscriptions, setNextRenewal } from "../lib/credits";
import { notifyUser } from "../lib/notify";
import { withTransaction } from "../lib/transaction";

function inOneMonth(from = new Date()): Date {
  const next = new Date(from);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return next;
}

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
export const renewSubscriptions = scheduledJob({ name: "renewSubscriptions", schedule: "0 3 * * *", timeZone: "Europe/Paris" }, async () => {
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
