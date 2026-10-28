import type { ClientSession } from "mongodb";
import { ObjectId } from "mongodb";
import {
  COL,
  type CreditTransaction,
  type CreditTransactionType,
  type Plan,
  type Subscription,
  type SubscriptionStatus,
  type Wallet,
} from "@reservation/shared";
import { appError } from "./errors";
import { getDb } from "./mongo";
import { withTransaction } from "./transaction";

/**
 * Credits are kept in `wallets/{uid}` (Mongo `_id` = uid); every change is also
 * recorded in `creditTransactions`. Unlike the Firestore-era version, this is no
 * longer composable inside an external (Firestore) transaction — booking-triggered
 * charges/refunds call this *after* their Firestore transaction commits (see
 * createBooking/cancelBooking/updateBooking), which is a deliberate, accepted
 * trade-off: the booking write and the credit write are each atomic on their own
 * database, but not atomic with each other.
 */

type WalletDoc = Wallet<Date> & { _id: string };
type PlanDoc = Plan & { _id: string };
type SubscriptionDoc = Subscription<Date> & { _id: string };
type CreditTransactionDoc = CreditTransaction<Date> & { _id: string };

async function walletsCol() {
  return (await getDb()).collection<WalletDoc>(COL.wallets);
}
async function transactionsCol() {
  return (await getDb()).collection<CreditTransactionDoc>(COL.creditTransactions);
}
async function plansCol() {
  return (await getDb()).collection<PlanDoc>(COL.plans);
}
async function subscriptionsCol() {
  return (await getDb()).collection<SubscriptionDoc>(COL.subscriptions);
}

export interface CreditEntry {
  /** Positive to add credits, negative to spend them. */
  amount: number;
  type: CreditTransactionType;
  label: string;
  bookingId?: string;
}

/**
 * Atomically applies a credit change and logs it. Throws `notEnoughCredits` when it
 * would take the balance negative. Pass `session` to run as part of a larger Mongo
 * transaction (e.g. alongside creating a subscription); omit it to run on its own.
 */
export async function applyCredit(uid: string, entry: CreditEntry, session?: ClientSession): Promise<number> {
  const wallets = await walletsCol();
  const transactions = await transactionsCol();

  const run = async (s: ClientSession) => {
    const current = await wallets.findOne({ _id: uid }, { session: s });
    const balanceAfter = (current?.balance ?? 0) + entry.amount;
    if (balanceAfter < 0) throw appError("failed-precondition", "notEnoughCredits", "Not enough credits.");

    const now = new Date();
    await wallets.updateOne({ _id: uid }, { $set: { balance: balanceAfter, updatedAt: now } }, { session: s, upsert: true });
    await transactions.insertOne(
      {
        _id: new ObjectId().toHexString(),
        userId: uid,
        type: entry.type,
        amount: entry.amount,
        balanceAfter,
        label: entry.label,
        bookingId: entry.bookingId ?? null,
        createdAt: now,
      },
      { session: s },
    );
    return balanceAfter;
  };

  return session ? run(session) : withTransaction(run);
}

/** Pass `session` to read the balance inside a larger Mongo transaction. */
export async function getBalance(uid: string, session?: ClientSession): Promise<number> {
  const wallet = await (await walletsCol()).findOne({ _id: uid }, { session });
  return wallet?.balance ?? 0;
}

export async function getWallet(uid: string): Promise<WalletDoc | null> {
  return (await walletsCol()).findOne({ _id: uid });
}

export async function listCreditTransactions(uid: string, max = 50): Promise<CreditTransactionDoc[]> {
  return (await transactionsCol()).find({ userId: uid }).sort({ createdAt: -1 }).limit(max).toArray();
}

export async function getPlan(planId: string): Promise<PlanDoc | null> {
  return (await plansCol()).findOne({ _id: planId });
}

export async function listPlans(activeOnly: boolean): Promise<PlanDoc[]> {
  const filter = activeOnly ? { active: true } : {};
  return (await plansCol()).find(filter).sort({ priceCents: 1 }).toArray();
}

export async function createPlan(plan: Plan): Promise<string> {
  const _id = new ObjectId().toHexString();
  await (await plansCol()).insertOne({ _id, ...plan });
  return _id;
}

export async function updatePlan(planId: string, plan: Plan): Promise<void> {
  const res = await (await plansCol()).replaceOne({ _id: planId }, plan);
  if (res.matchedCount === 0) throw appError("not-found", "planNotFound", "Plan not found.");
}

export async function deletePlan(planId: string): Promise<void> {
  await (await plansCol()).deleteOne({ _id: planId });
}

export async function getActiveSubscription(uid: string): Promise<SubscriptionDoc | null> {
  return (await subscriptionsCol()).findOne({ userId: uid, status: "active" });
}

export async function listSubscriptionsForUser(uid: string): Promise<SubscriptionDoc[]> {
  return (await subscriptionsCol()).find({ userId: uid }).toArray();
}

export async function createSubscription(sub: Omit<SubscriptionDoc, "_id">, session: ClientSession): Promise<string> {
  const _id = new ObjectId().toHexString();
  await (await subscriptionsCol()).insertOne({ _id, ...sub }, { session });
  return _id;
}

/** The subscription must belong to `uid` (unless `uid` is an admin) and still be active. */
export async function cancelSubscriptionById(subscriptionId: string, uid: string, isAdmin: boolean): Promise<void> {
  const subscriptions = await subscriptionsCol();
  const sub = await subscriptions.findOne({ _id: subscriptionId });
  if (!sub || sub.status !== "active") throw appError("not-found", "subscriptionNotFound", "Subscription not found.");
  if (sub.userId !== uid && !isAdmin) throw appError("permission-denied", "forbidden", "Not your subscription.");

  await subscriptions.updateOne({ _id: subscriptionId }, { $set: { status: "cancelled" as SubscriptionStatus, cancelledAt: new Date() } });
}

/** Best-effort, non-atomic fan-out — matches the Firestore `bulkWriter` semantics this replaces. */
export async function cancelActiveSubscriptionsForUser(uid: string): Promise<void> {
  await (await subscriptionsCol()).updateMany({ userId: uid, status: "active" }, { $set: { status: "cancelled", cancelledAt: new Date() } });
}

export async function listDueSubscriptions(now: Date): Promise<SubscriptionDoc[]> {
  return (await subscriptionsCol()).find({ status: "active", nextRenewalAt: { $lte: now } }).toArray();
}

export async function setNextRenewal(subscriptionId: string, nextRenewalAt: Date, session: ClientSession): Promise<void> {
  await (await subscriptionsCol()).updateOne({ _id: subscriptionId }, { $set: { nextRenewalAt } }, { session });
}
