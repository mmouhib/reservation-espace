import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import {
  COL,
  adjustCreditsInput,
  cancelSubscriptionInput,
  purchasePlanInput,
  type Plan,
  type Subscription,
} from "@reservation/shared";
import { db } from "../lib/admin";
import { writeAudit } from "../lib/audit";
import { secureCall } from "../lib/callable";
import { REGION } from "../lib/config";
import { readBalance, writeCredits } from "../lib/credits";
import { appError } from "../lib/errors";
import { notifyUser } from "../lib/notify";

function inOneMonth(from = new Date()): Timestamp {
  const next = new Date(from);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return Timestamp.fromDate(next);
}

/**
 * Buys a credit pack or starts a subscription for the signed-in user.
 * The payment is simulated: plug a payment provider in here before charging real money.
 */
export const purchasePlan = secureCall(
  { name: "purchasePlan", schema: purchasePlanInput, rateLimit: { limit: 10, windowSec: 60 } },
  async ({ uid, role, data }) => {
    const planSnap = await db.collection(COL.plans).doc(data.planId).get();
    const plan = planSnap.data() as Plan | undefined;
    if (!plan || !plan.active) throw appError("not-found", "planNotFound", "Plan not found.");

    const isSubscription = plan.kind === "subscription";
    if (isSubscription) {
      const active = await db.collection(COL.subscriptions).where("userId", "==", uid).where("status", "==", "active").limit(1).get();
      if (!active.empty) throw appError("failed-precondition", "alreadySubscribed", "User already has a subscription.");
    }

    await db.runTransaction(async (tx) => {
      const balance = await readBalance(tx, uid);
      writeCredits(tx, uid, balance, { amount: plan.credits, type: isSubscription ? "subscription" : "purchase", label: plan.name });
      if (isSubscription) {
        const subscription: Subscription<FieldValue | Timestamp | null> = {
          userId: uid,
          planId: data.planId,
          planName: plan.name,
          credits: plan.credits,
          status: "active",
          nextRenewalAt: inOneMonth(),
          createdAt: FieldValue.serverTimestamp(),
          cancelledAt: null,
        };
        tx.create(db.collection(COL.subscriptions).doc(), subscription);
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
    const ref = db.collection(COL.subscriptions).doc(data.subscriptionId);
    const subscription = (await ref.get()).data() as Subscription | undefined;
    if (!subscription || subscription.status !== "active") throw appError("not-found", "subscriptionNotFound", "Subscription not found.");
    if (subscription.userId !== uid && role !== "admin") throw appError("permission-denied", "forbidden", "Not your subscription.");

    await ref.update({ status: "cancelled", cancelledAt: FieldValue.serverTimestamp() });
    await writeAudit({ actorId: uid, actorRole: role ?? "user", action: "subscription.cancelled", targetType: "subscription", targetId: ref.id });
    return { cancelled: true };
  },
);

/** Admin-only: adds or removes credits on a user's balance, with a note. */
export const adjustCredits = secureCall(
  { name: "adjustCredits", schema: adjustCreditsInput, role: "admin", rateLimit: { limit: 20, windowSec: 60 } },
  async ({ uid: actorId, data }) => {
    await db.runTransaction(async (tx) => {
      const balance = await readBalance(tx, data.uid);
      writeCredits(tx, data.uid, balance, { amount: data.amount, type: "adjustment", label: data.label });
    });
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
  const due = await db
    .collection(COL.subscriptions)
    .where("status", "==", "active")
    .where("nextRenewalAt", "<=", Timestamp.now())
    .get();

  for (const doc of due.docs) {
    const subscription = doc.data() as Subscription<Timestamp>;
    await db.runTransaction(async (tx) => {
      const balance = await readBalance(tx, subscription.userId);
      writeCredits(tx, subscription.userId, balance, { amount: subscription.credits, type: "subscription", label: subscription.planName });
      tx.update(doc.ref, { nextRenewalAt: inOneMonth(subscription.nextRenewalAt.toDate()) });
    });
    await notifyUser(subscription.userId, {
      type: "subscriptionRenewed",
      values: { count: subscription.credits, label: subscription.planName },
      link: "/credits",
    });
  }
});
