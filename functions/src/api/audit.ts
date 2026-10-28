import { COL, listAuditLogsInput, type AuditLogSummary } from "@reservation/shared";
import { secureCall } from "../lib/callable";
import { col, type AuditDoc, type UserDoc } from "./common";

/**
 * Administrators: the most recent audit entries, optionally of one action.
 * Actor and user-target names are resolved here, so the page needs no user list.
 */
export const listAuditLogs = secureCall(
  { name: "listAuditLogs", schema: listAuditLogsInput, role: "admin", rateLimit: { limit: 60, windowSec: 60 } },
  async ({ data }): Promise<AuditLogSummary[]> => {
    const auditLogs = await col<AuditDoc>(COL.auditLogs);
    const docs = await auditLogs.find(data.action ? { action: data.action } : {}).sort({ createdAt: -1 }).limit(data.limit).toArray();

    const userIds = new Set<string>();
    for (const doc of docs) {
      if (doc.actorId !== "system") userIds.add(doc.actorId);
      if (doc.targetType === "user") userIds.add(doc.targetId);
    }
    const names = new Map<string, string>();
    if (userIds.size > 0) {
      const users = await col<UserDoc>(COL.users);
      for (const user of await users.find({ _id: { $in: [...userIds] } }, { projection: { displayName: 1 } }).toArray()) {
        names.set(user._id, user.displayName);
      }
    }

    return docs.map((doc) => ({
      id: doc._id,
      actorId: doc.actorId,
      actorName: doc.actorId === "system" ? "system" : (names.get(doc.actorId) ?? doc.actorId),
      actorRole: doc.actorRole,
      action: doc.action,
      targetType: doc.targetType,
      targetId: doc.targetId,
      targetName: doc.targetType === "user" ? (names.get(doc.targetId) ?? doc.targetId) : null,
      details: doc.details,
      createdAt: doc.createdAt.toISOString(),
    }));
  },
);
