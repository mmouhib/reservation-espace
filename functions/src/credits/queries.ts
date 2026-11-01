import { emptyInput, type CreditTransaction, type MyWallet, type Subscription, type CreditTransactionSummary, type SubscriptionSummary } from "@reservation/shared";
import { secureCall } from "../lib/callable";
import { getActiveSubscription, getBalance, listCreditTransactions } from "../lib/credits";

function toSummary(tx: CreditTransaction<Date> & { _id: string }): CreditTransactionSummary {
  return { id: tx._id, type: tx.type, amount: tx.amount, balanceAfter: tx.balanceAfter, label: tx.label, bookingId: tx.bookingId, createdAt: tx.createdAt.toISOString() };
}

function toSubscriptionSummary(sub: Subscription<Date> & { _id: string }): SubscriptionSummary {
  return {
    id: sub._id,
    planId: sub.planId,
    planName: sub.planName,
    credits: sub.credits,
    status: sub.status,
    nextRenewalAt: sub.nextRenewalAt.toISOString(),
    createdAt: sub.createdAt.toISOString(),
    cancelledAt: sub.cancelledAt ? sub.cancelledAt.toISOString() : null,
  };
}

export const getMyWallet = secureCall({ name: "getMyWallet", schema: emptyInput }, async ({ uid }): Promise<MyWallet> => {
  return { balance: await getBalance(uid) };
});

export const getMyCreditHistory = secureCall({ name: "getMyCreditHistory", schema: emptyInput }, async ({ uid }) => {
  const history = await listCreditTransactions(uid);
  return history.map(toSummary);
});

export const getMySubscription = secureCall({ name: "getMySubscription", schema: emptyInput }, async ({ uid }): Promise<SubscriptionSummary | null> => {
  const sub = await getActiveSubscription(uid);
  return sub ? toSubscriptionSummary(sub) : null;
});
