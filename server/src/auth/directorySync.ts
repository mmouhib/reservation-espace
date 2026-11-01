import { z } from "zod";
import { COL, type UserProfile } from "@reservation/shared";
import { cancelUpcomingBookings } from "../bookings/cancelBooking";
import { auth } from "../lib/admin";
import { writeAudit } from "../lib/audit";
import { scheduledJob, secureCall } from "../lib/callable";
import { logger } from "../lib/logger";
import { getDb } from "../lib/mongo";
import { getDirectoryProvider } from "./directory";

export interface DirectorySyncResult {
  checked: number;
  disabled: string[];
}

/**
 * Disables accounts of departed employees: blocks sign-in, revokes refresh
 * tokens, marks the profile as disabled and cancels their upcoming bookings.
 */
export async function runDirectorySync(actorId = "system"): Promise<DirectorySyncResult> {
  const departed = await getDirectoryProvider().listDepartedEmails();
  const disabled: string[] = [];

  for (const email of departed) {
    const user = await auth.getUserByEmail(email).catch(() => null);
    if (!user || user.disabled) continue;

    await auth.updateUser(user.uid, { disabled: true });
    await auth.revokeRefreshTokens(user.uid);
    // Their upcoming bookings free the spaces, and the credits go back to their wallet.
    await cancelUpcomingBookings(user.uid, { uid: actorId, role: "system" }, "left_company");
    const db = await getDb();
    await db
      .collection<UserProfile<Date> & { _id: string }>(COL.users)
      .updateOne({ _id: user.uid }, { $set: { status: "disabled", disabledAt: new Date() } }, { upsert: true });
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

export const directorySyncScheduled = scheduledJob(
  { name: "directorySyncScheduled", schedule: "0 2 * * *", timeZone: "Europe/Paris" },
  async () => {
    await runDirectorySync();
  },
);

/** Admin-only manual trigger. */
export const runDirectorySyncNow = secureCall(
  { name: "runDirectorySyncNow", schema: z.object({}).strict(), role: "admin", rateLimit: { limit: 5, windowSec: 60 } },
  async ({ uid }) => runDirectorySync(uid),
);
