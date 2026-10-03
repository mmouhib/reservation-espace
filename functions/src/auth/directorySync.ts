import { FieldValue } from "firebase-admin/firestore";
import { logger } from "firebase-functions/v2";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { z } from "zod";
import { COL } from "@reservation/shared";
import { auth, db } from "../lib/admin";
import { writeAudit } from "../lib/audit";
import { secureCall } from "../lib/callable";
import { REGION } from "../lib/config";
import { getDirectoryProvider } from "./directory";

export interface DirectorySyncResult {
  checked: number;
  disabled: string[];
}

/**
 * Disables accounts of departed employees: blocks sign-in, revokes refresh
 * tokens and marks the profile as disabled.
 * Phase 2 extends this to cancel and refund their future bookings.
 */
export async function runDirectorySync(actorId = "system"): Promise<DirectorySyncResult> {
  const departed = await getDirectoryProvider().listDepartedEmails();
  const disabled: string[] = [];

  for (const email of departed) {
    const user = await auth.getUserByEmail(email).catch(() => null);
    if (!user || user.disabled) continue;

    await auth.updateUser(user.uid, { disabled: true });
    await auth.revokeRefreshTokens(user.uid);
    await db
      .collection(COL.users)
      .doc(user.uid)
      .set({ status: "disabled", disabledAt: FieldValue.serverTimestamp() }, { merge: true });
    await writeAudit({
      actorId,
      actorRole: actorId === "system" ? "system" : "admin",
      action: "user.disabled",
      targetType: "user",
      targetId: user.uid,
      details: { reason: "directory_sync" },
    });
    disabled.push(user.uid);
  }

  logger.info("Directory sync done", { checked: departed.length, disabled: disabled.length });
  return { checked: departed.length, disabled };
}

export const directorySyncScheduled = onSchedule(
  { schedule: "every day 02:00", timeZone: "Europe/Paris", region: REGION },
  async () => {
    await runDirectorySync();
  },
);

/** Admin-only manual trigger (scheduled functions don't fire in the emulator). */
export const runDirectorySyncNow = secureCall(
  { name: "runDirectorySyncNow", schema: z.object({}).strict(), role: "admin", rateLimit: { limit: 5, windowSec: 60 } },
  async ({ uid }) => runDirectorySync(uid),
);
