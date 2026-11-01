import type { ClientSession } from "mongodb";
import { ObjectId } from "mongodb";
import type { z } from "zod";
import { COL, auditLogSchema, type Role } from "@reservation/shared";
import { getDb } from "./mongo";

export interface AuditEntry {
  actorId: string;
  actorRole: Role | "system";
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, unknown>;
}

type AuditDoc = z.infer<typeof auditLogSchema>;

/** Appends an immutable audit log entry. Pass a session to write it atomically with the audited change. */
export async function writeAudit(entry: AuditEntry, session?: ClientSession): Promise<void> {
  const db = await getDb();
  const doc: AuditDoc = {
    _id: new ObjectId().toHexString(),
    ...entry,
    details: entry.details ?? null,
    createdAt: new Date(),
  };
  await db.collection<AuditDoc>(COL.auditLogs).insertOne(doc, { session });
}
