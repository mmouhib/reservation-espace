import { FieldValue, type Transaction } from "firebase-admin/firestore";
import { COL, type Role } from "@reservation/shared";
import { db } from "./admin";

export interface AuditEntry {
  actorId: string;
  actorRole: Role | "system";
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
}

/** Appends an immutable audit log entry. Pass a transaction to write it atomically with the audited change. */
export async function writeAudit(entry: AuditEntry, tx?: Transaction): Promise<void> {
  const ref = db.collection(COL.auditLogs).doc();
  const data = { ...entry, details: entry.details ?? null, createdAt: FieldValue.serverTimestamp() };
  if (tx) tx.create(ref, data);
  else await ref.create(data);
}
