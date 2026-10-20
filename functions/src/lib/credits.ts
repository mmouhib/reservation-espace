import { FieldValue, type Transaction } from "firebase-admin/firestore";
import { COL, type CreditTransactionType, type Wallet } from "@reservation/shared";
import { db } from "./admin";
import { appError } from "./errors";

/** Credits are kept in wallets/{uid}; every change is also recorded in creditTransactions. */

export async function readBalance(tx: Transaction, uid: string): Promise<number> {
  const snap = await tx.get(db.collection(COL.wallets).doc(uid));
  return (snap.data() as Wallet | undefined)?.balance ?? 0;
}

export interface CreditEntry {
  /** Positive to add credits, negative to spend them. */
  amount: number;
  type: CreditTransactionType;
  label: string;
  bookingId?: string;
}

/**
 * Applies a credit change inside a transaction and returns the new balance.
 * Read the balance with readBalance() first: a transaction must read before it writes.
 */
export function writeCredits(tx: Transaction, uid: string, balance: number, entry: CreditEntry): number {
  const balanceAfter = balance + entry.amount;
  if (balanceAfter < 0) throw appError("failed-precondition", "notEnoughCredits", "Not enough credits.");

  tx.set(db.collection(COL.wallets).doc(uid), { balance: balanceAfter, updatedAt: FieldValue.serverTimestamp() });
  tx.create(db.collection(COL.creditTransactions).doc(), {
    userId: uid,
    type: entry.type,
    amount: entry.amount,
    balanceAfter,
    label: entry.label,
    bookingId: entry.bookingId ?? null,
    createdAt: FieldValue.serverTimestamp(),
  });
  return balanceAfter;
}
